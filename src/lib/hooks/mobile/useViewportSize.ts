import { useState, useEffect, useCallback, useMemo } from 'react'

export interface ViewportSize {
  width: number
  height: number
}

export interface ViewportState extends ViewportSize {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isSmallMobile: boolean
  aspectRatio: number
  devicePixelRatio: number
}

export interface ViewportBreakpoints {
  mobile: number
  tablet: number
  desktop: number
  smallMobile: number
}

export interface ViewportOptions {
  breakpoints?: Partial<ViewportBreakpoints>
  debounceMs?: number
  enableHighDPI?: boolean
  onViewportChange?: (state: ViewportState) => void
}

const DEFAULT_BREAKPOINTS: ViewportBreakpoints = {
  smallMobile: 375,  // iPhone SE and smaller
  mobile: 640,       // Tailwind sm
  tablet: 1024,      // Tailwind md
  desktop: 1280      // Tailwind lg
}

export const useViewportSize = (options: ViewportOptions = {}) => {
  const {
    breakpoints = {},
    debounceMs = 100,
    enableHighDPI = true,
    onViewportChange
  } = options

  const finalBreakpoints = useMemo(() => ({ ...DEFAULT_BREAKPOINTS, ...breakpoints }), [breakpoints])

  const getInitialViewport = (): ViewportState => {
    if (typeof window === 'undefined') {
      return {
        width: 1024,
        height: 768,
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        isSmallMobile: false,
        aspectRatio: 4/3,
        devicePixelRatio: 1
      }
    }

    const width = window.innerWidth
    const height = window.innerHeight
    const devicePixelRatio = enableHighDPI ? (window.devicePixelRatio || 1) : 1

    return {
      width,
      height,
      isMobile: width < finalBreakpoints.mobile,
      isTablet: width >= finalBreakpoints.mobile && width < finalBreakpoints.desktop,
      isDesktop: width >= finalBreakpoints.desktop,
      isSmallMobile: width < finalBreakpoints.smallMobile,
      aspectRatio: width / height,
      devicePixelRatio
    }
  }

  const [viewportState, setViewportState] = useState<ViewportState>(getInitialViewport)

  // Debounce timer
  const [, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)

  const updateViewport = useCallback(() => {
    if (typeof window === 'undefined') return

    const width = window.innerWidth
    const height = window.innerHeight
    const devicePixelRatio = enableHighDPI ? (window.devicePixelRatio || 1) : 1

    const newState: ViewportState = {
      width,
      height,
      isMobile: width < finalBreakpoints.mobile,
      isTablet: width >= finalBreakpoints.mobile && width < finalBreakpoints.desktop,
      isDesktop: width >= finalBreakpoints.desktop,
      isSmallMobile: width < finalBreakpoints.smallMobile,
      aspectRatio: width / height,
      devicePixelRatio
    }

    setViewportState(prevState => {
      // Only update if dimensions actually changed
      if (prevState.width !== width || prevState.height !== height) {
        onViewportChange?.(newState)
        return newState
      }
      return prevState
    })
  }, [finalBreakpoints, enableHighDPI, onViewportChange])

  const debouncedUpdateViewport = useCallback(() => {
    setDebounceTimer(prevTimer => {
      if (prevTimer) {
        clearTimeout(prevTimer)
      }
      return setTimeout(updateViewport, debounceMs)
    })
  }, [updateViewport, debounceMs])

  // Listen for viewport changes
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleResize = () => {
      debouncedUpdateViewport()
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)

    // Initial update
    updateViewport()

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
      setDebounceTimer(prevTimer => {
        if (prevTimer) {
          clearTimeout(prevTimer)
        }
        return null
      })
    }
  }, [debouncedUpdateViewport, updateViewport])

  // Get responsive class names (Tailwind-compatible)
  const getResponsiveClasses = useCallback((config: {
    mobile?: string
    tablet?: string
    desktop?: string
    base?: string
  }) => {
    const { mobile = '', tablet = '', desktop = '', base = '' } = config
    
    let classes = base

    if (viewportState.isMobile && mobile) {
      classes += ` ${mobile}`
    } else if (viewportState.isTablet && tablet) {
      classes += ` ${tablet}`
    } else if (viewportState.isDesktop && desktop) {
      classes += ` ${desktop}`
    }

    return classes.trim()
  }, [viewportState])

  // Check if viewport matches a specific breakpoint
  const matches = useCallback((breakpoint: keyof ViewportBreakpoints | 'all') => {
    if (breakpoint === 'all') return true
    
    switch (breakpoint) {
      case 'smallMobile':
        return viewportState.isSmallMobile
      case 'mobile':
        return viewportState.isMobile
      case 'tablet':
        return viewportState.isTablet
      case 'desktop':
        return viewportState.isDesktop
      default:
        return false
    }
  }, [viewportState])

  // Get current breakpoint name
  const getCurrentBreakpoint = useCallback((): keyof ViewportBreakpoints => {
    if (viewportState.isSmallMobile) return 'smallMobile'
    if (viewportState.isMobile) return 'mobile'
    if (viewportState.isTablet) return 'tablet'
    return 'desktop'
  }, [viewportState])

  // Check if touch device (heuristic)
  const isTouchDevice = useCallback((): boolean => {
    if (typeof window === 'undefined') return false
    
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-expect-error - msMaxTouchPoints is IE specific
      navigator.msMaxTouchPoints > 0
    )
  }, [])

  // Get safe area insets (for devices with notches)
  const getSafeAreaInsets = useCallback(() => {
    if (typeof window === 'undefined' || !window.CSS?.supports) {
      return { top: 0, right: 0, bottom: 0, left: 0 }
    }

    const style = getComputedStyle(document.documentElement)
    
    return {
      top: parseInt(style.getPropertyValue('env(safe-area-inset-top)') || '0'),
      right: parseInt(style.getPropertyValue('env(safe-area-inset-right)') || '0'),
      bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
      left: parseInt(style.getPropertyValue('env(safe-area-inset-left)') || '0')
    }
  }, [])

  // Force viewport refresh
  const refresh = useCallback(() => {
    updateViewport()
  }, [updateViewport])

  return {
    ...viewportState,
    breakpoints: finalBreakpoints,
    getResponsiveClasses,
    matches,
    getCurrentBreakpoint,
    isTouchDevice: isTouchDevice(),
    safeAreaInsets: getSafeAreaInsets(),
    refresh
  }
}