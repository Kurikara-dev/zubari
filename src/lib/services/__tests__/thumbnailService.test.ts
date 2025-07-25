import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { thumbnailService, ThumbnailSize } from '../thumbnailService'

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn()
}))

// Mock Sharp - it may not be available in test environment
vi.mock('sharp', () => ({
  default: vi.fn(() => ({
    resize: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    png: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('mock-image-buffer')),
    metadata: vi.fn().mockResolvedValue({
      width: 800,
      height: 600,
      format: 'jpeg'
    })
  })),
  __esModule: true
}))

describe('ThumbnailService', () => {
  const mockSupabase = {
    from: vi.fn(),
    storage: {
      from: vi.fn()
    }
  }

  const mockMedia = {
    id: 'test-media-id',
    project_id: 'test-project-id',
    file_name: 'test-image.jpg',
    file_path: 'test-project/test-image.jpg',
    mime_type: 'image/jpeg',
    file_size: 1024000
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(createClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getThumbnailUrl', () => {
    it('should return cached thumbnail URL if exists', async () => {
      // Mock existing thumbnail
      const mockStorageList = {
        data: [{ name: 'test-media-id.webp' }],
        error: null
      }
      
      const mockGetPublicUrl = {
        data: { publicUrl: 'https://example.com/thumbnail.webp' }
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockMedia,
              error: null
            })
          })
        })
      })

      mockSupabase.storage.from.mockReturnValue({
        list: vi.fn().mockResolvedValue(mockStorageList),
        getPublicUrl: vi.fn().mockReturnValue(mockGetPublicUrl)
      })

      const result = await thumbnailService.getThumbnailUrl('test-media-id', ThumbnailSize.SMALL)
      
      expect(result).toBe('https://example.com/thumbnail.webp')
    })

    it('should fallback to original image URL on error', async () => {
      // Mock database error
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Database error')
            })
          })
        })
      })

      const result = await thumbnailService.getThumbnailUrl('test-media-id', ThumbnailSize.SMALL)
      
      expect(result).toBe('/api/media/download?id=test-media-id')
    })
  })

  describe('getResponsiveThumbnails', () => {
    it('should return all thumbnail sizes', async () => {
      // Mock successful thumbnail generation for all sizes
      const mockStorageList = {
        data: [
          { name: 'test-media-id.webp' }
        ],
        error: null
      }
      
      const mockGetPublicUrl = {
        data: { publicUrl: 'https://example.com/thumbnail.webp' }
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockMedia,
              error: null
            })
          })
        })
      })

      mockSupabase.storage.from.mockReturnValue({
        list: vi.fn().mockResolvedValue(mockStorageList),
        getPublicUrl: vi.fn().mockReturnValue(mockGetPublicUrl)
      })

      const result = await thumbnailService.getResponsiveThumbnails('test-media-id')
      
      expect(result).toHaveProperty(ThumbnailSize.SMALL)
      expect(result).toHaveProperty(ThumbnailSize.MEDIUM)
      expect(result).toHaveProperty(ThumbnailSize.LARGE)
      
      // All should return the same URL since we mocked the same response
      expect(result[ThumbnailSize.SMALL]).toContain('thumbnail.webp')
    })

    it('should return fallback URLs on error', async () => {
      // Mock database error
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Database error')
            })
          })
        })
      })

      const result = await thumbnailService.getResponsiveThumbnails('test-media-id')
      
      // All should fallback to original image URL
      Object.values(result).forEach(url => {
        expect(url).toBe('/api/media/download?id=test-media-id')
      })
    })
  })

  describe('cleanupThumbnails', () => {
    it('should delete all thumbnail sizes', async () => {
      const mockRemove = vi.fn().mockResolvedValue({ data: null, error: null })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockMedia,
              error: null
            })
          })
        })
      })

      mockSupabase.storage.from.mockReturnValue({
        remove: mockRemove
      })

      await thumbnailService.cleanupThumbnails('test-media-id')
      
      // Should be called for each thumbnail size
      expect(mockRemove).toHaveBeenCalledTimes(3)
    })

    it('should handle cleanup errors gracefully', async () => {
      const mockRemove = vi.fn().mockResolvedValue({ 
        data: null, 
        error: new Error('Storage error') 
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockMedia,
              error: null
            })
          })
        })
      })

      mockSupabase.storage.from.mockReturnValue({
        remove: mockRemove
      })

      // Should not throw error
      await expect(thumbnailService.cleanupThumbnails('test-media-id')).resolves.toBeUndefined()
    })
  })

  describe('generateThumbnail', () => {
    it('should handle non-existent media', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        })
      })

      await expect(
        thumbnailService.generateThumbnail('non-existent-id', ThumbnailSize.SMALL)
      ).rejects.toThrow('Media with ID non-existent-id not found')
    })
  })

  describe('ThumbnailSize enum', () => {
    it('should have correct values', () => {
      expect(ThumbnailSize.SMALL).toBe('small')
      expect(ThumbnailSize.MEDIUM).toBe('medium')
      expect(ThumbnailSize.LARGE).toBe('large')
    })
  })
})