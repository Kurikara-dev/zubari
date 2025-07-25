'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export interface UrlSyncOptions {
  debounceMs?: number;
  replaceState?: boolean;
}

/**
 * Hook for synchronizing state with URL query parameters
 */
export function useUrlSync<T extends Record<string, string | number | boolean | null | undefined>>(
  initialState: T,
  options: UrlSyncOptions = {}
) {
  const { debounceMs = 300, replaceState = false } = options;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Initialize state from URL parameters
  const [state, setState] = useState<T>(() => {
    const urlState = { ...initialState };
    
    // Parse URL parameters and override initial state
    Object.keys(initialState).forEach(key => {
      const urlValue = searchParams.get(key);
      if (urlValue !== null) {
        const initialValue = initialState[key];
        
        // Convert string back to appropriate type
        if (typeof initialValue === 'number') {
          const numberValue = Number(urlValue);
          if (!isNaN(numberValue)) {
            urlState[key as keyof T] = numberValue as T[keyof T];
          }
        } else if (typeof initialValue === 'boolean') {
          urlState[key as keyof T] = (urlValue === 'true') as T[keyof T];
        } else {
          urlState[key as keyof T] = urlValue as T[keyof T];
        }
      }
    });
    
    return urlState;
  });

  // Update URL when state changes
  const updateUrl = useCallback((newState: T) => {
    const current = new URLSearchParams(searchParams.toString());
    
    // Update or remove parameters based on state
    Object.entries(newState).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        current.delete(key);
      } else {
        current.set(key, String(value));
      }
    });
    
    const newUrl = `${pathname}${current.toString() ? `?${current.toString()}` : ''}`;
    
    if (replaceState) {
      router.replace(newUrl);
    } else {
      router.push(newUrl);
    }
  }, [pathname, searchParams, router, replaceState]);

  // Debounced URL update
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateUrl(state);
    }, debounceMs);
    
    return () => clearTimeout(timeoutId);
  }, [state, updateUrl, debounceMs]);

  const updateState = useCallback((updates: Partial<T>) => {
    setState(prevState => ({ ...prevState, ...updates }));
  }, []);

  const resetState = useCallback(() => {
    setState(initialState);
  }, [initialState]);

  return {
    state,
    updateState,
    resetState,
  };
}

/**
 * Hook specifically for pagination URL sync
 */
export interface PaginationUrlState extends Record<string, number> {
  page: number;
  pageSize: number;
}

export function usePaginationUrlSync(initialState: PaginationUrlState = { page: 1, pageSize: 20 }) {
  return useUrlSync(initialState, { 
    debounceMs: 100, // Faster for pagination changes
    replaceState: true // Replace state to avoid cluttering browser history
  });
}

/**
 * Hook for filter state URL sync
 */
export interface FilterUrlState extends Record<string, string | undefined> {
  search?: string;
  sortBy?: string;
  sortOrder?: string;
  fileTypes?: string;
  uploaders?: string;
  startDate?: string;
  endDate?: string;
}

export function useFilterUrlSync(initialState: FilterUrlState = {}) {
  return useUrlSync(initialState, { 
    debounceMs: 500, // Longer debounce for search input
    replaceState: true
  });
}