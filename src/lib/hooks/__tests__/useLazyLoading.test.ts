import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLazyLoading, useLazyImage, useImagePreloader } from '../useLazyLoading'

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn()
mockIntersectionObserver.mockReturnValue({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
})
window.IntersectionObserver = mockIntersectionObserver

describe('useLazyLoading', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useLazyLoading())
    
    const [ref, state] = result.current
    
    expect(ref).toBeDefined()
    expect(state).toEqual({
      isVisible: false,
      hasLoaded: false,
      isLoading: false,
      error: null,
      hasEntered: false
    })
  })

  it('should create IntersectionObserver with correct options', () => {
    const options = {
      rootMargin: '50px',
      threshold: 0.5
    }
    
    renderHook(() => useLazyLoading(options))
    
    expect(mockIntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        rootMargin: '50px',
        threshold: 0.5
      })
    )
  })

  it('should handle intersection changes', () => {
    let intersectionCallback: (entries: IntersectionObserverEntry[]) => void
    
    mockIntersectionObserver.mockImplementation((callback) => {
      intersectionCallback = callback
      return {
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn()
      }
    })

    const onEnter = vi.fn()
    const onExit = vi.fn()
    
    const { result } = renderHook(() => 
      useLazyLoading({ onEnter, onExit })
    )

    // Create a mock DOM element for the ref
    const mockElement = document.createElement('div')
    act(() => {
      result.current[0].current = mockElement
    })

    // Simulate intersection (entering viewport)
    act(() => {
      intersectionCallback([
        {
          isIntersecting: true,
          target: mockElement
        } as unknown as IntersectionObserverEntry
      ])
    })

    expect(result.current[1].isVisible).toBe(true)
    expect(result.current[1].hasEntered).toBe(true)
    expect(onEnter).toHaveBeenCalledTimes(1)

    // Simulate leaving viewport
    act(() => {
      intersectionCallback([
        {
          isIntersecting: false,
          target: mockElement
        } as unknown as IntersectionObserverEntry
      ])
    })

    expect(result.current[1].isVisible).toBe(false)
    expect(result.current[1].hasEntered).toBe(true) // Should remain true
    expect(onExit).toHaveBeenCalledTimes(1)
  })

  it('should disable when enabled is false', () => {
    renderHook(() => 
      useLazyLoading({ enabled: false })
    )
    
    expect(mockIntersectionObserver).not.toHaveBeenCalled()
  })

  it('should fallback when IntersectionObserver is not supported', () => {
    // Temporarily remove IntersectionObserver
    const originalIntersectionObserver = window.IntersectionObserver
    delete (window as unknown as { IntersectionObserver?: unknown }).IntersectionObserver

    const { result } = renderHook(() => useLazyLoading())
    
    // Should set visible to true as fallback
    expect(result.current[1].isVisible).toBe(true)
    expect(result.current[1].hasEntered).toBe(true)

    // Restore IntersectionObserver
    window.IntersectionObserver = originalIntersectionObserver
  })
})

describe('useLazyImage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should provide imageSrc when visible', () => {
    let intersectionCallback: (entries: IntersectionObserverEntry[]) => void
    
    mockIntersectionObserver.mockImplementation((callback) => {
      intersectionCallback = callback
      return {
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn()
      }
    })

    const testSrc = 'https://example.com/image.jpg'
    const { result } = renderHook(() => useLazyImage(testSrc))

    // Initially should not have imageSrc
    expect(result.current[1].imageSrc).toBeUndefined()
    expect(result.current[1].shouldLoad).toBe(false)

    // Create a mock DOM element for the ref
    const mockElement = document.createElement('img')
    act(() => {
      result.current[0].current = mockElement
    })

    // Simulate intersection (entering viewport)
    act(() => {
      intersectionCallback([
        {
          isIntersecting: true,
          target: mockElement
        } as unknown as IntersectionObserverEntry
      ])
    })

    expect(result.current[1].shouldLoad).toBe(true)
    expect(result.current[1].imageSrc).toBe(testSrc)
  })

  it('should handle image load and error events', () => {
    const onLoad = vi.fn()
    const onError = vi.fn()
    
    const { result } = renderHook(() => 
      useLazyImage('test.jpg', { onLoad, onError })
    )

    const mockElement = document.createElement('img')
    act(() => {
      result.current[0].current = mockElement
    })

    // Simulate image load
    act(() => {
      const loadEvent = new Event('load')
      Object.defineProperty(loadEvent, 'target', {
        value: { naturalWidth: 800, naturalHeight: 600 }
      })
      mockElement.dispatchEvent(loadEvent)
    })

    expect(onLoad).toHaveBeenCalledTimes(1)

    // Simulate image error
    act(() => {
      const errorEvent = new Event('error')
      mockElement.dispatchEvent(errorEvent)
    })

    expect(onError).toHaveBeenCalledTimes(1)
  })
})

describe('useImagePreloader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock Image constructor
    global.Image = class MockImage extends EventTarget {
      private _src: string = ''
      onload: ((event: Event) => void) | null = null
      onerror: ((event: Event) => void) | null = null

      constructor() {
        super()
      }

      get src(): string {
        return this._src
      }

      set src(value: string) {
        this._src = value
        setTimeout(() => {
          if (value.includes('error')) {
            this.onerror?.(new Event('error'))
          } else {
            this.onload?.(new Event('load'))
          }
        }, 10)
      }
    } as unknown as typeof Image
  })

  it('should preload images and track progress', async () => {
    const onProgress = vi.fn()
    const urls = [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg'
    ]

    const { result } = renderHook(() => 
      useImagePreloader(urls, { onProgress })
    )

    // Initially no images loaded
    expect(result.current.loadedUrls.size).toBe(0)
    expect(result.current.progress).toBe(0)
    expect(result.current.isComplete).toBe(false)

    // Wait for images to load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    expect(result.current.loadedUrls.size).toBe(2)
    expect(result.current.progress).toBe(100)
    expect(result.current.isComplete).toBe(true)
    expect(onProgress).toHaveBeenCalledWith(2, 2)
  })

  it('should handle image load failures gracefully', async () => {
    const onProgress = vi.fn()
    const urls = [
      'https://example.com/image1.jpg',
      'https://example.com/error.jpg' // This will trigger error
    ]

    const { result } = renderHook(() => 
      useImagePreloader(urls, { onProgress })
    )

    // Wait for images to load/fail
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    // Should still complete even with errors
    expect(result.current.progress).toBe(100)
    expect(onProgress).toHaveBeenCalledWith(2, 2)
  })

  it('should handle empty URL list', () => {
    const { result } = renderHook(() => useImagePreloader([]))
    
    expect(result.current.loadedUrls.size).toBe(0)
    expect(result.current.progress).toBe(0)
    expect(result.current.isComplete).toBe(true) // Empty list is considered complete
  })
})