import { NextRequest } from 'next/server'
import { withAuth, createErrorResponse, createSuccessResponse } from '@/lib/api/auth-middleware'
import { supabase } from '@/lib/supabase'
import type { AuthenticatedRequest } from '@/lib/api/auth-middleware'
import type { Media } from '@/lib/types/api'

export async function GET(request: NextRequest) {
  return withAuth(request, async (authRequest: AuthenticatedRequest) => {
    try {
      const { searchParams } = new URL(authRequest.url)
      const projectId = searchParams.get('projectId')

      if (!projectId) {
        return createErrorResponse('Project ID is required', 400)
      }

      // First, verify that the user owns the project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, owner_id')
        .eq('id', projectId)
        .eq('owner_id', authRequest.user.sub)
        .single()

      if (projectError || !project) {
        return createErrorResponse('Project not found or access denied', 404)
      }

      // Get media files for the project
      const { data: mediaFiles, error: mediaError } = await supabase
        .from('media')
        .select('*')
        .eq('project_id', projectId)
        .order('uploaded_at', { ascending: false })

      if (mediaError) {
        console.error('Error fetching media files:', mediaError)
        return createErrorResponse('Failed to fetch media files', 500)
      }

      return createSuccessResponse(mediaFiles as Media[])
    } catch (error) {
      console.error('GET /api/media error:', error)
      return createErrorResponse('Failed to fetch media files', 500)
    }
  })
}