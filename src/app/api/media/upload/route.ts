import { NextRequest } from 'next/server'
import { withAuth, createErrorResponse, createSuccessResponse } from '@/lib/api/auth-middleware'
import { supabase } from '@/lib/supabase'
import type { AuthenticatedRequest } from '@/lib/api/auth-middleware'
import type { MediaUploadResult } from '@/lib/types/media'
import { isAllowedMimeType, validateFileSize, generateMediaFilePath } from '@/lib/types/media'

export async function POST(request: NextRequest) {
  return withAuth(request, async (authRequest: AuthenticatedRequest) => {
    try {
      const formData = await authRequest.formData()
      const file = formData.get('file') as File
      const projectId = formData.get('projectId') as string

      if (!file || !projectId) {
        return createErrorResponse('File and project ID are required', 400)
      }

      // Validate file type and size
      if (!isAllowedMimeType(file.type)) {
        return createErrorResponse('Only JPEG, PNG, and WebP files are allowed', 400)
      }

      if (!validateFileSize(file.size)) {
        return createErrorResponse('File size must be less than 10MB', 400)
      }

      // Verify that the user owns the project
      if (!supabase) {
        return createErrorResponse('Database connection not available', 500)
      }
      
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, owner_id')
        .eq('id', projectId)
        .eq('owner_id', authRequest.user.sub)
        .single()

      if (projectError || !project) {
        return createErrorResponse('Project not found or access denied', 404)
      }

      // Generate unique file path
      const filePath = generateMediaFilePath(projectId, file.name)
      
      // Convert File to ArrayBuffer for upload
      const fileBuffer = await file.arrayBuffer()
      const uint8Array = new Uint8Array(fileBuffer)

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-media')
        .upload(filePath, uint8Array, {
          contentType: file.type,
          upsert: false
        })

      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        return createErrorResponse('Failed to upload file to storage', 500)
      }

      // Create media record in database
      const { data: mediaRecord, error: dbError } = await supabase
        .from('media')
        .insert({
          project_id: projectId,
          file_name: file.name,
          file_path: uploadData.path,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: authRequest.user.sub
        })
        .select()
        .single()

      if (dbError) {
        console.error('Database insert error:', dbError)
        
        // Clean up uploaded file if database insert fails
        await supabase.storage
          .from('project-media')
          .remove([uploadData.path])
        
        return createErrorResponse('Failed to save media record', 500)
      }

      const result: MediaUploadResult = {
        success: true,
        mediaFile: {
          id: mediaRecord.id,
          projectId: mediaRecord.project_id,
          fileName: mediaRecord.file_name,
          filePath: mediaRecord.file_path,
          fileSize: mediaRecord.file_size,
          mimeType: mediaRecord.mime_type,
          uploadedBy: mediaRecord.uploaded_by,
          uploadedAt: mediaRecord.uploaded_at
        }
      }

      return createSuccessResponse(result, 201)
    } catch (error) {
      console.error('POST /api/media/upload error:', error)
      return createErrorResponse('Failed to upload file', 500)
    }
  })
}