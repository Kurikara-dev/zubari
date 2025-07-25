'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useIntersectionObserver } from '@/lib/hooks/useIntersectionObserver'
import { useDeviceDetection } from '@/lib/utils/mobile/deviceDetection'

export interface ProgressiveImageLoaderProps {
  src: string
  alt: string
  className?: string
  placeholder?: string
  placeholderClassName?: string
  priority?: boolean
  sizes?: string
  quality?: number
  onLoad?: () => void
  onError?: (error: Error) => void
  onLoadStart?: () => void
  enableWebP?: boolean
  enableAVIF?: boolean
  enableBlurPlaceholder?: boolean
  blurIntensity?: number
  showLoadingIndicator?: boolean
  loadingIndicatorColor?: string
  fadeDuration?: number
  enableMetrics?: boolean
  onMetrics?: (metrics: ImageLoadMetrics) => void
}

export interface ImageLoadMetrics {
  loadTime: number
  fileSize?: number
  format: string
  dimensions: { width: number; height: number }
  fromCache: boolean
  quality: number
}

interface ImageState {
  isLoading: boolean
  isLoaded: boolean
  hasError: boolean
  currentSrc: string | null
  loadStartTime: number
  error: Error | null
}

// Generate blur placeholder data URL
const generateBlurPlaceholder = (width: number = 10, height: number = 10, intensity: number = 20): string => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  
  // Create gradient background
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, '#f3f4f6')
  gradient.addColorStop(0.5, '#e5e7eb')
  gradient.addColorStop(1, '#d1d5db')
  
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
  
  // Apply blur effect
  ctx.filter = `blur(${intensity}px)`
  
  return canvas.toDataURL('image/jpeg', 0.1)
}

// Generate responsive image sources
const generateImageSources = (
  baseSrc: string,
  enableWebP: boolean = true,
  enableAVIF: boolean = true,
  quality: number = 75
): { src: string; type?: string }[] => {
  const sources: { src: string; type?: string }[] = []
  
  // Add AVIF if supported
  if (enableAVIF) {
    sources.push({
      src: `${baseSrc}?format=avif&quality=${quality}`,
      type: 'image/avif'
    })
  }
  
  // Add WebP if supported
  if (enableWebP) {
    sources.push({
      src: `${baseSrc}?format=webp&quality=${quality}`,
      type: 'image/webp'
    })
  }
  
  // Add original format as fallback
  sources.push({
    src: `${baseSrc}?quality=${quality}`
  })
  
  return sources
}

