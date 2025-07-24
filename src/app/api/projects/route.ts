import { NextRequest } from 'next/server'
import { withAuth, createErrorResponse, createSuccessResponse } from '@/lib/api/auth-middleware'
import { ProjectService } from '@/lib/api/projects'
import type { AuthenticatedRequest } from '@/lib/api/auth-middleware'

export async function POST(request: NextRequest) {
  return withAuth(request, async (authRequest: AuthenticatedRequest) => {
    try {
      let requestBody
      try {
        requestBody = await authRequest.json()
      } catch {
        return createErrorResponse('Invalid JSON in request body', 400)
      }

      const validatedRequest = ProjectService.validateCreateRequest(requestBody)
      const project = await ProjectService.createProject(authRequest.user, validatedRequest)

      return createSuccessResponse(project, 201)
    } catch (error) {
      console.error('POST /api/projects error:', error)
      
      if (error instanceof Error) {
        if (error.message.includes('required') || 
            error.message.includes('exceed') || 
            error.message.includes('must be')) {
          return createErrorResponse(error.message, 400)
        }
      }

      return createErrorResponse('Failed to create project', 500)
    }
  })
}

export async function GET(request: NextRequest) {
  return withAuth(request, async (authRequest: AuthenticatedRequest) => {
    try {
      const { searchParams } = new URL(authRequest.url)
      
      const options = {
        search: searchParams.get('search') || undefined,
        dateFrom: searchParams.get('dateFrom') || undefined,
        dateTo: searchParams.get('dateTo') || undefined,
        sortBy: (searchParams.get('sortBy') as 'created_at' | 'updated_at' | 'name') || 'created_at',
        sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
        page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined,
        limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
      }

      const result = await ProjectService.getUserProjects(authRequest.user, options)
      return createSuccessResponse(result)
    } catch (error) {
      console.error('GET /api/projects error:', error)
      return createErrorResponse('Failed to fetch projects', 500)
    }
  })
}