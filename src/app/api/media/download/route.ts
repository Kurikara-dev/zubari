import { NextRequest, NextResponse } from 'next/server'
import { withAuth, createErrorResponse } from '@/lib/api/auth-middleware'
import { supabase } from '@/lib/supabase'
import type { AuthenticatedRequest } from '@/lib/api/auth-middleware'

export async function GET(request: NextRequest) {
  return withAuth(request, async (authRequest: AuthenticatedRequest) => {
    try {
      const { searchParams } = new URL(authRequest.url)
      const mediaId = searchParams.get('id')

      if (!mediaId) {
        return createErrorResponse('Media ID is required', 400)
      }

      // Get media record and verify access
      const { data: mediaRecord, error: mediaError } = await supabase
        .from('media')
        .select(`
          id,
          file_name,
          file_path,
          mime_type,
          project_id,
          projects!inner (
            id,
            owner_id
          )
        `)
        .eq('id', mediaId)
        .eq('projects.owner_id', authRequest.user.sub)
        .single()

      if (mediaError || !mediaRecord) {
        return createErrorResponse('Media file not found or access denied', 404)
      }

      // Get signed URL for the file
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('project-media')
        .createSignedUrl(mediaRecord.file_path, 3600) // 1 hour expiry

      if (urlError || !signedUrlData?.signedUrl) {
        console.error('Error creating signed URL:', urlError)
        return createErrorResponse('Failed to generate download link', 500)
      }

      // For images, redirect to the signed URL for direct viewing
      if (mediaRecord.mime_type.startsWith('image/')) {
        return NextResponse.redirect(signedUrlData.signedUrl)
      }

      // For other file types, fetch and return the file
      const fileResponse = await fetch(signedUrlData.signedUrl)
      if (!fileResponse.ok) {
        return createErrorResponse('Failed to retrieve file', 500)
      }

      const fileBuffer = await fileResponse.arrayBuffer()

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': mediaRecord.mime_type,
          'Content-Disposition': `inline; filename="${mediaRecord.file_name}"`,
          'Cache-Control': 'private, max-age=3600'
        }
      })
    } catch (error) {
      console.error('GET /api/media/download error:', error)
      return createErrorResponse('Failed to download file', 500)
    }
  })
}