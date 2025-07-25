'use client';

import { useEffect } from 'react';

/**
 * Service Worker Registration Component
 * Handles the registration of the service worker for performance optimization
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    // Only register service worker in production and if supported
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      registerServiceWorker();
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      console.log('[App] Registering Service Worker...');
      
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none', // Always check for updates
      });

      console.log('[App] Service Worker registered successfully:', registration);

      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          console.log('[App] New Service Worker found, installing...');
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New update available
                console.log('[App] New content available, refresh to update');
                
                // Optionally prompt user to refresh
                if (confirm('New version available. Refresh to update?')) {
                  window.location.reload();
                }
              } else {
                // Content cached for offline use
                console.log('[App] Content cached for offline use');
              }
            }
          });
        }
      });

      // Handle controlled state changes
      if (registration.active) {
        console.log('[App] Service Worker is active and controlling the page');
      }

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, payload } = event.data;
        
        switch (type) {
          case 'CACHE_INFO':
            console.log('[App] Cache info:', payload);
            break;
          default:
            console.log('[App] SW message:', type, payload);
        }
      });

      // Check for updates periodically
      setInterval(() => {
        registration.update();
      }, 60000); // Check every minute

    } catch (error) {
      console.error('[App] Service Worker registration failed:', error);
    }
  };

  // Send message to service worker
  const sendMessageToSW = (message: { type: string; payload?: Record<string, unknown> }) => {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(message);
    }
  };

  // Expose SW utilities globally for debugging
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      interface WindowWithSWUtils extends Window {
        swUtils: {
          clearCache: (cacheName?: string) => void;
          getCacheInfo: () => void;
        };
      }
      
      (window as unknown as WindowWithSWUtils).swUtils = {
        clearCache: (cacheName?: string) => {
          sendMessageToSW({ type: 'CLEAR_CACHE', payload: { cacheName } });
        },
        getCacheInfo: () => {
          sendMessageToSW({ type: 'GET_CACHE_INFO' });
        },
      };
    }
  }, []);

  // This component doesn't render anything
  return null;
}

/**
 * Performance monitoring utilities
 */
export const performanceUtils = {
  // Measure Core Web Vitals
  measureCWV: () => {
    if (typeof window === 'undefined') return;

    // First Contentful Paint
    const paintObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          console.log('[Perf] First Contentful Paint:', entry.startTime);
        }
      });
    });
    paintObserver.observe({ entryTypes: ['paint'] });

    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      console.log('[Perf] Largest Contentful Paint:', lastEntry.startTime);
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // Cumulative Layout Shift
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShiftEntry = entry as PerformanceEntry & {
          hadRecentInput?: boolean;
          value?: number;
        };
        if (!layoutShiftEntry.hadRecentInput && layoutShiftEntry.value) {
          clsValue += layoutShiftEntry.value;
          console.log('[Perf] Cumulative Layout Shift:', clsValue);
        }
      }
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });

    // First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const eventEntry = entry as PerformanceEventTiming;
        const fid = eventEntry.processingStart - eventEntry.startTime;
        console.log('[Perf] First Input Delay:', fid);
      }
    });
    fidObserver.observe({ entryTypes: ['first-input'] });
  },

  // Measure resource loading times
  measureResourceTiming: () => {
    if (typeof window === 'undefined') return;

    const resourceObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.name.includes('image') || entry.name.includes('media')) {
          console.log('[Perf] Image load time:', entry.name, entry.duration);
        }
      });
    });
    resourceObserver.observe({ entryTypes: ['resource'] });
  },
};