/**
 * Device Detection Utilities for Mobile Optimization
 * Provides comprehensive device and capability detection
 */

export interface DeviceInfo {
  // Basic device type
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  
  // Operating system
  isIOS: boolean
  isAndroid: boolean
  isWindows: boolean
  isMacOS: boolean
  isLinux: boolean
  
  // Browser
  isSafari: boolean
  isChrome: boolean
  isFirefox: boolean
  isEdge: boolean
  
  // Specific devices
  isIPhone: boolean
  isIPad: boolean
  isIPod: boolean
  
  // Version info
  osVersion: string | null
  browserVersion: string | null
  
  // Hardware capabilities
  devicePixelRatio: number
  maxTouchPoints: number
  
  // Screen info
  screenWidth: number
  screenHeight: number
  availableWidth: number
  availableHeight: number
}

export interface TouchCapabilities {
  supportsTouch: boolean
  supportsMultiTouch: boolean
  maxTouchPoints: number
  supportsPressure: boolean
  supportsForceTouch: boolean
  supportsHover: boolean
  supportsPointer: boolean
}

export interface DeviceCapabilities {
  // Input capabilities
  touch: TouchCapabilities
  
  // Display capabilities
  supportsHDR: boolean
  supportsP3ColorSpace: boolean
  supportsReducedMotion: boolean
  prefersReducedMotion: boolean
  
  // Hardware capabilities
  supportsVibration: boolean
  supportsHapticFeedback: boolean
  supportsGeolocation: boolean
  supportsOrientation: boolean
  supportsDeviceMotion: boolean
  
  // Network capabilities
  supportsServiceWorker: boolean
  supportsWebPush: boolean
  connectionSpeed: 'slow' | 'medium' | 'fast' | 'unknown'
  
  // Storage capabilities
  supportsLocalStorage: boolean
  supportsSessionStorage: boolean
  supportsIndexedDB: boolean
}

class DeviceDetector {
  private static instance: DeviceDetector
  private deviceInfo: DeviceInfo | null = null
  private capabilities: DeviceCapabilities | null = null

  private constructor() {
    if (typeof window !== 'undefined') {
      this.detectDevice()
      this.detectCapabilities()
    }
  }

  static getInstance(): DeviceDetector {
    if (!DeviceDetector.instance) {
      DeviceDetector.instance = new DeviceDetector()
    }
    return DeviceDetector.instance
  }

  private detectDevice(): void {
    if (typeof window === 'undefined') return

    const userAgent = navigator.userAgent
    const platform = navigator.platform
    const vendor = navigator.vendor

    // Operating System Detection
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as { MSStream?: unknown }).MSStream
    const isAndroid = /Android/.test(userAgent)
    const isWindows = /Win/.test(platform)
    const isMacOS = /Mac/.test(platform) && !isIOS
    const isLinux = /Linux/.test(platform) && !isAndroid

    // Browser Detection
    const isSafari = /Safari/.test(userAgent) && /Apple Computer/.test(vendor)
    const isChrome = /Chrome/.test(userAgent) && /Google Inc/.test(vendor)
    const isFirefox = /Firefox/.test(userAgent)
    const isEdge = /Edg/.test(userAgent)

    // Device Type Detection
    const isIPhone = /iPhone/.test(userAgent)
    const isIPad = /iPad/.test(userAgent) || (isMacOS && navigator.maxTouchPoints > 1)
    const isIPod = /iPod/.test(userAgent)

    // Basic device classification
    const isMobile = isIOS || isAndroid || window.innerWidth < 768
    const isTablet = isIPad || (isAndroid && window.innerWidth >= 768 && window.innerWidth < 1024)
    const isDesktop = !isMobile && !isTablet

    // Version extraction
    const extractVersion = (regex: RegExp): string | null => {
      const match = userAgent.match(regex)
      return match ? match[1] : null
    }

    const osVersion = isIOS ? extractVersion(/OS (\d+_\d+_?\d*)/) :
                     isAndroid ? extractVersion(/Android (\d+\.?\d*\.?\d*)/) :
                     null

