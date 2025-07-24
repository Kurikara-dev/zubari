'use client'

import { useRouter } from 'next/navigation'
import ProjectForm from './ProjectForm'
import { ProjectFormData } from '@/app/types/forms'
import { projectApi } from '@/lib/api/client'

export default function ProjectCreateForm() {
  const router = useRouter()

  const handleSubmit = async (data: ProjectFormData) => {
    try {
      const project = await projectApi.create({
        name: data.name,
        description: data.description || undefined
      })
      
      router.push(`/projects/${project.id}`)
    } catch (error) {
      throw error
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Create New Project
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Fill in the details below to create your new project
          </p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <ProjectForm
            onSubmit={handleSubmit}
            submitLabel="Create Project"
            isEditing={false}
          />
        </div>
      </div>
    </div>
  )
}