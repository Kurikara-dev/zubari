'use client'

import React, { createContext, useContext, useCallback, useRef, useEffect, ReactNode } from 'react'
import { useScreenReaderAnnouncer } from './ScreenReaderAnnouncer'

export interface KeyboardShortcut {
  key: string | string[]
  description: string
  action: (event: KeyboardEvent) => void
  scope?: 'global' | 'modal' | 'grid' | 'form'
  condition?: () => boolean
  preventDefault?: boolean
  stopPropagation?: boolean
}

export interface FocusTrapOptions {
  initialFocus?: HTMLElement | string
  finalFocus?: HTMLElement | string
  clickOutsideDeactivates?: boolean
  escapeDeactivates?: boolean
  allowOutsideClick?: boolean
}

export interface KeyboardNavigationContextValue {
  // Shortcut management
  registerShortcuts: (shortcuts: KeyboardShortcut[]) => () => void
  unregisterShortcuts: (shortcuts: KeyboardShortcut[]) => void
  
  // Focus management
  trapFocus: (container: HTMLElement, options?: FocusTrapOptions) => () => void
  releaseFocus: () => void
  moveFocusTo: (element: HTMLElement | string) => boolean
  
  // Navigation helpers
  navigateGrid: (direction: 'up' | 'down' | 'left' | 'right', wrap?: boolean) => boolean
  navigateList: (direction: 'up' | 'down' | 'home' | 'end', wrap?: boolean) => boolean
  
  // Announcements
  announceShortcuts: () => void
  announceNavigation: (message: string) => void
  
  // State
  currentScope: string
  isTrapped: boolean
  focusableElements: HTMLElement[]
}

interface KeyboardNavigationProviderProps {
  children: ReactNode
  defaultScope?: string
  enableGlobalShortcuts?: boolean
  enableFocusTrapping?: boolean
  enableAriaAnnouncements?: boolean
}

const KeyboardNavigationContext = createContext<KeyboardNavigationContextValue | null>(null)

// Focusable element selectors
const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
  'audio[controls]',
  'video[controls]',
  'iframe',
  'embed',
  'object',
  'area[href]'
].join(', ')

