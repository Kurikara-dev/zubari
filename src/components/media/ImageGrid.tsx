'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import ImageCard from './ImageCard'
import ImageSkeleton from './ImageSkeleton'
import { ImagePreviewModal } from './ImagePreviewModal'
import ImageUploadWithProgress from '@/components/projects/form-components/ImageUploadWithProgress'
import UploadValidation from '@/components/projects/form-components/UploadValidation'
import { useMediaInfiniteScroll } from '@/lib/hooks/useInfiniteScroll'
import ImageFilters, { type FilterState } from './ImageFilters'
import ImagePagination from './ImagePagination'
import type { Media, ApiResponse } from '@/lib/types/api'
import { useMediaPagination } from '@/lib/hooks/usePagination'
import { TouchFeedbackProvider, useTouchFeedback, TouchFeedbackButton } from './mobile/TouchFeedbackProvider'
import { useViewportSize } from '@/lib/hooks/mobile/useViewportSize'
import { useDeviceDetection } from '@/lib/utils/mobile/deviceDetection'

interface ImageGridProps {
  projectId: string
  className?: string
  enableInfiniteScroll?: boolean
  pageSize?: number
  showFilters?: boolean
  showPagination?: boolean
}

async function fetchMediaFiles(projectId: string): Promise<Media[]> {
  const url = `/api/media?projectId=${projectId}`
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error('Failed to fetch media files')
  }
  
  const apiResponse: ApiResponse<Media[]> = await response.json()
  
  if (!apiResponse.success || !apiResponse.data) {
    throw new Error(apiResponse.error || 'Failed to fetch media files')
  }
  
  return apiResponse.data
}

