import { useRef, useCallback, useEffect, useState } from 'react'
import { useGestureRecognition, GestureType, GestureState } from './useGestureRecognition'

export interface PinchZoomState {
  scale: number
  position: { x: number; y: number }
  isZooming: boolean
}

export interface PinchZoomOptions {
  minScale?: number
  maxScale?: number
  initialScale?: number
  initialPosition?: { x: number; y: number }
  enableBoundaryConstraints?: boolean
  enableDoubleTapZoom?: boolean
  doubleTapZoomLevels?: number[]
}

const DEFAULT_OPTIONS: Required<PinchZoomOptions> = {
  minScale: 0.1,
  maxScale: 5.0,
  initialScale: 1.0,
  initialPosition: { x: 0, y: 0 },
  enableBoundaryConstraints: true,
  enableDoubleTapZoom: true,
  doubleTapZoomLevels: [1.0, 2.0, 4.0]
}

export const usePinchZoom = (
  containerRef: React.RefObject<HTMLElement>,
  imageRef: React.RefObject<HTMLElement>,
  options: PinchZoomOptions = {},
  onZoomChange?: (state: PinchZoomState) => void
) => {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  
  const [state, setState] = useState<PinchZoomState>({
    scale: opts.initialScale,
    position: { ...opts.initialPosition },
    isZooming: false
  })

  const stateRef = useRef(state)
  const lastScaleRef = useRef(opts.initialScale)
  const lastPositionRef = useRef({ ...opts.initialPosition })
  const gestureStartScaleRef = useRef(opts.initialScale)
  const gestureStartPositionRef = useRef({ ...opts.initialPosition })
  const pinchCenterRef = useRef({ x: 0, y: 0 })
  const currentZoomLevelRef = useRef(0)

  useEffect(() => {
    stateRef.current = state
    onZoomChange?.(state)
  }, [state, onZoomChange])

  const constrainScale = useCallback((scale: number): number => {
    return Math.max(opts.minScale, Math.min(opts.maxScale, scale))
  }, [opts.minScale, opts.maxScale])

  const getImageBounds = useCallback(() => {
    if (!containerRef.current || !imageRef.current) {
      return { container: null, image: null }
    }

    const containerRect = containerRef.current.getBoundingClientRect()
    const imageRect = imageRef.current.getBoundingClientRect()

    return {
      container: {
        width: containerRect.width,
        height: containerRect.height,
        centerX: containerRect.width / 2,
        centerY: containerRect.height / 2
      },
      image: {
        width: imageRect.width,
        height: imageRect.height,
        naturalWidth: (imageRef.current as HTMLImageElement).naturalWidth || imageRect.width,
        naturalHeight: (imageRef.current as HTMLImageElement).naturalHeight || imageRect.height
      }
    }
  }, [containerRef, imageRef])

  const constrainPosition = useCallback((position: { x: number; y: number }, scale: number): { x: number; y: number } => {
    if (!opts.enableBoundaryConstraints) return position

    const bounds = getImageBounds()
    if (!bounds.container || !bounds.image) return position

    const scaledWidth = bounds.image.naturalWidth * scale
    const scaledHeight = bounds.image.naturalHeight * scale

    let { x, y } = position

    if (scaledWidth <= bounds.container.width) {
      x = 0
    } else {
      const maxX = (scaledWidth - bounds.container.width) / 2
      x = Math.max(-maxX, Math.min(maxX, x))
    }

    if (scaledHeight <= bounds.container.height) {
      y = 0
    } else {
      const maxY = (scaledHeight - bounds.container.height) / 2
      y = Math.max(-maxY, Math.min(maxY, y))
    }

    return { x, y }
  }, [opts.enableBoundaryConstraints, getImageBounds])

  const updateZoom = useCallback((scale: number, focalPoint?: { x: number; y: number }) => {
    const newScale = constrainScale(scale)
    
    let newPosition = { ...stateRef.current.position }
    
    if (focalPoint && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect()
      const focalX = focalPoint.x - containerRect.left - containerRect.width / 2
      const focalY = focalPoint.y - containerRect.top - containerRect.height / 2
      
      const scaleRatio = newScale / stateRef.current.scale
      
      newPosition = {
        x: focalX - (focalX - stateRef.current.position.x) * scaleRatio,
        y: focalY - (focalY - stateRef.current.position.y) * scaleRatio
      }
    }
    
    newPosition = constrainPosition(newPosition, newScale)
    
    setState({
      scale: newScale,
      position: newPosition,
      isZooming: false
    })
  }, [constrainScale, constrainPosition, containerRef])

  const handleDoubleTap = useCallback((gesture: GestureState) => {
    if (!opts.enableDoubleTapZoom || gesture.touches.length !== 1) return

    const touch = gesture.touches[0]
    const currentScale = stateRef.current.scale
    const zoomLevels = opts.doubleTapZoomLevels
    
    // Find next zoom level
    let nextIndex = currentZoomLevelRef.current + 1
    if (nextIndex >= zoomLevels.length || currentScale >= zoomLevels[zoomLevels.length - 1]) {
      nextIndex = 0
    }
    
    currentZoomLevelRef.current = nextIndex
    const nextScale = zoomLevels[nextIndex]
    
    updateZoom(nextScale, { x: touch.currentX, y: touch.currentY })
  }, [opts.enableDoubleTapZoom, opts.doubleTapZoomLevels, updateZoom])

  const handlePinch = useCallback((gesture: GestureState) => {
    if (gesture.touches.length !== 2 || gesture.scale === undefined) return

    if (!gesture.active) {
      // Pinch ended
      lastScaleRef.current = stateRef.current.scale
      lastPositionRef.current = { ...stateRef.current.position }
      setState(prev => ({ ...prev, isZooming: false }))
      return
    }

    if (stateRef.current.isZooming === false) {
      // Pinch started
      gestureStartScaleRef.current = stateRef.current.scale
      gestureStartPositionRef.current = { ...stateRef.current.position }
      
      // Calculate pinch center
      const touch1 = gesture.touches[0]
      const touch2 = gesture.touches[1]
      pinchCenterRef.current = {
        x: (touch1.currentX + touch2.currentX) / 2,
        y: (touch1.currentY + touch2.currentY) / 2
      }
    }

    const newScale = constrainScale(gestureStartScaleRef.current * gesture.scale)
    let newPosition = { ...gestureStartPositionRef.current }

    // Zoom around pinch center
    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect()
      const centerX = pinchCenterRef.current.x - containerRect.left - containerRect.width / 2
      const centerY = pinchCenterRef.current.y - containerRect.top - containerRect.height / 2
      
      const scaleRatio = newScale / gestureStartScaleRef.current
      
      newPosition = {
        x: centerX - (centerX - gestureStartPositionRef.current.x) * scaleRatio,
        y: centerY - (centerY - gestureStartPositionRef.current.y) * scaleRatio
      }
    }

    newPosition = constrainPosition(newPosition, newScale)

    setState({
      scale: newScale,
      position: newPosition,
      isZooming: true
    })
  }, [constrainScale, constrainPosition, containerRef])

  const handlePan = useCallback((gesture: GestureState) => {
    if (gesture.touches.length !== 1 || !gesture.deltaX || !gesture.deltaY) return
    if (stateRef.current.scale <= 1.0) return // Only allow pan when zoomed in

    if (!gesture.active) {
      lastPositionRef.current = { ...stateRef.current.position }
      return
    }

    const newPosition = constrainPosition({
      x: lastPositionRef.current.x + gesture.deltaX,
      y: lastPositionRef.current.y + gesture.deltaY
    }, stateRef.current.scale)

    setState(prev => ({
      ...prev,
      position: newPosition
    }))
  }, [constrainPosition])

  const handleGesture = useCallback((gesture: GestureState) => {
    switch (gesture.type) {
      case GestureType.DOUBLE_TAP:
        handleDoubleTap(gesture)
        break
      case GestureType.PINCH:
        handlePinch(gesture)
        break
      case GestureType.PAN:
        handlePan(gesture)
        break
    }
  }, [handleDoubleTap, handlePinch, handlePan])

  const gesture = useGestureRecognition(containerRef.current, {}, handleGesture)

  // Public API methods
  const zoomIn = useCallback(() => {
    updateZoom(stateRef.current.scale + 0.5)
  }, [updateZoom])

  const zoomOut = useCallback(() => {
    updateZoom(stateRef.current.scale - 0.5)
  }, [updateZoom])

  const resetZoom = useCallback(() => {
    setState({
      scale: 1.0,
      position: { x: 0, y: 0 },
      isZooming: false
    })
    currentZoomLevelRef.current = 0
  }, [])

  const setZoom = useCallback((scale: number, position?: { x: number; y: number }) => {
    const newScale = constrainScale(scale)
    const newPosition = position ? constrainPosition(position, newScale) : stateRef.current.position
    
    setState({
      scale: newScale,
      position: newPosition,
      isZooming: false
    })
  }, [constrainScale, constrainPosition])

  return {
    ...state,
    gesture,
    zoomIn,
    zoomOut,
    resetZoom,
    setZoom,
    updateZoom
  }
}