import { useCallback, useRef, useState, useMemo } from 'react'
import { useGestureRecognition, GestureType, GestureState } from './useGestureRecognition'

export interface LongPressOptions {
  onLongPress: (event: { x: number; y: number }) => void
  onLongPressEnd?: () => void
  delay?: number
  threshold?: number // Movement threshold to cancel long press
  enableHapticFeedback?: boolean
  enableVisualFeedback?: boolean
}

export interface LongPressState {
  isLongPressing: boolean
  progress: number // Progress from 0 to 1
  position: { x: number; y: number } | null
}

const DEFAULT_OPTIONS: Partial<LongPressOptions> = {
  delay: 500,
  threshold: 10,
  enableHapticFeedback: true,
  enableVisualFeedback: true
}

export const useLongPress = (
  element: HTMLElement | null,
  options: LongPressOptions
) => {
  const opts = useMemo(() => ({ ...DEFAULT_OPTIONS, ...options }), [options])
  const [state, setState] = useState<LongPressState>({
    isLongPressing: false,
    progress: 0,
    position: null
  })

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const startPositionRef = useRef<{ x: number; y: number } | null>(null)
  const hasTriggeredRef = useRef(false)

  const triggerHapticFeedback = useCallback(() => {
    if (opts.enableHapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(50)
    }
  }, [opts.enableHapticFeedback])

  const clearTimers = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
  }, [])

  const resetState = useCallback(() => {
    clearTimers()
    setState({
      isLongPressing: false,
      progress: 0,
      position: null
    })
    startPositionRef.current = null
    hasTriggeredRef.current = false
  }, [clearTimers])

  const handleLongPressStart = useCallback((position: { x: number; y: number }) => {
    resetState()
    startPositionRef.current = { ...position }
    
    setState({
      isLongPressing: false,
      progress: 0,
      position: { ...position }
    })

    // Start progress animation
    if (opts.enableVisualFeedback) {
      let progress = 0
      const progressStep = 100 / (opts.delay ?? 500) * 20 // Update every 20ms
      
      progressIntervalRef.current = setInterval(() => {
        progress += progressStep
        if (progress <= 100) {
          setState(prev => ({
            ...prev,
            progress: progress / 100
          }))
        }
      }, 20)
    }

    // Start long press timer
    longPressTimerRef.current = setTimeout(() => {
      if (!hasTriggeredRef.current) {
        hasTriggeredRef.current = true
        triggerHapticFeedback()
        
        setState(prev => ({
          ...prev,
          isLongPressing: true,
          progress: 1
        }))
        
        opts.onLongPress(position)
      }
    }, opts.delay)
  }, [opts, triggerHapticFeedback, resetState])

  const handleLongPressMove = useCallback((currentPosition: { x: number; y: number }) => {
    if (!startPositionRef.current || hasTriggeredRef.current) return

    const deltaX = Math.abs(currentPosition.x - startPositionRef.current.x)
    const deltaY = Math.abs(currentPosition.y - startPositionRef.current.y)
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    // Cancel long press if moved too far
    if (distance > (opts.threshold ?? 10)) {
      resetState()
    }
  }, [opts.threshold, resetState])

  const handleLongPressEnd = useCallback(() => {
    clearTimers()
    
    if (hasTriggeredRef.current) {
      opts.onLongPressEnd?.()
    }
    
    // Delay reset to allow for visual feedback
    setTimeout(() => {
      resetState()
    }, 100)
  }, [clearTimers, opts, resetState])

  const handleGesture = useCallback((gesture: GestureState) => {
    // Only handle single touch
    if (gesture.touches.length !== 1) {
      resetState()
      return
    }

    const touch = gesture.touches[0]

    if (gesture.type === GestureType.LONG_PRESS && gesture.active) {
      // Long press detected by gesture recognition
      if (!hasTriggeredRef.current) {
        hasTriggeredRef.current = true
        triggerHapticFeedback()
        
        setState({
          isLongPressing: true,
          progress: 1,
          position: { x: touch.currentX, y: touch.currentY }
        })
        
        opts.onLongPress({ x: touch.currentX, y: touch.currentY })
      }
    } else if (gesture.active) {
      // Touch started or moved
      if (!startPositionRef.current && gesture.type === GestureType.IDLE) {
        handleLongPressStart({ x: touch.currentX, y: touch.currentY })
      } else if (startPositionRef.current) {
        handleLongPressMove({ x: touch.currentX, y: touch.currentY })
      }
    } else {
      // Touch ended
      handleLongPressEnd()
    }
  }, [handleLongPressStart, handleLongPressMove, handleLongPressEnd, opts, triggerHapticFeedback, resetState])

  const gesture = useGestureRecognition(
    element,
    { longPressDelay: opts.delay },
    handleGesture
  )

  // Cancel long press on component unmount
  useCallback(() => {
    return () => {
      resetState()
    }
  }, [resetState])

  return {
    ...state,
    gesture,
    cancel: resetState
  }
}