'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import type { Media } from '@/lib/types/api'
import { ImageViewer } from './ImageViewer'
import { ImageMetadata } from './ImageMetadata'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import { useMediaDeletion } from '@/lib/hooks/useMediaDeletion'
import { TouchFeedbackProvider, useTouchFeedback } from './mobile/TouchFeedbackProvider'
import { useViewportSize } from '@/lib/hooks/mobile/useViewportSize'
import { useDeviceDetection } from '@/lib/utils/mobile/deviceDetection'

interface ImagePreviewModalProps {
  media: Media
  isOpen: boolean
  onClose: () => void
  onNavigate?: (direction: 'prev' | 'next') => void
  showNavigation?: boolean
  projectId: string
  canDelete?: boolean
  onDelete?: () => void
  currentIndex?: number
  totalCount?: number
}

// Internal component with mobile optimizations
function ImagePreviewModalContent({
  media,
  isOpen,
  onClose,
  onNavigate,
  showNavigation = false,
  projectId,
  canDelete = false,
  onDelete,
  currentIndex = 1,
  totalCount = 1
}: ImagePreviewModalProps) {
  // Mobile optimization hooks
  const { isMobile, isTablet } = useViewportSize()
  const { supportsTouch, optimizedSettings } = useDeviceDetection()
  const touchFeedback = useTouchFeedback()
  const modalRef = useRef<HTMLDivElement>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showMetadata, setShowMetadata] = useState(false)

  // Media deletion hook
  const deleteMutation = useMediaDeletion(projectId, {
    onSuccess: () => {
      setShowDeleteDialog(false)
      onDelete?.()
      onClose() // Close the modal after successful deletion
    },
    onError: (error) => {
      console.error('Failed to delete media:', error)
      // You might want to show a toast notification here
    }
  })

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(() => {
    deleteMutation.mutate(media.id)
  }, [deleteMutation, media.id])

  // Handle delete dialog close
  const handleDeleteCancel = useCallback(() => {
    setShowDeleteDialog(false)
  }, [])

  // Handle delete button click with haptic feedback
  const handleDeleteClick = useCallback(async () => {
    setShowDeleteDialog(true)
    if (supportsTouch) {
      await touchFeedback.notification('warning')
    }
  }, [supportsTouch, touchFeedback])

  // Handle keyboard shortcuts and accessibility
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isOpen) return

    switch (event.key) {
      case 'Escape':
        event.preventDefault()
        if (showDeleteDialog) {
          setShowDeleteDialog(false)
        } else if (showMetadata) {
          setShowMetadata(false)
        } else {
          onClose()
        }
        break
      case 'ArrowLeft':
        if (onNavigate && showNavigation && !showDeleteDialog) {
          event.preventDefault()
          onNavigate('prev')
          if (supportsTouch) {
            touchFeedback.selection()
          }
        }
        break
      case 'ArrowRight':
        if (onNavigate && showNavigation && !showDeleteDialog) {
          event.preventDefault()
          onNavigate('next')
          if (supportsTouch) {
            touchFeedback.selection()
          }
        }
        break
      case 'i':
      case 'I':
        if (!showDeleteDialog) {
          event.preventDefault()
          setShowMetadata(prev => !prev)
        }
        break
      case 'Delete':
      case 'Backspace':
        if (canDelete && !showDeleteDialog && !deleteMutation.isPending) {
          event.preventDefault()
          setShowDeleteDialog(true)
        }
        break
      case ' ':
      case 'Enter':
        // Handle focus management for interactive elements
        if (document.activeElement?.tagName === 'BUTTON') {
          // Let the button handle the click
          break
        }
        if (onNavigate && showNavigation && !showDeleteDialog) {
          event.preventDefault()
          onNavigate('next')
        }
        break
      case 'Tab':
        // Allow default tab behavior for accessibility
        break
      case 'Home':
        if (onNavigate && showNavigation && totalCount > 1 && !showDeleteDialog) {
          event.preventDefault()
          // Navigation to first/last would be handled by parent component
          // This is just keyboard shortcut handling
        }
        break
      case 'End':
        if (onNavigate && showNavigation && totalCount > 1 && !showDeleteDialog) {
          event.preventDefault()
          // Navigation to first/last would be handled by parent component
          // This is just keyboard shortcut handling
        }
        break
    }
  }, [isOpen, onClose, onNavigate, showNavigation, showMetadata, showDeleteDialog, canDelete, deleteMutation.isPending, totalCount])

  // Handle click outside modal
  const handleBackdropClick = useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }, [onClose])

  // Enhanced navigation handlers with haptic feedback
  const handleNavigateWithFeedback = useCallback(async (direction: 'prev' | 'next') => {
    if (onNavigate) {
      onNavigate(direction)
      if (supportsTouch) {
        await touchFeedback.selection()
      }
    }
  }, [onNavigate, supportsTouch, touchFeedback])

  // Handle metadata toggle with feedback
  const handleMetadataToggle = useCallback(async () => {
    setShowMetadata(!showMetadata)
    if (supportsTouch) {
      await touchFeedback.impact('light')
    }
  }, [showMetadata, supportsTouch, touchFeedback])

  // Handle close with feedback
  const handleCloseWithFeedback = useCallback(async () => {
    onClose()
    if (supportsTouch) {
      await touchFeedback.impact('light')
    }
  }, [onClose, supportsTouch, touchFeedback])

  // Setup keyboard event listeners
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
      
      // Focus the modal for accessibility
      modalRef.current?.focus()
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50"
      onClick={handleBackdropClick}
      style={{ backdropFilter: 'blur(8px)' }}
    >
      {/* Backdrop overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-80" />
      
      {/* Modal content - Responsive Layout */}
      <div
        ref={modalRef}
        className="relative w-full h-full flex overflow-hidden"
        tabIndex={-1}
        role="dialog"
        aria-label="Image preview"
        aria-modal="true"
      >
        {/* Desktop Layout: Image viewer + Side panel */}
        <div className="hidden lg:flex w-full h-full">
          {/* Main image area */}
          <div className="flex-1 relative">
            <ImageViewer
              src={`/api/media/download?path=${encodeURIComponent(media.file_path)}`}
              alt={media.file_name}
            />
            
            {/* Navigation buttons for desktop */}
            {showNavigation && onNavigate && (
              <>
                <button
                  type="button"
                  onClick={() => handleNavigateWithFeedback('prev')}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 p-3 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all duration-200 touch-button"
                  aria-label="Previous image"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <button
                  type="button"
                  onClick={() => handleNavigateWithFeedback('next')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all duration-200 touch-button"
                  aria-label="Next image"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </div>
          
          {/* Desktop: Side panel with metadata */}
          <div 
            className="w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col"
            role="complementary"
            aria-label="Image metadata panel"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
              <h2 
                className="text-lg font-medium text-gray-900 dark:text-white"
                id="metadata-panel-title"
              >
                Image Details
              </h2>
              <div className="flex items-center space-x-2" role="toolbar" aria-label="Image actions">
                {/* Delete button */}
                {canDelete && (
                  <button
                    type="button"
                    onClick={handleDeleteClick}
                    disabled={deleteMutation.isPending}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-full hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={`Delete image ${media.file_name}`}
                    aria-describedby="delete-shortcut-hint"
                    title="Delete media (Del key)"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
                
                {/* Close button */}
                <button
                  type="button"
                  onClick={handleCloseWithFeedback}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100 touch-button"
                  aria-label="Close image preview"
                  aria-describedby="close-shortcut-hint"
                  title="Close preview (Esc key)"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Metadata panel */}
            <div 
              className="flex-1 overflow-y-auto p-4"
              role="region"
              aria-labelledby="metadata-panel-title"
              tabIndex={0}
            >
              <ImageMetadata
                media={media}
                currentIndex={currentIndex}
                totalCount={totalCount}
                showUserInfo={true}
                showIndex={true}
                compact={false}
              />
            </div>
            
            {/* Hidden accessibility hints */}
            <div className="sr-only">
              <div id="delete-shortcut-hint">Press Delete or Backspace key to delete this image</div>
              <div id="close-shortcut-hint">Press Escape key to close preview</div>
              <div id="navigation-hint">Use arrow keys to navigate between images</div>
              <div id="metadata-hint">Press &apos;i&apos; to toggle metadata display on mobile</div>
            </div>
          </div>
        </div>
        
        {/* Mobile/Tablet Layout: Full screen with overlay */}
        <div className="lg:hidden relative w-full h-full">
          {/* Mobile header */}
          <div 
            className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent text-white"
            role="banner"
            aria-label="Image preview controls"
          >
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleMetadataToggle}
                className="p-2 text-white hover:text-gray-300 transition-colors rounded-full hover:bg-white hover:bg-opacity-10 touch-button"
                aria-label={`${showMetadata ? 'Hide' : 'Show'} image metadata`}
                aria-describedby="metadata-hint"
                aria-expanded={showMetadata}
                title="Toggle info (i key)"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              
              {totalCount > 1 && (
                <div
                  className="text-sm font-medium"
                  role="status"
                  aria-label={`Image ${currentIndex} of ${totalCount}`}
                  aria-live="polite"
                >
                  {currentIndex} / {totalCount}
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2" role="toolbar" aria-label="Image actions">
              {/* Delete button */}
              {canDelete && (
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  disabled={deleteMutation.isPending}
                  className="p-2 text-white hover:text-red-300 transition-colors rounded-full hover:bg-red-600 hover:bg-opacity-20 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={`Delete image ${media.file_name}`}
                  aria-describedby="delete-shortcut-hint"
                  title="Delete media (Del key)"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
              
              {/* Close button */}
              <button
                type="button"
                onClick={handleCloseWithFeedback}
                className="p-2 text-white hover:text-gray-300 transition-colors rounded-full hover:bg-white hover:bg-opacity-10 touch-button"
                aria-label="Close image preview"
                aria-describedby="close-shortcut-hint"
                title="Close preview (Esc key)"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Mobile image viewer */}
          <div className="w-full h-full">
            <ImageViewer
              src={`/api/media/download?path=${encodeURIComponent(media.file_path)}`}
              alt={media.file_name}
              onSwipeLeft={showNavigation && onNavigate ? () => onNavigate('next') : undefined}
              onSwipeRight={showNavigation && onNavigate ? () => onNavigate('prev') : undefined}
            />
          </div>
          
          {/* Mobile navigation buttons */}
          {showNavigation && onNavigate && (
            <div role="navigation" aria-label="Image navigation">
              <button
                type="button"
                onClick={() => handleNavigateWithFeedback('prev')}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 p-3 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all duration-200 touch-target"
                aria-label={`Previous image (${currentIndex - 1} of ${totalCount})`}
                aria-describedby="navigation-hint"
                disabled={currentIndex === 1}
                title="Previous (← key)"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <button
                type="button"
                onClick={() => handleNavigateWithFeedback('next')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all duration-200 touch-target"
                aria-label={`Next image (${currentIndex + 1} of ${totalCount})`}
                aria-describedby="navigation-hint"
                disabled={currentIndex === totalCount}
                title="Next (→ key)"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
          
          {/* Mobile metadata overlay */}
          {showMetadata && (
            <div 
              className="absolute bottom-0 left-0 right-0 max-h-[50vh] overflow-y-auto"
              role="region"
              aria-label="Image metadata"
              aria-live="polite"
            >
              <div className="p-4">
                <ImageMetadata
                  media={media}
                  currentIndex={currentIndex}
                  totalCount={totalCount}
                  showUserInfo={true}
                  showIndex={false} // Already shown in header
                  compact={true}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        mediaItem={media}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  )
}

// Main export component with TouchFeedbackProvider
export function ImagePreviewModal(props: ImagePreviewModalProps) {
  return (
    <TouchFeedbackProvider
      enabled={true}
      enableHaptic={true}
      enableVisual={true}
      enableAudio={false}
      respectReducedMotion={true}
    >
      <ImagePreviewModalContent {...props} />
    </TouchFeedbackProvider>
  )
}