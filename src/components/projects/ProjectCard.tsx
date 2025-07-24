import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import ProjectActions from './ProjectActions'
import type { Project } from '@/lib/types/api'

interface ProjectCardProps {
  project: Project
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const createdAt = new Date(project.created_at)
  const updatedAt = new Date(project.updated_at)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 overflow-hidden">
      <div className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-gray-600 text-sm line-clamp-2">
              {project.description}
            </p>
          )}
        </div>

        <div className="mb-4 space-y-1">
          <div className="flex items-center text-xs text-gray-500">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            作成日: {format(createdAt, 'yyyy/MM/dd', { locale: ja })}
          </div>
          {updatedAt.getTime() !== createdAt.getTime() && (
            <div className="flex items-center text-xs text-gray-500">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              更新日: {format(updatedAt, 'yyyy/MM/dd', { locale: ja })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <ProjectActions project={project} />
        </div>
      </div>
    </div>
  )
}