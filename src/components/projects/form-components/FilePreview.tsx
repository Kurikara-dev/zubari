'use client'

import { useMemo } from 'react'
import Image from 'next/image'
import { FilePreviewProps } from '@/app/types/forms'

export default function FilePreview({
  file,
  previewUrl,
  onRemove,
  disabled = false,
  showSize = true,
  showType = true
}: FilePreviewProps) {
  const fileInfo = useMemo(() => {
    if (!file) return null
    
    return {
      name: file.name,
      size: file.size,
      type: file.type,
      sizeFormatted: `${Math.round(file.size / 1024)} KB`
    }
  }, [file])

  if (!file || !fileInfo) {
    return null
  }

  const isImage = file.type.startsWith('image/')

  return (
    <div className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-white">
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Preview Thumbnail */}
        <div className="flex-shrink-0">
          {isImage && previewUrl ? (
            <Image
              src={previewUrl}
              alt="プレビュー"
              width={64}
              height={64}
              className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded border"
            />
          ) : (
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded border flex items-center justify-center">
              <svg
                className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          )}
        </div>

        {/* File Information */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate" title={fileInfo.name}>
            {fileInfo.name}
          </p>
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            {showSize && (
              <span>{fileInfo.sizeFormatted}</span>
            )}
            {showSize && showType && (
              <span>•</span>
            )}
            {showType && (
              <span>{fileInfo.type}</span>
            )}
          </div>
        </div>

        {/* Remove Button */}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            className="flex-shrink-0 text-red-600 hover:text-red-700 active:text-red-800 text-sm touch-target px-2 py-1 rounded touch-button disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="ファイルを削除"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}