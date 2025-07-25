import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useGestureRecognition, GestureType } from '../useGestureRecognition'

// Mock DOM element
const mockElement = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  getBoundingClientRect: vi.fn(() => ({
    left: 0,
    top: 0,
    width: 300,
    height: 200
  }))
} as unknown as HTMLElement

// Mock touch event
const createMockTouchEvent = (touches: Array<{ clientX: number; clientY: number; identifier: number }>) => ({
  touches: touches.map(touch => ({
    ...touch,
    target: mockElement,
    currentTarget: mockElement
  })),
  changedTouches: touches.map(touch => ({
    ...touch,
    target: mockElement,
    currentTarget: mockElement
  })),
  preventDefault: vi.fn(),
  stopPropagation: vi.fn()
} as unknown as TouchEvent)

describe('useGestureRecognition', () => {
  let mockOnGesture: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockOnGesture = vi.fn()
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should initialize with idle state', () => {
    const { result: _ } = renderHook(() => // eslint-disable-line @typescript-eslint/no-unused-vars
      useGestureRecognition(mockElement, {}, mockOnGesture)
    )

    expect(result.current.type).toBe(GestureType.IDLE)
    expect(result.current.active).toBe(false)
    expect(result.current.touches).toEqual([])
  })

  it('should detect single tap gesture', async () => {
    const { result: _ } = renderHook(() => // eslint-disable-line @typescript-eslint/no-unused-vars
      useGestureRecognition(mockElement, {}, mockOnGesture)
    )

    // Simulate touch start
    const touchEvent = createMockTouchEvent([{ clientX: 100, clientY: 100, identifier: 0 }])
    const touchStartHandler = mockElement.addEventListener.mock.calls.find(
      call => call[0] === 'touchstart'
    )?.[1] as EventListener

    act(() => {
      touchStartHandler(touchEvent)
    })

    // Simulate touch end quickly (tap)
    const touchEndHandler = mockElement.addEventListener.mock.calls.find(
      call => call[0] === 'touchend'
    )?.[1] as EventListener

    act(() => {
      touchEndHandler(touchEvent)
    })

    expect(mockOnGesture).toHaveBeenCalledWith(
      expect.objectContaining({
        type: GestureType.TAP,
        active: false
      })
    )
  })

  it('should detect double tap gesture', async () => {
    const { result: _ } = renderHook(() => // eslint-disable-line @typescript-eslint/no-unused-vars
      useGestureRecognition(mockElement, { doubleTapDelay: 300 }, mockOnGesture)
    )

    const touchEvent = createMockTouchEvent([{ clientX: 100, clientY: 100, identifier: 0 }])
    const touchStartHandler = mockElement.addEventListener.mock.calls.find(
      call => call[0] === 'touchstart'
    )?.[1] as EventListener

    // First tap
    act(() => {
      touchStartHandler(touchEvent)
    })

    // Advance time slightly and do second tap
    act(() => {
      vi.advanceTimersByTime(100)
      touchStartHandler(touchEvent)
    })

    expect(mockOnGesture).toHaveBeenCalledWith(
      expect.objectContaining({
        type: GestureType.DOUBLE_TAP,
        active: false
      })
    )
  })

  it('should detect long press gesture', async () => {
    const { result: _ } = renderHook(() => // eslint-disable-line @typescript-eslint/no-unused-vars
      useGestureRecognition(mockElement, { longPressDelay: 500 }, mockOnGesture)
    )

    const touchEvent = createMockTouchEvent([{ clientX: 100, clientY: 100, identifier: 0 }])
    const touchStartHandler = mockElement.addEventListener.mock.calls.find(
      call => call[0] === 'touchstart'
    )?.[1] as EventListener

    act(() => {
      touchStartHandler(touchEvent)
    })

    // Advance time to trigger long press
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(mockOnGesture).toHaveBeenCalledWith(
      expect.objectContaining({
        type: GestureType.LONG_PRESS,
        active: true
      })
    )
  })

  it('should detect horizontal swipe gesture', async () => {
    const { result: _ } = renderHook(() => // eslint-disable-line @typescript-eslint/no-unused-vars
      useGestureRecognition(mockElement, { swipeThreshold: 50 }, mockOnGesture)
    )

    const touchStartEvent = createMockTouchEvent([{ clientX: 100, clientY: 100, identifier: 0 }])
    const touchMoveEvent = createMockTouchEvent([{ clientX: 200, clientY: 100, identifier: 0 }])
    const touchEndEvent = createMockTouchEvent([{ clientX: 200, clientY: 100, identifier: 0 }])

    const touchStartHandler = mockElement.addEventListener.mock.calls.find(
      call => call[0] === 'touchstart'
    )?.[1] as EventListener
    const touchMoveHandler = mockElement.addEventListener.mock.calls.find(
      call => call[0] === 'touchmove'
    )?.[1] as EventListener
    const touchEndHandler = mockElement.addEventListener.mock.calls.find(
      call => call[0] === 'touchend'
    )?.[1] as EventListener

    act(() => {
      touchStartHandler(touchStartEvent)
    })

    act(() => {
      touchMoveHandler(touchMoveEvent)
    })

    act(() => {
      touchEndHandler(touchEndEvent)
    })

    expect(mockOnGesture).toHaveBeenCalledWith(
      expect.objectContaining({
        type: GestureType.SWIPE_RIGHT,
        active: false
      })
    )
  })

  it('should detect pinch gesture with two touches', async () => {
    const { result: _ } = renderHook(() => // eslint-disable-line @typescript-eslint/no-unused-vars
      useGestureRecognition(mockElement, {}, mockOnGesture)
    )

    const twoTouchEvent = createMockTouchEvent([
      { clientX: 100, clientY: 100, identifier: 0 },
      { clientX: 200, clientY: 100, identifier: 1 }
    ])

    const touchStartHandler = mockElement.addEventListener.mock.calls.find(
      call => call[0] === 'touchstart'
    )?.[1] as EventListener
    const touchMoveHandler = mockElement.addEventListener.mock.calls.find(
      call => call[0] === 'touchmove'
    )?.[1] as EventListener

    act(() => {
      touchStartHandler(twoTouchEvent)
    })

    // Move touches to simulate pinch
    const pinchMoveEvent = createMockTouchEvent([
      { clientX: 80, clientY: 100, identifier: 0 },
      { clientX: 220, clientY: 100, identifier: 1 }
    ])

    act(() => {
      touchMoveHandler(pinchMoveEvent)
    })

    expect(mockOnGesture).toHaveBeenCalledWith(
      expect.objectContaining({
        type: GestureType.PINCH,
        active: true,
        touches: expect.arrayContaining([
          expect.objectContaining({ id: 0 }),
          expect.objectContaining({ id: 1 })
        ])
      })
    )
  })

  it('should cleanup event listeners on unmount', () => {
    const { unmount } = renderHook(() =>
      useGestureRecognition(mockElement, {}, mockOnGesture)
    )

    // Verify event listeners were added
    expect(mockElement.addEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function), expect.any(Object))
    expect(mockElement.addEventListener).toHaveBeenCalledWith('touchmove', expect.any(Function), expect.any(Object))
    expect(mockElement.addEventListener).toHaveBeenCalledWith('touchend', expect.any(Function), expect.any(Object))
    expect(mockElement.addEventListener).toHaveBeenCalledWith('touchcancel', expect.any(Function), expect.any(Object))

    unmount()

    // Verify event listeners were removed
    expect(mockElement.removeEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function))
    expect(mockElement.removeEventListener).toHaveBeenCalledWith('touchmove', expect.any(Function))
    expect(mockElement.removeEventListener).toHaveBeenCalledWith('touchend', expect.any(Function))
    expect(mockElement.removeEventListener).toHaveBeenCalledWith('touchcancel', expect.any(Function))
  })

  it('should handle touch cancel events', async () => {
    const { result: _ } = renderHook(() => // eslint-disable-line @typescript-eslint/no-unused-vars
      useGestureRecognition(mockElement, {}, mockOnGesture)
    )

    const touchEvent = createMockTouchEvent([{ clientX: 100, clientY: 100, identifier: 0 }])
    const touchCancelHandler = mockElement.addEventListener.mock.calls.find(
      call => call[0] === 'touchcancel'
    )?.[1] as EventListener

    act(() => {
      touchCancelHandler(touchEvent)
    })

    expect(mockOnGesture).toHaveBeenCalledWith(
      expect.objectContaining({
        type: GestureType.IDLE,
        active: false,
        touches: []
      })
    )
  })

  it('should respect custom gesture options', async () => {
    const customOptions = {
      swipeThreshold: 100,
      swipeVelocity: 0.5,
      longPressDelay: 1000,
      doubleTapDelay: 500,
      pinchThreshold: 0.2
    }

    const { result: _ } = renderHook(() => // eslint-disable-line @typescript-eslint/no-unused-vars
      useGestureRecognition(mockElement, customOptions, mockOnGesture)
    )

    // Test that swipe requires higher threshold
    const touchStartEvent = createMockTouchEvent([{ clientX: 100, clientY: 100, identifier: 0 }])
    const shortSwipeEvent = createMockTouchEvent([{ clientX: 130, clientY: 100, identifier: 0 }]) // Only 30px
    const touchEndEvent = createMockTouchEvent([{ clientX: 130, clientY: 100, identifier: 0 }])

    const touchStartHandler = mockElement.addEventListener.mock.calls.find(
      call => call[0] === 'touchstart'
    )?.[1] as EventListener
    const touchMoveHandler = mockElement.addEventListener.mock.calls.find(
      call => call[0] === 'touchmove'
    )?.[1] as EventListener
    const touchEndHandler = mockElement.addEventListener.mock.calls.find(
      call => call[0] === 'touchend'
    )?.[1] as EventListener

    act(() => {
      touchStartHandler(touchStartEvent)
      touchMoveHandler(shortSwipeEvent)
      touchEndHandler(touchEndEvent)
    })

    // Should not detect swipe due to higher threshold
    expect(mockOnGesture).not.toHaveBeenCalledWith(
      expect.objectContaining({
        type: GestureType.SWIPE_RIGHT
      })
    )
  })
})