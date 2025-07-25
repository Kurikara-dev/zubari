import { useCallback, useRef, useMemo } from 'react'

export enum HapticFeedbackType {
  LIGHT = 'light',
  MEDIUM = 'medium', 
  HEAVY = 'heavy',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  SELECTION = 'selection'
}

export interface HapticFeedbackOptions {
  enabled?: boolean
  fallbackToVibration?: boolean
  customPatterns?: {
    [key in HapticFeedbackType]?: number | number[]
  }
}

interface HapticCapabilities {
  supportsHaptic: boolean
  supportsVibration: boolean
  supportsImpactFeedback: boolean
  supportsSelectionFeedback: boolean
  supportsNotificationFeedback: boolean
}

const DEFAULT_VIBRATION_PATTERNS: Record<HapticFeedbackType, number | number[]> = {
  [HapticFeedbackType.LIGHT]: 10,
  [HapticFeedbackType.MEDIUM]: 20,
  [HapticFeedbackType.HEAVY]: 50,
  [HapticFeedbackType.SUCCESS]: [10, 10, 10],
  [HapticFeedbackType.WARNING]: [20, 10, 20],
  [HapticFeedbackType.ERROR]: [50, 10, 50, 10, 50],
  [HapticFeedbackType.SELECTION]: 5
}

