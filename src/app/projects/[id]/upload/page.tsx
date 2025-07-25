'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import ImageUploadWithProgress from '@/components/projects/form-components/ImageUploadWithProgress'
import UploadValidation from '@/components/projects/form-components/UploadValidation'

export default function UploadPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string
  
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])
  
  const handleUploadComplete = useCallback((file: File) => {
    setUploadedFiles(prev => [...prev, file.name])
  }, [])
  
  const handleUploadError = useCallback((error: string) => {
    console.error('Upload error:', error)
  }, [])
  

  const handleNavigateToMedia = useCallback(() => {
    router.push(`/projects/${projectId}/media`)
  }, [router, projectId])

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Breadcrumb Navigation */}
      <nav className="mb-8">
        <ol className="flex items-center space-x-2 text-sm text-gray-600">
          <li>
            <Link href="/projects" className="hover:text-gray-900 transition-colors">
              プロジェクト一覧
            </Link>
          </li>
          <li>
            <span className="mx-2">/</span>
          </li>
          <li>
            <Link href={`/projects/${projectId}/media`} className="hover:text-gray-900 transition-colors">
              メディア一覧
            </Link>
          </li>
          <li>
            <span className="mx-2">/</span>
          </li>
          <li className="text-gray-900 font-medium">
            画像アップロード
          </li>
        </ol>
      </nav>

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">画像アップロード</h1>
        <p className="text-gray-600">
          プロジェクトに画像を追加します。複数の画像を一度にアップロードできます。
        </p>
      </div>

      {/* Validation Rules */}
      <div className="mb-8">
        <UploadValidation 
          showRules={true}
        />
      </div>

      {/* Upload Area */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          画像を選択してアップロード
        </h2>
        
        <ImageUploadWithProgress
          projectId={projectId}
          onUploadComplete={handleUploadComplete}
          onUploadError={handleUploadError}
          autoUpload={true}
          placeholder="画像をドラッグ&ドロップ、またはクリックして選択"
        />
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            アップロード済みファイル ({uploadedFiles.length}件)
          </h3>
          <ul className="space-y-2">
            {uploadedFiles.map((fileName, index) => (
              <li key={index} className="flex items-center text-sm text-gray-700">
                <svg className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {fileName}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Navigation Actions */}
      <div className="flex justify-between items-center">
        <Link
          href={`/projects/${projectId}/media`}
          className="text-blue-600 hover:text-blue-700 transition-colors flex items-center"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          メディア一覧に戻る
        </Link>
        
        {uploadedFiles.length > 0 && (
          <button
            onClick={handleNavigateToMedia}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 active:bg-blue-800 transition-colors"
          >
            メディア一覧を確認
          </button>
        )}
      </div>
    </div>
  )
}