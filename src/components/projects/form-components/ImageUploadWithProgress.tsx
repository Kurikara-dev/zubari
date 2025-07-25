'use client'

import { useState, useCallback } from 'react'
import ImageUploadZone from './ImageUploadZone'
import FilePreview from './FilePreview'
import UploadProgress from './UploadProgress'
import { useUploadProgress } from '@/lib/hooks/useUploadProgress'
import { ImageUploadZoneProps } from '@/app/types/forms'

interface ImageUploadWithProgressProps extends Omit<ImageUploadZoneProps, 'onFileSelect'> {
  projectId: string
  onUploadComplete?: (file: File) => void
  onUploadError?: (error: string) => void
  autoUpload?: boolean
}

export default function ImageUploadWithProgress({
  projectId,
  onUploadComplete,
  onUploadError,
  autoUpload = false,
  acceptedTypes,
  maxSize,
  disabled = false,
  error,
  placeholder
}: ImageUploadWithProgressProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  
  const { uploadState, uploadFile, cancelUpload, resetUpload } = useUploadProgress()

  const handleUpload = useCallback(async (file?: File) => {
    const fileToUpload = file || selectedFile
    if (!fileToUpload) return

    try {
      const success = await uploadFile(fileToUpload, projectId)
      if (success) {
        onUploadComplete?.(fileToUpload)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      onUploadError?.(errorMessage)
    }
  }, [selectedFile, uploadFile, projectId, onUploadComplete, onUploadError])

  const handleFileSelect = useCallback((file: File | null) => {
    if (!file) {
      setSelectedFile(null)
      setPreviewUrl(null)
      resetUpload()
      return
    }

    setSelectedFile(file)
    
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    if (autoUpload) {
      handleUpload(file)
    }
  }, [autoUpload, resetUpload, handleUpload])

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null)
    setPreviewUrl(null)
    resetUpload()
  }, [resetUpload])

  const handleCancelUpload = useCallback(() => {
    cancelUpload()
  }, [cancelUpload])

  const isUploading = uploadState.status === 'uploading'
  const showProgress = uploadState.status !== 'idle'

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      {!selectedFile && (
        <ImageUploadZone
          onFileSelect={handleFileSelect}
          acceptedTypes={acceptedTypes}
          maxSize={maxSize}
          disabled={disabled || isUploading}
          error={error}
          placeholder={placeholder}
        />
      )}

      {/* File Preview */}
      {selectedFile && (
        <FilePreview
          file={selectedFile}
          previewUrl={previewUrl}
          onRemove={uploadState.status === 'success' ? undefined : handleRemoveFile}
          disabled={isUploading}
          showSize={true}
          showType={true}
        />
      )}

      {/* Upload Progress */}
      {showProgress && (
        <UploadProgress
          progress={uploadState.progress}
          status={uploadState.status}
          fileName={selectedFile?.name}
          errorMessage={uploadState.error}
          onCancel={isUploading ? handleCancelUpload : undefined}
          showPercentage={true}
          size="medium"
        />
      )}

      {/* Manual Upload Button */}
      {!autoUpload && selectedFile && uploadState.status === 'idle' && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => handleUpload()}
            disabled={disabled || isUploading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            アップロード開始
          </button>
        </div>
      )}
    </div>
  )
}