    const browserVersion = isChrome ? extractVersion(/Chrome\/(\d+\.?\d*\.?\d*\.?\d*)/) :
                          isSafari ? extractVersion(/Version\/(\d+\.?\d*\.?\d*)/) :
                          isFirefox ? extractVersion(/Firefox\/(\d+\.?\d*)/) :
                          isEdge ? extractVersion(/Edg\/(\d+\.?\d*\.?\d*\.?\d*)/) :
                          null

    this.deviceInfo = {
      isMobile,
      isTablet,
      isDesktop,
      isIOS,
      isAndroid,
      isWindows,
      isMacOS,
      isLinux,
      isSafari,
      isChrome,
      isFirefox,
      isEdge,
      isIPhone,
      isIPad,
      isIPod,
      osVersion,
      browserVersion,
      devicePixelRatio: window.devicePixelRatio || 1,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      screenWidth: screen.width,
      screenHeight: screen.height,
      availableWidth: screen.availWidth,
      availableHeight: screen.availHeight
    }
  }

  private detectCapabilities(): void {
    if (typeof window === 'undefined') return

    // Touch capabilities
    const supportsTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    const maxTouchPoints = navigator.maxTouchPoints || 0
    const supportsMultiTouch = maxTouchPoints > 1
    const supportsPressure = 'force' in TouchEvent.prototype || false
    const supportsForceTouch = !!(this.deviceInfo?.isIOS && supportsTouch)
    const supportsHover = window.matchMedia('(hover: hover)').matches
    const supportsPointer = 'PointerEvent' in window

    const touch: TouchCapabilities = {
      supportsTouch,
      supportsMultiTouch,
      maxTouchPoints,
      supportsPressure,
      supportsForceTouch,
      supportsHover,
      supportsPointer
    }

    // Display capabilities
    const supportsHDR = window.matchMedia('(dynamic-range: high)').matches ||
                       window.matchMedia('(color-gamut: rec2020)').matches
    const supportsP3ColorSpace = window.matchMedia('(color-gamut: p3)').matches
    const supportsReducedMotion = window.matchMedia('(prefers-reduced-motion)').matches
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Hardware capabilities
    const supportsVibration = 'vibrate' in navigator
    const supportsHapticFeedback = !!(this.deviceInfo?.isIOS && supportsTouch)
    const supportsGeolocation = 'geolocation' in navigator
    const supportsOrientation = 'orientation' in screen || 'orientation' in window
    const supportsDeviceMotion = 'DeviceMotionEvent' in window

    // Network capabilities
    const supportsServiceWorker = 'serviceWorker' in navigator
    const supportsWebPush = 'PushManager' in window
    
    // Connection speed detection (heuristic)
    const connection = (navigator as {
      connection?: { effectiveType?: string };
      mozConnection?: { effectiveType?: string };
      webkitConnection?: { effectiveType?: string };
    }).connection || (navigator as {
      mozConnection?: { effectiveType?: string };
    }).mozConnection || (navigator as {
      webkitConnection?: { effectiveType?: string };
    }).webkitConnection
    let connectionSpeed: 'slow' | 'medium' | 'fast' | 'unknown' = 'unknown'
    
    if (connection) {
      const effectiveType = connection.effectiveType
      switch (effectiveType) {
        case 'slow-2g':
        case '2g':
          connectionSpeed = 'slow'
          break
        case '3g':
          connectionSpeed = 'medium'
          break
        case '4g':
          connectionSpeed = 'fast'
          break
        default:
          connectionSpeed = 'unknown'
      }
    }

    // Storage capabilities
    const supportsLocalStorage = (() => {
      try {
        const test = 'test'
        localStorage.setItem(test, test)
        localStorage.removeItem(test)
        return true
      } catch {
        return false
      }
    })()

    const supportsSessionStorage = (() => {
      try {
        const test = 'test'
        sessionStorage.setItem(test, test)
        sessionStorage.removeItem(test)
        return true
      } catch {
        return false
      }
    })()

    const supportsIndexedDB = 'indexedDB' in window

    this.capabilities = {
      touch,
      supportsHDR,
      supportsP3ColorSpace,
      supportsReducedMotion,
      prefersReducedMotion,
      supportsVibration,
      supportsHapticFeedback,
      supportsGeolocation,
      supportsOrientation,
      supportsDeviceMotion,
      supportsServiceWorker,
      supportsWebPush,
      connectionSpeed,
      supportsLocalStorage,
      supportsSessionStorage,
      supportsIndexedDB
    }
  }

  getDeviceInfo(): DeviceInfo {
    if (!this.deviceInfo) {
      this.detectDevice()
    }
    return this.deviceInfo!
  }

  getCapabilities(): DeviceCapabilities {
    if (!this.capabilities) {
      this.detectCapabilities()
    }
    return this.capabilities!
  }

  // Convenience methods
  isMobileDevice(): boolean {
    return this.getDeviceInfo().isMobile
  }

  isTabletDevice(): boolean {
    return this.getDeviceInfo().isTablet
  }

  isDesktopDevice(): boolean {
    return this.getDeviceInfo().isDesktop
  }

  isIOSDevice(): boolean {
    return this.getDeviceInfo().isIOS
  }

  isAndroidDevice(): boolean {
    return this.getDeviceInfo().isAndroid
  }

  supportsTouchInput(): boolean {
    return this.getCapabilities().touch.supportsTouch
  }

  supportsHapticFeedback(): boolean {
    return this.getCapabilities().supportsHapticFeedback
  }

  prefersReducedMotion(): boolean {
    return this.getCapabilities().prefersReducedMotion
  }

  isHighDPIDevice(): boolean {
    return this.getDeviceInfo().devicePixelRatio > 1.5
  }

  // Get optimized settings based on device
  getOptimizedSettings() {
    const device = this.getDeviceInfo()
    const capabilities = this.getCapabilities()

    return {
      // Image loading settings
      imageQuality: device.devicePixelRatio > 2 ? 'high' : 'medium',
      lazyLoadingEnabled: device.isMobile,
      progressiveLoadingEnabled: capabilities.connectionSpeed === 'slow',

      // Animation settings
      animationsEnabled: !capabilities.prefersReducedMotion,
      reducedAnimations: capabilities.prefersReducedMotion,

      // Touch settings
      touchOptimized: capabilities.touch.supportsTouch,
      hapticFeedbackEnabled: capabilities.supportsHapticFeedback,

      // Performance settings
      enableWebP: device.isChrome || device.isAndroid,
      enableAVIF: device.isChrome && parseInt(device.browserVersion || '0') >= 85,
      
      // UI settings
      compactUI: device.isIPhone || (device.isMobile && device.screenWidth < 375),
      largeTargets: capabilities.touch.supportsTouch
    }
  }
}

