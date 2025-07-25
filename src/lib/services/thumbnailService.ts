import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import type { Media } from '@/lib/types/api'

// Thumbnail sizes configuration
export enum ThumbnailSize {
  SMALL = 'small',    // 200x200
  MEDIUM = 'medium',  // 400x400
  LARGE = 'large'     // 800x800
}

export interface ThumbnailOptions {
  width: number
  height: number
  quality: number
  format: 'webp' | 'jpeg' | 'png'
}

export interface ThumbnailMetadata {
  mediaId: string
  size: ThumbnailSize
  url: string
  width: number
  height: number
  fileSize: number
  format: string
  createdAt: Date
}

// Thumbnail size configurations
const THUMBNAIL_CONFIGS: Record<ThumbnailSize, ThumbnailOptions> = {
  [ThumbnailSize.SMALL]: {
    width: 200,
    height: 200,
    quality: 80,
    format: 'webp'
  },
  [ThumbnailSize.MEDIUM]: {
    width: 400,
    height: 400,
    quality: 85,
    format: 'webp'
  },
  [ThumbnailSize.LARGE]: {
    width: 800,
    height: 800,
    quality: 90,
    format: 'webp'
  }
}

class ThumbnailService {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  /**
   * Generate thumbnail for a media item
   */
  async generateThumbnail(
    mediaId: string, 
    size: ThumbnailSize
  ): Promise<ThumbnailMetadata> {
    try {
      // Get original media info
      const media = await this.getMediaInfo(mediaId)
      if (!media) {
        throw new Error(`Media with ID ${mediaId} not found`)
      }

      // Check if thumbnail already exists
      const existingThumbnail = await this.getThumbnailMetadata(mediaId, size)
      if (existingThumbnail) {
        return existingThumbnail
      }

      // Download original image
      const originalBuffer = await this.downloadOriginalImage(media)
      
      // Generate thumbnail
      const config = THUMBNAIL_CONFIGS[size]
      const thumbnailBuffer = await this.processImage(originalBuffer, config)

      // Upload thumbnail
      const thumbnailPath = this.generateThumbnailPath(media.project_id, mediaId, size)
      const thumbnailUrl = await this.uploadThumbnail(thumbnailPath, thumbnailBuffer, config.format)

      // Create metadata
      const metadata: ThumbnailMetadata = {
        mediaId,
        size,
        url: thumbnailUrl,
        width: config.width,
        height: config.height,
        fileSize: thumbnailBuffer.length,
        format: config.format,
        createdAt: new Date()
      }

      // Cache metadata (could be stored in database or cache)
      await this.cacheThumbnailMetadata(metadata)

      return metadata
    } catch (error) {
      console.error(`Failed to generate thumbnail for media ${mediaId}:`, error)
      throw error
    }
  }

  /**
   * Get thumbnail URL, generate if not exists
   */
  async getThumbnailUrl(mediaId: string, size: ThumbnailSize): Promise<string> {
    try {
      // Check cache first
      const cached = await this.getThumbnailMetadata(mediaId, size)
      if (cached) {
        return cached.url
      }

      // Generate thumbnail if not exists
      const metadata = await this.generateThumbnail(mediaId, size)
      return metadata.url
    } catch (error) {
      console.error(`Failed to get thumbnail URL for media ${mediaId}:`, error)
      // Fallback to original image
      return `/api/media/download?id=${mediaId}`
    }
  }

  /**
   * Generate responsive thumbnail URLs for all sizes
   */
  async getResponsiveThumbnails(mediaId: string): Promise<Record<ThumbnailSize, string>> {
    const thumbnails = {} as Record<ThumbnailSize, string>
    
    try {
      // Generate all sizes in parallel for better performance
      const promises = Object.values(ThumbnailSize).map(async (size) => {
        const url = await this.getThumbnailUrl(mediaId, size)
        return { size, url }
      })

      const results = await Promise.allSettled(promises)
      
      results.forEach((result, index) => {
        const size = Object.values(ThumbnailSize)[index]
        if (result.status === 'fulfilled') {
          thumbnails[size] = result.value.url
        } else {
          // Fallback to original image
          thumbnails[size] = `/api/media/download?id=${mediaId}`
        }
      })

      return thumbnails
    } catch (error) {
      console.error(`Failed to get responsive thumbnails for media ${mediaId}:`, error)
      // Return fallback URLs
      return Object.values(ThumbnailSize).reduce((acc, size) => {
        acc[size] = `/api/media/download?id=${mediaId}`
        return acc
      }, {} as Record<ThumbnailSize, string>)
    }
  }

  /**
   * Clean up thumbnails for deleted media
   */
  async cleanupThumbnails(mediaId: string): Promise<void> {
    try {
      const media = await this.getMediaInfo(mediaId)
      if (!media) return

      // Delete all thumbnail sizes
      const deletePromises = Object.values(ThumbnailSize).map(async (size) => {
        const thumbnailPath = this.generateThumbnailPath(media.project_id, mediaId, size)
        await this.deleteThumbnail(thumbnailPath)
      })

      await Promise.allSettled(deletePromises)

      // Clean up metadata cache
      await this.cleanupThumbnailMetadata(mediaId)
    } catch (error) {
      console.error(`Failed to cleanup thumbnails for media ${mediaId}:`, error)
    }
  }

