'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import ImageGrid from '@/components/media/ImageGrid'
import type { Project, ApiResponse } from '@/lib/types/api'

async function fetchProject(projectId: string): Promise<Project> {
  const response = await fetch(`/api/projects/${projectId}`)
  
  if (!response.ok) {
    throw new Error('Failed to fetch project')
  }
  
  const apiResponse: ApiResponse<Project> = await response.json()
  
  if (!apiResponse.success || !apiResponse.data) {
    throw new Error(apiResponse.error || 'Failed to fetch project')
  }
  
  return apiResponse.data
}

export default function ProjectPage() {
  const { id: projectId } = useParams<{ id: string }>()
  
  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => fetchProject(projectId),
  })

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-surface-secondary rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-surface-secondary rounded w-2/3 mb-8"></div>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-square bg-surface-secondary rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-surface-secondary rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-text-muted mb-4">プロジェクトの読み込みに失敗しました</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-accent hover:bg-accent-hover active:bg-accent-active text-white font-medium py-3 sm:py-2 px-4 rounded-md transition duration-200"
          >
            再試行
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Project Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text mb-2">
          {project?.name || 'プロジェクト詳細'}
        </h1>
        {project?.description && (
          <p className="text-text-muted text-lg">
            {project.description}
          </p>
        )}
      </div>

      {/* Image Grid */}
      <ImageGrid
        projectId={projectId}
        className="mb-8"
        enableInfiniteScroll={true}
        pageSize={20}
        showFilters={true}
      />
    </div>
  )
}