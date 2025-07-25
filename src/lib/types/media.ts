export interface MediaFile {
  id: string
  projectId: string
  fileName: string
  filePath: string
  fileSize: number
  mimeType: string
  uploadedBy: string
  uploadedAt: string
}

export interface MediaItem {
  id: string
  filename: string
  url: string
  type: string
  size: number
  uploadedAt: string
}

export interface MediaUploadOptions {
  projectId: string
  file: File
  userId: string
}

export interface MediaUploadResult {
  success: boolean
  mediaFile?: MediaFile
  error?: string
}

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png', 
  'image/webp'
] as const

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export type AllowedMimeType = typeof ALLOWED_MIME_TYPES[number]

export function isAllowedMimeType(mimeType: string): mimeType is AllowedMimeType {
  return ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType)
}

export function validateFileSize(size: number): boolean {
  return size <= MAX_FILE_SIZE
}

export function generateMediaFilePath(projectId: string, fileName: string): string {
  const timestamp = Date.now()
  const extension = fileName.split('.').pop()
  const uuid = crypto.randomUUID()
  return `${projectId}/${uuid}_${timestamp}.${extension}`
}