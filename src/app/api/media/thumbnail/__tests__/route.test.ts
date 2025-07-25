import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET, HEAD, DELETE } from '../route'

// Mock auth middleware
vi.mock('@/lib/api/auth-middleware', () => ({
  getAuthContext: vi.fn()
}))

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn(),
    storage: {
      from: vi.fn()
    }
  }
}))

// Type-safe mock interfaces
interface MockSupabase {
  from: ReturnType<typeof vi.fn>
  storage: {
    from: ReturnType<typeof vi.fn>
  }
}

interface MockAuthContext {
  mockResolvedValue: ReturnType<typeof vi.fn>
}

// Mock thumbnail service
vi.mock('@/lib/services/thumbnailService', () => ({
  thumbnailService: {
    generateThumbnail: vi.fn(),
    cleanupThumbnails: vi.fn()
  },
  ThumbnailSize: {
    SMALL: 'small',
    MEDIUM: 'medium',
    LARGE: 'large'
  }
}))

import { getAuthContext } from '@/lib/api/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { thumbnailService } from '@/lib/services/thumbnailService'

describe('/api/media/thumbnail', () => {
  const mockSupabase = {
    from: vi.fn(),
    storage: {
      from: vi.fn()
    }
  }

  const mockUser = {
    sub: 'test-user-id',
    email: 'test@example.com'
  }

  const mockMedia = {
    id: 'test-media-id',
    project_id: 'test-project-id',
    file_name: 'test-image.jpg',
    file_path: 'test-project/test-image.jpg',
    mime_type: 'image/jpeg',
    file_size: 1024000,
    projects: {
      id: 'test-project-id',
      owner_id: 'test-user-id'
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock supabaseAdmin methods
    ;(supabaseAdmin as unknown as MockSupabase).from = mockSupabase.from
    ;(supabaseAdmin as unknown as MockSupabase).storage = mockSupabase.storage
    ;(getAuthContext as unknown as MockAuthContext).mockResolvedValue({ 
      user: mockUser, 
      isAuthenticated: true 
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET', () => {
    it('should return 401 when not authenticated', async () => {
      ;(getAuthContext as unknown as MockAuthContext).mockResolvedValue({ 
        user: null, 
        isAuthenticated: false 
      })

      const request = new Request('http://localhost:3000/api/media/thumbnail?id=test-id')
      const response = await GET(request)
      
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 when media ID is missing', async () => {
      const request = new Request('http://localhost:3000/api/media/thumbnail')
      const response = await GET(request)
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Media ID is required')
    })

    it('should return 400 for invalid size parameter', async () => {
      const request = new Request('http://localhost:3000/api/media/thumbnail?id=test-id&size=invalid')
      const response = await GET(request)
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid size')
    })

    it('should return 400 for invalid format parameter', async () => {
      const request = new Request('http://localhost:3000/api/media/thumbnail?id=test-id&format=invalid')
      const response = await GET(request)
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid format')
    })

    it('should return 400 for invalid quality parameter', async () => {
      const request = new Request('http://localhost:3000/api/media/thumbnail?id=test-id&quality=150')
      const response = await GET(request)
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Quality must be between 1 and 100')
    })

    it('should return 404 when media not found', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Not found')
            })
          })
        })
      })

      const request = new Request('http://localhost:3000/api/media/thumbnail?id=nonexistent')
      const response = await GET(request)
      
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Media not found')
    })

    it('should return 403 when user does not own the project', async () => {
      const unauthorizedMedia = {
        ...mockMedia,
        projects: {
          id: 'test-project-id',
          owner_id: 'different-user-id'
        }
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: unauthorizedMedia,
              error: null
            })
          })
        })
      })

      const request = new Request('http://localhost:3000/api/media/thumbnail?id=test-id')
      const response = await GET(request)
      
      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Access denied')
    })

    it('should return 400 for non-image media', async () => {
      const nonImageMedia = {
        ...mockMedia,
        mime_type: 'application/pdf'
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: nonImageMedia,
              error: null
            })
          })
        })
      })

      const request = new Request('http://localhost:3000/api/media/thumbnail?id=test-id')
      const response = await GET(request)
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Media is not an image')
    })

    it('should redirect when redirect=true parameter is provided', async () => {
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

      ;(thumbnailService.generateThumbnail as unknown).mockResolvedValue({
        url: 'https://example.com/thumbnail.webp'
      })

      const request = new Request('http://localhost:3000/api/media/thumbnail?id=test-id&redirect=true')
      const response = await GET(request)
      
      expect(response.status).toBe(307) // Redirect status
    })

    it('should return thumbnail data successfully', async () => {
      const mockThumbnailData = new ArrayBuffer(1024)
      
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

      ;(thumbnailService.generateThumbnail as unknown).mockResolvedValue({
        url: 'https://example.com/thumbnail.webp'
      })

      mockSupabase.storage.from.mockReturnValue({
        download: vi.fn().mockResolvedValue({
          data: { arrayBuffer: () => Promise.resolve(mockThumbnailData) },
          error: null
        })
      })

      const request = new Request('http://localhost:3000/api/media/thumbnail?id=test-id')
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('image/webp')
      expect(response.headers.get('Cache-Control')).toContain('max-age=31536000')
    })

    it('should fallback to original image when thumbnail download fails', async () => {
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

      ;(thumbnailService.generateThumbnail as unknown).mockResolvedValue({
        url: 'https://example.com/thumbnail.webp'
      })

      mockSupabase.storage.from.mockReturnValue({
        download: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Download failed')
        })
      })

      const request = new Request('http://localhost:3000/api/media/thumbnail?id=test-id')
      const response = await GET(request)
      
      expect(response.status).toBe(307) // Redirect to original
    })
  })

  describe('HEAD', () => {
    it('should return 401 when not authenticated', async () => {
      ;(getAuthContext as unknown as MockAuthContext).mockResolvedValue({ 
        user: null, 
        isAuthenticated: false 
      })

      const request = new Request('http://localhost:3000/api/media/thumbnail?id=test-id')
      const response = await HEAD(request)
      
      expect(response.status).toBe(401)
    })

    it('should return 200 when thumbnail exists', async () => {
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
        list: vi.fn().mockResolvedValue({
          data: [{ name: 'test-id.webp' }],
          error: null
        })
      })

      const request = new Request('http://localhost:3000/api/media/thumbnail?id=test-id')
      const response = await HEAD(request)
      
      expect(response.status).toBe(200)
      expect(response.headers.get('X-Thumbnail-Exists')).toBe('true')
    })

    it('should return 404 when thumbnail does not exist', async () => {
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
        list: vi.fn().mockResolvedValue({
          data: [], // No thumbnail files
          error: null
        })
      })

      const request = new Request('http://localhost:3000/api/media/thumbnail?id=test-id')
      const response = await HEAD(request)
      
      expect(response.status).toBe(404)
      expect(response.headers.get('X-Thumbnail-Exists')).toBe('false')
    })
  })

  describe('DELETE', () => {
    it('should return 401 when not authenticated', async () => {
      ;(getAuthContext as unknown as MockAuthContext).mockResolvedValue({ 
        user: null, 
        isAuthenticated: false 
      })

      const request = new Request('http://localhost:3000/api/media/thumbnail?id=test-id')
      const response = await DELETE(request)
      
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should delete specific thumbnail size', async () => {
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
        remove: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      })

      const request = new Request('http://localhost:3000/api/media/thumbnail?id=test-id&size=small')
      const response = await DELETE(request)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.message).toContain('Thumbnail small deleted')
    })

    it('should delete all thumbnails when size not specified', async () => {
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

      ;(thumbnailService.cleanupThumbnails as unknown).mockResolvedValue(undefined)

      const request = new Request('http://localhost:3000/api/media/thumbnail?id=test-id')
      const response = await DELETE(request)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.message).toContain('All thumbnails deleted')
      expect(thumbnailService.cleanupThumbnails).toHaveBeenCalledWith('test-id')
    })
  })
})