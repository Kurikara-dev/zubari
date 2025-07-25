'use client'

import { useEffect, useCallback, useRef } from 'react'
import type { Media } from '@/lib/types/api'

interface DeleteConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  mediaItem: Media
  isDeleting: boolean
}

export function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  mediaItem,
  isDeleting
}: DeleteConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  // Handle ESC key press
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isOpen || isDeleting) return

    if (event.key === 'Escape') {
      onClose()
    }
  }, [isOpen, isDeleting, onClose])

  // Handle click outside dialog
  const handleBackdropClick = useCallback((event: React.MouseEvent) => {
    if (isDeleting) return
    
    if (event.target === event.currentTarget) {
      onClose()
    }
  }, [isDeleting, onClose])

  // Setup keyboard event listeners and focus management
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
      
      // Focus the dialog for accessibility
      dialogRef.current?.focus()
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      style={{ backdropFilter: 'blur(4px)' }}
    >
      {/* Backdrop overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-50" />
      
      {/* Dialog content */}
      <div
        ref={dialogRef}
        className="relative w-full max-w-md bg-white rounded-lg shadow-xl overflow-hidden"
        tabIndex={-1}
        role="dialog"
        aria-label="Delete confirmation"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Delete Media
          </h3>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-3">
              Are you sure you want to delete this media file? This action cannot be undone.
            </p>
            
            {/* Media info */}
            <div className="bg-gray-50 rounded-lg p-3 border">
              <div className="flex items-start space-x-3">
                {/* File icon */}
                <div className="flex-shrink-0 mt-1">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                
                {/* File details */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate" title={mediaItem.file_name}>
                    {mediaItem.file_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(mediaItem.file_size / 1024 / 1024).toFixed(2)} MB • {mediaItem.mime_type}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Uploaded: {new Date(mediaItem.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">
                  <strong>Warning:</strong> This will permanently delete the file from storage. This action cannot be undone.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {isDeleting && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}