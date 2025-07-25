'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'

export interface RippleEffect {
  id: string
  x: number
  y: number
  timestamp: number
}

export interface TouchFeedbackProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  
  // Ripple effect options
  enableRipple?: boolean
  rippleColor?: string
  rippleDuration?: number
  rippleOpacity?: number
  
  // Loading state
  isLoading?: boolean
  loadingIndicator?: React.ReactNode
  
  // Error state
  hasError?: boolean
  errorMessage?: string
  onErrorDismiss?: () => void
  
  // Success state
  showSuccess?: boolean
  successMessage?: string
  successDuration?: number
  
  // Callbacks
  onTouchStart?: (event: React.TouchEvent) => void
  onTouchEnd?: (event: React.TouchEvent) => void
  onClick?: (event: React.MouseEvent) => void
}

const DEFAULT_RIPPLE_DURATION = 600
const DEFAULT_SUCCESS_DURATION = 2000

export const TouchFeedback: React.FC<TouchFeedbackProps> = ({
  children,
  className = '',
  style = {},
  enableRipple = true,
  rippleColor = 'rgba(255, 255, 255, 0.6)',
  rippleDuration = DEFAULT_RIPPLE_DURATION,
  rippleOpacity = 0.6,
  isLoading = false,
  loadingIndicator,
  hasError = false,
  errorMessage,
  onErrorDismiss,
  showSuccess = false,
  successMessage,
  successDuration = DEFAULT_SUCCESS_DURATION,
  onTouchStart,
  onTouchEnd,
  onClick
}) => {
  const [ripples, setRipples] = useState<RippleEffect[]>([])
  const [shakeAnimation, setShakeAnimation] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const successTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Clean up ripples after animation
  useEffect(() => {
    const timer = setInterval(() => {
      setRipples(prev => {
        const now = Date.now()
        return prev.filter(ripple => now - ripple.timestamp < rippleDuration)
      })
    }, 100)

    return () => clearInterval(timer)
  }, [rippleDuration])

  // Handle error shake animation
  useEffect(() => {
    if (hasError) {
      setShakeAnimation(true)
      const timer = setTimeout(() => setShakeAnimation(false), 600)
      return () => clearTimeout(timer)
    }
  }, [hasError])

  // Handle success message auto-dismiss
  useEffect(() => {
    if (showSuccess) {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current)
      }
      successTimerRef.current = setTimeout(() => {
        // Success message will be handled by parent component
      }, successDuration)
    }

    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current)
      }
    }
  }, [showSuccess, successDuration])

  const createRipple = useCallback((x: number, y: number) => {
    if (!enableRipple || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const rippleX = x - rect.left
    const rippleY = y - rect.top

    const newRipple: RippleEffect = {
      id: `ripple-${Date.now()}-${Math.random()}`,
      x: rippleX,
      y: rippleY,
      timestamp: Date.now()
    }

    setRipples(prev => [...prev, newRipple])
  }, [enableRipple])

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    if (event.touches.length === 1) {
      const touch = event.touches[0]
      createRipple(touch.clientX, touch.clientY)
    }
    onTouchStart?.(event)
  }, [createRipple, onTouchStart])

  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    onTouchEnd?.(event)
  }, [onTouchEnd])

  const handleClick = useCallback((event: React.MouseEvent) => {
    createRipple(event.clientX, event.clientY)
    onClick?.(event)
  }, [createRipple, onClick])

  const handleErrorDismiss = useCallback(() => {
    onErrorDismiss?.()
  }, [onErrorDismiss])

  // Container styles
  const containerStyle: React.CSSProperties = {
    ...style,
    position: 'relative',
    overflow: 'hidden',
    transform: shakeAnimation ? 'translateX(0)' : undefined,
    animation: shakeAnimation ? 'shake 0.6s ease-in-out' : undefined
  }

  // Ripple styles
  const rippleContainerStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 1,
    overflow: 'hidden'
  }

  // Loading overlay styles
  const loadingOverlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10
  }

  // Error/Success message styles
  const messageOverlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: hasError ? 'rgba(239, 68, 68, 0.9)' : 'rgba(34, 197, 94, 0.9)',
    color: 'white',
    padding: '12px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    zIndex: 20,
    maxWidth: '80%',
    textAlign: 'center',
    cursor: hasError ? 'pointer' : 'default'
  }

  return (
    <>
      <div
        ref={containerRef}
        className={className}
        style={containerStyle}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
      >
        {children}
        
        {/* Ripple effects */}
        {enableRipple && ripples.length > 0 && (
          <div style={rippleContainerStyle}>
            {ripples.map(ripple => {
              const age = Date.now() - ripple.timestamp
              const progress = Math.min(age / rippleDuration, 1)
              const scale = progress * 2.5
              const opacity = Math.max(0, rippleOpacity * (1 - progress))
              
              return (
                <div
                  key={ripple.id}
                  style={{
                    position: 'absolute',
                    left: ripple.x,
                    top: ripple.y,
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: rippleColor,
                    transform: `translate(-50%, -50%) scale(${scale})`,
                    opacity: opacity,
                    pointerEvents: 'none'
                  }}
                />
              )
            })}
          </div>
        )}
        
        {/* Loading overlay */}
        {isLoading && (
          <div style={loadingOverlayStyle}>
            {loadingIndicator || (
              <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid rgba(255, 255, 255, 0.3)',
                borderTop: '3px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
            )}
          </div>
        )}
      </div>
      
      {/* Error message */}
      {hasError && errorMessage && (
        <div style={messageOverlayStyle} onClick={handleErrorDismiss}>
          {errorMessage}
          <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.8 }}>
            Tap to dismiss
          </div>
        </div>
      )}
      
      {/* Success message */}
      {showSuccess && successMessage && (
        <div style={messageOverlayStyle}>
          {successMessage}
        </div>
      )}
      
      {/* CSS animations */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
      `}</style>
    </>
  )
}

export default TouchFeedback