'use client'

import { useState, useCallback, useRef } from 'react'

export interface UploadState {
  progress: number
  status: 'idle' | 'uploading' | 'success' | 'error'
  error?: string
}

export interface UseUploadProgressReturn {
  uploadState: UploadState
  uploadFile: (file: File, projectId: string, onProgress?: (progress: number) => void) => Promise<boolean>
  cancelUpload: () => void
  resetUpload: () => void
}

export function useUploadProgress(): UseUploadProgressReturn {
  const [uploadState, setUploadState] = useState<UploadState>({
    progress: 0,
    status: 'idle'
  })
  
  const abortControllerRef = useRef<AbortController | null>(null)

  const resetUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    
    setUploadState({
      progress: 0,
      status: 'idle'
    })
  }, [])

  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    
    setUploadState(prev => ({
      ...prev,
      status: 'idle',
      progress: 0
    }))
  }, [])

  const uploadFile = useCallback(async (
    file: File,
    projectId: string,
    onProgress?: (progress: number) => void
  ): Promise<boolean> => {
    try {
      resetUpload()
      
      abortControllerRef.current = new AbortController()
      
      setUploadState({
        progress: 0,
        status: 'uploading'
      })

      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', projectId)

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100)
            setUploadState(prev => ({
              ...prev,
              progress
            }))
            onProgress?.(progress)
          }
        })

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadState({
              progress: 100,
              status: 'success'
            })
            resolve(true)
          } else {
            const errorMessage = `Upload failed with status: ${xhr.status}`
            setUploadState({
              progress: 0,
              status: 'error',
              error: errorMessage
            })
            reject(new Error(errorMessage))
          }
        })

        xhr.addEventListener('error', () => {
          const errorMessage = 'Network error during upload'
          setUploadState({
            progress: 0,
            status: 'error',
            error: errorMessage
          })
          reject(new Error(errorMessage))
        })

        xhr.addEventListener('abort', () => {
          setUploadState({
            progress: 0,
            status: 'idle'
          })
          resolve(false)
        })

        abortControllerRef.current?.signal.addEventListener('abort', () => {
          xhr.abort()
        })

        xhr.open('POST', '/api/media/upload')
        xhr.send(formData)
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown upload error'
      setUploadState({
        progress: 0,
        status: 'error',
        error: errorMessage
      })
      return false
    }
  }, [resetUpload])

  return {
    uploadState,
    uploadFile,
    cancelUpload,
    resetUpload
  }
}