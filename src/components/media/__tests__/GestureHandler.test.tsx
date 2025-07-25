import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import GestureHandler, { GestureHandlerRef } from '../GestureHandler'

// Mock the hooks
vi.mock('@/lib/hooks/usePinchZoom', () => ({
  usePinchZoom: vi.fn(() => ({
    scale: 1,
    position: { x: 0, y: 0 },
    isZooming: false,
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    resetZoom: vi.fn(),
    setZoom: vi.fn(),
    gesture: {
      type: 'IDLE',
      active: false,
      touches: []
    }
  }))
}))

vi.mock('@/lib/hooks/useSwipeNavigation', () => ({
  useSwipeNavigation: vi.fn(() => ({
    gesture: {
      type: 'IDLE',
      active: false,
      touches: []
    },
    isSwipeActive: false,
    lastSwipeDirection: null
  }))
}))

vi.mock('@/lib/hooks/useLongPress', () => ({
  useLongPress: vi.fn(() => ({
    isLongPressing: false,
    progress: 0,
    position: null,
    gesture: {
      type: 'IDLE',
      active: false,
      touches: []
    },
    cancel: vi.fn()
  }))
}))

const TestImage = () => (
  <div 
    data-testid="test-image"
    style={{ width: '200px', height: '150px', backgroundColor: '#f0f0f0' }}
  >
    Test Image
  </div>
)

