/**
 * Image Optimization Utilities
 * Provides client-side and server-side image optimization capabilities
 */

// Image format types
export type ImageFormat = 'webp' | 'jpeg' | 'png'

// Compression options
export interface CompressionOptions {
  quality: number       // 0-100
  format: ImageFormat
  maxWidth?: number
  maxHeight?: number
  maintainAspectRatio?: boolean
}

// Image dimensions
export interface ImageDimensions {
  width: number
  height: number
}

// Optimization result
export interface OptimizationResult {
  buffer: ArrayBuffer
  dimensions: ImageDimensions
  format: ImageFormat
  originalSize: number
  optimizedSize: number
  compressionRatio: number
}

// Responsive image sizes configuration
export const RESPONSIVE_SIZES = {
  thumbnail: { width: 200, height: 200 },
  small: { width: 400, height: 400 },
  medium: { width: 800, height: 600 },
  large: { width: 1200, height: 900 },
  xlarge: { width: 1600, height: 1200 }
} as const

export type ResponsiveSize = keyof typeof RESPONSIVE_SIZES

/**
 * Client-side image optimization using Canvas API
 */
export class ClientImageOptimizer {
  /**
   * Optimize image file on client side
   */
  static async optimizeImage(
    file: File,
    options: CompressionOptions
  ): Promise<OptimizationResult> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          if (!ctx) {
            throw new Error('Failed to get canvas context')
          }

          // Calculate dimensions
          const dimensions = this.calculateDimensions(
            { width: img.width, height: img.height },
            options
          )

          canvas.width = dimensions.width
          canvas.height = dimensions.height

          // Draw and compress
          ctx.drawImage(img, 0, 0, dimensions.width, dimensions.height)
          
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to create optimized blob'))
                return
              }

              blob.arrayBuffer().then(buffer => {
                resolve({
                  buffer,
                  dimensions,
                  format: options.format,
                  originalSize: file.size,
                  optimizedSize: buffer.byteLength,
                  compressionRatio: (1 - buffer.byteLength / file.size) * 100
                })
              })
            },
            `image/${options.format}`,
            options.quality / 100
          )
        } catch (error) {
          reject(error)
        }
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }

  /**
   * Generate responsive image sizes
   */
  static async generateResponsiveSizes(
    file: File,
    quality: number = 80
  ): Promise<Record<ResponsiveSize, OptimizationResult>> {
    const results = {} as Record<ResponsiveSize, OptimizationResult>
    
    for (const [sizeName, dimensions] of Object.entries(RESPONSIVE_SIZES)) {
      try {
        const result = await this.optimizeImage(file, {
          quality,
          format: 'webp',
          maxWidth: dimensions.width,
          maxHeight: dimensions.height,
          maintainAspectRatio: true
        })
        
        results[sizeName as ResponsiveSize] = result
      } catch (error) {
        console.error(`Failed to generate ${sizeName} size:`, error)
        // Continue with other sizes
      }
    }

    return results
  }

  /**
   * Calculate optimal dimensions maintaining aspect ratio
   */
  private static calculateDimensions(
    original: ImageDimensions,
    options: CompressionOptions
  ): ImageDimensions {
    let { width, height } = original

    // Apply max width/height constraints
    if (options.maxWidth && width > options.maxWidth) {
      const ratio = options.maxWidth / width
      width = options.maxWidth
      if (options.maintainAspectRatio !== false) {
        height = Math.round(height * ratio)
      }
    }

    if (options.maxHeight && height > options.maxHeight) {
      const ratio = options.maxHeight / height
      height = options.maxHeight
      if (options.maintainAspectRatio !== false) {
        width = Math.round(width * ratio)
      }
    }

    return { width, height }
  }
}

/**
 * Server-side image optimization (requires sharp - will fallback gracefully)
 */
export class ServerImageOptimizer {
  private static sharpAvailable: boolean | null = null

