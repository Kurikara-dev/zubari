'use client'

import React, { forwardRef, useImperativeHandle, useRef, ReactNode } from 'react'
import { usePinchZoom, PinchZoomOptions, PinchZoomState } from '@/lib/hooks/usePinchZoom'
import { useSwipeNavigation, SwipeNavigationOptions } from '@/lib/hooks/useSwipeNavigation'
import { useLongPress, LongPressOptions } from '@/lib/hooks/useLongPress'

export interface GestureHandlerProps {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
  
  // Pinch zoom options
  pinchZoomOptions?: PinchZoomOptions
  onZoomChange?: (state: PinchZoomState) => void
  
  // Swipe navigation options
  swipeOptions?: SwipeNavigationOptions
  
  // Long press options
  longPressOptions?: LongPressOptions
  
  // Enable/disable specific gestures
  enablePinchZoom?: boolean
  enableSwipeNavigation?: boolean
  enableLongPress?: boolean
  
  // Container and image refs for zoom calculations
  imageElement?: HTMLElement | null
}

export interface GestureHandlerRef {
  // Zoom controls
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
  setZoom: (scale: number, position?: { x: number; y: number }) => void
  
  // Zoom state
  getZoomState: () => PinchZoomState
  
  // Long press control
  cancelLongPress: () => void
}

const GestureHandler = forwardRef<GestureHandlerRef, GestureHandlerProps>(({
  children,
  className = '',
  style = {},
  pinchZoomOptions = {},
  onZoomChange,
  swipeOptions = {},
  longPressOptions,
  enablePinchZoom = true,
  enableSwipeNavigation = true,
  enableLongPress = true,
  imageElement
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLElement>(imageElement || null)

  // Update image ref when prop changes
  React.useEffect(() => {
    imageRef.current = imageElement || null
  }, [imageElement])

  // Pinch zoom functionality
  const pinchZoom = usePinchZoom(
    containerRef as React.RefObject<HTMLElement>,
    imageRef as React.RefObject<HTMLElement>,
    enablePinchZoom ? pinchZoomOptions : { ...pinchZoomOptions, minScale: 1, maxScale: 1 },
    onZoomChange
  )

  // Swipe navigation functionality
  useSwipeNavigation(
    enableSwipeNavigation ? containerRef.current : null,
    {
      ...swipeOptions,
      currentZoom: pinchZoom.scale,
      preventSwipeOnZoom: true
    }
  )

  // Long press functionality
  const longPress = useLongPress(
    enableLongPress && longPressOptions ? containerRef.current : null,
    longPressOptions || { onLongPress: () => {} }
  )

  // Expose public API through ref
  useImperativeHandle(ref, () => ({
    zoomIn: pinchZoom.zoomIn,
    zoomOut: pinchZoom.zoomOut,
    resetZoom: pinchZoom.resetZoom,
    setZoom: pinchZoom.setZoom,
    getZoomState: () => ({
      scale: pinchZoom.scale,
      position: pinchZoom.position,
      isZooming: pinchZoom.isZooming
    }),
    cancelLongPress: longPress.cancel
  }), [pinchZoom, longPress])

  // Prevent default browser behaviors
  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const preventDefaults = (e: Event) => {
      e.preventDefault()
    }

    // Prevent context menu on long press
    container.addEventListener('contextmenu', preventDefaults)
    
    // Prevent text selection during gestures
    container.addEventListener('selectstart', preventDefaults)
    
    // Prevent drag and drop
    container.addEventListener('dragstart', preventDefaults)

    return () => {
      container.removeEventListener('contextmenu', preventDefaults)
      container.removeEventListener('selectstart', preventDefaults)
      container.removeEventListener('dragstart', preventDefaults)
    }
  }, [])

  // Apply zoom transform
  const containerStyle: React.CSSProperties = {
    ...style,
    position: 'relative',
    overflow: 'hidden',
    touchAction: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    cursor: pinchZoom.scale > 1 ? 'grab' : 'default'
  }

  // Image transform style
  const imageTransform = `translate(${pinchZoom.position.x}px, ${pinchZoom.position.y}px) scale(${pinchZoom.scale})`
  
  const imageStyle: React.CSSProperties = {
    transform: imageTransform,
    transformOrigin: 'center center',
    transition: pinchZoom.isZooming ? 'none' : 'transform 0.2s ease-out',
    willChange: 'transform'
  }

  // Long press visual feedback
  const longPressOverlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 10
  }

  const longPressIndicatorStyle: React.CSSProperties = {
    position: 'absolute',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    border: '3px solid rgba(0, 0, 0, 0.2)',
    transform: 'translate(-50%, -50%)',
    opacity: longPress.progress > 0 ? 1 : 0,
    transition: 'opacity 0.1s ease-in-out',
    left: longPress.position?.x || 0,
    top: longPress.position?.y || 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }

  const longPressProgressStyle: React.CSSProperties = {
    width: `${longPress.progress * 40}px`,
    height: `${longPress.progress * 40}px`,
    borderRadius: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    transition: 'width 0.02s linear, height 0.02s linear'
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={containerStyle}
    >
      {/* Apply transform to children if they contain images */}
      <div style={imageStyle}>
        {children}
      </div>
      
      {/* Long press visual feedback */}
      {enableLongPress && longPressOptions && (
        <div style={longPressOverlayStyle}>
          <div style={longPressIndicatorStyle}>
            <div style={longPressProgressStyle} />
          </div>
        </div>
      )}
    </div>
  )
})

GestureHandler.displayName = 'GestureHandler'

export default GestureHandler