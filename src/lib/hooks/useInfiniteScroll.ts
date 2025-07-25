'use client';

import { useCallback, useEffect, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useIntersectionObserver } from './useIntersectionObserver';

export interface InfiniteScrollOptions {
  enabled?: boolean;
  threshold?: number;
  rootMargin?: string;
  pageSize?: number;
  initialPageParam?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor?: string | number;
  hasMore: boolean;
  total?: number;
}

/**
 * Hook for infinite scrolling with automatic loading
 */
export function useInfiniteScroll<T>(
  queryKey: (string | number)[],
  queryFn: (params: { pageParam: number; pageSize: number }) => Promise<PaginatedResponse<T>>,
  options: InfiniteScrollOptions = {}
) {
  const {
    enabled = true,
    threshold = 0.1,
    rootMargin = '100px',
    pageSize = 20,
    initialPageParam = 0,
  } = options;

  const [triggerRef, triggerState] = useIntersectionObserver({
    threshold,
    rootMargin,
    triggerOnce: false,
    skip: !enabled,
  });

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
    refetch,
  } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam = initialPageParam }: { pageParam: string | number }) =>
      queryFn({ pageParam: Number(pageParam), pageSize }),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return lastPage.nextCursor ?? allPages.length;
    },
    initialPageParam,
    enabled,
  });

  // Auto-fetch next page when trigger element is visible
  useEffect(() => {
    if (
      triggerState.isIntersecting &&
      hasNextPage &&
      !isFetchingNextPage &&
      enabled
    ) {
      fetchNextPage();
    }
  }, [
    triggerState.isIntersecting,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    enabled,
  ]);

  // Flatten all pages into a single array
  const flatData = data?.pages.flatMap(page => page.data) ?? [];

  return {
    data: flatData,
    error,
    isLoading: status === 'pending',
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    triggerRef,
    totalCount: data?.pages[0]?.total,
  };
}

/**
 * Hook specifically for media/image infinite scrolling
 */
export interface MediaInfiniteScrollOptions extends InfiniteScrollOptions {
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

export function useMediaInfiniteScroll(options: MediaInfiniteScrollOptions) {
  const { projectId, sortBy = 'created_at', sortOrder = 'desc', search, filter, ...scrollOptions } = options;

  const queryFn = useCallback(
    async ({ pageParam, pageSize }: { pageParam: number; pageSize: number }) => {
      const searchParams = new URLSearchParams({
        projectId,
        page: pageParam.toString(),
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

  return useInfiniteScroll(
    ['media', projectId, sortBy, sortOrder, search || '', JSON.stringify(filter || {})],
    queryFn,
    scrollOptions
  );
}

/**
 * Virtual scrolling hook for very large datasets
 */
export interface VirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export function useVirtualScroll<T>(
  items: T[],
  options: VirtualScrollOptions
) {
  const { itemHeight, containerHeight, overscan = 5 } = options;
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1).map((item, index) => ({
    item,
    index: startIndex + index,
    offsetTop: (startIndex + index) * itemHeight,
  }));

  const totalHeight = items.length * itemHeight;

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    handleScroll,
    startIndex,
    endIndex,
  };
}

/**
 * Performance monitoring for infinite scroll
 */
export const infiniteScrollMetrics = {
  /**
   * Track page load performance
   */
  trackPageLoad(page: number, startTime: number, itemCount: number) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.debug(`[InfiniteScroll] Page ${page} loaded in ${duration}ms with ${itemCount} items`);

    // Send to analytics if available
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'infinite_scroll_page_load', {
        custom_parameter_1: page.toString(),
        custom_parameter_2: Math.round(duration),
        custom_parameter_3: itemCount,
      });
    }

    return duration;
  },

  /**
   * Track scroll performance
   */
  trackScrollPerformance(scrollTop: number, totalItems: number) {
    const scrollPercentage = Math.round((scrollTop / (totalItems * 100)) * 100);
    
    console.debug(`[InfiniteScroll] Scrolled ${scrollPercentage}% through ${totalItems} items`);

    // Send to analytics if available (throttled)
    if (typeof window !== 'undefined' && window.gtag && scrollPercentage % 25 === 0) {
      window.gtag('event', 'infinite_scroll_progress', {
        custom_parameter_1: scrollPercentage.toString(),
        custom_parameter_2: totalItems,
      });
    }
  },

  /**
   * Track memory usage during scrolling
   */
  trackMemoryUsage() {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      if (memory) {
        console.debug('[InfiniteScroll] Memory usage:', {
          used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
        });
      }
    }
  },
};

// Extend Window interface for gtag
declare global {
  interface Window {
    gtag?: (command: string, eventName: string, parameters: Record<string, string | number>) => void;
  }
}