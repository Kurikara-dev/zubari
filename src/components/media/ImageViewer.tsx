'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { ZoomControls } from './ZoomControls'
import GestureHandler, { GestureHandlerRef } from './GestureHandler'
import TouchFeedback from './TouchFeedback'
// import { imagePerformanceMonitor } from '@/lib/utils/imageOptimization'

interface ImageViewerProps {
  src: string
  alt: string
  onZoomChange?: (scale: number) => void
  initialScale?: number
  maxScale?: number
  minScale?: number
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onLongPress?: (position: { x: number; y: number }) => void
  enableGestures?: boolean
  // Optimization options
  priority?: boolean
  thumbnailSrc?: string  // Progressive loading with thumbnail first
  quality?: number
  showPerformanceMetrics?: boolean
  enableProgressiveLoading?: boolean
  // Accessibility options
  enableKeyboardNavigation?: boolean
  announceZoomChanges?: boolean
  describedBy?: string
}

interface ImageViewerState {
  isLoading: boolean
  hasError: boolean
  naturalDimensions: { width: number; height: number }
  showContextMenu: boolean
  contextMenuPosition: { x: number; y: number } | null
  // Progressive loading states
  thumbnailLoaded: boolean
  fullImageLoaded: boolean
  currentSrc: string
  loadTime: number
}

const ZOOM_STEP = 0.1
const DEFAULT_MIN_SCALE = 0.1
const DEFAULT_MAX_SCALE = 5.0