  /**
   * Check if sharp is available
   */
  private static async checkSharpAvailability(): Promise<boolean> {
    if (this.sharpAvailable !== null) {
      return this.sharpAvailable
    }

    try {
      await import('sharp')
      this.sharpAvailable = true
      return true
    } catch {
      this.sharpAvailable = false
      console.warn('Sharp not available - using fallback optimization')
      return false
    }
  }

  /**
   * Optimize image on server side
   */
  static async optimizeImage(
    buffer: Buffer,
    options: CompressionOptions
  ): Promise<OptimizationResult> {
    const sharpAvailable = await this.checkSharpAvailability()

    if (sharpAvailable) {
      return this.optimizeWithSharp(buffer, options)
    } else {
      return this.optimizeWithFallback(buffer, options)
    }
  }

  /**
   * Optimize using Sharp (when available)
   */
  private static async optimizeWithSharp(
    buffer: Buffer,
    options: CompressionOptions
  ): Promise<OptimizationResult> {
    const sharp = await import('sharp')
    
    let processor = sharp.default(buffer)
    
    // Get original metadata
    const metadata = await processor.metadata()
    const originalDimensions = {
      width: metadata.width || 0,
      height: metadata.height || 0
    }

    // Calculate target dimensions
    const dimensions = this.calculateOptimalDimensions(originalDimensions, options)
    
    // Apply resizing
    if (dimensions.width !== originalDimensions.width || 
        dimensions.height !== originalDimensions.height) {
      processor = processor.resize(dimensions.width, dimensions.height, {
        fit: 'cover',
        position: 'center'
      })
    }

    // Apply format and quality
    switch (options.format) {
      case 'webp':
        processor = processor.webp({ quality: options.quality })
        break
      case 'jpeg':
        processor = processor.jpeg({ quality: options.quality })
        break
      case 'png':
        processor = processor.png({ quality: options.quality })
        break
    }

    const optimizedBuffer = await processor.toBuffer()

    return {
      buffer: (optimizedBuffer.buffer as ArrayBuffer).slice(optimizedBuffer.byteOffset, optimizedBuffer.byteOffset + optimizedBuffer.byteLength),
      dimensions,
      format: options.format,
      originalSize: buffer.length,
      optimizedSize: optimizedBuffer.length,
      compressionRatio: (1 - optimizedBuffer.length / buffer.length) * 100
    }
  }

  /**
   * Fallback optimization (without Sharp)
   */
  private static async optimizeWithFallback(
    buffer: Buffer,
    options: CompressionOptions
  ): Promise<OptimizationResult> {
    // For server-side fallback, we return the original buffer
    // In a real implementation, you might use alternative libraries
    console.warn('Using fallback optimization - limited functionality')
    
    return {
      buffer: (buffer.buffer as ArrayBuffer).slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
      dimensions: { width: 0, height: 0 }, // Would need to parse image headers
      format: options.format,
      originalSize: buffer.length,
      optimizedSize: buffer.length,
      compressionRatio: 0
    }
  }

  /**
   * Calculate optimal dimensions for server-side processing
   */
  private static calculateOptimalDimensions(
    original: ImageDimensions,
    options: CompressionOptions
  ): ImageDimensions {
    let { width, height } = original

    if (options.maxWidth && width > options.maxWidth) {
      const ratio = options.maxWidth / width
      width = options.maxWidth
      if (options.maintainAspectRatio !== false) {
        height = Math.round(height * ratio)
      }
    }

    if (options.maxHeight && height > options.maxHeight) {
      const ratio = options.maxHeight / height
      height = options.maxHeight
      if (options.maintainAspectRatio !== false) {
        width = Math.round(width * ratio)
      }
    }

    return { width, height }
  }
}

/**
 * Utility functions for image optimization
 */