export const KeyboardNavigationProvider: React.FC<KeyboardNavigationProviderProps> = ({
  children,
  defaultScope = 'global',
  enableGlobalShortcuts = true,
  enableFocusTrapping = true,
  enableAriaAnnouncements = true
}) => {
  const { announce } = useScreenReaderAnnouncer()
  
  const shortcutsRef = useRef<KeyboardShortcut[]>([])
  const focusTrapRef = useRef<{
    container: HTMLElement | null
    options: FocusTrapOptions
    previousFocus: HTMLElement | null
    isActive: boolean
  }>({
    container: null,
    options: {},
    previousFocus: null,
    isActive: false
  })
  
  const [currentScope, setCurrentScope] = React.useState(defaultScope)
  const [focusableElements, setFocusableElements] = React.useState<HTMLElement[]>([])

  // Get all focusable elements in a container
  const getFocusableElements = useCallback((container: HTMLElement = document.body): HTMLElement[] => {
    const elements = Array.from(container.querySelectorAll(FOCUSABLE_SELECTORS)) as HTMLElement[]
    return elements.filter(element => {
      const style = window.getComputedStyle(element)
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        !element.hasAttribute('inert') &&
        element.tabIndex >= 0
      )
    })
  }, [])

  // Update focusable elements
  const updateFocusableElements = useCallback(() => {
    const container = focusTrapRef.current.isActive 
      ? focusTrapRef.current.container || document.body
      : document.body
    
    setFocusableElements(getFocusableElements(container))
  }, [getFocusableElements])

  // Register keyboard shortcuts
  const registerShortcuts = useCallback((shortcuts: KeyboardShortcut[]) => {
    shortcutsRef.current = [...shortcutsRef.current, ...shortcuts]
    
    const unregister = () => {
      shortcutsRef.current = shortcutsRef.current.filter(
        existing => !shortcuts.includes(existing)
      )
    }
    
    return unregister
  }, [])

  // Unregister keyboard shortcuts
  const unregisterShortcuts = useCallback((shortcuts: KeyboardShortcut[]) => {
    shortcutsRef.current = shortcutsRef.current.filter(
      existing => !shortcuts.includes(existing)
    )
  }, [])

  // Handle keyboard events
  const handleKeyboardEvent = useCallback((event: KeyboardEvent) => {
    if (!enableGlobalShortcuts) return

    const activeShortcuts = shortcutsRef.current.filter(shortcut => {
      // Check scope
      if (shortcut.scope && shortcut.scope !== currentScope && shortcut.scope !== 'global') {
        return false
      }
      
      // Check condition
      if (shortcut.condition && !shortcut.condition()) {
        return false
      }
      
      // Check key match
      const keys = Array.isArray(shortcut.key) ? shortcut.key : [shortcut.key]
      const eventKey = event.key.toLowerCase()
      const matches = keys.some(key => {
        const normalizedKey = key.toLowerCase()
        
        // Handle modifier combinations
        if (normalizedKey.includes('+')) {
          const parts = normalizedKey.split('+').map(p => p.trim())
          const modifierKeys = parts.slice(0, -1)
          const mainKey = parts[parts.length - 1]
          
          const modifierMatches = modifierKeys.every(modifier => {
            switch (modifier) {
              case 'ctrl': return event.ctrlKey
              case 'alt': return event.altKey
              case 'shift': return event.shiftKey
              case 'meta': return event.metaKey
              default: return false
            }
          })
          
          return modifierMatches && eventKey === mainKey
        }
        
        return eventKey === normalizedKey
      })
      
      return matches
    })

    // Execute matching shortcuts
    activeShortcuts.forEach(shortcut => {
      if (shortcut.preventDefault !== false) {
        event.preventDefault()
      }
      if (shortcut.stopPropagation) {
        event.stopPropagation()
      }
      
      try {
        shortcut.action(event)
      } catch (error) {
        console.error('Error executing keyboard shortcut:', error)
      }
    })
  }, [enableGlobalShortcuts, currentScope])

  // Focus trap implementation
  const trapFocus = useCallback((container: HTMLElement, options: FocusTrapOptions = {}) => {
    if (!enableFocusTrapping) return () => {}

    // Store previous focus
    const previousFocus = document.activeElement as HTMLElement
    
    focusTrapRef.current = {
      container,
      options,
      previousFocus,
      isActive: true
    }

    // Set initial focus
    if (options.initialFocus) {
      const initialElement = typeof options.initialFocus === 'string'
        ? container.querySelector(options.initialFocus) as HTMLElement
        : options.initialFocus
      
      if (initialElement) {
        initialElement.focus()
      }
    } else {
      // Focus first focusable element
      const focusableElements = getFocusableElements(container)
      if (focusableElements.length > 0) {
        focusableElements[0].focus()
      }
    }

    updateFocusableElements()

    // Handle Tab navigation within trap
    const handleTrapKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        const focusableElements = getFocusableElements(container)
        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]
        
        if (event.shiftKey) {
          // Shift + Tab - backward
          if (document.activeElement === firstElement) {
            event.preventDefault()
            lastElement?.focus()
          }
        } else {
          // Tab - forward
          if (document.activeElement === lastElement) {
            event.preventDefault()
            firstElement?.focus()
          }
        }
      } else if (event.key === 'Escape' && options.escapeDeactivates !== false) {
        event.preventDefault()
        releaseFocus()
      }
    }

    // Handle clicks outside trap
    const handleOutsideClick = (event: MouseEvent) => {
      if (options.clickOutsideDeactivates !== false && 
          !container.contains(event.target as Node)) {
        if (options.allowOutsideClick) {
          return
        }
        event.preventDefault()
        event.stopPropagation()
        
        // Return focus to trap
        const focusableElements = getFocusableElements(container)
        if (focusableElements.length > 0) {
          focusableElements[0].focus()
        }
      }
    }

    document.addEventListener('keydown', handleTrapKeydown)
    document.addEventListener('click', handleOutsideClick, true)

    const releaseTrap = () => {
      document.removeEventListener('keydown', handleTrapKeydown)
      document.removeEventListener('click', handleOutsideClick, true)
      
      focusTrapRef.current.isActive = false
      
      // Return focus to previous element
      if (options.finalFocus) {
        const finalElement = typeof options.finalFocus === 'string'
          ? document.querySelector(options.finalFocus) as HTMLElement
          : options.finalFocus
        finalElement?.focus()
      } else if (previousFocus) {
        previousFocus.focus()
      }
      
      updateFocusableElements()
    }

    return releaseTrap
  }, [enableFocusTrapping, getFocusableElements, updateFocusableElements])

  // Release focus trap
  const releaseFocus = useCallback(() => {
    if (focusTrapRef.current.isActive) {
      // This will be handled by the trap cleanup
      focusTrapRef.current.isActive = false
    }
  }, [])

  // Move focus to specific element
  const moveFocusTo = useCallback((element: HTMLElement | string): boolean => {
    try {
      const targetElement = typeof element === 'string'
        ? document.querySelector(element) as HTMLElement
        : element

      if (targetElement && typeof targetElement.focus === 'function') {
        targetElement.focus()
        
        if (enableAriaAnnouncements) {
          const elementName = targetElement.getAttribute('aria-label') ||
                             targetElement.getAttribute('alt') ||
                             targetElement.textContent ||
                             targetElement.tagName.toLowerCase()
          
          announce(`Focused on ${elementName}`)
        }
        
        return true
      }
    } catch (error) {
      console.error('Error moving focus:', error)
    }
    return false
  }, [announce, enableAriaAnnouncements])

  // Navigate grid layout
  const navigateGrid = useCallback((
    direction: 'up' | 'down' | 'left' | 'right',
    wrap: boolean = false
  ): boolean => {
    const currentFocus = document.activeElement as HTMLElement
    const currentIndex = focusableElements.indexOf(currentFocus)
    
    if (currentIndex === -1) return false

    // Estimate grid columns based on element positions
    const elements = focusableElements
    const gridColumns = estimateGridColumns(elements)
    
    let newIndex: number
    
    switch (direction) {
      case 'left':
        newIndex = currentIndex - 1
        if (newIndex < 0 && wrap) {
          newIndex = elements.length - 1
        }
        break
      case 'right':
        newIndex = currentIndex + 1
        if (newIndex >= elements.length && wrap) {
          newIndex = 0
        }
        break
      case 'up':
        newIndex = currentIndex - gridColumns
        if (newIndex < 0 && wrap) {
          newIndex = Math.max(0, elements.length - gridColumns + (currentIndex % gridColumns))
        }
        break
      case 'down':
        newIndex = currentIndex + gridColumns
        if (newIndex >= elements.length && wrap) {
          newIndex = currentIndex % gridColumns
        }
        break
      default:
        return false
    }

    if (newIndex >= 0 && newIndex < elements.length) {
      return moveFocusTo(elements[newIndex])
    }
    
    return false
  }, [focusableElements, moveFocusTo])

  // Navigate list layout
  const navigateList = useCallback((
    direction: 'up' | 'down' | 'home' | 'end',
    wrap: boolean = false
  ): boolean => {
    const currentFocus = document.activeElement as HTMLElement
    const currentIndex = focusableElements.indexOf(currentFocus)
    
    let newIndex: number
    
    switch (direction) {
      case 'up':
        newIndex = currentIndex - 1
        if (newIndex < 0 && wrap) {
          newIndex = focusableElements.length - 1
        }
        break
      case 'down':
        newIndex = currentIndex + 1
        if (newIndex >= focusableElements.length && wrap) {
          newIndex = 0
        }
        break
      case 'home':
        newIndex = 0
        break
      case 'end':
        newIndex = focusableElements.length - 1
        break
      default:
        return false
    }

    if (newIndex >= 0 && newIndex < focusableElements.length) {
      return moveFocusTo(focusableElements[newIndex])
    }
    
    return false
  }, [focusableElements, moveFocusTo])

  // Announce available shortcuts
  const announceShortcuts = useCallback(() => {
    if (!enableAriaAnnouncements) return

    const activeShortcuts = shortcutsRef.current.filter(shortcut => 
      !shortcut.scope || shortcut.scope === currentScope || shortcut.scope === 'global'
    )

    if (activeShortcuts.length === 0) {
      announce('No keyboard shortcuts available')
      return
    }

    const shortcutDescriptions = activeShortcuts.map(shortcut => {
      const keys = Array.isArray(shortcut.key) ? shortcut.key.join(' or ') : shortcut.key
      return `${keys}: ${shortcut.description}`
    }).join('. ')

    announce(`Available keyboard shortcuts: ${shortcutDescriptions}`)
  }, [currentScope, announce, enableAriaAnnouncements])

  // Announce navigation
  const announceNavigation = useCallback((message: string) => {
    if (enableAriaAnnouncements) {
      announce(message)
    }
  }, [announce, enableAriaAnnouncements])

  // Estimate grid columns from element positions
  const estimateGridColumns = useCallback((elements: HTMLElement[]): number => {
    if (elements.length < 2) return 1

    const positions = elements.map(el => {
      const rect = el.getBoundingClientRect()
      return { element: el, top: rect.top, left: rect.left }
    })

    // Count elements with the same top position as the first element
    const firstTop = positions[0].top
    const firstRowElements = positions.filter(pos => Math.abs(pos.top - firstTop) < 5)
    
    return Math.max(1, firstRowElements.length)
  }, [])

  // Set up global keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardEvent)
    return () => {
      document.removeEventListener('keydown', handleKeyboardEvent)
    }
  }, [handleKeyboardEvent])

  // Update focusable elements when DOM changes
  useEffect(() => {
    const observer = new MutationObserver(updateFocusableElements)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['tabindex', 'disabled', 'inert']
    })

    updateFocusableElements()

    return () => {
      observer.disconnect()
    }
  }, [updateFocusableElements])

  const contextValue: KeyboardNavigationContextValue = {
    registerShortcuts,
    unregisterShortcuts,
    trapFocus,
    releaseFocus,
    moveFocusTo,
    navigateGrid,
    navigateList,
    announceShortcuts,
    announceNavigation,
    currentScope,
    isTrapped: focusTrapRef.current.isActive,
    focusableElements
  }

  return (
    <KeyboardNavigationContext.Provider value={contextValue}>
      {children}
    </KeyboardNavigationContext.Provider>
  )
}

