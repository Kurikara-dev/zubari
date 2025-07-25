import { useRef, useCallback, useEffect, useState } from 'react'

export enum GestureType {
  IDLE = 'IDLE',
  TAP = 'TAP',
  DOUBLE_TAP = 'DOUBLE_TAP',
  LONG_PRESS = 'LONG_PRESS',
  SWIPE_LEFT = 'SWIPE_LEFT',
  SWIPE_RIGHT = 'SWIPE_RIGHT',
  SWIPE_UP = 'SWIPE_UP',
  SWIPE_DOWN = 'SWIPE_DOWN',
  PINCH = 'PINCH',
  PAN = 'PAN',
  UNKNOWN = 'UNKNOWN'
}

export interface TouchPoint {
  id: number
  startX: number
  startY: number
  currentX: number
  currentY: number
  timestamp: number
}

export interface GestureState {
  type: GestureType
  active: boolean
  touches: TouchPoint[]
  scale?: number
  deltaX?: number
  deltaY?: number
  velocity?: { x: number; y: number }
  distance?: number
}

export interface GestureOptions {
  swipeThreshold?: number // Minimum distance for swipe (pixels)
  swipeVelocity?: number // Minimum velocity for swipe
  longPressDelay?: number // Delay for long press (ms)
  doubleTapDelay?: number // Max delay between taps for double tap (ms)
  pinchThreshold?: number // Minimum scale change for pinch
}

const DEFAULT_OPTIONS: Required<GestureOptions> = {
  swipeThreshold: 50,
  swipeVelocity: 0.3,
  longPressDelay: 500,
  doubleTapDelay: 300,
  pinchThreshold: 0.1
}

