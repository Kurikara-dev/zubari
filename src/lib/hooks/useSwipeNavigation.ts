import { useCallback, useRef, useEffect, useMemo } from 'react'
import { useGestureRecognition, GestureType, GestureState } from './useGestureRecognition'

export interface SwipeNavigationOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  swipeThreshold?: number
  swipeVelocity?: number
  enableHorizontalSwipe?: boolean
  enableVerticalSwipe?: boolean
  preventSwipeOnZoom?: boolean
  currentZoom?: number
}

const DEFAULT_OPTIONS: Partial<SwipeNavigationOptions> = {
  swipeThreshold: 50,
  swipeVelocity: 0.3,
  enableHorizontalSwipe: true,
  enableVerticalSwipe: true,
  preventSwipeOnZoom: true,
  currentZoom: 1.0
}

export const useSwipeNavigation = (
  element: HTMLElement | null,
  options: SwipeNavigationOptions = {}
) => {
  const opts = useMemo(() => ({ ...DEFAULT_OPTIONS, ...options }), [options])
  const isSwipingRef = useRef(false)
  const swipeStartTimeRef = useRef(0)
  const lastSwipeDirectionRef = useRef<string | null>(null)

  const handleSwipe = useCallback((gesture: GestureState) => {
    // Prevent swipe when zoomed in
    if (opts.preventSwipeOnZoom && opts.currentZoom && opts.currentZoom > 1.0) {
      return
    }

    // Only process single-touch swipe gestures
    if (gesture.touches.length !== 1) return

    const swipeTypes = [
      GestureType.SWIPE_LEFT,
      GestureType.SWIPE_RIGHT,
      GestureType.SWIPE_UP,
      GestureType.SWIPE_DOWN
    ]

    if (!swipeTypes.includes(gesture.type)) return

    // Prevent multiple swipes in quick succession
    const now = Date.now()
    if (now - swipeStartTimeRef.current < 300) {
      return
    }

    // Check if swipe direction is enabled
    const isHorizontalSwipe = gesture.type === GestureType.SWIPE_LEFT || gesture.type === GestureType.SWIPE_RIGHT
    const isVerticalSwipe = gesture.type === GestureType.SWIPE_UP || gesture.type === GestureType.SWIPE_DOWN

    if (isHorizontalSwipe && !opts.enableHorizontalSwipe) return
    if (isVerticalSwipe && !opts.enableVerticalSwipe) return

    // Validate swipe velocity and distance
    if (gesture.velocity && gesture.distance) {
      const velocityMagnitude = Math.sqrt(
        gesture.velocity.x ** 2 + gesture.velocity.y ** 2
      )
      
      if (
        gesture.distance < (opts.swipeThreshold ?? 50) ||
        velocityMagnitude < (opts.swipeVelocity ?? 0.3)
      ) {
        return
      }
    }

    // Execute swipe callback
    swipeStartTimeRef.current = now
    lastSwipeDirectionRef.current = gesture.type

    switch (gesture.type) {
      case GestureType.SWIPE_LEFT:
        opts.onSwipeLeft?.()
        break
      case GestureType.SWIPE_RIGHT:
        opts.onSwipeRight?.()
        break
      case GestureType.SWIPE_UP:
        opts.onSwipeUp?.()
        break
      case GestureType.SWIPE_DOWN:
        opts.onSwipeDown?.()
        break
    }
  }, [opts])

  const handleGestureStart = useCallback((gesture: GestureState) => {
    if (gesture.active && gesture.touches.length === 1) {
      isSwipingRef.current = false
    }
  }, [])

  const handleGestureEnd = useCallback((gesture: GestureState) => {
    if (!gesture.active) {
      handleSwipe(gesture)
      isSwipingRef.current = false
    }
  }, [handleSwipe])

  const gesture = useGestureRecognition(
    element,
    {
      swipeThreshold: opts.swipeThreshold,
      swipeVelocity: opts.swipeVelocity
    },
    (gestureState) => {
      if (gestureState.active) {
        handleGestureStart(gestureState)
      } else {
        handleGestureEnd(gestureState)
      }
    }
  )

  // Prevent default touch behavior to avoid browser navigation
  useEffect(() => {
    if (!element) return

    const preventDefaults = (e: TouchEvent) => {
      // Allow vertical scrolling when not zoomed
      if (
        opts.preventSwipeOnZoom && 
        opts.currentZoom && 
        opts.currentZoom <= 1.0 &&
        !opts.enableVerticalSwipe
      ) {
        return
      }
      
      // Prevent horizontal browser navigation
      if (opts.enableHorizontalSwipe && e.touches.length === 1) {
        const touch = e.touches[0]
        const startX = touch.clientX
        
        const handleMove = (moveEvent: TouchEvent) => {
          if (moveEvent.touches.length === 1) {
            const moveTouch = moveEvent.touches[0]
            const deltaX = Math.abs(moveTouch.clientX - startX)
            
            // If horizontal movement detected, prevent default
            if (deltaX > 10) {
              moveEvent.preventDefault()
            }
          }
        }
        
        element.addEventListener('touchmove', handleMove, { passive: false })
        
        const handleEnd = () => {
          element.removeEventListener('touchmove', handleMove)
          element.removeEventListener('touchend', handleEnd)
        }
        
        element.addEventListener('touchend', handleEnd, { passive: true })
      }
    }

    element.addEventListener('touchstart', preventDefaults, { passive: true })

    return () => {
      element.removeEventListener('touchstart', preventDefaults)
    }
  }, [element, opts.enableHorizontalSwipe, opts.enableVerticalSwipe, opts.preventSwipeOnZoom, opts.currentZoom])

  return {
    gesture,
    isSwipeActive: gesture.active && gesture.touches.length === 1,
    lastSwipeDirection: lastSwipeDirectionRef.current
  }
}