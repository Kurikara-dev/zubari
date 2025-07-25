'use client'

import React, { useState, useEffect, useRef, useCallback, RefObject } from 'react'

// Lazy loading hook options
export interface UseLazyLoadingOptions {
  // Intersection Observer options
  root?: Element | null
  rootMargin?: string
  threshold?: number | number[]
  
  // Loading behavior
  triggerOnce?: boolean
  enabled?: boolean
  
  // Preloading
  preloadMargin?: string
  
  // Callbacks
  onEnter?: () => void
  onExit?: () => void
  onLoad?: () => void
  onError?: (error: Error) => void
}

// Lazy loading state
export interface LazyLoadingState {
  isVisible: boolean
  hasLoaded: boolean
  isLoading: boolean
  error: Error | null
  hasEntered: boolean
}

// Default options
const DEFAULT_OPTIONS: Required<Omit<UseLazyLoadingOptions, 'root' | 'onEnter' | 'onExit' | 'onLoad' | 'onError'>> = {
  rootMargin: '100px',
  threshold: 0.1,
  triggerOnce: true,
  enabled: true,
  preloadMargin: '200px'
}

/**
 * Custom hook for lazy loading with Intersection Observer
 */
export function useLazyLoading<T extends HTMLElement = HTMLElement>(
  options: UseLazyLoadingOptions = {}
): [RefObject<T | null>, LazyLoadingState] {
  const elementRef = useRef<T | null>(null)
  
  const [state, setState] = useState<LazyLoadingState>({
    isVisible: false,
    hasLoaded: false,
    isLoading: false,
    error: null,
    hasEntered: false
  })

  const config = { ...DEFAULT_OPTIONS, ...options }

  // Handle intersection changes
  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const entry = entries[0]
      const isIntersecting = entry.isIntersecting

      setState(prev => {
        const newState = {
          ...prev,
          isVisible: isIntersecting
        }

        // Track if element has entered viewport at least once
        if (isIntersecting && !prev.hasEntered) {
          newState.hasEntered = true
          options.onEnter?.()
        }

        // Handle exit
        if (!isIntersecting && prev.isVisible) {
          options.onExit?.()
        }

        return newState
      })
    },
    [options]
  )

  // Set up Intersection Observer
  useEffect(() => {
    const element = elementRef.current
    if (!element || !config.enabled) return

    // Check if browser supports Intersection Observer
    if (!window.IntersectionObserver) {
      console.warn('IntersectionObserver not supported, defaulting to visible')
      setState(prev => ({
        ...prev,
        isVisible: true,
        hasEntered: true
      }))
      return
    }

    const observer = new IntersectionObserver(handleIntersection, {
      root: config.root,
      rootMargin: config.rootMargin,
      threshold: config.threshold
    })

    observer.observe(element)

    return () => {
      observer.unobserve(element)
      observer.disconnect()
    }
  }, [config.enabled, config.root, config.rootMargin, config.threshold, handleIntersection])

  // Clean up if triggerOnce and already triggered
  useEffect(() => {
    if (config.triggerOnce && state.hasEntered) {
      const element = elementRef.current
      if (element) {
        // We can optionally disconnect the observer here for performance
        // but keeping it active allows for re-entry tracking
      }
    }
  }, [config.triggerOnce, state.hasEntered])

  return [elementRef, state]
}

/**
 * Enhanced lazy loading hook specifically for images
 */
export function useLazyImage(
  src?: string,
  options: UseLazyLoadingOptions = {}
): [
  RefObject<HTMLImageElement | null>, 
  LazyLoadingState & { 
    imageSrc: string | undefined
    shouldLoad: boolean
  }
] {
  const [ref, baseState] = useLazyLoading<HTMLImageElement>(options)
  const [imageState, setImageState] = useState({
    imageSrc: undefined as string | undefined,
    shouldLoad: false,
    naturalDimensions: { width: 0, height: 0 }
  })

  const shouldLoad = baseState.isVisible || baseState.hasEntered
  const _imageSrc = shouldLoad ? src : undefined // eslint-disable-line @typescript-eslint/no-unused-vars -- Reserved for conditional loading

  // Update loading state when src changes
  useEffect(() => {
    if (shouldLoad && src && !baseState.hasLoaded) {
      setImageState(prev => ({
        ...prev,
        imageSrc: src,
        shouldLoad: true
      }))
    }
  }, [shouldLoad, src, baseState.hasLoaded])

  // Handle image load
  const handleImageLoad = useCallback((event: Event) => {
    const img = event.target as HTMLImageElement

    setImageState(prev => ({
      ...prev,
      naturalDimensions: {
        width: img.naturalWidth,
        height: img.naturalHeight
      }
    }))

    options.onLoad?.()
  }, [options])

  // Handle image error
  const handleImageError = useCallback((_event: Event) => { // eslint-disable-line @typescript-eslint/no-unused-vars
    const error = new Error('Failed to load image')

    options.onError?.(error)
  }, [options])

  // Attach image event listeners
  useEffect(() => {
    const img = ref.current
    if (!img || !shouldLoad) return

    img.addEventListener('load', handleImageLoad)
    img.addEventListener('error', handleImageError)

    return () => {
      img.removeEventListener('load', handleImageLoad)
      img.removeEventListener('error', handleImageError)
    }
  }, [shouldLoad, handleImageLoad, handleImageError, ref])

  return [
    ref,
    {
      ...baseState,
      ...imageState
    }
  ]
}

