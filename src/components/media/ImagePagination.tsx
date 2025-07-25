'use client'

import { useMemo } from 'react'

export interface PaginationState {
  currentPage: number
  pageSize: number
  totalItems: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

interface ImagePaginationProps {
  paginationState: PaginationState
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  showPageSizeSelector?: boolean
  className?: string
}

export default function ImagePagination({
  paginationState,
  onPageChange,
  onPageSizeChange,
  showPageSizeSelector = true,
  className = ''
}: ImagePaginationProps) {
  const { currentPage, totalPages, hasNextPage, hasPrevPage, totalItems, pageSize } = paginationState

  // Generate page numbers to display
  const visiblePages = useMemo(() => {
    const delta = 2 // Number of pages to show on each side of current page
    const range = []
    const rangeWithDots = []

    for (let i = Math.max(2, currentPage - delta); 
         i <= Math.min(totalPages - 1, currentPage + delta); 
         i++) {
      range.push(i)
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...')
    } else {
      rangeWithDots.push(1)
    }

    rangeWithDots.push(...range)

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages)
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages)
    }

    return rangeWithDots.filter((item, index, arr) => arr.indexOf(item) === index)
  }, [currentPage, totalPages])

  if (totalPages <= 1) {
    return null
  }

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
      {/* Results Info */}
      <div className="text-sm text-gray-600 order-2 sm:order-1">
        {totalItems > 0 && (
          <span>
            {((currentPage - 1) * pageSize) + 1}〜{Math.min(currentPage * pageSize, totalItems)}件
            / 全{totalItems}件を表示
          </span>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center gap-2 order-1 sm:order-2">
        {/* Previous Button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPrevPage}
          className={`
            flex items-center px-3 py-2 text-sm font-medium rounded-md transition duration-200
            ${hasPrevPage 
              ? 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 active:bg-gray-100' 
              : 'text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed'
            }
          `}
          aria-label="前のページ"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          前へ
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {visiblePages.map((page, index) => (
            <div key={index}>
              {page === '...' ? (
                <span className="px-3 py-2 text-sm text-gray-500">…</span>
              ) : (
                <button
                  onClick={() => onPageChange(page as number)}
                  className={`
                    px-3 py-2 text-sm font-medium rounded-md transition duration-200 min-w-[40px]
                    ${page === currentPage
                      ? 'text-white bg-blue-600 border border-blue-600'
                      : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 active:bg-gray-100'
                    }
                  `}
                  aria-label={`ページ${page}`}
                  aria-current={page === currentPage ? 'page' : undefined}
                >
                  {page}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Next Button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNextPage}
          className={`
            flex items-center px-3 py-2 text-sm font-medium rounded-md transition duration-200
            ${hasNextPage 
              ? 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 active:bg-gray-100' 
              : 'text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed'
            }
          `}
          aria-label="次のページ"
        >
          次へ
          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Page Size Selector */}
      {showPageSizeSelector && (
        <div className="flex items-center gap-2 text-sm text-gray-600 order-3">
          <label htmlFor="pageSize" className="whitespace-nowrap">
            表示件数:
          </label>
          <select
            id="pageSize"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-2 py-1 border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={20}>20件</option>
            <option value={40}>40件</option>
            <option value={60}>60件</option>
          </select>
        </div>
      )}
    </div>
  )
}