  /**
   * Get media information from database
   */
  private async getMediaInfo(mediaId: string): Promise<Media | null> {
    if (!this.supabase) {
      throw new Error('Supabase client not initialized');
    }
    
    const { data, error } = await this.supabase
      .from('media')
      .select('*')
      .eq('id', mediaId)
      .single()

    if (error) {
      console.error('Failed to get media info:', error)
      return null
    }

    return data
  }

  /**
   * Download original image from Supabase Storage
   */
  private async downloadOriginalImage(media: Media): Promise<Buffer> {
    if (!this.supabase) {
      throw new Error('Supabase client not initialized');
    }
    
    const { data, error } = await this.supabase.storage
      .from('project-media')
      .download(media.file_path)

    if (error) {
      throw new Error(`Failed to download original image: ${error.message}`)
    }

    return Buffer.from(await data.arrayBuffer())
  }

  /**
   * Process image with Sharp
   */
  private async processImage(
    buffer: Buffer, 
    config: ThumbnailOptions
  ): Promise<Buffer> {
    try {
      let processor = sharp(buffer)
        .resize(config.width, config.height, {
          fit: 'cover',
          position: 'center'
        })

      // Apply format-specific processing
      switch (config.format) {
        case 'webp':
          processor = processor.webp({ quality: config.quality })
          break
        case 'jpeg':
          processor = processor.jpeg({ quality: config.quality })
          break
        case 'png':
          processor = processor.png({ quality: config.quality })
          break
      }

      return await processor.toBuffer()
    } catch (error) {
      console.error('Failed to process image:', error)
      throw error
    }
  }

  /**
   * Generate thumbnail storage path
   */
  private generateThumbnailPath(
    projectId: string, 
    mediaId: string, 
    size: ThumbnailSize
  ): string {
    return `${projectId}/thumbnails/${size}/${mediaId}.webp`
  }

  /**
   * Upload thumbnail to Supabase Storage
   */
  private async uploadThumbnail(
    path: string, 
    buffer: Buffer, 
    format: string
  ): Promise<string> {
    if (!this.supabase) {
      throw new Error('Supabase client not initialized');
    }
    
    const { data: _data, error } = await this.supabase.storage // eslint-disable-line @typescript-eslint/no-unused-vars -- Upload response data not needed
      .from('project-media')
      .upload(path, buffer, {
        contentType: `image/${format}`,
        upsert: true
      })

    if (error) {
      throw new Error(`Failed to upload thumbnail: ${error.message}`)
    }

    // Get public URL
    const { data: { publicUrl } } = this.supabase.storage
      .from('project-media')
      .getPublicUrl(path)

    return publicUrl
  }

  /**
   * Delete thumbnail from storage
   */
  private async deleteThumbnail(path: string): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase client not initialized');
    }
    
    const { error } = await this.supabase.storage
      .from('project-media')
      .remove([path])

    if (error) {
      console.error(`Failed to delete thumbnail ${path}:`, error)
    }
  }

  /**
   * Get cached thumbnail metadata
   * This could be enhanced with Redis or in-memory cache
   */
  private async getThumbnailMetadata(
    mediaId: string, 
    size: ThumbnailSize
  ): Promise<ThumbnailMetadata | null> {
    // For now, check if file exists in storage
    try {
      if (!this.supabase) {
        throw new Error('Supabase client not initialized');
      }
      
      const media = await this.getMediaInfo(mediaId)
      if (!media) return null

      const thumbnailPath = this.generateThumbnailPath(media.project_id, mediaId, size)
      const { data, error } = await this.supabase.storage
        .from('project-media')
        .list(thumbnailPath.split('/').slice(0, -1).join('/'))

      if (error || !data) return null

      const fileName = thumbnailPath.split('/').pop()
      const exists = data.some(file => file.name === fileName)

      if (exists) {
        const { data: { publicUrl } } = this.supabase.storage
          .from('project-media')
          .getPublicUrl(thumbnailPath)

        const config = THUMBNAIL_CONFIGS[size]
        return {
          mediaId,
          size,
          url: publicUrl,
          width: config.width,
          height: config.height,
          fileSize: 0, // Would need to get from storage metadata
          format: config.format,
          createdAt: new Date()
        }
      }

      return null
    } catch (error) {
      console.error('Failed to get thumbnail metadata:', error)
      return null
    }
  }

  /**
   * Cache thumbnail metadata
   * In production, this should use Redis or database
   */
  private async cacheThumbnailMetadata(metadata: ThumbnailMetadata): Promise<void> {
    // For now, this is a no-op since we check storage directly
    // In production, implement proper caching here
    console.log(`Cached thumbnail metadata for ${metadata.mediaId}:${metadata.size}`)
  }

  /**
   * Clean up cached metadata
   */
  private async cleanupThumbnailMetadata(mediaId: string): Promise<void> {
    // For now, this is a no-op
    // In production, clean up cache entries here
    console.log(`Cleaned up thumbnail metadata for ${mediaId}`)
  }
}

// Export singleton instance
export const thumbnailService = new ThumbnailService()
export default thumbnailService