'use client'

import React, { createContext, useContext, useCallback, useRef, ReactNode } from 'react'
import { useHapticFeedback, HapticFeedbackType } from '@/lib/hooks/mobile/useHapticFeedback'
import { useDeviceDetection } from '@/lib/utils/mobile/deviceDetection'

export interface TouchFeedbackContextValue {
  // Haptic feedback methods
  triggerHaptic: (type: HapticFeedbackType) => Promise<void>
  impact: (intensity?: 'light' | 'medium' | 'heavy') => Promise<void>
  notification: (type: 'success' | 'warning' | 'error') => Promise<void>
  selection: () => Promise<void>
  
  // Visual feedback methods
  triggerVisualFeedback: (element: HTMLElement, type: VisualFeedbackType) => void
  
  // Audio feedback methods
  triggerAudioFeedback: (type: AudioFeedbackType) => void
  
  // Configuration
  isEnabled: boolean
  capabilities: {
    haptic: boolean
    vibration: boolean
    visual: boolean
    audio: boolean
  }
}

export enum VisualFeedbackType {
  PRESS = 'press',
  SUCCESS = 'success',
  ERROR = 'error',
  SELECTION = 'selection',
  HOVER = 'hover'
}

export enum AudioFeedbackType {
  CLICK = 'click',
  SUCCESS = 'success',
  ERROR = 'error',
  NOTIFICATION = 'notification'
}

interface TouchFeedbackProviderProps {
  children: ReactNode
  enabled?: boolean
  enableHaptic?: boolean
  enableVisual?: boolean
  enableAudio?: boolean
  respectReducedMotion?: boolean
  customAudioSources?: {
    [key in AudioFeedbackType]?: string
  }
}

const TouchFeedbackContext = createContext<TouchFeedbackContextValue | null>(null)

export const TouchFeedbackProvider: React.FC<TouchFeedbackProviderProps> = ({
  children,
  enabled = true,
  enableHaptic = true,
  enableVisual = true,
  enableAudio = false,
  respectReducedMotion = true,
  customAudioSources = {}
}) => {
  const { supportsHaptic, prefersReducedMotion } = useDeviceDetection()
  const haptic = useHapticFeedback({
    enabled: enabled && enableHaptic && supportsHaptic,
    fallbackToVibration: true
  })

  // Audio elements cache
  const audioCache = useRef<Map<AudioFeedbackType, HTMLAudioElement>>(new Map())

  // Check if feedback should be disabled due to reduced motion preferences
  const isMotionReduced = respectReducedMotion && prefersReducedMotion

  // Initialize audio elements
  const initializeAudio = useCallback(() => {
    if (!enableAudio || typeof window === 'undefined') return

    const defaultSources: { [key in AudioFeedbackType]: string } = {
      [AudioFeedbackType.CLICK]: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzuL0fLNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzuL0fLNeSsFJHfH8N2QQAo=',
      [AudioFeedbackType.SUCCESS]: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzuL0fLNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzuL0fLNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzuL0fLNeSsFJHfH8N2QQAo=',
      [AudioFeedbackType.ERROR]: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzuL0fLNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzuL0fLNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzuL0fLNeSsFJHfH8N2QQAo=',
      [AudioFeedbackType.NOTIFICATION]: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzuL0fLNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzuL0fLNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzuL0fLNeSsFJHfH8N2QQAo='
    }

    const sources = { ...defaultSources, ...customAudioSources }

    Object.entries(sources).forEach(([type, src]) => {
      const audio = new Audio(src)
      audio.preload = 'auto'
      audio.volume = 0.3
      audioCache.current.set(type as AudioFeedbackType, audio)
    })
  }, [enableAudio, customAudioSources])

  // Initialize audio on mount
  React.useEffect(() => {
    initializeAudio()
  }, [initializeAudio])

  // Visual feedback implementation
  const triggerVisualFeedback = useCallback((element: HTMLElement, type: VisualFeedbackType) => {
    if (!enabled || !enableVisual || isMotionReduced) return

    const originalTransform = element.style.transform
    const originalTransition = element.style.transition

    switch (type) {
      case VisualFeedbackType.PRESS:
        element.style.transition = 'transform 0.1s ease-out'
        element.style.transform = 'scale(0.98)'
        setTimeout(() => {
          element.style.transform = originalTransform
          setTimeout(() => {
            element.style.transition = originalTransition
          }, 100)
        }, 100)
        break

      case VisualFeedbackType.SUCCESS:
        element.style.transition = 'background-color 0.2s ease-out'
        const originalBg = element.style.backgroundColor
        element.style.backgroundColor = 'rgba(34, 197, 94, 0.1)'
        setTimeout(() => {
          element.style.backgroundColor = originalBg
          setTimeout(() => {
            element.style.transition = originalTransition
          }, 200)
        }, 200)
        break

      case VisualFeedbackType.ERROR:
        element.style.transition = 'background-color 0.2s ease-out'
        const originalErrorBg = element.style.backgroundColor
        element.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'
        setTimeout(() => {
          element.style.backgroundColor = originalErrorBg
          setTimeout(() => {
            element.style.transition = originalTransition
          }, 200)
        }, 200)
        break

      case VisualFeedbackType.SELECTION:
        element.style.transition = 'transform 0.15s ease-out'
        element.style.transform = 'scale(1.02)'
        setTimeout(() => {
          element.style.transform = originalTransform
          setTimeout(() => {
            element.style.transition = originalTransition
          }, 150)
        }, 150)
        break

      case VisualFeedbackType.HOVER:
        if (!isMotionReduced) {
          element.style.transition = 'transform 0.2s ease-out, box-shadow 0.2s ease-out'
          element.style.transform = 'translateY(-1px)'
          element.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
        }
        break
    }
  }, [enabled, enableVisual, isMotionReduced])

  // Audio feedback implementation
  const triggerAudioFeedback = useCallback((type: AudioFeedbackType) => {
    if (!enabled || !enableAudio) return

    const audio = audioCache.current.get(type)
    if (audio) {
      audio.currentTime = 0
      audio.play().catch(() => {
        // Ignore audio play errors (common in browsers without user interaction)
      })
    }
  }, [enabled, enableAudio])

  // Combined feedback methods
  const triggerHapticWithFeedback = useCallback(async (type: HapticFeedbackType) => {
    await haptic.triggerHaptic(type)
  }, [haptic])

  const impactWithFeedback = useCallback(async (intensity: 'light' | 'medium' | 'heavy' = 'medium') => {
    await haptic.impact(intensity)
    triggerAudioFeedback(AudioFeedbackType.CLICK)
  }, [haptic, triggerAudioFeedback])

  const notificationWithFeedback = useCallback(async (type: 'success' | 'warning' | 'error') => {
    await haptic.notification(type)
    
    const audioType = type === 'success' ? AudioFeedbackType.SUCCESS : 
                     type === 'error' ? AudioFeedbackType.ERROR : 
                     AudioFeedbackType.NOTIFICATION
    triggerAudioFeedback(audioType)
  }, [haptic, triggerAudioFeedback])

  const selectionWithFeedback = useCallback(async () => {
    await haptic.selection()
    triggerAudioFeedback(AudioFeedbackType.CLICK)
  }, [haptic, triggerAudioFeedback])

  const contextValue: TouchFeedbackContextValue = {
    triggerHaptic: triggerHapticWithFeedback,
    impact: impactWithFeedback,
    notification: notificationWithFeedback,
    selection: selectionWithFeedback,
    triggerVisualFeedback,
    triggerAudioFeedback,
    isEnabled: enabled,
    capabilities: {
      haptic: haptic.isAvailable() && enableHaptic,
      vibration: haptic.capabilities.supportsVibration,
      visual: enableVisual,
      audio: enableAudio
    }
  }

  return (
    <TouchFeedbackContext.Provider value={contextValue}>
      {children}
    </TouchFeedbackContext.Provider>
  )
}