export const imageOptimizer = {
  /**
   * Auto-detect and optimize image (client or server side)
   */
  async optimize(
    input: File | Buffer,
    options: CompressionOptions
  ): Promise<OptimizationResult> {
    if (input instanceof File) {
      // Client-side optimization
      return ClientImageOptimizer.optimizeImage(input, options)
    } else {
      // Server-side optimization
      return ServerImageOptimizer.optimizeImage(input, options)
    }
  },

  /**
   * Generate srcset for responsive images
   */
  generateSrcSet(baseUrl: string, sizes: ResponsiveSize[]): string {
    return sizes
      .map(size => {
        const { width } = RESPONSIVE_SIZES[size]
        return `${baseUrl}?size=${size} ${width}w`
      })
      .join(', ')
  },

  /**
   * Generate sizes attribute for responsive images
   */
  generateSizesAttribute(breakpoints?: Record<string, string>): string {
    const defaultBreakpoints = {
      '(max-width: 640px)': '50vw',
      '(max-width: 1024px)': '33vw',
      '(max-width: 1280px)': '25vw'
    }

    const bp = breakpoints || defaultBreakpoints
    const sizeRules = Object.entries(bp).map(([query, size]) => `${query} ${size}`)
    sizeRules.push('16vw') // Default size

    return sizeRules.join(', ')
  },

  /**
   * Detect optimal format based on browser support
   */
  detectOptimalFormat(): ImageFormat {
    if (typeof window === 'undefined') {
      // Server-side default
      return 'webp'
    }

    // Check WebP support
    const canvas = document.createElement('canvas')
    const webpSupported = canvas.toDataURL('image/webp').indexOf('webp') > -1

    if (webpSupported) {
      return 'webp'
    }

    return 'jpeg'
  },

  /**
   * Calculate compression quality based on file size
   */
  calculateOptimalQuality(fileSizeBytes: number): number {
    // Adjust quality based on file size
    if (fileSizeBytes < 100 * 1024) { // < 100KB
      return 90
    } else if (fileSizeBytes < 500 * 1024) { // < 500KB
      return 85
    } else if (fileSizeBytes < 1024 * 1024) { // < 1MB
      return 80
    } else if (fileSizeBytes < 2 * 1024 * 1024) { // < 2MB
      return 75
    } else {
      return 70
    }
  },

  /**
   * Validate image format
   */
  isValidImageFormat(mimeType: string): boolean {
    const validFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    return validFormats.includes(mimeType)
  },

  /**
   * Get format from MIME type
   */
  formatFromMimeType(mimeType: string): ImageFormat {
    switch (mimeType) {
      case 'image/webp':
        return 'webp'
      case 'image/png':
        return 'png'
      case 'image/jpeg':
      case 'image/jpg':
      default:
        return 'jpeg'
    }
  }
}

// Performance monitoring utilities
export const imagePerformanceMonitor = {
  /**
   * Track image loading performance
   */
  trackImageLoad(imageId: string, startTime: number): void {
    const loadTime = performance.now() - startTime
    
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'image_load_time', {
        custom_parameter_1: imageId,
        custom_parameter_2: Math.round(loadTime)
      })
    }

    console.debug(`Image ${imageId} loaded in ${Math.round(loadTime)}ms`)
  },

  /**
   * Track memory usage
   */
  getMemoryUsage(): MemoryUsage | null {
    if (typeof window !== 'undefined' && 
        'memory' in performance && 
        performance.memory) {
      const memory = performance.memory as MemoryUsage;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      }
    }
    return null
  },

  /**
   * Monitor network usage
   */
  trackNetworkUsage(imageId: string, sizeBytes: number): void {
    console.debug(`Image ${imageId} downloaded: ${(sizeBytes / 1024).toFixed(1)}KB`)
    
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'image_download_size', {
        custom_parameter_1: imageId,
        custom_parameter_2: Math.round(sizeBytes / 1024)
      })
    }
  }
}

// Types for performance monitoring
interface MemoryUsage {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
}

// Extend Window interface for gtag
declare global {
  interface Window {
    gtag?: (command: string, eventName: string, parameters: Record<string, string | number>) => void
  }
}