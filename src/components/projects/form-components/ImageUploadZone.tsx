'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { ImageUploadZoneProps } from '@/app/types/forms'
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE, isAllowedMimeType, validateFileSize } from '@/lib/types/media'

interface ImageUploadState {
  isDragOver: boolean
  selectedFile: File | null
  previewUrl: string | null
  error: string | null
}

export default function ImageUploadZone({
  onFileSelect,
  acceptedTypes = [...ALLOWED_MIME_TYPES],
  maxSize = MAX_FILE_SIZE,
  disabled = false,
  error,
  placeholder = "画像をドラッグ&ドロップ、またはクリックして選択"
}: ImageUploadZoneProps) {
  const [state, setState] = useState<ImageUploadState>({
    isDragOver: false,
    selectedFile: null,
    previewUrl: null,
    error: null
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = useCallback((file: File): string | null => {
    if (!isAllowedMimeType(file.type)) {
      return `サポートされていないファイル形式です。${acceptedTypes.join(', ')} のみ対応しています。`
    }
    
    if (!validateFileSize(file.size)) {
      return `ファイルサイズが大きすぎます。${Math.round(maxSize / 1024 / 1024)}MB以下のファイルを選択してください。`
    }
    
    return null
  }, [acceptedTypes, maxSize])

  const handleFileSelect = useCallback((file: File) => {
    const validationError = validateFile(file)
    
    if (validationError) {
      setState(prev => ({
        ...prev,
        error: validationError,
        selectedFile: null,
        previewUrl: null
      }))
      onFileSelect(null)
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      setState(prev => ({
        ...prev,
        selectedFile: file,
        previewUrl: e.target?.result as string,
        error: null
      }))
    }
    reader.readAsDataURL(file)
    onFileSelect(file)
  }, [validateFile, onFileSelect])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }, [handleFileSelect])

  const handleClick = useCallback(() => {
    if (disabled) return
    fileInputRef.current?.click()
  }, [disabled])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setState(prev => ({ ...prev, isDragOver: true }))
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setState(prev => ({ ...prev, isDragOver: false }))
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setState(prev => ({ ...prev, isDragOver: false }))
    
    if (disabled) return
    
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }, [disabled, handleFileSelect])

  const handleRemoveFile = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedFile: null,
      previewUrl: null,
      error: null
    }))
    onFileSelect(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [onFileSelect])

  const baseClasses = "w-full border-2 border-dashed rounded-lg transition-colors cursor-pointer touch-button"
  const dragOverClasses = state.isDragOver ? "border-blue-500 bg-blue-50" : ""
  const errorClasses = (error || state.error) ? "border-red-500" : "border-gray-300 hover:border-gray-400 active:border-gray-500"
  const disabledClasses = disabled ? "opacity-50 cursor-not-allowed" : ""
  
  const dropZoneClasses = `${baseClasses} ${dragOverClasses} ${errorClasses} ${disabledClasses}`

  const displayError = error || state.error

  return (
    <div className="mb-4">
      <div
        className={dropZoneClasses}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="画像ファイルをアップロード"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
          data-testid="file-input"
        />
        
        {state.selectedFile ? (
          <div className="p-3 sm:p-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              {state.previewUrl && (
                <Image
                  src={state.previewUrl}
                  alt="プレビュー"
                  width={64}
                  height={64}
                  className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {state.selectedFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {Math.round(state.selectedFile.size / 1024)} KB • {state.selectedFile.type}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemoveFile()
                }}
                className="text-red-600 hover:text-red-700 active:text-red-800 text-sm touch-target px-2 py-1 rounded touch-button flex-shrink-0"
                disabled={disabled}
              >
                削除
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 sm:p-8 text-center">
            <svg
              className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="mt-2 text-sm sm:text-sm text-gray-600">
              {placeholder}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {acceptedTypes.join(', ')} • 最大 {Math.round(maxSize / 1024 / 1024)}MB
            </p>
          </div>
        )}
      </div>
      
      {displayError && (
        <p className="mt-1 text-sm text-red-600" role="alert">
          {displayError}
        </p>
      )}
    </div>
  )
}