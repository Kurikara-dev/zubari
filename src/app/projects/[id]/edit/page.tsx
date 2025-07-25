'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import ProjectForm from '@/components/projects/ProjectForm'
import { ProjectFormData } from '@/app/types/forms'
import { projectApi } from '@/lib/api/client'
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

export default function EditProjectPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const router = useRouter()

  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => fetchProject(projectId),
  })

  const handleSubmit = async (data: ProjectFormData) => {
    try {
      await projectApi.update(projectId, {
        name: data.name,
        description: data.description || undefined
      })
      
      router.push('/projects')
    } catch (error) {
      throw error
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-surface-secondary rounded w-3/4 mb-4 mx-auto"></div>
            <div className="h-4 bg-surface-secondary rounded w-1/2 mb-8 mx-auto"></div>
            <div className="bg-surface shadow rounded-lg p-6">
              <div className="space-y-4">
                <div className="h-4 bg-surface-secondary rounded w-1/4"></div>
                <div className="h-10 bg-surface-secondary rounded"></div>
                <div className="h-4 bg-surface-secondary rounded w-1/4"></div>
                <div className="h-24 bg-surface-secondary rounded"></div>
                <div className="h-10 bg-surface-secondary rounded w-1/3"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-surface-secondary rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-text mb-2">
              プロジェクトが見つかりません
            </h1>
            <p className="text-text-muted mb-4">
              指定されたプロジェクトを読み込めませんでした
            </p>
            <button
              onClick={() => router.push('/projects')}
              className="bg-accent hover:bg-accent-hover active:bg-accent-active text-white font-medium py-3 sm:py-2 px-4 rounded-md transition duration-200"
            >
              プロジェクト一覧に戻る
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text">
            プロジェクトを編集
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            プロジェクトの詳細を編集できます
          </p>
        </div>
        
        <div className="bg-surface shadow rounded-lg p-6">
          <ProjectForm
            initialData={project}
            onSubmit={handleSubmit}
            submitLabel="プロジェクトを更新"
            isEditing={true}
          />
        </div>
      </div>
    </div>
  )
}