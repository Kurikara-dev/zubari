import { render, screen } from '@testing-library/react'
import { ImageMetadata } from '../ImageMetadata'
import type { Media } from '@/lib/types/api'

// Mock media data for testing
const mockMedia: Media = {
  id: 'test-media-id',
  project_id: 'test-project-id',
  file_name: 'test-image.jpg',
  file_path: '/test/path/test-image.jpg',
  file_size: 2048576, // 2MB
  mime_type: 'image/jpeg',
  uploaded_by: 'test.user@example.com',
  uploaded_at: '2025-01-20T10:30:00.000Z'
}

describe('ImageMetadata', () => {
  const defaultProps = {
    media: mockMedia,
    currentIndex: 1,
    totalCount: 5
  }

  describe('Default rendering', () => {
    it('renders all metadata sections', () => {
      render(<ImageMetadata {...defaultProps} />)
      
      expect(screen.getByText('Image 1 of 5')).toBeInTheDocument()
      expect(screen.getByText('JPEG')).toBeInTheDocument()
      expect(screen.getByText('File Information')).toBeInTheDocument()
      expect(screen.getByText('Upload Information')).toBeInTheDocument()
    })

    it('displays file information correctly', () => {
      render(<ImageMetadata {...defaultProps} />)
      
      expect(screen.getByText('test-image.jpg')).toBeInTheDocument()
      expect(screen.getByText('2.0 MB')).toBeInTheDocument()
    })

    it('displays upload information correctly', () => {
      render(<ImageMetadata {...defaultProps} />)
      
      expect(screen.getByText('test.user')).toBeInTheDocument()
      // Date formatting is relative, so we just check that some date text is present
      expect(screen.getByText(/ago|on/)).toBeInTheDocument()
    })
  })

  describe('File size formatting', () => {
    it('formats bytes correctly', () => {
      const media = { ...mockMedia, file_size: 512 }
      render(<ImageMetadata {...defaultProps} media={media} />)
      expect(screen.getByText('512 B')).toBeInTheDocument()
    })

    it('formats kilobytes correctly', () => {
      const media = { ...mockMedia, file_size: 1536 } // 1.5 KB
      render(<ImageMetadata {...defaultProps} media={media} />)
      expect(screen.getByText('1.5 KB')).toBeInTheDocument()
    })

    it('formats megabytes correctly', () => {
      const media = { ...mockMedia, file_size: 5242880 } // 5 MB
      render(<ImageMetadata {...defaultProps} media={media} />)
      expect(screen.getByText('5.0 MB')).toBeInTheDocument()
    })

    it('formats gigabytes correctly', () => {
      const media = { ...mockMedia, file_size: 2147483648 } // 2 GB
      render(<ImageMetadata {...defaultProps} media={media} />)
      expect(screen.getByText('2.0 GB')).toBeInTheDocument()
    })

    it('handles zero bytes', () => {
      const media = { ...mockMedia, file_size: 0 }
      render(<ImageMetadata {...defaultProps} media={media} />)
      expect(screen.getByText('0 B')).toBeInTheDocument()
    })
  })

  describe('MIME type formatting', () => {
    it('formats JPEG correctly', () => {
      const media = { ...mockMedia, mime_type: 'image/jpeg' }
      render(<ImageMetadata {...defaultProps} media={media} />)
      expect(screen.getByText('JPEG')).toBeInTheDocument()
    })

    it('formats PNG correctly', () => {
      const media = { ...mockMedia, mime_type: 'image/png' }
      render(<ImageMetadata {...defaultProps} media={media} />)
      expect(screen.getByText('PNG')).toBeInTheDocument()
    })

    it('formats WebP correctly', () => {
      const media = { ...mockMedia, mime_type: 'image/webp' }
      render(<ImageMetadata {...defaultProps} media={media} />)
      expect(screen.getByText('WebP')).toBeInTheDocument()
    })

    it('handles unknown MIME types', () => {
      const media = { ...mockMedia, mime_type: 'image/tiff' }
      render(<ImageMetadata {...defaultProps} media={media} />)
      expect(screen.getByText('TIFF')).toBeInTheDocument()
    })

    it('handles malformed MIME types', () => {
      const media = { ...mockMedia, mime_type: 'invalid' }
      render(<ImageMetadata {...defaultProps} media={media} />)
      expect(screen.getByText('Unknown')).toBeInTheDocument()
    })
  })

  describe('Date formatting', () => {
    beforeAll(() => {
      // Mock Date to ensure consistent test results
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-01-24T12:00:00.000Z'))
    })

    afterAll(() => {
      vi.useRealTimers()
    })

    it('formats recent minutes correctly', () => {
      const media = { ...mockMedia, uploaded_at: '2025-01-24T11:30:00.000Z' } // 30 minutes ago
      render(<ImageMetadata {...defaultProps} media={media} />)
      expect(screen.getByText('30 minutes ago')).toBeInTheDocument()
    })

    it('formats recent hours correctly', () => {
      const media = { ...mockMedia, uploaded_at: '2025-01-24T09:00:00.000Z' } // 3 hours ago
      render(<ImageMetadata {...defaultProps} media={media} />)
      expect(screen.getByText('3 hours ago')).toBeInTheDocument()
    })

    it('formats recent days correctly', () => {
      const media = { ...mockMedia, uploaded_at: '2025-01-22T12:00:00.000Z' } // 2 days ago
      render(<ImageMetadata {...defaultProps} media={media} />)
      expect(screen.getByText('2 days ago')).toBeInTheDocument()
    })

    it('formats older dates correctly', () => {
      const media = { ...mockMedia, uploaded_at: '2025-01-10T12:00:00.000Z' } // 2 weeks ago
      render(<ImageMetadata {...defaultProps} media={media} />)
      expect(screen.getByText('Jan 10, 2025')).toBeInTheDocument()
    })
  })

  describe('User name formatting', () => {
    it('extracts username from email', () => {
      const media = { ...mockMedia, uploaded_by: 'john.doe@example.com' }
      render(<ImageMetadata {...defaultProps} media={media} />)
      expect(screen.getByText('john.doe')).toBeInTheDocument()
    })

    it('displays plain username as-is', () => {
      const media = { ...mockMedia, uploaded_by: 'johndoe' }
      render(<ImageMetadata {...defaultProps} media={media} />)
      expect(screen.getByText('johndoe')).toBeInTheDocument()
    })
  })

  describe('Compact mode', () => {
    it('renders compact layout', () => {
      render(<ImageMetadata {...defaultProps} compact />)
      
      // Compact mode should still show index and filename
      expect(screen.getByText('1 / 5')).toBeInTheDocument()
      expect(screen.getByText('test-image.jpg')).toBeInTheDocument()
      expect(screen.getByText('JPEG')).toBeInTheDocument()
      expect(screen.getByText('2.0 MB')).toBeInTheDocument()
      
      // But should not show detailed sections
      expect(screen.queryByText('File Information')).not.toBeInTheDocument()
      expect(screen.queryByText('Upload Information')).not.toBeInTheDocument()
    })
  })

  describe('Props customization', () => {
    it('hides index when showIndex is false', () => {
      render(<ImageMetadata {...defaultProps} showIndex={false} />)
      expect(screen.queryByText('Image 1 of 5')).not.toBeInTheDocument()
    })

    it('hides user info when showUserInfo is false', () => {
      render(<ImageMetadata {...defaultProps} showUserInfo={false} />)
      expect(screen.queryByText('Upload Information')).not.toBeInTheDocument()
      expect(screen.queryByText('test.user')).not.toBeInTheDocument()
    })

    it('applies custom className', () => {
      const { container } = render(<ImageMetadata {...defaultProps} className="custom-class" />)
      expect(container.firstChild).toHaveClass('custom-class')
    })
  })

  describe('Accessibility', () => {
    it('provides title attribute for filename', () => {
      render(<ImageMetadata {...defaultProps} />)
      const filenameElement = screen.getByText('test-image.jpg')
      expect(filenameElement).toHaveAttribute('title', 'test-image.jpg')
    })

    it('provides title attribute for upload date', () => {
      render(<ImageMetadata {...defaultProps} />)
      const dateElements = screen.getAllByTitle(/2025-01-20/)
      expect(dateElements.length).toBeGreaterThan(0)
    })
  })

  describe('Edge cases', () => {
    it('handles very long filenames', () => {
      const longFilename = 'very-long-filename-that-should-be-truncated-in-the-ui.jpg'
      const media = { ...mockMedia, file_name: longFilename }
      render(<ImageMetadata {...defaultProps} media={media} />)
      expect(screen.getByText(longFilename)).toBeInTheDocument()
    })

    it('handles special characters in filename', () => {
      const specialFilename = '图片 with üñíçødé & symbols!@#.png'
      const media = { ...mockMedia, file_name: specialFilename }
      render(<ImageMetadata {...defaultProps} media={media} />)
      expect(screen.getByText(specialFilename)).toBeInTheDocument()
    })

    it('handles large index numbers', () => {
      render(<ImageMetadata {...defaultProps} currentIndex={999} totalCount={9999} />)
      expect(screen.getByText('Image 999 of 9999')).toBeInTheDocument()
    })
  })
})