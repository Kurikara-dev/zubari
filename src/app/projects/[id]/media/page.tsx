import { Suspense } from 'react'
import ImageGrid from '@/components/media/ImageGrid'

interface MediaPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function MediaPage({ params }: MediaPageProps) {
  const resolvedParams = await params
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">メディア一覧</h1>
        <p className="text-gray-600">プロジェクトに関連する画像を管理・確認できます</p>
      </div>
      
      <Suspense fallback={<div className="text-center py-8">読み込み中...</div>}>
        <ImageGrid projectId={resolvedParams.id} />
      </Suspense>
    </div>
  )
}