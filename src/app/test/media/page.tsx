'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Project, Media, ApiResponse } from '@/lib/types/api'
import type { MediaUploadOptions, MediaUploadResult } from '@/lib/types/media'
import { isAllowedMimeType, validateFileSize, MAX_FILE_SIZE } from '@/lib/types/media'

async function fetchProjects(): Promise<Project[]> {
  const response = await fetch('/api/projects?limit=100')
  if (!response.ok) {
    throw new Error('Failed to fetch projects')
  }
  const apiResponse: ApiResponse<{ data: Project[]; total: number }> = await response.json()
  if (!apiResponse.success || !apiResponse.data) {
    throw new Error(apiResponse.error || 'Failed to fetch projects')
  }
  return apiResponse.data.data
}

async function fetchMediaFiles(projectId: string): Promise<Media[]> {
  const response = await fetch(`/api/media?projectId=${projectId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch media files')
  }
  const apiResponse: ApiResponse<Media[]> = await response.json()
  if (!apiResponse.success || !apiResponse.data) {
    throw new Error(apiResponse.error || 'Failed to fetch media files')
  }
  return apiResponse.data
}

async function uploadMediaFile(options: MediaUploadOptions): Promise<MediaUploadResult> {
  const formData = new FormData()
  formData.append('file', options.file)
  formData.append('projectId', options.projectId)
  
  const response = await fetch('/api/media/upload', {
    method: 'POST',
    body: formData,
  })
  
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Upload failed')
  }
  
  const result: ApiResponse<MediaUploadResult> = await response.json()
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Upload failed')
  }
  
  return result.data
}

export default function MediaTestPage() {
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = useState<string>('')
  const queryClient = useQueryClient()

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
  })

  const { data: mediaFiles = [], isLoading: mediaLoading } = useQuery({
    queryKey: ['media', selectedProject],
    queryFn: () => fetchMediaFiles(selectedProject),
    enabled: !!selectedProject,
  })

  const uploadMutation = useMutation({
    mutationFn: uploadMediaFile,
    onSuccess: () => {
      setUploadStatus('ファイルがアップロードされました！')
      setSelectedFile(null)
      if (selectedProject) {
        queryClient.invalidateQueries({ queryKey: ['media', selectedProject] })
      }
      
      const fileInput = document.getElementById('fileInput') as HTMLInputElement
      if (fileInput) {
        fileInput.value = ''
      }
    },
    onError: (error: Error) => {
      setUploadStatus(`エラー: ${error.message}`)
    },
  })

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setUploadStatus('')
    
    if (!file) {
      setSelectedFile(null)
      return
    }

    if (!isAllowedMimeType(file.type)) {
      setUploadStatus('エラー: JPG、PNG、WebPファイルのみアップロード可能です')
      setSelectedFile(null)
      return
    }

    if (!validateFileSize(file.size)) {
      setUploadStatus(`エラー: ファイルサイズは${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB以下にしてください`)
      setSelectedFile(null)
      return
    }

    setSelectedFile(file)
  }

  const handleUpload = () => {
    if (!selectedFile || !selectedProject) {
      setUploadStatus('エラー: プロジェクトとファイルを選択してください')
      return
    }

    setUploadStatus('アップロード中...')
    uploadMutation.mutate({
      projectId: selectedProject,
      file: selectedFile,
      userId: 'current-user', // This will be handled by the API
    })
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">メディア管理テストページ</h1>
        <p className="text-gray-600">Supabase Storageとメディア管理機能のテスト</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">ファイルアップロード</h2>
          
          {/* Project Selection */}
          <div className="mb-4">
            <label htmlFor="projectSelect" className="block text-sm font-medium text-gray-700 mb-2">
              プロジェクトを選択
            </label>
            {projectsLoading ? (
              <div className="h-10 bg-gray-200 rounded-md animate-pulse"></div>
            ) : (
              <select
                id="projectSelect"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">プロジェクトを選択してください</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* File Selection */}
          <div className="mb-4">
            <label htmlFor="fileInput" className="block text-sm font-medium text-gray-700 mb-2">
              ファイルを選択（JPG、PNG、WebP、最大10MB）
            </label>
            <input
              id="fileInput"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Selected File Info */}
          {selectedFile && (
            <div className="mb-4 p-3 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>選択されたファイル:</strong> {selectedFile.name}
              </p>
              <p className="text-sm text-blue-600">
                サイズ: {Math.round(selectedFile.size / 1024)}KB | タイプ: {selectedFile.type}
              </p>
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!selectedFile || !selectedProject || uploadMutation.isPending}
            className={`w-full py-3 px-4 rounded-md font-medium transition duration-200 ${
              !selectedFile || !selectedProject || uploadMutation.isPending
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {uploadMutation.isPending ? 'アップロード中...' : 'アップロード'}
          </button>

          {/* Status Message */}
          {uploadStatus && (
            <div className={`mt-4 p-3 rounded-md ${
              uploadStatus.startsWith('エラー') 
                ? 'bg-red-50 text-red-800 border border-red-200' 
                : uploadStatus.includes('アップロード中')
                ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                : 'bg-green-50 text-green-800 border border-green-200'
            }`}>
              {uploadStatus}
            </div>
          )}
        </div>

        {/* Media Files List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">アップロード済みファイル</h2>
          
          {!selectedProject ? (
            <p className="text-gray-500">プロジェクトを選択してファイル一覧を表示</p>
          ) : mediaLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-16 bg-gray-200 rounded-md animate-pulse"></div>
              ))}
            </div>
          ) : mediaFiles.length === 0 ? (
            <p className="text-gray-500">まだファイルがアップロードされていません</p>
          ) : (
            <div className="space-y-3">
              {mediaFiles.map((media) => (
                <div key={media.id} className="border border-gray-200 rounded-md p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{media.file_name}</h3>
                      <p className="text-sm text-gray-600">
                        {Math.round(media.file_size / 1024)}KB | {media.mime_type}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(media.uploaded_at).toLocaleString('ja-JP')}
                      </p>
                    </div>
                    <div className="ml-4">
                      <a
                        href={`/api/media/download?id=${media.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        表示
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Debug Information */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">デバッグ情報</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <h4 className="font-medium text-gray-700">プロジェクト数</h4>
            <p className="text-lg font-bold text-blue-600">{projects.length}</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-700">選択されたプロジェクト</h4>
            <p className="text-lg font-bold text-blue-600">
              {selectedProject ? projects.find(p => p.id === selectedProject)?.name || 'Unknown' : 'なし'}
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-700">メディアファイル数</h4>
            <p className="text-lg font-bold text-blue-600">{mediaFiles.length}</p>
          </div>
        </div>
      </div>
    </div>
  )
}