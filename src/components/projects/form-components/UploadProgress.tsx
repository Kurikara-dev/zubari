'use client'

import { useMemo } from 'react'
import { UploadProgressProps } from '@/app/types/forms'

export default function UploadProgress({
  progress,
  status,
  fileName,
  errorMessage,
  onCancel,
  showPercentage = true,
  size = 'medium'
}: UploadProgressProps) {
  const progressClamped = useMemo(() => {
    return Math.max(0, Math.min(100, progress))
  }, [progress])

  const sizeClasses = useMemo(() => {
    switch (size) {
      case 'small':
        return {
          container: 'p-2',
          bar: 'h-1',
          text: 'text-xs',
          icon: 'w-3 h-3'
        }
      case 'large':
        return {
          container: 'p-4',
          bar: 'h-3',
          text: 'text-base',
          icon: 'w-6 h-6'
        }
      default:
        return {
          container: 'p-3',
          bar: 'h-2',
          text: 'text-sm',
          icon: 'w-4 h-4'
        }
    }
  }, [size])

  const statusConfig = useMemo(() => {
    switch (status) {
      case 'uploading':
        return {
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          progressColor: 'bg-blue-600',
          message: 'アップロード中...',
          icon: (
            <svg
              className={`${sizeClasses.icon} animate-spin`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          )
        }
      case 'success':
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          progressColor: 'bg-green-600',
          message: 'アップロード完了',
          icon: (
            <svg
              className={`${sizeClasses.icon}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )
        }
      case 'error':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          progressColor: 'bg-red-600',
          message: errorMessage || 'アップロードエラー',
          icon: (
            <svg
              className={`${sizeClasses.icon}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )
        }
      default:
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          progressColor: 'bg-gray-600',
          message: '待機中',
          icon: (
            <svg
              className={`${sizeClasses.icon}`}
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
          )
        }
    }
  }, [status, errorMessage, sizeClasses.icon])

  if (status === 'idle' && progress === 0) {
    return null
  }

  return (
    <div className={`border border-gray-200 rounded-lg bg-white ${sizeClasses.container}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className={statusConfig.color}>
            {statusConfig.icon}
          </div>
          <div className="flex-1 min-w-0">
            {fileName && (
              <p className={`font-medium ${statusConfig.color} truncate ${sizeClasses.text}`}>
                {fileName}
              </p>
            )}
            <p className={`text-gray-600 ${sizeClasses.text}`}>
              {statusConfig.message}
            </p>
          </div>
        </div>
        
        {/* Progress Percentage */}
        {showPercentage && status !== 'idle' && (
          <span className={`${statusConfig.color} font-medium ${sizeClasses.text}`}>
            {Math.round(progressClamped)}%
          </span>
        )}
        
        {/* Cancel Button */}
        {onCancel && status === 'uploading' && (
          <button
            type="button"
            onClick={onCancel}
            className="ml-2 text-gray-400 hover:text-gray-600 active:text-gray-700 touch-target"
            aria-label="アップロードをキャンセル"
          >
            <svg
              className={sizeClasses.icon}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`${sizeClasses.bar} ${statusConfig.progressColor} transition-all duration-300 ease-out`}
          style={{ width: `${progressClamped}%` }}
          role="progressbar"
          aria-valuenow={progressClamped}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`アップロード進捗: ${Math.round(progressClamped)}%`}
        />
      </div>
    </div>
  )
}