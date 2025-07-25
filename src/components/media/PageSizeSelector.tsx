'use client'

interface PageSizeSelectorProps {
  pageSize: number
  onPageSizeChange: (pageSize: number) => void
  options?: number[]
  className?: string
  compact?: boolean
}

export default function PageSizeSelector({
  pageSize,
  onPageSizeChange,
  options = [20, 40, 60],
  className = '',
  compact = false
}: PageSizeSelectorProps) {
  if (compact) {
    return (
      <select
        value={pageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        className={`px-2 py-1 border border-gray-300 rounded-md bg-white text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
        aria-label="表示件数を選択"
      >
        {options.map(size => (
          <option key={size} value={size}>
            {size}件
          </option>
        ))}
      </select>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label className="text-sm text-gray-600 whitespace-nowrap">
        表示件数:
      </label>
      <div className="flex items-center gap-1">
        {options.map(size => (
          <button
            key={size}
            onClick={() => onPageSizeChange(size)}
            className={`
              px-3 py-1 text-sm font-medium rounded-md transition duration-200
              ${size === pageSize
                ? 'text-white bg-blue-600 border border-blue-600'
                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 active:bg-gray-100'
              }
            `}
            aria-pressed={size === pageSize}
            aria-label={`${size}件表示`}
          >
            {size}件
          </button>
        ))}
      </div>
    </div>
  )
}