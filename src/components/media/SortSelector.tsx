'use client'

import { useState, useRef, useEffect } from 'react'

export type SortField = 'created_at' | 'file_name' | 'file_size'
export type SortOrder = 'asc' | 'desc'

interface SortOption {
  value: SortField
  label: string
  orders: {
    asc: string
    desc: string
  }
}

interface SortSelectorProps {
  sortBy: SortField
  sortOrder: SortOrder
  onChange: (sortBy: SortField, sortOrder: SortOrder) => void
  className?: string
}

const SORT_OPTIONS: SortOption[] = [
  {
    value: 'created_at',
    label: 'アップロード日時',
    orders: {
      asc: '古い順',
      desc: '新しい順'
    }
  },
  {
    value: 'file_name',
    label: 'ファイル名',
    orders: {
      asc: 'A-Z順',
      desc: 'Z-A順'
    }
  },
  {
    value: 'file_size',
    label: 'ファイルサイズ',
    orders: {
      asc: '小さい順',
      desc: '大きい順'
    }
  }
]

export default function SortSelector({
  sortBy,
  sortOrder,
  onChange,
  className = ''
}: SortSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const currentOption = SORT_OPTIONS.find(option => option.value === sortBy)
  const currentLabel = currentOption
    ? `${currentOption.label}: ${currentOption.orders[sortOrder]}`
    : 'ソート方法を選択'

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleOptionClick = (option: SortOption, order: SortOrder) => {
    onChange(option.value, order)
    setIsOpen(false)
  }

  const toggleOrder = () => {
    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc'
    onChange(sortBy, newOrder)
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Main dropdown button */}
      <button
        type="button"
        className="inline-flex justify-between items-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="flex items-center">
          <svg
            className="w-4 h-4 mr-2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
            />
          </svg>
          {currentLabel}
        </span>
        <svg
          className={`w-5 h-5 ml-2 -mr-1 text-gray-400 transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Quick toggle button for current sort order */}
      {currentOption && (
        <button
          type="button"
          className="ml-2 inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          onClick={toggleOrder}
          title={`${currentOption.orders[sortOrder === 'asc' ? 'desc' : 'asc']}に変更`}
        >
          <svg
            className={`w-4 h-4 transition-transform ${
              sortOrder === 'desc' ? 'transform rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 15l7-7 7 7"
            />
          </svg>
        </button>
      )}

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-72 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1" role="menu">
            {SORT_OPTIONS.map((option) => (
              <div key={option.value} className="px-1">
                <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  {option.label}
                </div>
                <div className="py-1">
                  {Object.entries(option.orders).map(([order, label]) => (
                    <button
                      key={`${option.value}-${order}`}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 focus:outline-none focus:bg-gray-100 flex items-center justify-between ${
                        sortBy === option.value && sortOrder === order
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700'
                      }`}
                      onClick={() => handleOptionClick(option, order as SortOrder)}
                      role="menuitem"
                    >
                      <span>{label}</span>
                      {sortBy === option.value && sortOrder === order && (
                        <svg
                          className="w-4 h-4 text-blue-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}