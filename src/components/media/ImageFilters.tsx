'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import SearchBar from './SearchBar'
import SortSelector, { type SortField, type SortOrder } from './SortSelector'
import FilterSelector from './FilterSelector'

export interface FilterState {
  search: string
  sortBy: SortField
  sortOrder: SortOrder
  fileTypes: string[]
  uploaders: string[]
  dateRange: {
    start: string | null
    end: string | null
  }
}

interface ImageFiltersProps {
  projectId: string
  initialState?: Partial<FilterState>
  onChange: (filters: FilterState) => void
  availableUploaders?: string[]
  className?: string
  enableUrlSync?: boolean
}

const DEFAULT_FILTER_STATE: FilterState = {
  search: '',
  sortBy: 'created_at',
  sortOrder: 'desc',
  fileTypes: [],
  uploaders: [],
  dateRange: {
    start: null,
    end: null
  }
}

export default function ImageFilters({
  projectId: _projectId, // eslint-disable-line @typescript-eslint/no-unused-vars -- Reserved for future project-specific filtering
  initialState = {},
  onChange,
  availableUploaders = [],
  className = '',
  enableUrlSync = true
}: ImageFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Initialize state from URL params or initial state
  const initializeFromUrl = useCallback((): FilterState => {
    if (!enableUrlSync) {
      return { ...DEFAULT_FILTER_STATE, ...initialState }
    }

    return {
      search: searchParams.get('search') || initialState.search || DEFAULT_FILTER_STATE.search,
      sortBy: (searchParams.get('sortBy') as SortField) || initialState.sortBy || DEFAULT_FILTER_STATE.sortBy,
      sortOrder: (searchParams.get('sortOrder') as SortOrder) || initialState.sortOrder || DEFAULT_FILTER_STATE.sortOrder,
      fileTypes: searchParams.get('fileTypes')?.split(',').filter(Boolean) || initialState.fileTypes || DEFAULT_FILTER_STATE.fileTypes,
      uploaders: searchParams.get('uploaders')?.split(',').filter(Boolean) || initialState.uploaders || DEFAULT_FILTER_STATE.uploaders,
      dateRange: {
        start: searchParams.get('startDate') || initialState.dateRange?.start || DEFAULT_FILTER_STATE.dateRange.start,
        end: searchParams.get('endDate') || initialState.dateRange?.end || DEFAULT_FILTER_STATE.dateRange.end
      }
    }
  }, [searchParams, initialState, enableUrlSync])

  const [filters, setFilters] = useState<FilterState>(initializeFromUrl)

  // Update URL when filters change
  const updateUrl = useCallback((newFilters: FilterState) => {
    if (!enableUrlSync) return

    const params = new URLSearchParams()
    
    if (newFilters.search) params.set('search', newFilters.search)
    if (newFilters.sortBy !== DEFAULT_FILTER_STATE.sortBy) params.set('sortBy', newFilters.sortBy)
    if (newFilters.sortOrder !== DEFAULT_FILTER_STATE.sortOrder) params.set('sortOrder', newFilters.sortOrder)
    if (newFilters.fileTypes.length > 0) params.set('fileTypes', newFilters.fileTypes.join(','))
    if (newFilters.uploaders.length > 0) params.set('uploaders', newFilters.uploaders.join(','))
    if (newFilters.dateRange.start) params.set('startDate', newFilters.dateRange.start)
    if (newFilters.dateRange.end) params.set('endDate', newFilters.dateRange.end)

    const queryString = params.toString()
    const newUrl = queryString ? `?${queryString}` : window.location.pathname
    
    // Use replace to avoid adding to history for every filter change
    router.replace(newUrl, { scroll: false })
  }, [router, enableUrlSync])

  // Update filters and notify parent
  const updateFilters = useCallback((newFilters: FilterState) => {
    setFilters(newFilters)
    onChange(newFilters)
    updateUrl(newFilters)
  }, [onChange, updateUrl])

  // Handle individual filter changes
  const handleSearchChange = useCallback((search: string) => {
    updateFilters({ ...filters, search })
  }, [filters, updateFilters])

  const handleSortChange = useCallback((sortBy: SortField, sortOrder: SortOrder) => {
    updateFilters({ ...filters, sortBy, sortOrder })
  }, [filters, updateFilters])

  const handleFileTypesChange = useCallback((fileTypes: string[]) => {
    updateFilters({ ...filters, fileTypes })
  }, [filters, updateFilters])

  const handleUploadersChange = useCallback((uploaders: string[]) => {
    updateFilters({ ...filters, uploaders })
  }, [filters, updateFilters])

  const handleDateRangeChange = useCallback((dateRange: { start: string | null; end: string | null }) => {
    updateFilters({ ...filters, dateRange })
  }, [filters, updateFilters])

  // Reset all filters
  const handleReset = useCallback(() => {
    const resetState = { ...DEFAULT_FILTER_STATE, ...initialState }
    updateFilters(resetState)
  }, [initialState, updateFilters])

  // Sync with URL changes
  useEffect(() => {
    if (enableUrlSync) {
      const urlState = initializeFromUrl()
      setFilters(urlState)
      onChange(urlState)
    }
  }, [searchParams, enableUrlSync, initializeFromUrl, onChange])

  // Check if any filters are active
  const hasActiveFilters = filters.search ||
    filters.sortBy !== DEFAULT_FILTER_STATE.sortBy ||
    filters.sortOrder !== DEFAULT_FILTER_STATE.sortOrder ||
    filters.fileTypes.length > 0 ||
    filters.uploaders.length > 0 ||
    filters.dateRange.start ||
    filters.dateRange.end

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search and primary actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="flex-1 min-w-0">
          <SearchBar
            value={filters.search}
            onChange={handleSearchChange}
            placeholder="ファイル名で検索..."
            className="w-full"
          />
        </div>
        
        <div className="flex gap-2 shrink-0">
          <SortSelector
            sortBy={filters.sortBy}
            sortOrder={filters.sortOrder}
            onChange={handleSortChange}
          />
          
          <FilterSelector
            fileTypes={filters.fileTypes}
            uploaders={filters.uploaders}
            dateRange={filters.dateRange}
            onFileTypesChange={handleFileTypesChange}
            onUploadersChange={handleUploadersChange}
            onDateRangeChange={handleDateRangeChange}
            availableUploaders={availableUploaders}
          />
          
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              title="すべてのフィルタをリセット"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="ml-1 hidden sm:inline">リセット</span>
            </button>
          )}
        </div>
      </div>

      {/* Active filters indicator */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-gray-600">適用中のフィルタ:</span>
          
          {filters.search && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              検索: &quot;{filters.search}&quot;
              <button
                type="button"
                className="ml-1 text-blue-600 hover:text-blue-800"
                onClick={() => handleSearchChange('')}
              >
                ×
              </button>
            </span>
          )}
          
          {filters.fileTypes.map((type) => (
            <span
              key={type}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
            >
              {type.replace('image/', '').toUpperCase()}
              <button
                type="button"
                className="ml-1 text-green-600 hover:text-green-800"
                onClick={() => handleFileTypesChange(filters.fileTypes.filter(t => t !== type))}
              >
                ×
              </button>
            </span>
          ))}
          
          {filters.uploaders.map((uploader) => (
            <span
              key={uploader}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
            >
              アップロード者: {uploader}
              <button
                type="button"
                className="ml-1 text-purple-600 hover:text-purple-800"
                onClick={() => handleUploadersChange(filters.uploaders.filter(u => u !== uploader))}
              >
                ×
              </button>
            </span>
          ))}
          
          {(filters.dateRange.start || filters.dateRange.end) && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              期間: {filters.dateRange.start || '開始'} ～ {filters.dateRange.end || '終了'}
              <button
                type="button"
                className="ml-1 text-orange-600 hover:text-orange-800"
                onClick={() => handleDateRangeChange({ start: null, end: null })}
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  )
}