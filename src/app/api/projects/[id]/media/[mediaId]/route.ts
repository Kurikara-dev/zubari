import { NextRequest } from 'next/server'
import { withAuth, createErrorResponse, createSuccessResponse } from '@/lib/api/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import type { AuthenticatedRequest } from '@/lib/api/auth-middleware'
import type { DeleteResponse } from '@/lib/types/api'

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; mediaId: string }> }
) {
  return withAuth(request, async (authRequest: AuthenticatedRequest) => {
    try {
      const params = await context.params
      const { id: projectId, mediaId } = params

      if (!projectId || !mediaId) {
        return createErrorResponse('Project ID and Media ID are required', 400)
      }

      if (!supabaseAdmin) {
        return createErrorResponse('Database connection not available', 500)
      }

      // Verify project ownership
      const { data: project, error: projectError } = await supabaseAdmin
        .from('projects')
        .select('owner_id')
        .eq('id', projectId)
        .single()

      if (projectError || !project) {
        return createErrorResponse('Project not found', 404)
      }

      if (project.owner_id !== authRequest.user.sub) {
        return createErrorResponse("Access denied: You don't have permission to delete media from this project", 403)
      }

      // Get media metadata before deletion
      const { data: mediaItem, error: mediaError } = await supabaseAdmin
        .from('media')
        .select('file_path, project_id')
        .eq('id', mediaId)
        .eq('project_id', projectId)
        .single()

      if (mediaError || !mediaItem) {
        return createErrorResponse('Media not found', 404)
      }

      // Delete file from Supabase Storage
      const { error: storageError } = await supabaseAdmin.storage
        .from('project-media')
        .remove([mediaItem.file_path])

      if (storageError) {
        console.error('Storage deletion error:', storageError)
        return createErrorResponse('Failed to delete file from storage', 500)
      }

      // Delete record from database
      const { error: dbError } = await supabaseAdmin
        .from('media')
        .delete()
        .eq('id', mediaId)
        .eq('project_id', projectId)

      if (dbError) {
        console.error('Database deletion error:', dbError)
        return createErrorResponse('Failed to delete media record', 500)
      }

      const response: DeleteResponse = {
        success: true,
        message: 'Media deleted successfully'
      }

      return createSuccessResponse(response)
    } catch (error) {
      console.error('DELETE /api/projects/[id]/media/[mediaId] error:', error)
      
      const response: DeleteResponse = {
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }

      return createErrorResponse(response.error || 'Failed to delete media', 500)
    }
  })
}