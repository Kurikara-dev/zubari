import { expect, vi } from 'vitest'
import '@testing-library/jest-dom'

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ 
          data: { 
            id: 'test-media-id',
            project_id: 'test-project-id',
            file_name: 'test.jpg',
            file_size: 1024,
            mime_type: 'image/jpeg',
            storage_path: 'test/path.jpg',
            thumbnail_url: 'http://test.com/thumb.jpg',
            metadata: {}
          }, 
          error: null 
        }))
      }))
    }))
  })),
  storage: {
    from: vi.fn(() => ({
      getPublicUrl: vi.fn(() => ({
        data: { publicUrl: 'http://test.com/public.jpg' }
      })),
      upload: vi.fn(() => Promise.resolve({ 
        data: { path: 'test/path.jpg' }, 
        error: null 
      })),
      remove: vi.fn(() => Promise.resolve({ 
        data: null, 
        error: null 
      })),
      download: vi.fn(() => Promise.resolve({
        data: { arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)) },
        error: null
      })),
      list: vi.fn(() => Promise.resolve({
        data: [{ name: 'test-file.jpg' }],
        error: null
      }))
    }))
  }
}

// Mock @supabase/supabase-js
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient)
}))

// Mock local supabase module
vi.mock('./src/lib/supabase', () => ({
  supabase: mockSupabaseClient,
  supabaseAdmin: mockSupabaseClient
}))

// Mock fetch
global.fetch = vi.fn()

// Mock window.URL.createObjectURL
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'blob:http://localhost/test'),
    revokeObjectURL: vi.fn()
  }
})

// Mock global URL constructor
Object.defineProperty(global, 'URL', {
  writable: true,
  value: class URL {
    public href: string
    public origin: string = 'http://localhost:3000'
    public protocol: string = 'http:'
    public host: string = 'localhost:3000'
    public hostname: string = 'localhost'
    public port: string = '3000'
    public pathname: string
    public search: string
    public hash: string = ''
    
    constructor(href: string, base?: string) {
      this.href = base ? `${base}${href}` : href
      const urlParts = this.href.split('?')
      this.pathname = urlParts[0].replace(/^https?:\/\/[^\/]*/, '')
      this.search = urlParts[1] ? '?' + urlParts[1] : ''
    }
    
    toString() { return this.href }
  }
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  observe = vi.fn()
  disconnect = vi.fn()
  unobserve = vi.fn()
  root = null
  rootMargin = ''
  thresholds = []
  takeRecords = vi.fn(() => [])
  
  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    // Mock implementation
  }
} as any

// Mock ResizeObserver
global.ResizeObserver = vi.fn(() => ({
  disconnect: vi.fn(),
  observe: vi.fn(),
  unobserve: vi.fn()
}))

// Mock React Query
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query')
  return {
    ...actual,
    useQuery: vi.fn(() => ({
      data: null,
      error: null,
      isLoading: false,
      isError: false,
      refetch: vi.fn()
    })),
    useMutation: vi.fn(() => ({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isLoading: false,
      isError: false,
      error: null
    })),
    useQueryClient: vi.fn(() => ({
      invalidateQueries: vi.fn(),
      setQueryData: vi.fn(),
      getQueryData: vi.fn()
    }))
  }
})

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn()
  })),
  useSearchParams: vi.fn(() => ({
    get: vi.fn(),
    toString: vi.fn(() => '')
  })),
  usePathname: vi.fn(() => '/test')
}))