'use client'

import { useMemo } from 'react'
import type { Media } from '@/lib/types/api'

/**
 * Extended metadata interface with additional computed properties
 */
export interface ImageMetadata {
  filename: string
  size: number
  uploadedAt: string
  uploadedBy: string
  mimeType: string
  dimensions?: {
    width: number
    height: number
  }
}

export interface ImageMetadataProps {
  /** Media item data from database */
  media: Media
  /** Current image index in gallery (1-based) */
  currentIndex: number
  /** Total number of images in gallery */
  totalCount: number
  /** Additional CSS classes */
  className?: string
  /** Whether to show user information */
  showUserInfo?: boolean
  /** Whether to show image index */
  showIndex?: boolean
  /** Compact mode for mobile */
  compact?: boolean
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const size = bytes / Math.pow(1024, i)
  
  return `${size.toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`
}

/**
 * Format upload date in human-readable format
 */
function formatUploadDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  
  if (diffHours < 24) {
    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      return `${diffMinutes} minutes ago`
    }
    return `${Math.floor(diffHours)} hours ago`
  }
  
  if (diffDays < 7) {
    return `${Math.floor(diffDays)} days ago`
  }
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Format MIME type for display
 */
function formatMimeType(mimeType: string): string {
  const typeMap: Record<string, string> = {
    'image/jpeg': 'JPEG',
    'image/jpg': 'JPEG',
    'image/png': 'PNG',
    'image/webp': 'WebP',
    'image/gif': 'GIF',
    'image/svg+xml': 'SVG',
  }
  
  return typeMap[mimeType.toLowerCase()] || mimeType.split('/')[1]?.toUpperCase() || 'Unknown'
}

/**
 * Extract username from uploaded_by field (handles email format)
 */
function formatUploadedBy(uploadedBy: string): string {
  // If it's an email, extract the username part
  if (uploadedBy.includes('@')) {
    return uploadedBy.split('@')[0]
  }
  return uploadedBy
}

/**
 * ImageMetadata Component
 * 
 * Displays comprehensive metadata for an image including file information,
 * upload details, and gallery position with responsive design support.
 */
export function ImageMetadata({
  media,
  currentIndex,
  totalCount,
  className = '',
  showUserInfo = true,
  showIndex = true,
  compact = false
}: ImageMetadataProps) {
  // Compute formatted values
  const metadata = useMemo((): ImageMetadata => ({
    filename: media.file_name,
    size: media.file_size,
    uploadedAt: media.uploaded_at,
    uploadedBy: media.uploaded_by,
    mimeType: media.mime_type
  }), [media])

  const formattedSize = useMemo(() => formatFileSize(metadata.size), [metadata.size])
  const formattedDate = useMemo(() => formatUploadDate(metadata.uploadedAt), [metadata.uploadedAt])
  const formattedType = useMemo(() => formatMimeType(metadata.mimeType), [metadata.mimeType])
  const formattedUser = useMemo(() => formatUploadedBy(metadata.uploadedBy), [metadata.uploadedBy])

  if (compact) {
    return (
      <div className={`bg-black bg-opacity-60 text-white p-3 rounded-lg ${className}`}>
        {/* Compact header */}
        <div className="flex items-center justify-between mb-2">
          {showIndex && (
            <span className="text-sm font-medium text-gray-300">
              {currentIndex} / {totalCount}
            </span>
          )}
          <span className="text-sm text-gray-300">{formattedType}</span>
        </div>
        
        {/* File info */}
        <div className="space-y-1">
          <h3 className="text-sm font-medium truncate" title={metadata.filename}>
            {metadata.filename}
          </h3>
          <div className="flex items-center justify-between text-xs text-gray-300">
            <span>{formattedSize}</span>
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm ${className}`}>
      {/* Header with index and type */}
      {showIndex && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Image {currentIndex} of {totalCount}
            </span>
            <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
              {formattedType}
            </span>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="p-4 space-y-4">
        {/* File information */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            File Information
          </h3>
          <div className="space-y-2">
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Name</dt>
              <dd className="text-sm text-gray-900 dark:text-white truncate" title={metadata.filename}>
                {metadata.filename}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Size</dt>
              <dd className="text-sm text-gray-900 dark:text-white">
                {formattedSize}
              </dd>
            </div>
            {metadata.dimensions && (
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400">Dimensions</dt>
                <dd className="text-sm text-gray-900 dark:text-white">
                  {metadata.dimensions.width} × {metadata.dimensions.height} pixels
                </dd>
              </div>
            )}
          </div>
        </div>

        {/* Upload information */}
        {showUserInfo && (
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Upload Information
            </h3>
            <div className="space-y-2">
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400">Uploaded by</dt>
                <dd className="text-sm text-gray-900 dark:text-white">
                  {formattedUser}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400">Uploaded</dt>
                <dd className="text-sm text-gray-900 dark:text-white" title={new Date(metadata.uploadedAt).toLocaleString()}>
                  {formattedDate}
                </dd>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ImageMetadata