// Internal component with mobile optimizations
function ImageGridContent({ 
  projectId, 
  className = '',
  enableInfiniteScroll = true,
  pageSize = 20,
  showFilters = true,
  showPagination = false
}: ImageGridProps) {
  // Mobile optimization hooks
  const { isMobile: _isMobile, isTablet: _isTablet, getCurrentBreakpoint, matches } = useViewportSize() // eslint-disable-line @typescript-eslint/no-unused-vars -- Reserved for responsive design
  const { supportsTouch, isHighDPI: _isHighDPI, optimizedSettings: _optimizedSettings } = useDeviceDetection() // eslint-disable-line @typescript-eslint/no-unused-vars -- Reserved for performance optimization
  const touchFeedback = useTouchFeedback()
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null)
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    sortBy: 'created_at',
    sortOrder: 'desc',
    fileTypes: [],
    uploaders: [],
    dateRange: { start: null, end: null }
  })
  
  // Determine which mode to use - prioritize pagination over infinite scroll if both are enabled
  const usePaginationMode = showPagination && !enableInfiniteScroll
  
  // Use pagination hook for traditional pagination
  const paginationData = useMediaPagination({
    projectId,
    initialPageSize: pageSize,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    search: filters.search,
    filter: {
      fileType: filters.fileTypes,
      uploaders: filters.uploaders,
      dateRange: filters.dateRange.start || filters.dateRange.end ? {
        start: filters.dateRange.start || '',
        end: filters.dateRange.end || ''
      } : undefined
    },
    enabled: usePaginationMode,
    enableUrlSync: usePaginationMode, // Enable URL sync only for pagination mode
  });
  
  // Use infinite scroll hook if enabled, otherwise fallback to regular query
  const infiniteScrollData = useMediaInfiniteScroll({
    projectId,
    pageSize,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    search: filters.search,
    filter: {
      fileType: filters.fileTypes,
      uploaders: filters.uploaders,
      dateRange: filters.dateRange.start || filters.dateRange.end ? {
        start: filters.dateRange.start || '',
        end: filters.dateRange.end || ''
      } : undefined
    },
    enabled: enableInfiniteScroll && !usePaginationMode,
  });

  const fallbackData = useQuery({
    queryKey: ['media', projectId],
    queryFn: () => fetchMediaFiles(projectId),
    enabled: !enableInfiniteScroll && !usePaginationMode,
  });

  // Determine which data source to use
  const {
    data: mediaFiles = [],
    isLoading,
    error,
    refetch,
    isFetchingNextPage,
    hasNextPage,
    triggerRef,
    totalCount,
    paginationState,
    onPageChange,
    onPageSizeChange
  } = useMemo(() => {
    if (usePaginationMode) {
      return {
        data: paginationData.data,
        isLoading: paginationData.isLoading,
        error: paginationData.error,
        refetch: paginationData.refetch,
        isFetchingNextPage: false,
        hasNextPage: false,
        triggerRef: null,
        totalCount: paginationData.paginationState.totalItems,
        paginationState: paginationData.paginationState,
        onPageChange: paginationData.goToPage,
        onPageSizeChange: paginationData.changePageSize,
      };
    } else if (enableInfiniteScroll) {
      return {
        data: infiniteScrollData.data,
        isLoading: infiniteScrollData.isLoading,
        error: infiniteScrollData.error,
        refetch: infiniteScrollData.refetch,
        isFetchingNextPage: infiniteScrollData.isFetchingNextPage,
        hasNextPage: infiniteScrollData.hasNextPage,
        triggerRef: infiniteScrollData.triggerRef,
        totalCount: infiniteScrollData.totalCount,
        paginationState: null,
        onPageChange: null,
        onPageSizeChange: null,
      };
    } else {
      return {
        data: fallbackData.data || [],
        isLoading: fallbackData.isLoading,
        error: fallbackData.error,
        refetch: fallbackData.refetch,
        isFetchingNextPage: false,
        hasNextPage: false,
        triggerRef: null,
        totalCount: fallbackData.data?.length,
        paginationState: null,
        onPageChange: null,
        onPageSizeChange: null,
      };
    }
  }, [usePaginationMode, enableInfiniteScroll, paginationData, infiniteScrollData, fallbackData]);

  const handleImageClick = async (media: Media) => {
    const index = (mediaFiles as Media[]).findIndex((m: Media) => m.id === media.id)
    setCurrentIndex(index)
    setSelectedMedia(media)
    
    // Provide haptic feedback on mobile devices
    if (supportsTouch) {
      await touchFeedback.selection()
    }
  }

  const handleClosePreview = () => {
    setSelectedMedia(null)
  }

  const handleNavigate = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' 
      ? (currentIndex - 1 + mediaFiles.length) % mediaFiles.length
      : (currentIndex + 1) % mediaFiles.length
    
    setCurrentIndex(newIndex)
    setSelectedMedia((mediaFiles as Media[])[newIndex])
  }

  const handleMediaDelete = () => {
    refetch()
  }

  const handleUploadComplete = () => {
    refetch()
    setShowUploadModal(false)
  }

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error)
  }

  if (isLoading) {
    return (
      <div className={className}>
        <ImageSkeleton count={12} />
      </div>
    )
  }

  if (error) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <p className="text-gray-600 mb-4">画像の読み込みに失敗しました</p>
        <TouchFeedbackButton
          onClick={() => refetch()}
          className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium py-3 sm:py-2 px-4 rounded-md transition duration-200 touch-target"
          hapticType="light"
          visualFeedback={true}
        >
          再試行
        </TouchFeedbackButton>
      </div>
    )
  }

  if (mediaFiles.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          画像が見つかりません
        </h3>
        <p className="text-gray-600 mb-4">
          このプロジェクトにはまだ画像がアップロードされていません
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <TouchFeedbackButton
            onClick={() => setShowUploadModal(true)}
            className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium py-3 px-6 rounded-md transition duration-200 touch-target"
            hapticType="medium"
            visualFeedback={true}
          >
            画像をアップロード
          </TouchFeedbackButton>
          <Link
            href={`/projects/${projectId}/upload`}
            className="text-blue-600 hover:text-blue-700 font-medium py-3 px-6 rounded-md transition duration-200 touch-target touch-button border border-blue-600 hover:border-blue-700"
          >
            アップロードページを開く
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Header with Upload Button */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          {totalCount ? `${totalCount}個中${mediaFiles.length}個の画像を表示` : `${mediaFiles.length}個の画像が見つかりました`}
          {enableInfiniteScroll && hasNextPage && (
            <span className="ml-2 text-blue-600">
              スクロールで続きを読み込み
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <TouchFeedbackButton
            onClick={() => setShowUploadModal(true)}
            className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium py-2 px-4 rounded-md transition duration-200 text-sm"
            hapticType="medium"
            visualFeedback={true}
          >
            + 画像を追加
          </TouchFeedbackButton>
          <Link
            href={`/projects/${projectId}/upload`}
            className="text-blue-600 hover:text-blue-700 font-medium py-2 px-4 rounded-md transition duration-200 text-sm touch-button border border-blue-600 hover:border-blue-700"
          >
            アップロードページ
          </Link>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mb-6">
          <ImageFilters
            projectId={projectId}
            initialState={filters}
            onChange={setFilters}
            enableUrlSync={true}
          />
        </div>
      )}
      
      <div className={`grid gap-4 ${
        // Mobile-optimized grid columns based on device type and orientation
        getCurrentBreakpoint() === 'smallMobile' 
          ? 'grid-cols-2'
          : matches('mobile')
          ? 'grid-cols-2 xs:grid-cols-3'
          : matches('tablet')
          ? 'grid-cols-3 md:grid-cols-4'
          : 'grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
      }`}>
        {(mediaFiles as Media[]).map((media, index) => (
          <ImageCard
            key={media.id}
            media={media}
            onClick={handleImageClick}
            enableLazyLoading={true}
            priority={index < 6} // Prioritize first row of images
            showPerformanceMetrics={process.env.NODE_ENV === 'development'}
          />
        ))}
      </div>

      {/* Infinite scroll trigger */}
      {enableInfiniteScroll && hasNextPage && (
        <div 
          ref={triggerRef as React.RefObject<HTMLDivElement>}
          className="flex justify-center py-8"
        >
          {isFetchingNextPage ? (
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
              <span className="text-sm text-gray-600">読み込み中...</span>
            </div>
          ) : (
            <div className="text-sm text-gray-400">
              スクロールして続きを読み込み
            </div>
          )}
        </div>
      )}

      {/* Pagination Controls */}
      {usePaginationMode && paginationState && onPageChange && onPageSizeChange && (
        <div className="mt-8">
          <ImagePagination
            paginationState={paginationState}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            showPageSizeSelector={true}
          />
        </div>
      )}

      {/* End of results indicator */}
      {enableInfiniteScroll && !hasNextPage && mediaFiles.length > 0 && (
        <div className="text-center py-8">
          <div className="text-sm text-gray-500">
            すべての画像を表示しました ({totalCount || mediaFiles.length}個)
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  画像をアップロード
                </h2>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4">
                <UploadValidation showRules={true} compact={true} />
              </div>
              
              <ImageUploadWithProgress
                projectId="default"
                onUploadComplete={handleUploadComplete}
                onUploadError={handleUploadError}
                autoUpload={true}
                placeholder="画像をドラッグ&ドロップ、またはクリックして選択"
              />
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {selectedMedia && (
        <ImagePreviewModal
          media={selectedMedia}
          isOpen={true}
          onClose={handleClosePreview}
          onNavigate={mediaFiles.length > 1 ? handleNavigate : undefined}
          showNavigation={mediaFiles.length > 1}
          projectId={projectId}
          canDelete={true}
          onDelete={handleMediaDelete}
          currentIndex={currentIndex + 1} // Convert to 1-based index
          totalCount={mediaFiles.length}
        />
      )}
    </div>
  )
}

// Main export component with TouchFeedbackProvider
export default function ImageGrid(props: ImageGridProps) {
  return (
    <TouchFeedbackProvider
      enabled={true}
      enableHaptic={true}
      enableVisual={true}
      enableAudio={false}
      respectReducedMotion={true}
    >
      <ImageGridContent {...props} />
    </TouchFeedbackProvider>
  )
}