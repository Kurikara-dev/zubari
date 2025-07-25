'use client';

/**
 * Image format detection and optimization utilities
 */

export type SupportedImageFormat = 'webp' | 'avif' | 'jpeg' | 'png';

export interface FormatSupport {
  webp: boolean;
  avif: boolean;
  jpeg: boolean;
  png: boolean;
}

export interface ImageFormatOptions {
  quality?: number;
  format?: SupportedImageFormat;
  fallback?: SupportedImageFormat;
  sizes?: string;
}

/**
 * Detect browser support for modern image formats
 */
export class ImageFormatDetector {
  private static supportCache: FormatSupport | null = null;

  /**
   * Check support for WebP format
   */
  static async supportsWebP(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    
    return new Promise((resolve) => {
      const webP = new Image();
      webP.onload = webP.onerror = () => {
        resolve(webP.height === 2);
      };
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    });
  }

  /**
   * Check support for AVIF format
   */
  static async supportsAVIF(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    
    return new Promise((resolve) => {
      const avif = new Image();
      avif.onload = avif.onerror = () => {
        resolve(avif.height === 2);
      };
      avif.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=';
    });
  }

  /**
   * Get all supported formats
   */
  static async getSupportedFormats(): Promise<FormatSupport> {
    if (this.supportCache) {
      return this.supportCache;
    }

    const [webp, avif] = await Promise.all([
      this.supportsWebP(),
      this.supportsAVIF(),
    ]);

    this.supportCache = {
      webp,
      avif,
      jpeg: true, // Always supported
      png: true,  // Always supported
    };

    return this.supportCache;
  }

  /**
   * Get the best supported format for the given options
   */
  static async getBestFormat(
    preferredFormats: SupportedImageFormat[] = ['avif', 'webp', 'jpeg']
  ): Promise<SupportedImageFormat> {
    const support = await this.getSupportedFormats();
    
    for (const format of preferredFormats) {
      if (support[format]) {
        return format;
      }
    }
    
    return 'jpeg'; // Ultimate fallback
  }
}

/**
 * Generate optimized image URLs with format detection
 */
export class ImageOptimizer {
  /**
   * Generate Next.js optimized image URL
   */
  static async generateOptimizedUrl(
    src: string,
    options: ImageFormatOptions = {}
  ): Promise<string> {
    const {
      quality = 85,
      format,
      fallback = 'jpeg',
    } = options;

    // If format is specified, use it directly
    if (format) {
      return this.buildNextImageUrl(src, { format, quality });
    }

    // Otherwise, detect best format
    const bestFormat = await ImageFormatDetector.getBestFormat([
      'avif',
      'webp',
      fallback,
    ]);

    return this.buildNextImageUrl(src, { format: bestFormat, quality });
  }

  /**
   * Generate multiple format URLs for <picture> element
   */
  static async generatePictureSourceUrls(
    src: string,
    options: ImageFormatOptions & { sizes?: number[] } = {}
  ): Promise<{
    avif?: string[];
    webp?: string[];
    fallback: string[];
  }> {
    const { quality = 85, sizes = [320, 640, 1024, 1920] } = options;
    const support = await ImageFormatDetector.getSupportedFormats();

    const result: {
      avif?: string[];
      webp?: string[];
      fallback: string[];
    } = {
      fallback: sizes.map(size => 
        this.buildNextImageUrl(src, { format: 'jpeg', quality, width: size })
      ),
    };

    if (support.avif) {
      result.avif = sizes.map(size =>
        this.buildNextImageUrl(src, { format: 'avif', quality, width: size })
      );
    }

    if (support.webp) {
      result.webp = sizes.map(size =>
        this.buildNextImageUrl(src, { format: 'webp', quality, width: size })
      );
    }

    return result;
  }

  /**
   * Build Next.js image optimization URL
   */
  private static buildNextImageUrl(
    src: string,
    params: {
      format: SupportedImageFormat;
      quality: number;
      width?: number;
    }
  ): string {
    const searchParams = new URLSearchParams({
      url: src,
      w: params.width?.toString() || '1920',
      q: params.quality.toString(),
    });

    // Next.js automatically handles format based on Accept headers,
    // but we can specify it explicitly if needed
    return `/_next/image?${searchParams.toString()}`;
  }

