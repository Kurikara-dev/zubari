import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import FilePreview from '../FilePreview'

describe('FilePreview', () => {
  const mockFile = new File(['test content'], 'test-image.jpg', {
    type: 'image/jpeg',
    lastModified: Date.now()
  })

  const mockPreviewUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD'

  it('renders nothing when no file is provided', () => {
    const { container } = render(<FilePreview file={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders file preview with image thumbnail', () => {
    render(
      <FilePreview
        file={mockFile}
        previewUrl={mockPreviewUrl}
        showSize={true}
        showType={true}
      />
    )

    expect(screen.getByText('test-image.jpg')).toBeInTheDocument()
    expect(screen.getByText(/KB/)).toBeInTheDocument()
    expect(screen.getByText('image/jpeg')).toBeInTheDocument()
    expect(screen.getByAltText('プレビュー')).toBeInTheDocument()
  })

  it('renders file preview without image for non-image files', () => {
    const textFile = new File(['test'], 'test.txt', { type: 'text/plain' })
    
    render(
      <FilePreview
        file={textFile}
        showSize={true}
        showType={true}
      />
    )

    expect(screen.getByText('test.txt')).toBeInTheDocument()
    expect(screen.getByText('text/plain')).toBeInTheDocument()
    expect(screen.queryByAltText('プレビュー')).not.toBeInTheDocument()
  })

  it('calls onRemove when remove button is clicked', () => {
    const onRemove = vi.fn()
    
    render(
      <FilePreview
        file={mockFile}
        onRemove={onRemove}
      />
    )

    const removeButton = screen.getByLabelText('ファイルを削除')
    fireEvent.click(removeButton)
    
    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('disables remove button when disabled prop is true', () => {
    const onRemove = vi.fn()
    
    render(
      <FilePreview
        file={mockFile}
        onRemove={onRemove}
        disabled={true}
      />
    )

    const removeButton = screen.getByLabelText('ファイルを削除')
    expect(removeButton).toBeDisabled()
  })

  it('hides file size when showSize is false', () => {
    render(
      <FilePreview
        file={mockFile}
        showSize={false}
        showType={true}
      />
    )

    expect(screen.queryByText(/KB/)).not.toBeInTheDocument()
    expect(screen.getByText('image/jpeg')).toBeInTheDocument()
  })

  it('hides file type when showType is false', () => {
    render(
      <FilePreview
        file={mockFile}
        showSize={true}
        showType={false}
      />
    )

    expect(screen.getByText(/KB/)).toBeInTheDocument()
    expect(screen.queryByText('image/jpeg')).not.toBeInTheDocument()
  })
})