describe('GestureHandler', () => {
  let mockOnZoomChange: ReturnType<typeof vi.fn>
  let mockOnSwipeLeft: ReturnType<typeof vi.fn>
  let mockOnLongPress: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockOnZoomChange = vi.fn()
    mockOnSwipeLeft = vi.fn()
    mockOnLongPress = vi.fn()
    vi.clearAllMocks()
  })

  it('should render children correctly', () => {
    render(
      <GestureHandler>
        <TestImage />
      </GestureHandler>
    )

    expect(screen.getByTestId('test-image')).toBeInTheDocument()
  })

  it('should apply correct container styles', () => {
    const { container } = render(
      <GestureHandler className="custom-class">
        <TestImage />
      </GestureHandler>
    )

    const gestureContainer = container.firstChild as HTMLElement
    expect(gestureContainer).toHaveClass('custom-class')
    expect(gestureContainer).toHaveStyle({
      position: 'relative',
      overflow: 'hidden',
      touchAction: 'none',
      userSelect: 'none'
    })
  })

  it('should pass options to pinch zoom hook', async () => {
    const { usePinchZoom } = await import('@/lib/hooks/usePinchZoom')
    
    render(
      <GestureHandler
        pinchZoomOptions={{
          minScale: 0.5,
          maxScale: 3.0,
          initialScale: 1.5
        }}
        onZoomChange={mockOnZoomChange}
      >
        <TestImage />
      </GestureHandler>
    )

    expect(usePinchZoom).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        minScale: 0.5,
        maxScale: 3.0,
        initialScale: 1.5
      }),
      mockOnZoomChange
    )
  })

  it('should pass swipe options correctly', async () => {
    const { useSwipeNavigation } = await import('@/lib/hooks/useSwipeNavigation')
    
    render(
      <GestureHandler
        swipeOptions={{
          onSwipeLeft: mockOnSwipeLeft,
          swipeThreshold: 100
        }}
      >
        <TestImage />
      </GestureHandler>
    )

    expect(useSwipeNavigation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        onSwipeLeft: mockOnSwipeLeft,
        swipeThreshold: 100,
        currentZoom: 1,
        preventSwipeOnZoom: true
      })
    )
  })

  it('should handle long press options', async () => {
    const { useLongPress } = await import('@/lib/hooks/useLongPress')
    
    render(
      <GestureHandler
        longPressOptions={{
          onLongPress: mockOnLongPress,
          delay: 600
        }}
      >
        <TestImage />
      </GestureHandler>
    )

    expect(useLongPress).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        onLongPress: mockOnLongPress,
        delay: 600
      })
    )
  })

  it('should disable gestures when enablePinchZoom is false', async () => {
    const { usePinchZoom } = await import('@/lib/hooks/usePinchZoom')
    
    render(
      <GestureHandler enablePinchZoom={false}>
        <TestImage />
      </GestureHandler>
    )

    expect(usePinchZoom).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        minScale: 1,
        maxScale: 1
      }),
      undefined
    )
  })

  it('should disable swipe navigation when enableSwipeNavigation is false', async () => {
    const { useSwipeNavigation } = await import('@/lib/hooks/useSwipeNavigation')
    
    render(
      <GestureHandler enableSwipeNavigation={false}>
        <TestImage />
      </GestureHandler>
    )

    expect(useSwipeNavigation).toHaveBeenCalledWith(
      null,
      expect.anything()
    )
  })

  it('should disable long press when enableLongPress is false', async () => {
    const { useLongPress } = await import('@/lib/hooks/useLongPress')
    
    render(
      <GestureHandler enableLongPress={false}>
        <TestImage />
      </GestureHandler>
    )

    expect(useLongPress).toHaveBeenCalledWith(
      null,
      expect.objectContaining({
        onLongPress: expect.any(Function)
      })
    )
  })

  it('should prevent default browser behaviors', () => {
    const { container } = render(
      <GestureHandler>
        <TestImage />
      </GestureHandler>
    )

    const gestureContainer = container.firstChild as HTMLElement
    
    // Mock context menu event
    const contextMenuEvent = new Event('contextmenu', { bubbles: true, cancelable: true })
    const preventDefaultSpy = vi.spyOn(contextMenuEvent, 'preventDefault')
    
    fireEvent(gestureContainer, contextMenuEvent)
    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  it('should expose public API through ref', () => {
    const ref = React.createRef<GestureHandlerRef>()
    
    render(
      <GestureHandler ref={ref}>
        <TestImage />
      </GestureHandler>
    )

    expect(ref.current).toMatchObject({
      zoomIn: expect.any(Function),
      zoomOut: expect.any(Function),
      resetZoom: expect.any(Function),
      setZoom: expect.any(Function),
      getZoomState: expect.any(Function),
      cancelLongPress: expect.any(Function)
    })
  })

  it('should apply zoom transform to children', async () => {
    const { usePinchZoom } = await import('@/lib/hooks/usePinchZoom')
    
    // Mock zoom state
    ;(usePinchZoom as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      scale: 2,
      position: { x: 10, y: 20 },
      isZooming: false,
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      resetZoom: vi.fn(),
      setZoom: vi.fn()
    })

    const { container } = render(
      <GestureHandler>
        <TestImage />
      </GestureHandler>
    )

    const transformedDiv = container.querySelector('div > div') as HTMLElement
    expect(transformedDiv).toHaveStyle({
      transform: 'translate(10px, 20px) scale(2)',
      transformOrigin: 'center center'
    })
  })

  it('should show long press visual feedback', async () => {
    const { useLongPress } = await import('@/lib/hooks/useLongPress')
    
    // Mock long press state with progress
    ;(useLongPress as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isLongPressing: false,
      progress: 0.5,
      position: { x: 100, y: 150 },
      cancel: vi.fn()
    })

    const { container } = render(
      <GestureHandler
        enableLongPress={true}
        longPressOptions={{
          onLongPress: mockOnLongPress
        }}
      >
        <TestImage />
      </GestureHandler>
    )

    // Check for long press indicator
    const longPressIndicator = container.querySelector('[style*="rgba(255, 255, 255, 0.8)"]')
    expect(longPressIndicator).toBeInTheDocument()
  })

  it('should handle custom className and style props', () => {
    const customStyle = { backgroundColor: 'red', border: '1px solid blue' }
    
    const { container } = render(
      <GestureHandler
        className="test-gesture-handler"
        style={customStyle}
      >
        <TestImage />
      </GestureHandler>
    )

    const gestureContainer = container.firstChild as HTMLElement
    expect(gestureContainer).toHaveClass('test-gesture-handler')
    expect(gestureContainer).toHaveStyle(customStyle)
  })
})