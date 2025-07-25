'use client'

import { useState, useEffect, useCallback } from 'react'
import { debounce } from 'lodash'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  debounceMs?: number
  className?: string
}

export default function SearchBar({
  value,
  onChange,
  placeholder = 'ファイル名で検索...',
  debounceMs = 300,
  className = ''
}: SearchBarProps) {
  const [inputValue, setInputValue] = useState(value)

  // Create debounced onChange handler
  // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce function is stable
  const debouncedOnChange = useCallback(
    debounce((searchValue: string) => {
      onChange(searchValue)
    }, debounceMs),
    [onChange, debounceMs]
  )

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    debouncedOnChange(newValue)
  }

  // Clear search
  const handleClear = () => {
    setInputValue('')
    onChange('')
  }

  // Sync with external value changes
  useEffect(() => {
    setInputValue(value)
  }, [value])

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      debouncedOnChange.cancel()
    }
  }, [debouncedOnChange])

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg
          className="h-5 w-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <input
        type="text"
        className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
        placeholder={placeholder}
        value={inputValue}
        onChange={handleInputChange}
        autoComplete="off"
      />
      {inputValue && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 transition-colors"
            onClick={handleClear}
            aria-label="検索をクリア"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}