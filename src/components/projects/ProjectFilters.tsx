'use client'

import { useDebounce } from 'use-debounce'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

interface ProjectFiltersProps {
  onFiltersChange?: (filters: {
    search: string
    dateFrom: string
    dateTo: string
    sortBy: string
    sortOrder: string
  }) => void
}

export default function ProjectFilters({ onFiltersChange }: ProjectFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [dateFrom, setDateFrom] = useState(searchParams.get('dateFrom') || '')
  const [dateTo, setDateTo] = useState(searchParams.get('dateTo') || '')
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'created_at')
  const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') || 'desc')

  const [debouncedSearch] = useDebounce(search, 500)

  useEffect(() => {
    const params = new URLSearchParams(searchParams)
    
    if (debouncedSearch) {
      params.set('search', debouncedSearch)
    } else {
      params.delete('search')
    }
    
    if (dateFrom) {
      params.set('dateFrom', dateFrom)
    } else {
      params.delete('dateFrom')
    }
    
    if (dateTo) {
      params.set('dateTo', dateTo)
    } else {
      params.delete('dateTo')
    }
    
    params.set('sortBy', sortBy)
    params.set('sortOrder', sortOrder)
    
    params.delete('page') // Reset to first page when filters change
    
    const newUrl = `${pathname}?${params.toString()}`
    router.replace(newUrl)

    // Trigger callback if provided
    onFiltersChange?.({
      search: debouncedSearch,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder
    })
  }, [debouncedSearch, dateFrom, dateTo, sortBy, sortOrder, pathname, router, searchParams, onFiltersChange])

  const handleClearFilters = () => {
    setSearch('')
    setDateFrom('')
    setDateTo('')
    setSortBy('created_at')
    setSortOrder('desc')
  }

  const hasActiveFilters = search || dateFrom || dateTo || sortBy !== 'created_at' || sortOrder !== 'desc'

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="space-y-2">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700">
            プロジェクト名で検索
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              id="search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="プロジェクト名を入力..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Date From */}
        <div className="space-y-2">
          <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700">
            作成日（開始）
          </label>
          <input
            id="dateFrom"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Date To */}
        <div className="space-y-2">
          <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700">
            作成日（終了）
          </label>
          <input
            id="dateTo"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Sort */}
        <div className="space-y-2">
          <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700">
            並び順
          </label>
          <div className="flex space-x-2">
            <select
              id="sortBy"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="created_at">作成日</option>
              <option value="updated_at">更新日</option>
              <option value="name">名前</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="desc">新しい順</option>
              <option value="asc">古い順</option>
            </select>
          </div>
        </div>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={handleClearFilters}
            className="text-sm text-gray-500 hover:text-gray-700 transition duration-200 flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            フィルターをクリア
          </button>
        </div>
      )}
    </div>
  )
}