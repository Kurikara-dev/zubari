'use client'

import React, { createContext, useContext, useCallback, useRef, ReactNode } from 'react'
import { useDeviceDetection } from '@/lib/utils/mobile/deviceDetection'

export interface ScreenReaderAnnouncerContextValue {
  announce: (message: string, priority?: 'polite' | 'assertive', delay?: number) => void
  announceWithFallback: (message: string, fallbackActions?: () => void) => void
  clearAnnouncements: () => void
  isScreenReaderActive: boolean
}

interface ScreenReaderAnnouncerProps {
  children: ReactNode
  enableAutoDetection?: boolean
  defaultPriority?: 'polite' | 'assertive'
  maxAnnouncementLength?: number
  debounceMs?: number
}

interface AnnouncementQueue {
  id: string
  message: string
  priority: 'polite' | 'assertive'
  timestamp: number
}

const ScreenReaderAnnouncerContext = createContext<ScreenReaderAnnouncerContextValue | null>(null)

export const ScreenReaderAnnouncerProvider: React.FC<ScreenReaderAnnouncerProps> = ({
  children,
  enableAutoDetection = true,
  defaultPriority = 'polite',
  maxAnnouncementLength = 150,
  debounceMs = 100
}) => {
  const { prefersReducedMotion } = useDeviceDetection()
  
  const politeAnnouncerRef = useRef<HTMLDivElement>(null)
  const assertiveAnnouncerRef = useRef<HTMLDivElement>(null)
  const announcementQueueRef = useRef<AnnouncementQueue[]>([])
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastAnnouncementRef = useRef<string>('')
  const announcementIdCounter = useRef(0)

  // Detect if screen reader is likely active
  const detectScreenReader = useCallback((): boolean => {
    if (!enableAutoDetection || typeof window === 'undefined') return false

    // Check for common screen reader indicators
    const indicators = [
      // Check for high contrast mode (often used with screen readers)
      window.matchMedia('(prefers-contrast: high)').matches,
      window.matchMedia('(prefers-contrast: more)').matches,
      
      // Check for reduced motion (often correlates with assistive technology)
      prefersReducedMotion,
      
      // Check for focus indicators preference
      window.matchMedia('(prefers-reduced-transparency: reduce)').matches,
      
      // Check for increased font size
      window.matchMedia('(min-resolution: 2dppx)').matches && window.innerWidth < 1024,
      
      // Heuristic: Very narrow viewport might indicate magnification
      window.innerWidth < 320,
      
      // Check if user is navigating primarily with keyboard
      document.activeElement?.tagName === 'BUTTON' || document.activeElement?.tagName === 'A'
    ]

    return indicators.some(indicator => indicator)
  }, [enableAutoDetection, prefersReducedMotion])

  const [isScreenReaderActive] = React.useState(() => detectScreenReader())

  // Process announcement queue
  const processAnnouncementQueue = useCallback(() => {
    if (announcementQueueRef.current.length === 0) return

    const now = Date.now()
    const announcement = announcementQueueRef.current.find(
      a => now - a.timestamp >= debounceMs
    )

    if (!announcement) return

    // Remove processed announcement from queue
    announcementQueueRef.current = announcementQueueRef.current.filter(
      a => a.id !== announcement.id
    )

    // Skip duplicate consecutive announcements
    if (announcement.message === lastAnnouncementRef.current) return

    const announcer = announcement.priority === 'assertive' 
      ? assertiveAnnouncerRef.current 
      : politeAnnouncerRef.current

    if (announcer) {
      // Clear previous content
      announcer.textContent = ''
      
      // Set new content after a brief delay to ensure screen readers pick it up
      setTimeout(() => {
        if (announcer) {
          announcer.textContent = announcement.message
          lastAnnouncementRef.current = announcement.message
        }
      }, 10)
    }

    // Schedule next processing if queue has more items
    if (announcementQueueRef.current.length > 0) {
      debounceTimerRef.current = setTimeout(processAnnouncementQueue, debounceMs)
    }
  }, [debounceMs])

  // Main announce function
  const announce = useCallback((
    message: string, 
    priority: 'polite' | 'assertive' = defaultPriority,
    delay: number = 0
  ) => {
    if (!message.trim()) return

    // Truncate long messages
    const truncatedMessage = message.length > maxAnnouncementLength
      ? message.substring(0, maxAnnouncementLength - 3) + '...'
      : message

    // Add to queue
    const announcement: AnnouncementQueue = {
      id: `announcement-${++announcementIdCounter.current}`,
      message: truncatedMessage,
      priority,
      timestamp: Date.now() + delay
    }

    announcementQueueRef.current.push(announcement)

    // Start processing if not already running
    if (!debounceTimerRef.current) {
      debounceTimerRef.current = setTimeout(processAnnouncementQueue, Math.max(delay, debounceMs))
    }
  }, [defaultPriority, maxAnnouncementLength, debounceMs, processAnnouncementQueue])

  // Announce with fallback actions for non-screen-reader users
  const announceWithFallback = useCallback((message: string, fallbackActions?: () => void) => {
    announce(message)
    
    // If screen reader is not detected, execute fallback actions
    if (!isScreenReaderActive && fallbackActions) {
      setTimeout(fallbackActions, 100)
    }
  }, [announce, isScreenReaderActive])

  // Clear all pending announcements
  const clearAnnouncements = useCallback(() => {
    announcementQueueRef.current = []
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    // Clear announcer content
    if (politeAnnouncerRef.current) {
      politeAnnouncerRef.current.textContent = ''
    }
    if (assertiveAnnouncerRef.current) {
      assertiveAnnouncerRef.current.textContent = ''
    }

    lastAnnouncementRef.current = ''
  }, [])

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const contextValue: ScreenReaderAnnouncerContextValue = {
    announce,
    announceWithFallback,
    clearAnnouncements,
    isScreenReaderActive
  }

  return (
    <ScreenReaderAnnouncerContext.Provider value={contextValue}>
      {children}
      
      {/* Screen Reader Live Regions */}
      <div
        ref={politeAnnouncerRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="polite-announcer"
      />
      
      <div
        ref={assertiveAnnouncerRef}
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        data-testid="assertive-announcer"
      />
      
      {/* Status region for persistent information */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="false"
        className="sr-only"
        data-testid="status-announcer"
      />
    </ScreenReaderAnnouncerContext.Provider>
  )
}

// Hook to use Screen Reader Announcer
export const useScreenReaderAnnouncer = (): ScreenReaderAnnouncerContextValue => {
  const context = useContext(ScreenReaderAnnouncerContext)
  if (!context) {
    throw new Error('useScreenReaderAnnouncer must be used within a ScreenReaderAnnouncerProvider')
  }
  return context
}

// HOC for components that need screen reader announcements
export const withScreenReaderAnnouncer = <P extends object>(
  Component: React.ComponentType<P>
) => {
  const WithScreenReaderAnnouncerComponent = (props: P) => {
    return (
      <ScreenReaderAnnouncerProvider>
        <Component {...props} />
      </ScreenReaderAnnouncerProvider>
    )
  }

  WithScreenReaderAnnouncerComponent.displayName = `withScreenReaderAnnouncer(${Component.displayName || Component.name})`
  return WithScreenReaderAnnouncerComponent
}

// Predefined announcement messages for common UI actions
export const SCREEN_READER_MESSAGES = {
  // Navigation
  NAVIGATED_TO_IMAGE: (index: number, total: number) => 
    `Navigated to image ${index} of ${total}`,
  REACHED_FIRST_IMAGE: 'Reached first image',
  REACHED_LAST_IMAGE: 'Reached last image',
  
  // Image actions
  IMAGE_LOADING: 'Image loading',
  IMAGE_LOADED: (filename: string) => `Image loaded: ${filename}`,
  IMAGE_LOAD_ERROR: (filename: string) => `Failed to load image: ${filename}`,
  
  // Upload actions
  UPLOAD_STARTED: (count: number) => 
    count === 1 ? 'Upload started' : `Upload started for ${count} files`,
  UPLOAD_PROGRESS: (progress: number) => `Upload progress: ${progress}%`,
  UPLOAD_COMPLETE: (count: number) => 
    count === 1 ? 'Upload complete' : `Upload complete for ${count} files`,
  UPLOAD_ERROR: 'Upload failed',
  
  // Delete actions
  DELETE_CONFIRMATION: (filename: string) => `Confirm deletion of ${filename}`,
  DELETE_SUCCESS: (filename: string) => `Successfully deleted ${filename}`,
  DELETE_ERROR: (filename: string) => `Failed to delete ${filename}`,
  
  // Filter and search
  FILTER_APPLIED: (filterType: string, value: string) => 
    `Filter applied: ${filterType} is ${value}`,
  SEARCH_RESULTS: (count: number) => 
    count === 0 ? 'No search results found' : 
    count === 1 ? '1 search result found' : 
    `${count} search results found`,
  
  // Grid actions
  GRID_LAYOUT_CHANGED: (columns: number) => `Grid layout changed to ${columns} columns`,
  INFINITE_SCROLL_LOADING: 'Loading more images',
  INFINITE_SCROLL_COMPLETE: (newCount: number) => `Loaded ${newCount} more images`,
  
  // Modal actions
  MODAL_OPENED: (title: string) => `${title} dialog opened`,
  MODAL_CLOSED: (title: string) => `${title} dialog closed`,
  
  // General feedback
  ACTION_SUCCESS: (action: string) => `${action} successful`,
  ACTION_ERROR: (action: string) => `${action} failed`,
  
  // Loading states
  LOADING: 'Loading',
  LOADING_COMPLETE: 'Loading complete',
  
  // Form validation
  VALIDATION_ERROR: (field: string, error: string) => `${field}: ${error}`,
  FORM_SUBMITTED: 'Form submitted successfully'
} as const

export default ScreenReaderAnnouncerProvider