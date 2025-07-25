import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { DeleteResponse } from '@/lib/types/api'

interface UseMediaDeletionOptions {
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export function useMediaDeletion(
  projectId: string,
  options?: UseMediaDeletionOptions
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (mediaId: string): Promise<DeleteResponse> => {
      const response = await fetch(`/api/projects/${projectId}/media/${mediaId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }))
        throw new Error(errorData.error || 'Failed to delete media')
      }

      const data = await response.json()
      return data
    },
    onSuccess: (data, mediaId) => {
      // Invalidate and refetch media-related queries
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey
          return (
            Array.isArray(queryKey) &&
            (queryKey.includes('projects') || queryKey.includes('media')) &&
            queryKey.includes(projectId)
          )
        }
      })

      // Remove the specific media item from cache if it exists
      queryClient.setQueryData(['media', projectId], (oldData: unknown) => {
        if (Array.isArray(oldData)) {
          return oldData.filter((item: Record<string, unknown>) => (item as { id: string }).id !== mediaId)
        }
        return oldData
      })

      // Call success callback if provided
      options?.onSuccess?.()
    },
    onError: (error: Error) => {
      console.error('Media deletion error:', error)
      // Call error callback if provided
      options?.onError?.(error)
    }
  })
}