export const useGestureRecognition = (
  element: HTMLElement | null,
  options: GestureOptions = {},
  onGesture?: (gesture: GestureState) => void
) => {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const [gesture, setGesture] = useState<GestureState>({
    type: GestureType.IDLE,
    active: false,
    touches: []
  })

  const touchesRef = useRef<Map<number, TouchPoint>>(new Map())
  const gestureRef = useRef<GestureState>(gesture)
  const lastTapRef = useRef<number>(0)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    gestureRef.current = gesture
  }, [gesture])

  const getDistance = useCallback((p1: TouchPoint, p2: TouchPoint): number => {
    const dx = p1.currentX - p2.currentX
    const dy = p1.currentY - p2.currentY
    return Math.sqrt(dx * dx + dy * dy)
  }, [])

  const classifyGesture = useCallback((touches: TouchPoint[]): GestureType => {
    if (touches.length === 0) return GestureType.IDLE
    if (touches.length === 1) {
      const touch = touches[0]
      const deltaX = touch.currentX - touch.startX
      const deltaY = touch.currentY - touch.startY
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      const duration = Date.now() - touch.timestamp

      if (distance < 10 && duration < 200) {
        return GestureType.TAP
      }

      if (distance > opts.swipeThreshold && duration < 500) {
        const absX = Math.abs(deltaX)
        const absY = Math.abs(deltaY)
        if (absX > absY) {
          return deltaX > 0 ? GestureType.SWIPE_RIGHT : GestureType.SWIPE_LEFT
        } else {
          return deltaY > 0 ? GestureType.SWIPE_DOWN : GestureType.SWIPE_UP
        }
      }

      if (distance > 10) {
        return GestureType.PAN
      }
    }

    if (touches.length === 2) {
      return GestureType.PINCH
    }

    return GestureType.UNKNOWN
  }, [opts.swipeThreshold])

  const updateGesture = useCallback((update: Partial<GestureState>) => {
    const newGesture = { ...gestureRef.current, ...update }
    setGesture(newGesture)
    onGesture?.(newGesture)
  }, [onGesture])

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const newTouches = new Map(touchesRef.current)
    
    Array.from(e.changedTouches).forEach(touch => {
      const point: TouchPoint = {
        id: touch.identifier,
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        currentY: touch.clientY,
        timestamp: Date.now()
      }
      newTouches.set(touch.identifier, point)
    })

    touchesRef.current = newTouches
    const touchArray = Array.from(newTouches.values())

    // Check for double tap
    if (touchArray.length === 1) {
      const now = Date.now()
      if (now - lastTapRef.current < opts.doubleTapDelay) {
        updateGesture({
          type: GestureType.DOUBLE_TAP,
          active: false,
          touches: touchArray
        })
        lastTapRef.current = 0
        return
      }
      lastTapRef.current = now

      // Start long press timer
      if (longPressTimerRef.current) {
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
      }
      longPressTimerRef.current = setTimeout(() => {
        if (touchesRef.current.size === 1) {
          updateGesture({
            type: GestureType.LONG_PRESS,
            active: true,
            touches: Array.from(touchesRef.current.values())
          })
        }
      }, opts.longPressDelay)
    }

    updateGesture({
      type: GestureType.IDLE,
      active: true,
      touches: touchArray
    })
  }, [opts.doubleTapDelay, opts.longPressDelay, updateGesture])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (longPressTimerRef.current) {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
    }

    const newTouches = new Map(touchesRef.current)
    
    Array.from(e.changedTouches).forEach(touch => {
      const existing = newTouches.get(touch.identifier)
      if (existing) {
        existing.currentX = touch.clientX
        existing.currentY = touch.clientY
      }
    })

    touchesRef.current = newTouches
    const touchArray = Array.from(newTouches.values())

    if (animationFrameRef.current) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      const gestureType = classifyGesture(touchArray)
      const update: Partial<GestureState> = {
        type: gestureType,
        active: true,
        touches: touchArray
      }

      if (touchArray.length === 1) {
        const touch = touchArray[0]
        update.deltaX = touch.currentX - touch.startX
        update.deltaY = touch.currentY - touch.startY
        update.distance = Math.sqrt(update.deltaX! ** 2 + update.deltaY! ** 2)
        
        const duration = (Date.now() - touch.timestamp) / 1000
        if (duration > 0) {
          update.velocity = {
            x: update.deltaX! / duration,
            y: update.deltaY! / duration
          }
        }
      } else if (touchArray.length === 2 && gestureType === GestureType.PINCH) {
        const initialDistance = getDistance(
          { ...touchArray[0], currentX: touchArray[0].startX, currentY: touchArray[0].startY },
          { ...touchArray[1], currentX: touchArray[1].startX, currentY: touchArray[1].startY }
        )
        const currentDistance = getDistance(touchArray[0], touchArray[1])
        update.scale = currentDistance / initialDistance
      }

      updateGesture(update)
    })
  }, [classifyGesture, getDistance, updateGesture])

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (longPressTimerRef.current) {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
    }

    const newTouches = new Map(touchesRef.current)
    
    Array.from(e.changedTouches).forEach(touch => {
      newTouches.delete(touch.identifier)
    })

    const touchArray = Array.from(touchesRef.current.values())
    const endedTouchArray = Array.from(e.changedTouches).map(touch => {
      const existing = touchesRef.current.get(touch.identifier)
      return existing || {
        id: touch.identifier,
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        currentY: touch.clientY,
        timestamp: Date.now()
      }
    })

    const finalGestureType = classifyGesture(endedTouchArray)
    
    updateGesture({
      type: finalGestureType,
      active: false,
      touches: touchArray
    })

    touchesRef.current = newTouches

    if (newTouches.size === 0) {
      setTimeout(() => {
        updateGesture({
          type: GestureType.IDLE,
          active: false,
          touches: []
        })
      }, 50)
    }
  }, [classifyGesture, updateGesture])

  const handleTouchCancel = useCallback(() => {
    if (longPressTimerRef.current) {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
    }
    if (animationFrameRef.current) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
    
    touchesRef.current.clear()
    updateGesture({
      type: GestureType.IDLE,
      active: false,
      touches: []
    })
  }, [updateGesture])

  useEffect(() => {
    if (!element) return

    element.addEventListener('touchstart', handleTouchStart, { passive: false })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd, { passive: false })
    element.addEventListener('touchcancel', handleTouchCancel, { passive: false })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
      element.removeEventListener('touchcancel', handleTouchCancel)
      
      if (longPressTimerRef.current) {
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
      }
      if (animationFrameRef.current) {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [element, handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel])

  return gesture
}