// Hook to use Keyboard Navigation
export const useKeyboardNavigation = (): KeyboardNavigationContextValue => {
  const context = useContext(KeyboardNavigationContext)
  if (!context) {
    throw new Error('useKeyboardNavigation must be used within a KeyboardNavigationProvider')
  }
  return context
}

// Common keyboard shortcuts for image management
export const IMAGE_GRID_SHORTCUTS: KeyboardShortcut[] = [
  {
    key: 'ArrowLeft',
    description: 'Navigate to previous image',
    action: () => {}, // Will be overridden by component
    scope: 'grid'
  },
  {
    key: 'ArrowRight', 
    description: 'Navigate to next image',
    action: () => {}, // Will be overridden by component
    scope: 'grid'
  },
  {
    key: 'Enter',
    description: 'Open selected image',
    action: () => {}, // Will be overridden by component
    scope: 'grid'
  },
  {
    key: 'Space',
    description: 'Select/deselect image',
    action: () => {}, // Will be overridden by component
    scope: 'grid'
  },
  {
    key: 'Home',
    description: 'Go to first image',
    action: () => {}, // Will be overridden by component
    scope: 'grid'
  },
  {
    key: 'End',
    description: 'Go to last image',
    action: () => {}, // Will be overridden by component
    scope: 'grid'
  },
  {
    key: 'Delete',
    description: 'Delete selected image',
    action: () => {}, // Will be overridden by component
    scope: 'grid'
  },
  {
    key: '?',
    description: 'Show keyboard shortcuts',
    action: (event) => {
      // Will be handled by provider
    },
    scope: 'global'
  }
]

export default KeyboardNavigationProvider