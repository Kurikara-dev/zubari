'use client'

import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import ProjectCard from './ProjectCard'
import ProjectFilters from './ProjectFilters'
import ProjectPagination from './ProjectPagination'
import type { Project, ApiResponse } from '@/lib/types/api'

async function fetchProjects(searchParams: URLSearchParams): Promise<{ data: Project[]; total: number }> {
  // Add default pagination parameters
  const params = new URLSearchParams(searchParams)
  if (!params.get('page')) {
    params.set('page', '1')
  }
  if (!params.get('limit')) {
    params.set('limit', '10')
  }
  
  const url = `/api/projects?${params.toString()}`
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error('Failed to fetch projects')
  }
  
  const apiResponse: ApiResponse<{ data: Project[]; total: number }> = await response.json()
  
  if (!apiResponse.success || !apiResponse.data) {
    throw new Error(apiResponse.error || 'Failed to fetch projects')
  }
  
  return apiResponse.data
}

export default function ProjectList() {
  const searchParams = useSearchParams()
  
  const {
    data: result,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['projects', searchParams.toString()],
    queryFn: () => fetchProjects(searchParams),
  })

  const projects = result?.data || []
  const total = result?.total || 0
  const currentPage = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = parseInt(searchParams.get('limit') || '10', 10)
  const hasFilters = searchParams.get('search') || searchParams.get('dateFrom') || searchParams.get('dateTo')

  if (isLoading) {
    return (
      <div>
        <ProjectFilters />
        <div className="grid gap-4 grid-cols-2 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-pulse">
              <div className="p-4 sm:p-5 md:p-6">
                <div className="h-6 bg-gray-200 rounded-md mb-4 w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded-md mb-2 w-full"></div>
                <div className="h-4 bg-gray-200 rounded-md mb-4 w-2/3"></div>
                <div className="flex justify-between items-center">
                  <div className="h-4 bg-gray-200 rounded-md w-24"></div>
                  <div className="h-8 bg-gray-200 rounded-md w-20"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <ProjectFilters />
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-gray-600 mb-4">プロジェクトの読み込みに失敗しました</p>
          <button
            onClick={() => refetch()}
            className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium py-3 sm:py-2 px-4 rounded-md transition duration-200 touch-target touch-button"
          >
            再試行
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <ProjectFilters />
      
      {projects.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {hasFilters ? '検索条件に一致するプロジェクトが見つかりません' : 'プロジェクトが見つかりません'}
          </h3>
          <p className="text-gray-600 mb-4">
            {hasFilters ? '検索条件を変更してみてください' : '新しいプロジェクトを作成してみましょう'}
          </p>
          {!hasFilters && (
            <a
              href="/projects/new"
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium py-3 sm:py-2 px-4 rounded-md transition duration-200 inline-block touch-target touch-button"
            >
              プロジェクト作成
            </a>
          )}
        </div>
      )}

      {projects.length > 0 && (
        <>
          <div className="mb-4 text-sm text-gray-600">
            {total}件のプロジェクトが見つかりました
          </div>
          
          <div className="grid gap-4 grid-cols-2 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 mb-6">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
          
          <ProjectPagination 
            total={total}
            currentPage={currentPage}
            pageSize={pageSize}
          />
        </>
      )}
    </div>
  )
}