import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import UploadProgress from '../UploadProgress'

describe('UploadProgress', () => {
  it('renders nothing when status is idle and progress is 0', () => {
    const { container } = render(
      <UploadProgress
        progress={0}
        status="idle"
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders upload progress for uploading status', () => {
    render(
      <UploadProgress
        progress={45}
        status="uploading"
        fileName="test-image.jpg"
        showPercentage={true}
      />
    )

    expect(screen.getByText('test-image.jpg')).toBeInTheDocument()
    expect(screen.getByText('アップロード中...')).toBeInTheDocument()
    expect(screen.getByText('45%')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '45')
  })

  it('renders success status correctly', () => {
    render(
      <UploadProgress
        progress={100}
        status="success"
        fileName="test-image.jpg"
      />
    )

    expect(screen.getByText('アップロード完了')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
  })

  it('renders error status with custom error message', () => {
    const errorMessage = 'ファイルが大きすぎます'
    
    render(
      <UploadProgress
        progress={0}
        status="error"
        fileName="test-image.jpg"
        errorMessage={errorMessage}
      />
    )

    expect(screen.getByText(errorMessage)).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('renders default error message when no errorMessage provided', () => {
    render(
      <UploadProgress
        progress={0}
        status="error"
        fileName="test-image.jpg"
      />
    )

    expect(screen.getByText('アップロードエラー')).toBeInTheDocument()
  })

  it('calls onCancel when cancel button is clicked during upload', () => {
    const onCancel = vi.fn()
    
    render(
      <UploadProgress
        progress={30}
        status="uploading"
        fileName="test-image.jpg"
        onCancel={onCancel}
      />
    )

    const cancelButton = screen.getByLabelText('アップロードをキャンセル')
    fireEvent.click(cancelButton)
    
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('does not show cancel button when not uploading', () => {
    render(
      <UploadProgress
        progress={100}
        status="success"
        fileName="test-image.jpg"
        onCancel={vi.fn()}
      />
    )

    expect(screen.queryByLabelText('アップロードをキャンセル')).not.toBeInTheDocument()
  })

  it('applies correct size classes for different sizes', () => {
    const { rerender } = render(
      <UploadProgress
        progress={50}
        status="uploading"
        size="small"
      />
    )

    let progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveClass('h-1')

    rerender(
      <UploadProgress
        progress={50}
        status="uploading"
        size="large"
      />
    )

    progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveClass('h-3')
  })

  it('clamps progress value between 0 and 100', () => {
    const { rerender } = render(
      <UploadProgress
        progress={150}
        status="uploading"
        showPercentage={true}
      />
    )

    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')

    rerender(
      <UploadProgress
        progress={-20}
        status="uploading"
        showPercentage={true}
      />
    )

    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  })

  it('hides percentage when showPercentage is false', () => {
    render(
      <UploadProgress
        progress={45}
        status="uploading"
        fileName="test-image.jpg"
        showPercentage={false}
      />
    )

    expect(screen.queryByText('45%')).not.toBeInTheDocument()
    expect(screen.getByText('アップロード中...')).toBeInTheDocument()
  })
})