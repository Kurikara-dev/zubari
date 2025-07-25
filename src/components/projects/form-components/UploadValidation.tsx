'use client'

import { useMemo } from 'react'
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE, isAllowedMimeType, validateFileSize } from '@/lib/types/media'

export interface ValidationError {
  type: 'size' | 'format' | 'count'
  message: string
  file?: string
}

export interface UploadValidationProps {
  files?: File[]
  showRules?: boolean
  compact?: boolean
  onValidationChange?: (isValid: boolean, errors: ValidationError[]) => void
}

export default function UploadValidation({
  files = [],
  showRules = true,
  compact = false,
  onValidationChange
}: UploadValidationProps) {
  const validationErrors = useMemo(() => {
    const errors: ValidationError[] = []
    
    files.forEach(file => {
      if (!isAllowedMimeType(file.type)) {
        errors.push({
          type: 'format',
          message: `${file.name}: サポートされていないファイル形式です`,
          file: file.name
        })
      }
      
      if (!validateFileSize(file.size)) {
        errors.push({
          type: 'size',
          message: `${file.name}: ファイルサイズが大きすぎます (${Math.round(file.size / 1024 / 1024)}MB)`,
          file: file.name
        })
      }
    })
    
    const isValid = errors.length === 0
    onValidationChange?.(isValid, errors)
    
    return errors
  }, [files, onValidationChange])

  const formatExtensions = useMemo(() => {
    return ALLOWED_MIME_TYPES.map(type => {
      switch(type) {
        case 'image/jpeg': return 'JPEG'
        case 'image/png': return 'PNG'
        case 'image/webp': return 'WebP'
        default: return (type as string).split('/')[1]?.toUpperCase() || 'Unknown'
      }
    }).join(', ')
  }, [])

  const maxSizeMB = Math.round(MAX_FILE_SIZE / 1024 / 1024)

  if (compact) {
    return (
      <div className="space-y-1">
        {showRules && (
          <p className="text-xs sm:text-sm text-gray-500">
            {formatExtensions} • 最大 {maxSizeMB}MB
          </p>
        )}
        {validationErrors.length > 0 && (
          <div className="space-y-1">
            {validationErrors.map((error, index) => (
              <p key={index} className="text-xs sm:text-sm text-red-600" role="alert">
                {error.message}
              </p>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {showRules && (
        <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
          <h3 className="text-sm sm:text-base font-medium text-gray-900 mb-2">
            アップロード可能なファイル
          </h3>
          <ul className="space-y-1 text-xs sm:text-sm text-gray-600">
            <li className="flex items-start">
              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>ファイル形式: {formatExtensions}</span>
            </li>
            <li className="flex items-start">
              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>最大ファイルサイズ: {maxSizeMB}MB</span>
            </li>
          </ul>
        </div>
      )}
      
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
          <h3 className="text-sm sm:text-base font-medium text-red-800 mb-2">
            バリデーションエラー
          </h3>
          <ul className="space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index} className="text-xs sm:text-sm text-red-600 flex items-start" role="alert">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{error.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {files.length > 0 && validationErrors.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-green-800 flex items-center">
            <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            すべてのファイルが有効です
          </p>
        </div>
      )}
    </div>
  )
}