export const ProgressiveImageLoader: React.FC<ProgressiveImageLoaderProps> = ({
  src,
  alt,
  className = '',
  placeholder,
  placeholderClassName = '',
  priority = false,
  sizes = '100vw',
  quality = 75,
  onLoad,
  onError,
  onLoadStart,
  enableWebP = true,
  enableAVIF = true,
  enableBlurPlaceholder = true,
  blurIntensity = 20,
  showLoadingIndicator = true,
  loadingIndicatorColor = '#3b82f6',
  fadeDuration = 300,
  enableMetrics = false,
  onMetrics
}) => {
  const { optimizedSettings, isHighDPI, deviceInfo } = useDeviceDetection()
  const [imageState, setImageState] = useState<ImageState>({
    isLoading: false,
    isLoaded: false,
    hasError: false,
    currentSrc: null,
    loadStartTime: 0,
    error: null
  })

  const imgRef = useRef<HTMLImageElement>(null)
  const [blurPlaceholder, setBlurPlaceholder] = useState<string>('')

  // Use intersection observer for lazy loading (unless priority is true)
  const [observerRef, { isIntersecting }] = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '50px',
    triggerOnce: true
  })

  // Generate blur placeholder on mount
  useEffect(() => {
    if (enableBlurPlaceholder && !placeholder) {
      setBlurPlaceholder(generateBlurPlaceholder(10, 10, blurIntensity))
    }
  }, [enableBlurPlaceholder, placeholder, blurIntensity])

  // Intersection observer is automatically set up by useIntersectionObserver hook

  // Determine optimal image sources based on device capabilities
  const imageSources = useCallback(() => {
    const adjustedQuality = isHighDPI ? Math.min(quality + 10, 95) : quality
    const webPEnabled = enableWebP && optimizedSettings.enableWebP
    const avifEnabled = enableAVIF && optimizedSettings.enableAVIF
    
    return generateImageSources(src, webPEnabled, avifEnabled, adjustedQuality)
  }, [src, enableWebP, enableAVIF, quality, isHighDPI, optimizedSettings])

  // Load image with best format support
  const loadImage = useCallback(async () => {
    if (imageState.isLoading || imageState.isLoaded) return

    setImageState(prev => ({
      ...prev,
      isLoading: true,
      loadStartTime: performance.now(),
      hasError: false,
      error: null
    }))

    onLoadStart?.()

    const sources = imageSources()
    let lastError: Error | null = null

    // Try each image source until one loads successfully
    for (const source of sources) {
      try {
        const img = new Image()
        
        // Set loading attributes
        if (priority) {
          img.loading = 'eager'
        } else {
          img.loading = 'lazy'
        }

        if (sizes) {
          img.sizes = sizes
        }

        // Create promise for image loading
        const imagePromise = new Promise<HTMLImageElement>((resolve, reject) => {
          img.onload = () => resolve(img)
          img.onerror = () => reject(new Error(`Failed to load image: ${source.src}`))
        })

        img.src = source.src
        const loadedImg = await imagePromise

        // Calculate metrics
        const loadTime = performance.now() - imageState.loadStartTime
        const metrics: ImageLoadMetrics = {
          loadTime,
          format: source.type || 'unknown',
          dimensions: {
            width: loadedImg.naturalWidth,
            height: loadedImg.naturalHeight
          },
          fromCache: loadTime < 50, // Heuristic for cache detection
          quality
        }

        setImageState(prev => ({
          ...prev,
          isLoading: false,
          isLoaded: true,
          currentSrc: source.src,
          hasError: false,
          error: null
        }))

        if (enableMetrics && onMetrics) {
          onMetrics(metrics)
        }

        onLoad?.()
        return

      } catch (error) {
        lastError = error as Error
        continue
      }
    }

    // If all sources failed
    setImageState(prev => ({
      ...prev,
      isLoading: false,
      isLoaded: false,
      hasError: true,
      error: lastError
    }))

    if (lastError) {
      onError?.(lastError)
    }
  }, [
    imageState.isLoading,
    imageState.isLoaded,
    imageState.loadStartTime,
    imageSources,
    priority,
    sizes,
    quality,
    enableMetrics,
    onMetrics,
    onLoad,
    onLoadStart,
    onError
  ])

  // Start loading when intersecting or if priority
  useEffect(() => {
    if (priority || isIntersecting) {
      loadImage()
    }
  }, [priority, isIntersecting, loadImage])

  // Get current placeholder source
  const placeholderSrc = placeholder || blurPlaceholder

  // Container styles
  const containerStyles: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#f3f4f6'
  }

  // Image styles with fade transition
  const imageStyles: React.CSSProperties = {
    transition: `opacity ${fadeDuration}ms ease-in-out`,
    opacity: imageState.isLoaded ? 1 : 0
  }

  // Placeholder styles
  const placeholderStyles: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: `opacity ${fadeDuration}ms ease-in-out`,
    opacity: imageState.isLoaded ? 0 : 1,
    filter: enableBlurPlaceholder ? `blur(${blurIntensity}px)` : undefined
  }

  // Loading indicator styles
  const loadingIndicatorStyles: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    opacity: imageState.isLoading ? 1 : 0,
    transition: `opacity ${fadeDuration / 2}ms ease-in-out`
  }

  return (
    <div
      ref={observerRef as React.RefObject<HTMLDivElement>}
      className={`progressive-image-loader ${className}`}
      style={containerStyles}
    >
      {/* Placeholder image */}
      {placeholderSrc && (
        <img
          src={placeholderSrc}
          alt=""
          className={`progressive-placeholder ${placeholderClassName}`}
          style={placeholderStyles}
          aria-hidden="true"
        />
      )}

      {/* Main image */}
      {imageState.currentSrc && (
        <img
          ref={imgRef}
          src={imageState.currentSrc}
          alt={alt}
          className={`progressive-image ${className}`}
          style={imageStyles}
          loading={priority ? 'eager' : 'lazy'}
          sizes={sizes}
        />
      )}

      {/* Loading indicator */}
      {showLoadingIndicator && imageState.isLoading && (
        <div
          className="progressive-loading-indicator"
          style={loadingIndicatorStyles}
          aria-label="Loading image"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="animate-spin"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke={loadingIndicatorColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="60"
              strokeDashoffset="60"
              opacity="0.3"
            />
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke={loadingIndicatorColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="15"
              strokeDashoffset="15"
            />
          </svg>
        </div>
      )}

      {/* Error state */}
      {imageState.hasError && (
        <div
          className="progressive-error-state absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400"
          role="img"
          aria-label={`Failed to load image: ${alt}`}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21,15 16,10 5,21" />
          </svg>
        </div>
      )}

      {/* Screen reader announcement for loading state */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {imageState.isLoading && 'Loading image'}
        {imageState.isLoaded && `Image loaded: ${alt}`}
        {imageState.hasError && `Failed to load image: ${alt}`}
      </div>
    </div>
  )
}

export default ProgressiveImageLoader