// Export singleton instance methods
export const deviceDetector = DeviceDetector.getInstance()

// Export convenience functions
export const getDeviceInfo = (): DeviceInfo => deviceDetector.getDeviceInfo()
export const getDeviceCapabilities = (): DeviceCapabilities => deviceDetector.getCapabilities()
export const isMobileDevice = (): boolean => deviceDetector.isMobileDevice()
export const isTabletDevice = (): boolean => deviceDetector.isTabletDevice()
export const isDesktopDevice = (): boolean => deviceDetector.isDesktopDevice()
export const isIOSDevice = (): boolean => deviceDetector.isIOSDevice()
export const isAndroidDevice = (): boolean => deviceDetector.isAndroidDevice()
export const supportsTouchInput = (): boolean => deviceDetector.supportsTouchInput()
export const supportsHapticFeedback = (): boolean => deviceDetector.supportsHapticFeedback()
export const prefersReducedMotion = (): boolean => deviceDetector.prefersReducedMotion()
export const isHighDPIDevice = (): boolean => deviceDetector.isHighDPIDevice()
export const getOptimizedSettings = () => deviceDetector.getOptimizedSettings()

// React hook version
export const useDeviceDetection = () => {
  return {
    deviceInfo: getDeviceInfo(),
    capabilities: getDeviceCapabilities(),
    isMobile: isMobileDevice(),
    isTablet: isTabletDevice(),
    isDesktop: isDesktopDevice(),
    isIOS: isIOSDevice(),
    isAndroid: isAndroidDevice(),
    supportsTouch: supportsTouchInput(),
    supportsHaptic: supportsHapticFeedback(),
    prefersReducedMotion: prefersReducedMotion(),
    isHighDPI: isHighDPIDevice(),
    optimizedSettings: getOptimizedSettings()
  }
}