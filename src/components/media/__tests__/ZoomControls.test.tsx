import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ZoomControls } from '../ZoomControls'

describe('ZoomControls', () => {
  const defaultProps = {
    scale: 1.0,
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onReset: vi.fn(),
    onFit: vi.fn(),
    minScale: 0.1,
    maxScale: 5.0
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all zoom control buttons', () => {
    render(<ZoomControls {...defaultProps} />)

    expect(screen.getByLabelText('Zoom in')).toBeInTheDocument()
    expect(screen.getByLabelText('Zoom out')).toBeInTheDocument()
    expect(screen.getByLabelText('Reset zoom')).toBeInTheDocument()
    expect(screen.getByLabelText('Fit to screen')).toBeInTheDocument()
  })

  it('displays current scale percentage', () => {
    render(<ZoomControls {...defaultProps} scale={1.5} />)
    expect(screen.getByText('150%')).toBeInTheDocument()
  })

  it('calls onZoomIn when zoom in button is clicked', () => {
    const onZoomIn = vi.fn()
    
    render(<ZoomControls {...defaultProps} onZoomIn={onZoomIn} />)
    
    fireEvent.click(screen.getByLabelText('Zoom in'))
    expect(onZoomIn).toHaveBeenCalledTimes(1)
  })

  it('calls onZoomOut when zoom out button is clicked', () => {
    const onZoomOut = vi.fn()
    
    render(<ZoomControls {...defaultProps} onZoomOut={onZoomOut} />)
    
    fireEvent.click(screen.getByLabelText('Zoom out'))
    expect(onZoomOut).toHaveBeenCalledTimes(1)
  })

  it('calls onReset when reset button is clicked', () => {
    const onReset = vi.fn()
    
    render(<ZoomControls {...defaultProps} onReset={onReset} />)
    
    fireEvent.click(screen.getByLabelText('Reset zoom'))
    expect(onReset).toHaveBeenCalledTimes(1)
  })

  it('calls onFit when fit button is clicked', () => {
    const onFit = vi.fn()
    
    render(<ZoomControls {...defaultProps} onFit={onFit} />)
    
    fireEvent.click(screen.getByLabelText('Fit to screen'))
    expect(onFit).toHaveBeenCalledTimes(1)
  })

  it('disables zoom in button when at max scale', () => {
    render(<ZoomControls {...defaultProps} scale={5.0} maxScale={5.0} />)
    
    const zoomInButton = screen.getByLabelText('Zoom in')
    expect(zoomInButton).toBeDisabled()
  })

  it('disables zoom out button when at min scale', () => {
    render(<ZoomControls {...defaultProps} scale={0.1} minScale={0.1} />)
    
    const zoomOutButton = screen.getByLabelText('Zoom out')
    expect(zoomOutButton).toBeDisabled()
  })

  it('enables zoom in button when below max scale', () => {
    render(<ZoomControls {...defaultProps} scale={2.0} maxScale={5.0} />)
    
    const zoomInButton = screen.getByLabelText('Zoom in')
    expect(zoomInButton).not.toBeDisabled()
  })

  it('enables zoom out button when above min scale', () => {
    render(<ZoomControls {...defaultProps} scale={1.0} minScale={0.1} />)
    
    const zoomOutButton = screen.getByLabelText('Zoom out')
    expect(zoomOutButton).not.toBeDisabled()
  })

  it('always enables reset and fit buttons', () => {
    render(<ZoomControls {...defaultProps} scale={0.1} />)
    
    expect(screen.getByLabelText('Reset zoom')).not.toBeDisabled()
    expect(screen.getByLabelText('Fit to screen')).not.toBeDisabled()
  })

  it('rounds scale percentage to whole number', () => {
    render(<ZoomControls {...defaultProps} scale={1.555} />)
    expect(screen.getByText('156%')).toBeInTheDocument()
  })
})