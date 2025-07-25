import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ImagePreviewModal } from '../ImagePreviewModal'
import type { Media } from '@/lib/types/api'

const mockMedia: Media = {
  id: 'test-id',
  project_id: 'project-123',
  file_name: 'test-image.jpg',
  file_path: '/api/media/test-image.jpg',
  file_size: 1024000,
  mime_type: 'image/jpeg',
  uploaded_by: 'user-123',
  uploaded_at: '2025-01-24T12:00:00Z'
}

vi.mock('../ImageViewer', () => ({
  ImageViewer: ({ src, alt }: { src: string; alt: string }) => (
    <div data-testid="image-viewer" data-src={src} data-alt={alt}>
      Mock ImageViewer
    </div>
  )
}))

describe('ImagePreviewModal', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <ImagePreviewModal
        media={mockMedia}
        isOpen={false}
        onClose={vi.fn()}
        projectId="project-123"
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders modal when isOpen is true', () => {
    render(
      <ImagePreviewModal
        media={mockMedia}
        isOpen={true}
        onClose={vi.fn()}
        projectId="project-123"
      />
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('test-image.jpg')).toBeInTheDocument()
    expect(screen.getByText(/0.98 MB/)).toBeInTheDocument()
    expect(screen.getByText(/image\/jpeg/)).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    
    render(
      <ImagePreviewModal
        media={mockMedia}
        isOpen={true}
        onClose={onClose}
        projectId="project-123"
      />
    )

    const closeButton = screen.getByLabelText('Close image preview')
    fireEvent.click(closeButton)
    
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when ESC key is pressed', () => {
    const onClose = vi.fn()
    
    render(
      <ImagePreviewModal
        media={mockMedia}
        isOpen={true}
        onClose={onClose}
        projectId="project-123"
      />
    )

    fireEvent.keyDown(document, { key: 'Escape' })
    
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows navigation buttons when showNavigation is true', () => {
    const onNavigate = vi.fn()
    
    render(
      <ImagePreviewModal
        media={mockMedia}
        isOpen={true}
        onClose={vi.fn()}
        onNavigate={onNavigate}
        showNavigation={true}
        projectId="project-123"
      />
    )

    expect(screen.getByLabelText('Previous image')).toBeInTheDocument()
    expect(screen.getByLabelText('Next image')).toBeInTheDocument()
  })

  it('hides navigation buttons when showNavigation is false', () => {
    render(
      <ImagePreviewModal
        media={mockMedia}
        isOpen={true}
        onClose={vi.fn()}
        showNavigation={false}
        projectId="project-123"
      />
    )

    expect(screen.queryByLabelText('Previous image')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Next image')).not.toBeInTheDocument()
  })

  it('calls onNavigate with correct direction when navigation buttons are clicked', () => {
    const onNavigate = vi.fn()
    
    render(
      <ImagePreviewModal
        media={mockMedia}
        isOpen={true}
        onClose={vi.fn()}
        onNavigate={onNavigate}
        showNavigation={true}
        projectId="project-123"
      />
    )

    fireEvent.click(screen.getByLabelText('Previous image'))
    expect(onNavigate).toHaveBeenCalledWith('prev')

    fireEvent.click(screen.getByLabelText('Next image'))
    expect(onNavigate).toHaveBeenCalledWith('next')
  })

  it('handles arrow key navigation when showNavigation is true', () => {
    const onNavigate = vi.fn()
    
    render(
      <ImagePreviewModal
        media={mockMedia}
        isOpen={true}
        onClose={vi.fn()}
        onNavigate={onNavigate}
        showNavigation={true}
        projectId="project-123"
      />
    )

    fireEvent.keyDown(document, { key: 'ArrowLeft' })
    expect(onNavigate).toHaveBeenCalledWith('prev')

    fireEvent.keyDown(document, { key: 'ArrowRight' })
    expect(onNavigate).toHaveBeenCalledWith('next')
  })

  it('prevents body scroll when modal is open', () => {
    render(
      <ImagePreviewModal
        media={mockMedia}
        isOpen={true}
        onClose={vi.fn()}
        projectId="project-123"
      />
    )

    expect(document.body.style.overflow).toBe('hidden')
  })

  it('restores body scroll when modal closes', () => {
    const { rerender } = render(
      <ImagePreviewModal
        media={mockMedia}
        isOpen={true}
        onClose={vi.fn()}
        projectId="project-123"
      />
    )

    rerender(
      <ImagePreviewModal
        media={mockMedia}
        isOpen={false}
        onClose={vi.fn()}
        projectId="project-123"
      />
    )

    expect(document.body.style.overflow).toBe('unset')
  })
})