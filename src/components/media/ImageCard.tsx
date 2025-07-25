'use client'

import { useState, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { Media } from '@/lib/types/api'
import { useImageLazyLoading, intersectionObserverMetrics } from '@/lib/hooks/useIntersectionObserver'

// Temporary enum for thumbnail sizes (will be moved to separate types file)
enum ThumbnailSize {
  SMALL = 'small',
  MEDIUM = 'medium', 
  LARGE = 'large'
}

interface ImageCardProps {
  media: Media
  onClick?: (media: Media) => void
  // Performance and optimization options
  thumbnailSize?: ThumbnailSize
  enableLazyLoading?: boolean
  preloadOnHover?: boolean
  showPerformanceMetrics?: boolean
  enableProgressiveLoading?: boolean
  // Lazy loading options
  rootMargin?: string
  priority?: boolean
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export default function ImageCard({ 
  media, 
  onClick,
  thumbnailSize = ThumbnailSize.SMALL,
  enableLazyLoading = true,
  preloadOnHover = false,
  showPerformanceMetrics = false,
  enableProgressiveLoading = false,
  rootMargin = '100px',
  priority = false
}: ImageCardProps) {
  const [fullImagePreloaded, setFullImagePreloaded] = useState(false)
  const [performanceMetrics, setPerformanceMetrics] = useState<{
    loadTime?: number
    transferSize?: number
  }>({})
  const [loadStartTime, setLoadStartTime] = useState<number>(0)
  const [progressiveStage, setProgressiveStage] = useState<'none' | 'low' | 'high'>('none')
  
  // Generate URLs
  const lowQualityUrl = `/api/media/thumbnail?id=${media.id}&size=small&q=20`; // Low quality for progressive loading
  const thumbnailUrl = `/api/media/thumbnail?id=${media.id}&size=${thumbnailSize}`
  const fullImageUrl = `/api/media/download?id=${media.id}`
  
  // Use intersection observer for lazy loading
  const [lazyRef, lazyState] = useImageLazyLoading(
    enableLazyLoading ? 
      (enableProgressiveLoading && progressiveStage === 'none' ? lowQualityUrl : thumbnailUrl) 
      : fullImageUrl,
    {
      rootMargin,
      triggerOnce: true,
      skip: !enableLazyLoading,
      onStartLoading: () => {
        const startTime = intersectionObserverMetrics.trackLazyLoadStart(media.id);
        setLoadStartTime(startTime);
        if (enableProgressiveLoading && progressiveStage === 'none') {
          setProgressiveStage('low');
        }
      },
      onLoad: () => {
        if (loadStartTime > 0) {
          const loadTime = intersectionObserverMetrics.trackLazyLoadComplete(media.id, loadStartTime);
          setPerformanceMetrics(prev => ({ ...prev, loadTime }));
        }
        
        // If progressive loading is enabled and we just loaded low quality, load high quality
        if (enableProgressiveLoading && progressiveStage === 'low') {
          setTimeout(() => {
            setProgressiveStage('high');
            // Trigger high quality load
            const img = new window.Image();
            img.onload = () => {
              // High quality image loaded, trigger re-render
              setProgressiveStage('high');
            };
            img.src = thumbnailUrl;
          }, 100); // Small delay to avoid jarring transitions
        }
      },
      onError: (error) => {
        console.warn(`Failed to load image for ${media.id}:`, error);
      }
    }
  );
  
  const uploadedDate = new Date(media.uploaded_at)
  const formattedDate = format(uploadedDate, 'yyyy/MM/dd', { locale: ja })
  const formattedSize = formatFileSize(media.file_size)
  
  // Determine which image to show based on progressive loading stage
  const imageUrl = useMemo(() => {
    if (!lazyState.shouldLoad) return undefined;
    
    if (enableProgressiveLoading) {
      switch (progressiveStage) {
        case 'low':
          return lowQualityUrl;
        case 'high':
          return thumbnailUrl;
        default:
          return undefined;
      }
    }
    
    return lazyState.src;
  }, [lazyState.shouldLoad, enableProgressiveLoading, progressiveStage, lowQualityUrl, thumbnailUrl, lazyState.src]);

  // Preload full image on hover
  const handleMouseEnter = useCallback(() => {
    if (preloadOnHover && !fullImagePreloaded && lazyState.shouldLoad) {
      const img = new window.Image()
      img.onload = () => setFullImagePreloaded(true)
      img.onerror = () => console.warn(`Failed to preload full image for ${media.id}`)
      img.src = fullImageUrl
    }
  }, [preloadOnHover, fullImagePreloaded, lazyState.shouldLoad, fullImageUrl, media.id])

  const handleClick = useCallback(() => {
    if (onClick) {
      onClick(media)
    }
  }, [onClick, media])

  const handleImageLoad = useCallback(() => {
    // Additional performance tracking when Next.js Image component loads
    if (showPerformanceMetrics && loadStartTime > 0) {
      const loadTime = performance.now() - loadStartTime
      setPerformanceMetrics(prev => ({ ...prev, loadTime }))
    }
  }, [showPerformanceMetrics, loadStartTime])

  const handleImageError = useCallback(() => {
    console.warn(`Image load failed for ${media.id}, falling back`)
    // Error state is handled by lazyState.error
  }, [media.id])

  return (
    <div 
      ref={enableLazyLoading ? lazyRef as React.RefObject<HTMLDivElement> : undefined}
      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`画像を表示: ${media.file_name} (${formattedSize}, ${formattedDate})`}
      data-testid="image-card"
    >
      {/* Image Container */}
      <div className="relative aspect-square bg-gray-100">
        {/* Loading state */}
        {lazyState.isLoading && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            </div>
          </div>
        )}

        {/* Lazy loading placeholder */}
        {enableLazyLoading && !lazyState.hasEntered && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
            <svg 
              className="w-8 h-8 text-gray-300" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" 
              />
            </svg>
          </div>
        )}
        
        {/* Error state */}
        {lazyState.error && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50">
            <div className="text-center">
              <svg 
                className="w-8 h-8 text-red-400 mx-auto mb-2" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5} 
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" 
                />
              </svg>
              <p className="text-xs text-red-600">Load failed</p>
            </div>
          </div>
        )}

        {/* Image */}
        {imageUrl && !lazyState.error && (
          <Image
            src={imageUrl}
            alt={media.file_name}
            fill
            priority={priority}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 16vw"
            className={`object-cover transition-all duration-300 ${
              enableProgressiveLoading && progressiveStage === 'low' 
                ? 'filter blur-sm opacity-80' 
                : 'filter-none opacity-100'
            }`}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        )}

        {/* Performance metrics overlay (dev mode) */}
        {showPerformanceMetrics && performanceMetrics.loadTime && (
          <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
            {Math.round(performanceMetrics.loadTime)}ms
          </div>
        )}

        {/* Progressive loading indicator */}
        {enableProgressiveLoading && progressiveStage !== 'none' && (
          <div className="absolute bottom-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
            {progressiveStage === 'low' ? 'Loading...' : 'Progressive'}
          </div>
        )}
        
        {/* Lazy loading indicator */}
        {enableLazyLoading && !enableProgressiveLoading && lazyState.shouldLoad && (
          <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
            Lazy
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="p-3">
        <h3 
          className="text-sm font-medium text-gray-900 truncate mb-1" 
          title={media.file_name}
        >
          {media.file_name}
        </h3>
        
        <div className="text-xs text-gray-500 space-y-0.5">
          <div>{formattedDate}</div>
          <div>{formattedSize}</div>
        </div>
      </div>
    </div>
  )
}