  /**
   * Preload critical images with optimal format
   */
  static async preloadImage(
    src: string,
    options: ImageFormatOptions = {}
  ): Promise<void> {
    const optimizedUrl = await this.generateOptimizedUrl(src, options);
    
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = optimizedUrl;
    
    // Add format-specific attributes
    if (options.format === 'webp') {
      link.type = 'image/webp';
    } else if (options.format === 'avif') {
      link.type = 'image/avif';
    }
    
    document.head.appendChild(link);
  }
}

/**
 * Progressive image loading component helper
 */
export class ProgressiveImageLoader {
  private static loadingImages = new Map<string, Promise<void>>();

  /**
   * Load image with progressive enhancement
   */
  static async loadProgressive(
    src: string,
    options: {
      lowQualitySrc?: string;
      onLowQualityLoad?: () => void;
      onHighQualityLoad?: () => void;
      onError?: (error: Error) => void;
    } = {}
  ): Promise<void> {
    const {
      lowQualitySrc,
      onLowQualityLoad,
      onHighQualityLoad,
      onError,
    } = options;

    try {
      // Load low quality version first if provided
      if (lowQualitySrc) {
        await this.loadSingleImage(lowQualitySrc);
        onLowQualityLoad?.();
      }

      // Load high quality version
      await this.loadSingleImage(src);
      onHighQualityLoad?.();
    } catch (error) {
      onError?.(error as Error);
    }
  }

  /**
   * Load a single image with caching
   */
  private static loadSingleImage(src: string): Promise<void> {
    // Return cached promise if already loading
    if (this.loadingImages.has(src)) {
      return this.loadingImages.get(src)!;
    }

    const loadPromise = new Promise<void>((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        this.loadingImages.delete(src);
        resolve();
      };
      
      img.onerror = () => {
        this.loadingImages.delete(src);
        reject(new Error(`Failed to load image: ${src}`));
      };
      
      img.src = src;
    });

    this.loadingImages.set(src, loadPromise);
    return loadPromise;
  }

  /**
   * Preload multiple images with priority
   */
  static async preloadBatch(
    images: Array<{
      src: string;
      priority: 'high' | 'low';
      options?: ImageFormatOptions;
    }>
  ): Promise<void> {
    // Sort by priority
    const highPriority = images.filter(img => img.priority === 'high');
    const lowPriority = images.filter(img => img.priority === 'low');

    // Load high priority images first
    await Promise.allSettled(
      highPriority.map(img => 
        ImageOptimizer.preloadImage(img.src, img.options)
      )
    );

    // Then load low priority images
    Promise.allSettled(
      lowPriority.map(img => 
        ImageOptimizer.preloadImage(img.src, img.options)
      )
    );
  }
}

/**
 * Performance monitoring for image loading
 */
export const imageFormatMetrics = {
  /**
   * Track format detection performance
   */
  trackFormatDetection(formats: FormatSupport, detectionTime: number) {
    console.debug('[ImageFormat] Format detection completed:', {
      formats,
      detectionTime,
    });

    // Send to analytics if available
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'image_format_detection', {
        custom_parameter_1: JSON.stringify(formats),
        custom_parameter_2: Math.round(detectionTime),
      });
    }
  },

  /**
   * Track progressive loading performance
   */
  trackProgressiveLoad(
    imageId: string,
    stage: 'low_quality' | 'high_quality',
    loadTime: number
  ) {
    console.debug(`[ImageFormat] Progressive load ${stage} for ${imageId}: ${loadTime}ms`);

    // Send to analytics if available
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'progressive_image_load', {
        custom_parameter_1: imageId,
        custom_parameter_2: stage,
        custom_parameter_3: Math.round(loadTime),
      });
    }
  },
};

// Extend Window interface for gtag
declare global {
  interface Window {
    gtag?: (command: string, eventName: string, parameters: Record<string, string | number>) => void;
  }
}