// Hook to use Touch Feedback
export const useTouchFeedback = (): TouchFeedbackContextValue => {
  const context = useContext(TouchFeedbackContext)
  if (!context) {
    throw new Error('useTouchFeedback must be used within a TouchFeedbackProvider')
  }
  return context
}

// HOC for components that need touch feedback
export const withTouchFeedback = <P extends object>(
  Component: React.ComponentType<P>
) => {
  const WithTouchFeedbackComponent = (props: P) => {
    return (
      <TouchFeedbackProvider>
        <Component {...props} />
      </TouchFeedbackProvider>
    )
  }

  WithTouchFeedbackComponent.displayName = `withTouchFeedback(${Component.displayName || Component.name})`
  return WithTouchFeedbackComponent
}

// Enhanced button component with touch feedback
export interface TouchFeedbackButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  hapticType?: 'light' | 'medium' | 'heavy'
  visualFeedback?: boolean
  audioFeedback?: boolean
  feedbackOnHover?: boolean
}

export const TouchFeedbackButton: React.FC<TouchFeedbackButtonProps> = ({
  children,
  hapticType = 'medium',
  visualFeedback = true,
  audioFeedback: _audioFeedback = false, // eslint-disable-line @typescript-eslint/no-unused-vars -- Reserved for accessibility features
  feedbackOnHover = true,
  onClick,
  onMouseEnter,
  onMouseLeave,
  className = '',
  ...props
}) => {
  const { impact, triggerVisualFeedback } = useTouchFeedback()
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handleClick = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (buttonRef.current) {
      await impact(hapticType)
      if (visualFeedback) {
        triggerVisualFeedback(buttonRef.current, VisualFeedbackType.PRESS)
      }
    }
    onClick?.(e)
  }, [impact, hapticType, visualFeedback, triggerVisualFeedback, onClick])

  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (feedbackOnHover && buttonRef.current && visualFeedback) {
      triggerVisualFeedback(buttonRef.current, VisualFeedbackType.HOVER)
    }
    onMouseEnter?.(e)
  }, [feedbackOnHover, visualFeedback, triggerVisualFeedback, onMouseEnter])

  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (buttonRef.current) {
      // Reset hover effects
      buttonRef.current.style.transform = ''
      buttonRef.current.style.boxShadow = ''
    }
    onMouseLeave?.(e)
  }, [onMouseLeave])

  return (
    <button
      ref={buttonRef}
      className={`touch-button ${className}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </button>
  )
}