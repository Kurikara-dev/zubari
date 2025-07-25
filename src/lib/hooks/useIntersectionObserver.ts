'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface IntersectionObserverOptions {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
  triggerOnce?: boolean;
  skip?: boolean;
}

export interface IntersectionObserverState {
  isIntersecting: boolean;
  hasEntered: boolean;
  isLoading: boolean;
  entry?: IntersectionObserverEntry;
}

/**
 * Custom hook for Intersection Observer API
 * Optimized for image lazy loading with performance monitoring
 */
export function useIntersectionObserver(
  options: IntersectionObserverOptions = {}
): [React.RefObject<HTMLElement | null>, IntersectionObserverState] {
  const {
    root = null,
    rootMargin = '100px',
    threshold = 0.1,
    triggerOnce = true,
    skip = false
  } = options;

  const elementRef = useRef<HTMLElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  
  const [state, setState] = useState<IntersectionObserverState>({
    isIntersecting: false,
    hasEntered: false,
    isLoading: false,
  });

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const entry = entries[0];
      
      setState(prevState => {
        const isIntersecting = entry.isIntersecting;
        const hasEntered = prevState.hasEntered || isIntersecting;
        
        return {
          isIntersecting,
          hasEntered,
          isLoading: isIntersecting && !prevState.hasEntered,
          entry,
        };
      });

      // If triggerOnce and element has entered, stop observing
      if (triggerOnce && entry.isIntersecting && observerRef.current) {
        observerRef.current.unobserve(entry.target);
      }
    },
    [triggerOnce]
  );

  useEffect(() => {
    const element = elementRef.current;
    
    // Skip if disabled or no element
    if (skip || !element) {
      return;
    }

    // Check if Intersection Observer is supported
    if (!window.IntersectionObserver) {
      console.warn('IntersectionObserver not supported, falling back to immediate loading');
      setState({
        isIntersecting: true,
        hasEntered: true,
        isLoading: false,
      });
      return;
    }

    // Create observer
    observerRef.current = new IntersectionObserver(handleIntersection, {
      root,
      rootMargin,
      threshold,
    });

    // Start observing
    observerRef.current.observe(element);

    // Cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [root, rootMargin, threshold, skip, handleIntersection]);

  return [elementRef, state];
}

/**
 * Hook specifically optimized for image lazy loading
 */
export interface ImageLazyLoadingOptions extends IntersectionObserverOptions {
  src?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  onStartLoading?: () => void;
}

export interface ImageLazyLoadingState extends IntersectionObserverState {
  src?: string;
  shouldLoad: boolean;
  error?: Error;
}

export function useImageLazyLoading(
  src: string | undefined,
  options: ImageLazyLoadingOptions = {}
): [React.RefObject<HTMLElement | null>, ImageLazyLoadingState] {
  const { onLoad, onError, onStartLoading, ...observerOptions } = options;
  
  const [elementRef, observerState] = useIntersectionObserver({
    rootMargin: '200px', // Larger margin for images
    threshold: 0,
    triggerOnce: true,
    ...observerOptions,
  });

  const [imageState, setImageState] = useState<{
    error?: Error;
    hasStartedLoading: boolean;
  }>({
    hasStartedLoading: false,
  });

  const shouldLoad = observerState.hasEntered && !!src;

  // Start loading when image enters viewport
  useEffect(() => {
    if (shouldLoad && !imageState.hasStartedLoading) {
      setImageState(prev => ({ ...prev, hasStartedLoading: true }));
      onStartLoading?.();
    }
  }, [shouldLoad, imageState.hasStartedLoading, onStartLoading]);

  // Create image element to handle loading
  useEffect(() => {
    if (!shouldLoad || !src) return;

    const img = new Image();
    
    img.onload = () => {
      onLoad?.();
    };
    
    img.onerror = () => {
      const error = new Error(`Failed to load image: ${src}`);
      setImageState(prev => ({ ...prev, error }));
      onError?.(error);
    };

    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [shouldLoad, src, onLoad, onError]);

  return [
    elementRef,
    {
      ...observerState,
      src: shouldLoad ? src : undefined,
      shouldLoad,
      error: imageState.error,
    },
  ];
}

/**
 * Performance monitoring for intersection observer
 */
export const intersectionObserverMetrics = {
  /**
   * Track intersection timing
   */
  trackIntersection(elementId: string, entry: IntersectionObserverEntry) {
    const intersectionTime = performance.now();
    
    console.debug(`[IO] Element ${elementId} intersected at ${intersectionTime}ms`, {
      isIntersecting: entry.isIntersecting,
      intersectionRatio: entry.intersectionRatio,
      boundingClientRect: entry.boundingClientRect,
      rootBounds: entry.rootBounds,
    });

    // Send to analytics if available
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'intersection_observed', {
        custom_parameter_1: elementId,
        custom_parameter_2: Math.round(intersectionTime),
      });
    }
  },

  /**
   * Track lazy loading performance
   */
  trackLazyLoadStart(imageId: string) {
    const startTime = performance.now();
    console.debug(`[IO] Lazy loading started for ${imageId} at ${startTime}ms`);
    
    return startTime;
  },

  /**
   * Track lazy loading completion
   */
  trackLazyLoadComplete(imageId: string, startTime: number) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.debug(`[IO] Lazy loading completed for ${imageId} in ${duration}ms`);

    // Send to analytics if available
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'lazy_load_complete', {
        custom_parameter_1: imageId,
        custom_parameter_2: Math.round(duration),
      });
    }

    return duration;
  },
};

// Extend Window interface for gtag
declare global {
  interface Window {
    gtag?: (command: string, eventName: string, parameters: Record<string, string | number>) => void;
  }
}