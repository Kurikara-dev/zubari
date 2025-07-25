import { useState, useEffect, useCallback } from 'react'

export type OrientationType = 'portrait' | 'landscape'

export interface DeviceOrientationState {
  orientation: OrientationType
  angle: number
  isPortrait: boolean
  isLandscape: boolean
  hasChanged: boolean
}

export interface DeviceOrientationOptions {
  enableAutoRotation?: boolean
  debounceMs?: number
  onOrientationChange?: (state: DeviceOrientationState) => void
}

export const useDeviceOrientation = (options: DeviceOrientationOptions = {}) => {
  const {
    enableAutoRotation = true,
    debounceMs = 250,
    onOrientationChange
  } = options

  const [orientationState, setOrientationState] = useState<DeviceOrientationState>(() => {
    // Initialize with current orientation
    const getInitialOrientation = (): DeviceOrientationState => {
      if (typeof window === 'undefined') {
        return {
          orientation: 'portrait',
          angle: 0,
          isPortrait: true,
          isLandscape: false,
          hasChanged: false
        }
      }

      const angle = window.screen?.orientation?.angle ?? 0
      const isPortrait = window.innerHeight > window.innerWidth
      
      return {
        orientation: isPortrait ? 'portrait' : 'landscape',
        angle,
        isPortrait,
        isLandscape: !isPortrait,
        hasChanged: false
      }
    }

    return getInitialOrientation()
  })

  // Debounce orientation changes to avoid too frequent updates
  const debounceTimeout = useState<NodeJS.Timeout | null>(null)[1]

  const updateOrientation = useCallback(() => {
    if (typeof window === 'undefined') return

    const angle = window.screen?.orientation?.angle ?? 0
    const isPortrait = window.innerHeight > window.innerWidth
    const orientation: OrientationType = isPortrait ? 'portrait' : 'landscape'

    const newState: DeviceOrientationState = {
      orientation,
      angle,
      isPortrait,
      isLandscape: !isPortrait,
      hasChanged: true
    }

    setOrientationState(prevState => {
      // Only update if orientation actually changed
      if (prevState.orientation !== orientation || prevState.angle !== angle) {
        onOrientationChange?.(newState)
        return newState
      }
      return prevState
    })
  }, [onOrientationChange])

  const debouncedUpdateOrientation = useCallback(() => {
    debounceTimeout(prev => {
      if (prev) clearTimeout(prev)
      return setTimeout(updateOrientation, debounceMs)
    })
  }, [updateOrientation, debounceMs, debounceTimeout])

  // Listen for orientation changes
  useEffect(() => {
    if (!enableAutoRotation || typeof window === 'undefined') return

    const handleOrientationChange = () => {
      debouncedUpdateOrientation()
    }

    const handleResize = () => {
      debouncedUpdateOrientation()
    }

    // Listen to multiple events for better compatibility
    window.addEventListener('orientationchange', handleOrientationChange)
    window.addEventListener('resize', handleResize)
    window.screen?.orientation?.addEventListener('change', handleOrientationChange)

    // Initial update
    updateOrientation()

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange)
      window.removeEventListener('resize', handleResize)
      window.screen?.orientation?.removeEventListener('change', handleOrientationChange)
    }
  }, [enableAutoRotation, debouncedUpdateOrientation, updateOrientation])

  // Force orientation check
  const checkOrientation = useCallback(() => {
    updateOrientation()
  }, [updateOrientation])

  // Lock orientation (if supported)
  const lockOrientation = useCallback(async (orientation: OrientationType): Promise<boolean> => {
    try {
      const screenOrientation = window.screen?.orientation as { lock?: (orientation: string) => Promise<void>; unlock?: () => void }
      if (screenOrientation?.lock) {
        await screenOrientation.lock(
          orientation === 'portrait' ? 'portrait-primary' : 'landscape-primary'
        )
        return true
      }
    } catch (error) {
      console.debug('Orientation lock failed:', error)
    }
    return false
  }, [])

  // Unlock orientation (if supported)
  const unlockOrientation = useCallback(() => {
    try {
      const screenOrientation = window.screen?.orientation as { lock?: (orientation: string) => Promise<void>; unlock?: () => void }
      if (screenOrientation?.unlock) {
        screenOrientation.unlock()
        return true
      }
    } catch (error) {
      console.debug('Orientation unlock failed:', error)
    }
    return false
  }, [])

  // Get orientation capabilities
  const getCapabilities = useCallback(() => {
    if (typeof window === 'undefined') {
      return {
        supportsOrientationLock: false,
        supportsOrientationAPI: false,
        supportedOrientations: []
      }
    }

    const screenOrientation = window.screen?.orientation as { lock?: unknown; type?: string }
    return {
      supportsOrientationLock: !!screenOrientation?.lock,
      supportsOrientationAPI: !!window.screen?.orientation,
      supportedOrientations: screenOrientation?.type ? [screenOrientation.type] : []
    }
  }, [])

  return {
    ...orientationState,
    checkOrientation,
    lockOrientation,
    unlockOrientation,
    getCapabilities,
    capabilities: getCapabilities()
  }
}