export const useHapticFeedback = (options: HapticFeedbackOptions = {}) => {
  const {
    enabled = true,
    fallbackToVibration = true,
    customPatterns = {}
  } = options

  const capabilitiesRef = useRef<HapticCapabilities | null>(null)
  const vibrationPatterns = useMemo(() => ({ ...DEFAULT_VIBRATION_PATTERNS, ...customPatterns }), [customPatterns])

  // Detect haptic capabilities
  const detectCapabilities = useCallback((): HapticCapabilities => {
    if (capabilitiesRef.current) {
      return capabilitiesRef.current
    }

    const capabilities: HapticCapabilities = {
      supportsHaptic: false,
      supportsVibration: false,
      supportsImpactFeedback: false,
      supportsSelectionFeedback: false,
      supportsNotificationFeedback: false
    }

    // Check for iOS Taptic Engine
    if (typeof window !== 'undefined') {
      // Check for vibration API support
      const hasVibrationAPI = 'vibrate' in navigator || 'webkitVibrate' in (navigator as { webkitVibrate?: unknown })
      if (hasVibrationAPI) {
        capabilities.supportsVibration = true
      }

      // Check for iOS Haptic Feedback API (iOS 10+)
      if (hasVibrationAPI && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
        capabilities.supportsHaptic = true
        capabilities.supportsImpactFeedback = true
        capabilities.supportsSelectionFeedback = true
        capabilities.supportsNotificationFeedback = true
      }

      // Check for Android Haptic Feedback
      if (hasVibrationAPI && /Android/.test(navigator.userAgent)) {
        capabilities.supportsVibration = true
        capabilities.supportsHaptic = true
      }

      // Check for modern Haptic API (experimental)
      if ('haptic' in navigator || 'getHapticActuators' in navigator) {
        capabilities.supportsHaptic = true
      }
    }

    capabilitiesRef.current = capabilities
    return capabilities
  }, [])

  // Trigger haptic feedback using iOS Taptic Engine
  const triggerIOSHaptic = useCallback(async (type: HapticFeedbackType): Promise<boolean> => {
    try {
      if ('vibrate' in navigator && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
        switch (type) {
          case HapticFeedbackType.LIGHT:
            // @ts-expect-error - TapticEngine is iOS specific
            if (window.TapticEngine) {
              // @ts-expect-error - TapticEngine is iOS specific
              window.TapticEngine.impact({ style: 'light' })
              return true
            }
            break
          case HapticFeedbackType.MEDIUM:
            // @ts-expect-error - TapticEngine is iOS specific
            if (window.TapticEngine) {
              // @ts-expect-error - TapticEngine is iOS specific
              window.TapticEngine.impact({ style: 'medium' })
              return true
            }
            break
          case HapticFeedbackType.HEAVY:
            // @ts-expect-error - TapticEngine is iOS specific
            if (window.TapticEngine) {
              // @ts-expect-error - TapticEngine is iOS specific
              window.TapticEngine.impact({ style: 'heavy' })
              return true
            }
            break
          case HapticFeedbackType.SUCCESS:
            // @ts-expect-error - TapticEngine is iOS specific
            if (window.TapticEngine) {
              // @ts-expect-error - TapticEngine is iOS specific
              window.TapticEngine.notification({ type: 'success' })
              return true
            }
            break
          case HapticFeedbackType.WARNING:
            // @ts-expect-error - TapticEngine is iOS specific
            if (window.TapticEngine) {
              // @ts-expect-error - TapticEngine is iOS specific
              window.TapticEngine.notification({ type: 'warning' })
              return true
            }
            break
          case HapticFeedbackType.ERROR:
            // @ts-expect-error - TapticEngine is iOS specific
            if (window.TapticEngine) {
              // @ts-expect-error - TapticEngine is iOS specific
              window.TapticEngine.notification({ type: 'error' })
              return true
            }
            break
          case HapticFeedbackType.SELECTION:
            // @ts-expect-error - TapticEngine is iOS specific
            if (window.TapticEngine) {
              // @ts-expect-error - TapticEngine is iOS specific
              window.TapticEngine.selection()
              return true
            }
            break
        }
      }
    } catch (error) {
      console.debug('iOS Haptic feedback failed:', error)
    }
    return false
  }, [])

  // Trigger vibration feedback
  const triggerVibration = useCallback(async (type: HapticFeedbackType): Promise<boolean> => {
    try {
      if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
        const pattern = vibrationPatterns[type]
        if (typeof pattern === 'number') {
          navigator.vibrate(pattern)
        } else {
          navigator.vibrate(pattern)
        }
        return true
      }
    } catch (error) {
      console.debug('Vibration feedback failed:', error)
    }
    return false
  }, [vibrationPatterns])

  // Main haptic feedback trigger
  const triggerHaptic = useCallback(async (type: HapticFeedbackType): Promise<void> => {
    if (!enabled) return

    const capabilities = detectCapabilities()

    let success = false

    // Try iOS Haptic first (most sophisticated)
    if (capabilities.supportsHaptic && capabilities.supportsImpactFeedback) {
      success = await triggerIOSHaptic(type)
    }

    // Fallback to vibration if haptic failed or not available
    if (!success && fallbackToVibration && capabilities.supportsVibration) {
      success = await triggerVibration(type)
    }

    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.debug(`Haptic feedback triggered: ${type}, success: ${success}`)
    }
  }, [enabled, fallbackToVibration, detectCapabilities, triggerIOSHaptic, triggerVibration])

  // Convenience methods for common haptic types
  const impact = useCallback((intensity: 'light' | 'medium' | 'heavy' = 'medium') => {
    const type = {
      light: HapticFeedbackType.LIGHT,
      medium: HapticFeedbackType.MEDIUM,
      heavy: HapticFeedbackType.HEAVY
    }[intensity]
    return triggerHaptic(type)
  }, [triggerHaptic])

  const notification = useCallback((type: 'success' | 'warning' | 'error') => {
    const feedbackType = {
      success: HapticFeedbackType.SUCCESS,
      warning: HapticFeedbackType.WARNING,
      error: HapticFeedbackType.ERROR
    }[type]
    return triggerHaptic(feedbackType)
  }, [triggerHaptic])

  const selection = useCallback(() => {
    return triggerHaptic(HapticFeedbackType.SELECTION)
  }, [triggerHaptic])

  // Get device capabilities
  const getCapabilities = useCallback(() => {
    return detectCapabilities()
  }, [detectCapabilities])

  // Check if haptic feedback is available
  const isAvailable = useCallback(() => {
    const capabilities = detectCapabilities()
    return capabilities.supportsHaptic || capabilities.supportsVibration
  }, [detectCapabilities])

  return {
    triggerHaptic,
    impact,
    notification,
    selection,
    getCapabilities,
    isAvailable,
    capabilities: detectCapabilities()
  }
}