/**
 * Preloader hook for aggressive image preloading
 */
export function useImagePreloader(
  urls: string[],
  options: { 
    preloadThreshold?: number
    onProgress?: (loaded: number, total: number) => void
  } = {}
): {
  loadedUrls: Set<string>
  progress: number
  isComplete: boolean
} {
  const [loadedUrls, setLoadedUrls] = useState<Set<string>>(new Set())
  const [progress, setProgress] = useState(0)
  const isComplete = loadedUrls.size === urls.length

  useEffect(() => {
    if (urls.length === 0) return

    const preloadImages = async () => {
      const loadPromises = urls.map((url) => {
        return new Promise<string>((resolve, reject) => {
          const img = new Image()
          
          img.onload = () => {
            setLoadedUrls(prev => {
              const newSet = new Set(prev)
              newSet.add(url)
              return newSet
            })
            resolve(url)
          }
          
          img.onerror = () => {
            console.warn(`Failed to preload image: ${url}`)
            reject(new Error(`Failed to preload ${url}`))
          }
          
          img.src = url
        })
      })

      // Track progress
      let loaded = 0
      for (const promise of loadPromises) {
        try {
          await promise
          loaded++
          const newProgress = (loaded / urls.length) * 100
          setProgress(newProgress)
          options.onProgress?.(loaded, urls.length)
        } catch (_error) { // eslint-disable-line @typescript-eslint/no-unused-vars
          // Continue with other images even if one fails
          loaded++
          setProgress((loaded / urls.length) * 100)
          options.onProgress?.(loaded, urls.length)
        }
      }
    }

    preloadImages()
  }, [urls, options])

  return {
    loadedUrls,
    progress,
    isComplete
  }
}

/**
 * Utility hook for batch lazy loading
 */
export function useBatchLazyLoading<T extends HTMLElement = HTMLElement>(
  itemCount: number,
  _batchSize: number = 10, // eslint-disable-line @typescript-eslint/no-unused-vars -- Reserved for batch processing
  _options: UseLazyLoadingOptions = {}
): {
  refs: RefObject<T | null>[]
  states: LazyLoadingState[]
  visibleRange: { start: number; end: number }
} {
  const refs = useRef<RefObject<T | null>[]>([])
  const [states, setStates] = useState<LazyLoadingState[]>([])
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 })

  // Initialize refs array
  useEffect(() => {
    const currentLength = refs.current.length
    if (currentLength < itemCount) {
      // Add new refs
      const newRefs = Array.from({ length: itemCount - currentLength }, () => ({ current: null }))
      refs.current = [...refs.current, ...newRefs]
    } else if (currentLength > itemCount) {
      // Remove excess refs
      refs.current = refs.current.slice(0, itemCount)
    }
  }, [itemCount])

  // Set up observers for each batch
  useEffect(() => {
    const observers: IntersectionObserver[] = []
    const newStates: LazyLoadingState[] = Array(itemCount).fill({
      isVisible: false,
      hasLoaded: false,
      isLoading: false,
      error: null,
      hasEntered: false
    })

    refs.current.forEach((ref, index) => {
      if (!ref.current) return

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const isVisible = entry.isIntersecting
            newStates[index] = {
              ...newStates[index],
              isVisible,
              hasEntered: newStates[index].hasEntered || isVisible
            }
          })
          
          setStates([...newStates])
          
          // Update visible range
          const visibleIndices = newStates
            .map((state, i) => state.isVisible ? i : -1)
            .filter(i => i !== -1)
          
          if (visibleIndices.length > 0) {
            setVisibleRange({
              start: Math.min(...visibleIndices),
              end: Math.max(...visibleIndices)
            })
          }
        },
        {
          root: _options.root,
          rootMargin: _options.rootMargin || '100px',
          threshold: _options.threshold || 0.1
        }
      )

      observer.observe(ref.current)
      observers.push(observer)
    })

    return () => {
      observers.forEach(observer => observer.disconnect())
    }
  }, [itemCount, _options.root, _options.rootMargin, _options.threshold])

  return {
    refs: refs.current,
    states,
    visibleRange
  }
}

/**
 * Performance-optimized lazy loading for large lists
 */
export function useVirtualLazyLoading(
  itemCount: number,
  itemHeight: number,
  containerHeight: number,
  _options: UseLazyLoadingOptions = {} // eslint-disable-line @typescript-eslint/no-unused-vars -- Reserved for virtual scrolling options
) {
  const [scrollTop, setScrollTop] = useState(0)
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 })

  // Calculate visible range based on scroll position
  useEffect(() => {
    const start = Math.floor(scrollTop / itemHeight)
    const visibleCount = Math.ceil(containerHeight / itemHeight)
    const end = Math.min(start + visibleCount + 1, itemCount - 1)
    
    // Add buffer for smoother scrolling
    const buffer = Math.ceil(visibleCount * 0.5)
    const bufferedStart = Math.max(0, start - buffer)
    const bufferedEnd = Math.min(itemCount - 1, end + buffer)

    setVisibleRange({ start: bufferedStart, end: bufferedEnd })
  }, [scrollTop, itemHeight, containerHeight, itemCount])

  const handleScroll = useCallback((event: React.UIEvent<HTMLElement>) => {
    setScrollTop(event.currentTarget.scrollTop)
  }, [])

  return {
    visibleRange,
    handleScroll,
    isVisible: (index: number) => 
      index >= visibleRange.start && index <= visibleRange.end
  }
}