export function ImageViewer({
  src,
  alt,
  onZoomChange,
  initialScale = 1.0,
  maxScale = DEFAULT_MAX_SCALE,
  minScale = DEFAULT_MIN_SCALE,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onLongPress,
  enableGestures = true,
  priority = false,
  thumbnailSrc,
  quality = 90,
  showPerformanceMetrics = false,
  enableProgressiveLoading = true,
  enableKeyboardNavigation: _enableKeyboardNavigation = true, // eslint-disable-line @typescript-eslint/no-unused-vars -- Reserved for accessibility features
  announceZoomChanges: _announceZoomChanges = true, // eslint-disable-line @typescript-eslint/no-unused-vars -- Reserved for accessibility features
  describedBy: _describedBy // eslint-disable-line @typescript-eslint/no-unused-vars -- Reserved for accessibility features
}: ImageViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const gestureHandlerRef = useRef<GestureHandlerRef>(null)
  
  const [state, setState] = useState<ImageViewerState>({
    isLoading: true,
    hasError: false,
    naturalDimensions: { width: 0, height: 0 },
    showContextMenu: false,
    contextMenuPosition: null,
    thumbnailLoaded: false,
    fullImageLoaded: false,
    currentSrc: thumbnailSrc || src,
    loadTime: 0
  })

  const startTime = useRef(performance.now())

  // Progressive loading effect
  useEffect(() => {
    if (enableProgressiveLoading && thumbnailSrc && !state.thumbnailLoaded) {
      // Load thumbnail first
      setState(prev => ({ ...prev, currentSrc: thumbnailSrc }))
    }
  }, [enableProgressiveLoading, thumbnailSrc, state.thumbnailLoaded])

  // Handle image load
  const handleImageLoad = useCallback(() => {
    const img = imageRef.current
    if (img) {
      const loadTime = performance.now() - startTime.current
      const isLoadingThumbnail = state.currentSrc === thumbnailSrc
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        hasError: false,
        naturalDimensions: { width: img.naturalWidth, height: img.naturalHeight },
        loadTime,
        thumbnailLoaded: isLoadingThumbnail ? true : prev.thumbnailLoaded,
        fullImageLoaded: !isLoadingThumbnail ? true : prev.fullImageLoaded
      }))

      // Temporarily disabled for Phase 1
      // if (showPerformanceMetrics) {
      //   imagePerformanceMonitor.trackImageLoad(
      //     `${alt}-${isLoadingThumbnail ? 'thumbnail' : 'full'}`,
      //     startTime.current
      //   )
      // }

      // If thumbnail loaded and we have progressive loading, load full image
      if (isLoadingThumbnail && enableProgressiveLoading && src !== thumbnailSrc) {
        setTimeout(() => {
          setState(prev => ({ 
            ...prev, 
            currentSrc: src,
            isLoading: true
          }))
        }, 100) // Small delay to show thumbnail
      }
    }
  }, [state.currentSrc, thumbnailSrc, enableProgressiveLoading, src])

  // Handle image error
  const handleImageError = useCallback(() => {
    const isLoadingThumbnail = state.currentSrc === thumbnailSrc
    
    if (isLoadingThumbnail && src !== thumbnailSrc) {
      // Thumbnail failed, try full image
      console.warn(`Thumbnail failed for ${alt}, loading full image`)
      setState(prev => ({
        ...prev,
        currentSrc: src,
        isLoading: true,
        hasError: false
      }))
    } else {
      // Full image failed
      setState(prev => ({
        ...prev,
        isLoading: false,
        hasError: true
      }))
    }
  }, [state.currentSrc, thumbnailSrc, src, alt])

  // Context menu functionality
  const handleLongPress = useCallback((position: { x: number; y: number }) => {
    setState(prev => ({
      ...prev,
      showContextMenu: true,
      contextMenuPosition: position
    }))
    onLongPress?.(position)
  }, [onLongPress])

  const hideContextMenu = useCallback(() => {
    setState(prev => ({
      ...prev,
      showContextMenu: false,
      contextMenuPosition: null
    }))
  }, [])

  // Zoom control methods for external access
  const zoomIn = useCallback(() => {
    gestureHandlerRef.current?.zoomIn()
  }, [])

  const zoomOut = useCallback(() => {
    gestureHandlerRef.current?.zoomOut()
  }, [])

  const resetZoom = useCallback(() => {
    gestureHandlerRef.current?.resetZoom()
    hideContextMenu()
  }, [hideContextMenu])

  const fitToContainer = useCallback(() => {
    const container = containerRef.current
    const img = imageRef.current
    if (!container || !img || !state.naturalDimensions.width) return

    const containerRect = container.getBoundingClientRect()
    const scaleX = containerRect.width / state.naturalDimensions.width
    const scaleY = containerRect.height / state.naturalDimensions.height
    const fitScale = Math.min(scaleX, scaleY, 1.0)
    
    gestureHandlerRef.current?.setZoom(fitScale, { x: 0, y: 0 })
  }, [state.naturalDimensions])

  // Mouse wheel zoom (still supported for desktop)
  const handleWheel = useCallback((event: React.WheelEvent) => {
    if (!enableGestures) return
    event.preventDefault()
    const currentZoom = gestureHandlerRef.current?.getZoomState()?.scale || 1.0
    const delta = event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
    gestureHandlerRef.current?.setZoom(currentZoom + delta)
  }, [enableGestures])

  // Zoom change handler
  const handleZoomChange = useCallback((zoomState: { scale: number }) => {
    onZoomChange?.(zoomState.scale)
  }, [onZoomChange])

  // Keyboard zoom controls
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case '+':
        case '=':
          event.preventDefault()
          zoomIn()
          break
        case '-':
          event.preventDefault()
          zoomOut()
          break
        case '0':
          event.preventDefault()
          resetZoom()
          break
        case 'Escape':
          event.preventDefault()
          hideContextMenu()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [zoomIn, zoomOut, resetZoom, hideContextMenu])

  // Hide context menu on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (state.showContextMenu) {
        hideContextMenu()
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [state.showContextMenu, hideContextMenu])

  const currentZoomState = gestureHandlerRef.current?.getZoomState()
  const currentScale = currentZoomState?.scale || 1.0

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden"
      onWheel={handleWheel}
    >
      {/* Loading spinner */}
      {state.isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      )}

      {/* Error state */}
      {state.hasError && (
        <div className="absolute inset-0 flex items-center justify-center text-white">
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-gray-400">Failed to load image</p>
          </div>
        </div>
      )}

      {/* Gesture-enabled Image */}
      {enableGestures ? (
        <GestureHandler
          ref={gestureHandlerRef}
          className="w-full h-full flex items-center justify-center"
          pinchZoomOptions={{
            minScale,
            maxScale,
            initialScale,
            enableDoubleTapZoom: true,
            doubleTapZoomLevels: [1.0, 2.0, 4.0]
          }}
          onZoomChange={handleZoomChange}
          swipeOptions={{
            onSwipeLeft,
            onSwipeRight,
            onSwipeUp,
            onSwipeDown,
            swipeThreshold: 50,
            swipeVelocity: 0.3
          }}
          longPressOptions={{
            onLongPress: handleLongPress,
            delay: 500,
            enableHapticFeedback: true,
            enableVisualFeedback: true
          }}
          imageElement={imageRef.current}
        >
          <TouchFeedback
            enableRipple={true}
            isLoading={state.isLoading}
            hasError={state.hasError}
            errorMessage="Failed to load image"
          >
            <Image
              ref={imageRef}
              src={state.currentSrc}
              alt={alt}
              fill
              priority={priority}
              quality={quality}
              className="max-w-none select-none object-contain"
              onLoad={handleImageLoad}
              onError={handleImageError}
              draggable={false}
              sizes="100vw"
              style={{
                maxWidth: 'none',
                maxHeight: 'none'
              }}
            />
          </TouchFeedback>
        </GestureHandler>
      ) : (
        /* Fallback for disabled gestures */
        <TouchFeedback
          enableRipple={false}
          isLoading={state.isLoading}
          hasError={state.hasError}
          errorMessage="Failed to load image"
        >
          <Image
            ref={imageRef}
            src={state.currentSrc}
            alt={alt}
            fill
            priority={priority}
            quality={quality}
            className="max-w-none select-none object-contain"
            onLoad={handleImageLoad}
            onError={handleImageError}
            draggable={false}
            sizes="100vw"
            style={{
              maxWidth: '100%',
              maxHeight: '100%'
            }}
          />
        </TouchFeedback>
      )}

      {/* Performance metrics overlay */}
      {showPerformanceMetrics && state.loadTime > 0 && (
        <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white text-xs px-3 py-2 rounded-lg">
          <div>Load: {Math.round(state.loadTime)}ms</div>
          <div>Status: {state.thumbnailLoaded ? 'Thumbnail' : ''} {state.fullImageLoaded ? 'Full' : ''}</div>
          <div>Dims: {state.naturalDimensions.width}×{state.naturalDimensions.height}</div>
        </div>
      )}

      {/* Progressive loading indicator */}
      {enableProgressiveLoading && state.thumbnailLoaded && !state.fullImageLoaded && (
        <div className="absolute top-4 right-4 bg-blue-500 text-white text-xs px-2 py-1 rounded">
          Loading full quality...
        </div>
      )}

      {/* Zoom controls */}
      <ZoomControls
        scale={currentScale}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onReset={resetZoom}
        onFit={fitToContainer}
        minScale={minScale}
        maxScale={maxScale}
      />

      {/* Context Menu */}
      {state.showContextMenu && state.contextMenuPosition && (
        <div
          className="absolute bg-white rounded-lg shadow-lg border py-2 z-50"
          style={{
            left: state.contextMenuPosition.x,
            top: state.contextMenuPosition.y,
            transform: 'translate(-50%, -100%)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => {
              resetZoom()
              hideContextMenu()
            }}
          >
            Reset Zoom
          </button>
          <button
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => {
              fitToContainer()
              hideContextMenu()
            }}
          >
            Fit to Screen
          </button>
          <hr className="my-1" />
          <button
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={hideContextMenu}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}