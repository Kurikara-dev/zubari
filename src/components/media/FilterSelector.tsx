'use client'

import { useState, useRef, useEffect } from 'react'

interface FilterOption {
  value: string
  label: string
  count?: number
}

interface FilterGroup {
  key: string
  label: string
  options: FilterOption[]
  multiple: boolean
}

interface FilterSelectorProps {
  fileTypes: string[]
  uploaders: string[]
  dateRange?: {
    start: string | null
    end: string | null
  }
  onFileTypesChange: (types: string[]) => void
  onUploadersChange: (uploaders: string[]) => void
  onDateRangeChange: (range: { start: string | null; end: string | null }) => void
  className?: string
  availableUploaders?: string[]
}

const FILE_TYPE_OPTIONS: FilterOption[] = [
  { value: 'image/jpeg', label: 'JPEG画像' },
  { value: 'image/png', label: 'PNG画像' },
  { value: 'image/webp', label: 'WebP画像' }
]

export default function FilterSelector({
  fileTypes,
  uploaders,
  dateRange,
  onFileTypesChange,
  onUploadersChange,
  onDateRangeChange,
  className = '',
  availableUploaders = []
}: FilterSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [_activeGroup, _setActiveGroup] = useState<string | null>(null) // eslint-disable-line @typescript-eslint/no-unused-vars -- Reserved for filter grouping functionality
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        _setActiveGroup(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleFileTypeToggle = (mimeType: string) => {
    const newTypes = fileTypes.includes(mimeType)
      ? fileTypes.filter(type => type !== mimeType)
      : [...fileTypes, mimeType]
    onFileTypesChange(newTypes)
  }

  const handleUploaderToggle = (uploader: string) => {
    const newUploaders = uploaders.includes(uploader)
      ? uploaders.filter(u => u !== uploader)
      : [...uploaders, uploader]
    onUploadersChange(newUploaders)
  }

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    onDateRangeChange({
      start: dateRange?.start || null,
      end: dateRange?.end || null,
      [field]: value || null
    })
  }

  const clearAllFilters = () => {
    onFileTypesChange([])
    onUploadersChange([])
    onDateRangeChange({ start: null, end: null })
  }

  const activeFilterCount = fileTypes.length + uploaders.length + 
    (dateRange?.start || dateRange?.end ? 1 : 0)

  const uploaderOptions: FilterOption[] = availableUploaders.map(uploader => ({
    value: uploader,
    label: uploader
  }))

  const filterGroups: FilterGroup[] = [
    {
      key: 'fileTypes',
      label: 'ファイル形式',
      options: FILE_TYPE_OPTIONS,
      multiple: true
    },
    ...(uploaderOptions.length > 0 ? [{
      key: 'uploaders',
      label: 'アップロード者',
      options: uploaderOptions,
      multiple: true
    }] : [])
  ]

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Filter button */}
      <button
        type="button"
        className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
          activeFilterCount > 0
            ? 'bg-blue-50 border-blue-300 text-blue-700'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
        } focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <svg
          className="w-4 h-4 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z"
          />
        </svg>
        フィルタ
        {activeFilterCount > 0 && (
          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {activeFilterCount}
          </span>
        )}
        <svg
          className={`w-4 h-4 ml-2 transition-transform ${
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

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 z-20 mt-2 w-80 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="p-4 space-y-4">
            {/* Filter groups */}
            {filterGroups.map((group) => (
              <div key={group.key} className="space-y-2">
                <h4 className="text-sm font-medium text-gray-900">
                  {group.label}
                </h4>
                <div className="space-y-1">
                  {group.options.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center space-x-2 text-sm text-gray-700 hover:bg-gray-50 p-1 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={group.key === 'fileTypes' 
                          ? fileTypes.includes(option.value)
                          : uploaders.includes(option.value)
                        }
                        onChange={() => {
                          if (group.key === 'fileTypes') {
                            handleFileTypeToggle(option.value)
                          } else {
                            handleUploaderToggle(option.value)
                          }
                        }}
                      />
                      <span>{option.label}</span>
                      {option.count && (
                        <span className="text-xs text-gray-500">
                          ({option.count})
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {/* Date range filter */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900">
                アップロード期間
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    開始日
                  </label>
                  <input
                    type="date"
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    value={dateRange?.start || ''}
                    onChange={(e) => handleDateChange('start', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    終了日
                  </label>
                  <input
                    type="date"
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    value={dateRange?.end || ''}
                    onChange={(e) => handleDateChange('end', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-gray-200 flex justify-between">
              <button
                type="button"
                className="text-sm text-gray-600 hover:text-gray-800"
                onClick={clearAllFilters}
                disabled={activeFilterCount === 0}
              >
                すべてクリア
              </button>
              <button
                type="button"
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
                onClick={() => setIsOpen(false)}
              >
                適用
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}