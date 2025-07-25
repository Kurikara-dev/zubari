import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ImageFilters from '../ImageFilters'

import { vi } from 'vitest'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn().mockReturnValue(null),
  }),
}))

describe('ImageFilters', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
  })

  afterEach(() => {
    queryClient.clear()
  })

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    )
  }

  it('renders search bar', () => {
    const mockOnChange = vi.fn()
    
    renderWithQueryClient(
      <ImageFilters
        projectId="test-project"
        onChange={mockOnChange}
      />
    )

    expect(screen.getByPlaceholderText('ファイル名で検索...')).toBeInTheDocument()
  })

  it('renders sort selector', () => {
    const mockOnChange = vi.fn()
    
    renderWithQueryClient(
      <ImageFilters
        projectId="test-project"
        onChange={mockOnChange}
      />
    )

    expect(screen.getByText(/アップロード日時/)).toBeInTheDocument()
  })

  it('renders filter selector', () => {
    const mockOnChange = vi.fn()
    
    renderWithQueryClient(
      <ImageFilters
        projectId="test-project"
        onChange={mockOnChange}
      />
    )

    expect(screen.getByText('フィルタ')).toBeInTheDocument()
  })

  it('calls onChange when search value changes', async () => {
    const mockOnChange = vi.fn()
    
    renderWithQueryClient(
      <ImageFilters
        projectId="test-project"
        onChange={mockOnChange}
      />
    )

    const searchInput = screen.getByPlaceholderText('ファイル名で検索...')
    fireEvent.change(searchInput, { target: { value: 'test-search' } })

    // Wait for debounce
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'test-search'
        })
      )
    }, { timeout: 500 })
  })

  it('shows reset button when filters are active', () => {
    const mockOnChange = vi.fn()
    
    renderWithQueryClient(
      <ImageFilters
        projectId="test-project"
        onChange={mockOnChange}
        initialState={{
          search: 'test',
          sortBy: 'created_at',
          sortOrder: 'desc',
          fileTypes: [],
          uploaders: [],
          dateRange: { start: null, end: null }
        }}
      />
    )

    expect(screen.getByText('リセット')).toBeInTheDocument()
  })

  it('shows active filter indicators', () => {
    const mockOnChange = vi.fn()
    
    renderWithQueryClient(
      <ImageFilters
        projectId="test-project"
        onChange={mockOnChange}
        initialState={{
          search: 'test-image',
          sortBy: 'created_at',
          sortOrder: 'desc',
          fileTypes: ['image/jpeg'],
          uploaders: [],
          dateRange: { start: null, end: null }
        }}
      />
    )

    expect(screen.getByText('適用中のフィルタ:')).toBeInTheDocument()
    expect(screen.getByText('"test-image"')).toBeInTheDocument()
    expect(screen.getByText('JPEG')).toBeInTheDocument()
  })
})