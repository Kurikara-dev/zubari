'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePaginationUrlSync } from './useUrlSync';

export interface PaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  enabled?: boolean;
  enableUrlSync?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor?: string | number;
  hasMore: boolean;
  total: number;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: string;
}

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Hook for traditional pagination
 */
export function usePagination<T>(
  queryKey: (string | number)[],
  queryFn: (params: { page: number; pageSize: number }) => Promise<PaginatedResponse<T>>,
  options: PaginationOptions = {}
) {
  const {
    initialPage = 1,
    initialPageSize = 20,
    enabled = true,
    enableUrlSync = false,
  } = options;

  // Use URL sync or local state based on option
  const urlSync = usePaginationUrlSync({ 
    page: initialPage, 
    pageSize: initialPageSize 
  });
  
  const [localCurrentPage, setLocalCurrentPage] = useState(initialPage);
  const [localPageSize, setLocalPageSize] = useState(initialPageSize);

  // Choose which state to use - ensure we have valid numbers
  const currentPage = enableUrlSync ? Number(urlSync.state.page) || 1 : localCurrentPage;
  const pageSize = enableUrlSync ? Number(urlSync.state.pageSize) || 20 : localPageSize;

  const queryResult = useQuery({
    queryKey: [...queryKey, currentPage, pageSize],
    queryFn: () => queryFn({ page: currentPage - 1, pageSize }), // Convert to 0-based for API
    enabled,
  });

  const paginationState: PaginationState = useMemo(() => {
    const totalItems = queryResult.data?.total ?? 0;
    const totalPages = Math.ceil(totalItems / pageSize);
    
    return {
      currentPage,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
    };
  }, [queryResult.data?.total, currentPage, pageSize]);

  const goToPage = useCallback((page: number) => {
    const totalPages = Math.ceil((queryResult.data?.total ?? 0) / pageSize);
    const clampedPage = Math.max(1, Math.min(page, totalPages));
    
    if (enableUrlSync) {
      urlSync.updateState({ page: clampedPage });
    } else {
      setLocalCurrentPage(clampedPage);
    }
  }, [queryResult.data?.total, pageSize, enableUrlSync, urlSync]);

  const changePageSize = useCallback((newPageSize: number) => {
    // Calculate what the current page should be with the new page size
    const currentItemIndex = (currentPage - 1) * pageSize;
    const newPage = Math.floor(currentItemIndex / newPageSize) + 1;
    
    if (enableUrlSync) {
      urlSync.updateState({ pageSize: newPageSize, page: newPage });
    } else {
      setLocalPageSize(newPageSize);
      setLocalCurrentPage(newPage);
    }
  }, [currentPage, pageSize, enableUrlSync, urlSync]);

  const goToNextPage = useCallback(() => {
    if (paginationState.hasNextPage) {
      const nextPage = currentPage + 1;
      if (enableUrlSync) {
        urlSync.updateState({ page: nextPage });
      } else {
        setLocalCurrentPage(nextPage);
      }
    }
  }, [paginationState.hasNextPage, currentPage, enableUrlSync, urlSync]);

  const goToPrevPage = useCallback(() => {
    if (paginationState.hasPrevPage) {
      const prevPage = currentPage - 1;
      if (enableUrlSync) {
        urlSync.updateState({ page: prevPage });
      } else {
        setLocalCurrentPage(prevPage);
      }
    }
  }, [paginationState.hasPrevPage, currentPage, enableUrlSync, urlSync]);

  const reset = useCallback(() => {
    if (enableUrlSync) {
      urlSync.resetState();
    } else {
      setLocalCurrentPage(initialPage);
      setLocalPageSize(initialPageSize);
    }
  }, [initialPage, initialPageSize, enableUrlSync, urlSync]);

  return {
    // Data
    data: queryResult.data?.data ?? [],
    
    // Status
    isLoading: queryResult.isLoading,
    error: queryResult.error,
    isError: queryResult.isError,
    
    // Pagination state
    paginationState,
    
    // Actions
    goToPage,
    goToNextPage,
    goToPrevPage,
    changePageSize,
    reset,
    refetch: queryResult.refetch,
  };
}

/**
 * Hook specifically for media pagination
 */
export interface MediaPaginationOptions extends PaginationOptions {
  projectId: string;
  sortBy?: 'created_at' | 'file_name' | 'file_size';
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filter?: {
    fileType?: string[];
    uploaders?: string[];
    dateRange?: {
      start: Date | string;
      end: Date | string;
    };
  };
}

export function useMediaPagination(options: MediaPaginationOptions) {
  const { projectId, sortBy = 'created_at', sortOrder = 'desc', search, filter, ...paginationOptions } = options;

  const queryFn = useCallback(
    async ({ page, pageSize }: { page: number; pageSize: number }) => {
      const searchParams = new URLSearchParams({
        projectId,
        page: page.toString(),
        limit: pageSize.toString(),
        sortBy,
        sortOrder,
      });

      // Add search parameter
      if (search) {
        searchParams.append('search', search);
      }

      // Add filter parameters
      if (filter?.fileType?.length) {
        searchParams.append('fileType', filter.fileType.join(','));
      }
      if (filter?.uploaders?.length) {
        searchParams.append('uploaders', filter.uploaders.join(','));
      }
      if (filter?.dateRange) {
        const startDate = typeof filter.dateRange.start === 'string' 
          ? filter.dateRange.start 
          : filter.dateRange.start?.toISOString();
        const endDate = typeof filter.dateRange.end === 'string' 
          ? filter.dateRange.end 
          : filter.dateRange.end?.toISOString();
        
        if (startDate) {
          searchParams.append('startDate', startDate);
        }
        if (endDate) {
          searchParams.append('endDate', endDate);
        }
      }

      const response = await fetch(`/api/media/paginated?${searchParams}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch media files');
      }

      return response.json();
    },
    [projectId, sortBy, sortOrder, search, filter]
  );

  return usePagination(
    ['media', projectId, sortBy, sortOrder, search || '', JSON.stringify(filter || {})],
    queryFn,
    paginationOptions
  );
}