import { NextRequest } from 'next/server'
import { withAuth, createErrorResponse, createSuccessResponse } from '@/lib/api/auth-middleware'
import { ProjectService } from '@/lib/api/projects'
import type { AuthenticatedRequest } from '@/lib/api/auth-middleware'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (authRequest: AuthenticatedRequest) => {
    try {
      const params = await context.params
      const projectId = params.id

      const project = await ProjectService.getProjectById(authRequest.user, projectId)
      
      if (!project) {
        return createErrorResponse('Project not found', 404)
      }

      return createSuccessResponse(project)
    } catch (error) {
      console.error('GET /api/projects/[id] error:', error)
      
      if (error instanceof Error) {
        if (error.message === 'Project ID is required') {
          return createErrorResponse(error.message, 400)
        }
      }

      return createErrorResponse('Failed to fetch project', 500)
    }
  })
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (authRequest: AuthenticatedRequest) => {
    try {
      const params = await context.params
      const projectId = params.id

      let requestBody
      try {
        requestBody = await authRequest.json()
      } catch {
        return createErrorResponse('Invalid JSON in request body', 400)
      }

      const validatedRequest = ProjectService.validateUpdateRequest(requestBody)
      const project = await ProjectService.updateProject(
        authRequest.user, 
        projectId, 
        validatedRequest
      )

      return createSuccessResponse(project)
    } catch (error) {
      console.error('PUT /api/projects/[id] error:', error)
      
      if (error instanceof Error) {
        if (error.message === 'Project not found') {
          return createErrorResponse(error.message, 404)
        }
        if (error.message.includes('required') || 
            error.message.includes('exceed') ||
            error.message.includes('cannot be empty') ||
            error.message.includes('must be')) {
          return createErrorResponse(error.message, 400)
        }
      }

      return createErrorResponse('Failed to update project', 500)
    }
  })
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (authRequest: AuthenticatedRequest) => {
    try {
      const params = await context.params
      const projectId = params.id

      await ProjectService.deleteProject(authRequest.user, projectId)

      return createSuccessResponse({ message: 'Project deleted successfully' })
    } catch (error) {
      console.error('DELETE /api/projects/[id] error:', error)
      
      if (error instanceof Error) {
        if (error.message === 'Project not found') {
          return createErrorResponse(error.message, 404)
        }
        if (error.message === 'Project ID is required') {
          return createErrorResponse(error.message, 400)
        }
      }

      return createErrorResponse('Failed to delete project', 500)
    }
  })
}