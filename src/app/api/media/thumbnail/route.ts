import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/api/auth-middleware'
import { thumbnailService, ThumbnailSize } from '@/lib/services/thumbnailService'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * GET /api/media/thumbnail
 * Generate and serve thumbnails for media items
 * 
 * Query parameters:
 * - id: Media ID (required)
 * - size: Thumbnail size (small|medium|large, default: small)
 * - format: Image format (webp|jpeg|png, default: webp)
 * - quality: Compression quality (1-100, default: 80)
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authContext = await getAuthContext(request)
    if (!authContext.isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const mediaId = searchParams.get('id')
    const sizeParam = searchParams.get('size') || 'small'
    const formatParam = searchParams.get('format') || 'webp'
    const qualityParam = parseInt(searchParams.get('quality') || '80')

    // Validate required parameters
    if (!mediaId) {
      return NextResponse.json(
        { error: 'Media ID is required' },
        { status: 400 }
      )
    }

    // Validate size parameter
    const validSizes = Object.values(ThumbnailSize)
    if (!validSizes.includes(sizeParam as ThumbnailSize)) {
      return NextResponse.json(
        { error: `Invalid size. Must be one of: ${validSizes.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate format parameter
    const validFormats = ['webp', 'jpeg', 'png']
    if (!validFormats.includes(formatParam)) {
      return NextResponse.json(
        { error: `Invalid format. Must be one of: ${validFormats.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate quality parameter
    if (qualityParam < 1 || qualityParam > 100) {
      return NextResponse.json(
        { error: 'Quality must be between 1 and 100' },
        { status: 400 }
      )
    }

    const size = sizeParam as ThumbnailSize

    // Check if user has access to this media
    const { data: media, error: mediaError } = await supabaseAdmin!
      .from('media')
      .select(`
        id,
        project_id,
        file_name,
        file_path,
        mime_type,
        file_size,
        projects (
          id,
          owner_id
        )
      `)
      .eq('id', mediaId)
      .single()

    if (mediaError) {
      console.error('Database error:', mediaError)
      return NextResponse.json(
        { error: 'Media not found' },
        { status: 404 }
      )
    }

    if (!media) {
      return NextResponse.json(
        { error: 'Media not found' },
        { status: 404 }
      )
    }

    // Check if user owns the project
    const userSub = authContext.user.sub
    if ((media.projects as { owner_id?: string })?.owner_id !== userSub) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Check if media is an image
    const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!imageTypes.includes(media.mime_type)) {
      return NextResponse.json(
        { error: 'Media is not an image' },
        { status: 400 }
      )
    }

    try {
      // Generate or get existing thumbnail
      const thumbnailMetadata = await thumbnailService.generateThumbnail(mediaId, size)
      
      // Check if we should redirect to the thumbnail URL
      const redirect = searchParams.get('redirect')
      if (redirect === 'true') {
        return NextResponse.redirect(thumbnailMetadata.url)
      }

      // Download thumbnail from Supabase Storage
      const thumbnailPath = `${media.project_id}/thumbnails/${size}/${mediaId}.webp`
      const { data: thumbnailData, error: downloadError } = await supabaseAdmin!.storage
        .from('project-media')
        .download(thumbnailPath)

      if (downloadError) {
        console.error('Failed to download thumbnail:', downloadError)
        
        // Fallback: redirect to original image with Next.js optimization
        const originalUrl = `/api/media/download?id=${mediaId}`
        return NextResponse.redirect(new URL(originalUrl, request.url))
      }

      // Convert to ArrayBuffer
      const buffer = await thumbnailData.arrayBuffer()

      // Determine content type
      const contentType = formatParam === 'webp' ? 'image/webp' : 
                         formatParam === 'png' ? 'image/png' : 'image/jpeg'

      // Return thumbnail with appropriate headers
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Length': buffer.byteLength.toString(),
          'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
          'ETag': `"${mediaId}-${size}-${formatParam}"`,
          'X-Thumbnail-Size': size,
          'X-Original-File': media.file_name,
          'X-Compression-Ratio': '0', // Would calculate actual ratio
        }
      })

    } catch (thumbnailError) {
      console.error('Thumbnail generation failed:', thumbnailError)
      
      // Fallback: redirect to original image
      const originalUrl = `/api/media/download?id=${mediaId}`
      return NextResponse.redirect(new URL(originalUrl, request.url))
    }

  } catch (error) {
    console.error('Thumbnail API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * HEAD /api/media/thumbnail
 * Check if thumbnail exists without downloading
 */
export async function HEAD(request: NextRequest) {
  try {
    // Check authentication
    const authContext = await getAuthContext(request)
    if (!authContext.isAuthenticated) {
      return new NextResponse(null, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const mediaId = searchParams.get('id')
    const sizeParam = searchParams.get('size') || 'small'

    if (!mediaId) {
      return new NextResponse(null, { status: 400 })
    }

    const size = sizeParam as ThumbnailSize

    // Check if user has access to this media
    const { data: media, error: mediaError } = await supabaseAdmin!
      .from('media')
      .select(`
        id,
        project_id,
        projects (
          id,
          owner_id
        )
      `)
      .eq('id', mediaId)
      .single()

    if (mediaError || !media) {
      return new NextResponse(null, { status: 404 })
    }

    // Check if user owns the project
    const userSub = authContext.user.sub
    if ((media.projects as { owner_id?: string })?.owner_id !== userSub) {
      return new NextResponse(null, { status: 403 })
    }

    // Check if thumbnail exists
    const thumbnailPath = `${media.project_id}/thumbnails/${size}/${mediaId}.webp`
    const { data, error } = await supabaseAdmin!.storage
      .from('project-media')
      .list(thumbnailPath.split('/').slice(0, -1).join('/'))

    if (error) {
      return new NextResponse(null, { status: 404 })
    }

    const fileName = thumbnailPath.split('/').pop()
    const exists = data?.some(file => file.name === fileName)

    return new NextResponse(null, {
      status: exists ? 200 : 404,
      headers: {
        'X-Thumbnail-Exists': exists.toString(),
        'X-Thumbnail-Size': size,
        'Cache-Control': 'public, max-age=300' // Cache existence check for 5 minutes
      }
    })

  } catch (error) {
    console.error('Thumbnail HEAD error:', error)
    return new NextResponse(null, { status: 500 })
  }
}

/**
 * DELETE /api/media/thumbnail
 * Delete thumbnails for a media item
 * 
 * Query parameters:
 * - id: Media ID (required)
 * - size: Specific size to delete (optional, deletes all if not specified)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const authContext = await getAuthContext(request)
    if (!authContext.isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const mediaId = searchParams.get('id')
    const sizeParam = searchParams.get('size')

    if (!mediaId) {
      return NextResponse.json(
        { error: 'Media ID is required' },
        { status: 400 }
      )
    }

    // Check if user has access to this media
    const { data: media, error: mediaError } = await supabaseAdmin!
      .from('media')
      .select(`
        id,
        project_id,
        projects (
          id,
          owner_id
        )
      `)
      .eq('id', mediaId)
      .single()

    if (mediaError || !media) {
      return NextResponse.json(
        { error: 'Media not found' },
        { status: 404 }
      )
    }

    // Check if user owns the project
    const userSub = authContext.user.sub
    if ((media.projects as { owner_id?: string })?.owner_id !== userSub) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    if (sizeParam) {
      // Delete specific size
      const size = sizeParam as ThumbnailSize
      const thumbnailPath = `${media.project_id}/thumbnails/${size}/${mediaId}.webp`
      
      const { error: deleteError } = await supabaseAdmin!.storage
        .from('project-media')
        .remove([thumbnailPath])

      if (deleteError) {
        console.error('Failed to delete thumbnail:', deleteError)
        return NextResponse.json(
          { error: 'Failed to delete thumbnail' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: `Thumbnail ${size} deleted successfully`
      })
    } else {
      // Delete all thumbnails for this media
      await thumbnailService.cleanupThumbnails(mediaId)

      return NextResponse.json({
        success: true,
        message: 'All thumbnails deleted successfully'
      })
    }

  } catch (error) {
    console.error('Thumbnail DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}