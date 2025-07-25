'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Project, ApiResponse } from '@/lib/types/api'

interface ProjectActionsProps {
  project: Project
}

async function deleteProject(projectId: string): Promise<void> {
  const response = await fetch(`/api/projects/${projectId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error('Failed to delete project')
  }

  const data: ApiResponse = await response.json()
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to delete project')
  }
}

export default function ProjectActions({ project }: ProjectActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      // Invalidate and refetch projects
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setShowDeleteDialog(false)
    },
    onError: (error) => {
      console.error('Delete project error:', error)
      // You could add toast notification here
    }
  })

  const handleDelete = () => {
    deleteMutation.mutate(project.id)
  }

  return (
    <>
      <div className="flex items-center space-x-1 sm:space-x-2">
        <a
          href={`/projects/${project.id}`}
          className="text-blue-600 hover:text-blue-700 active:text-blue-800 text-sm font-medium transition duration-200 touch-target px-2 py-1 rounded"
        >
          詳細
        </a>
        <span className="text-gray-300 hidden sm:inline">|</span>
        <a
          href={`/projects/${project.id}/edit`}
          className="text-green-600 hover:text-green-700 active:text-green-800 text-sm font-medium transition duration-200 touch-target px-2 py-1 rounded"
        >
          編集
        </a>
        <span className="text-gray-300 hidden sm:inline">|</span>
        <button
          type="button"
          onClick={() => setShowDeleteDialog(true)}
          className="text-red-600 hover:text-red-700 active:text-red-800 text-sm font-medium transition duration-200 touch-target px-2 py-1 rounded touch-button"
          disabled={deleteMutation.isPending}
        >
          削除
        </button>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative p-4 sm:p-6 bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="mb-4">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">プロジェクトを削除</h3>
              </div>
              
              <p className="text-gray-600 mb-2">
                「<strong className="text-gray-900">{project.name}</strong>」を削除しますか？
              </p>
              <p className="text-sm text-red-600">
                この操作は取り消すことができません。プロジェクトに関連するすべてのデータが完全に削除されます。
              </p>
            </div>

            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteDialog(false)}
                disabled={deleteMutation.isPending}
                className="px-4 py-3 sm:py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 active:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 touch-target touch-button"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="px-4 py-3 sm:py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 active:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 flex items-center justify-center touch-target touch-button"
              >
                {deleteMutation.isPending && (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                削除する
              </button>
            </div>

            {deleteMutation.isError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">
                  削除に失敗しました。しばらく時間をおいて再試行してください。
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}