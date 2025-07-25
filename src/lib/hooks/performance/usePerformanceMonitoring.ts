import { useEffect, useCallback, useRef, useState } from 'react'

export interface PerformanceMetrics {
  // Core Web Vitals
  firstContentfulPaint: number | null
  largestContentfulPaint: number | null
  cumulativeLayoutShift: number | null
  firstInputDelay: number | null
  totalBlockingTime: number | null
  
  // Additional metrics
  timeToFirstByte: number | null
  domContentLoaded: number | null
  loadComplete: number | null
  
  // Custom metrics
  imageLoadTimes: number[]
  interactionLatency: number[]
  jsExecutionTime: number | null
  
  // Memory usage (if available)
  memoryUsage: {
    usedJSHeapSize: number | null
    totalJSHeapSize: number | null
    jsHeapSizeLimit: number | null
  }
  
  // Connection info
  connectionType: string | null
  effectiveType: string | null
  downlink: number | null
  rtt: number | null
}

export interface PerformanceEntry {
  name: string
  entryType: string
  startTime: number
  duration: number
}

export interface PerformanceObserverOptions {
  enableWebVitals?: boolean
  enableResourceTiming?: boolean
  enableLongTasks?: boolean
  enableMemoryMonitoring?: boolean
  sampleRate?: number
  reportingInterval?: number
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void
  onThresholdExceeded?: (metric: string, value: number, threshold: number) => void
}

// Performance thresholds (in milliseconds)
const PERFORMANCE_THRESHOLDS = {
  firstContentfulPaint: 2000,
  largestContentfulPaint: 3000,
  cumulativeLayoutShift: 0.1,
  firstInputDelay: 100,
  totalBlockingTime: 300,
  timeToFirstByte: 800,
  imageLoadTime: 2000,
  interactionLatency: 100
}

export const usePerformanceMonitoring = (options: PerformanceObserverOptions = {}) => {
  const {
    enableWebVitals = true,
    enableResourceTiming = true,
    enableLongTasks = true,
    enableMemoryMonitoring = true,
    sampleRate = 1.0,
    reportingInterval = 10000,
    onMetricsUpdate,
    onThresholdExceeded
  } = options

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    firstContentfulPaint: null,
    largestContentfulPaint: null,
    cumulativeLayoutShift: null,
    firstInputDelay: null,
    totalBlockingTime: null,
    timeToFirstByte: null,
    domContentLoaded: null,
    loadComplete: null,
    imageLoadTimes: [],
    interactionLatency: [],
    jsExecutionTime: null,
    memoryUsage: {
      usedJSHeapSize: null,
      totalJSHeapSize: null,
      jsHeapSizeLimit: null
    },
    connectionType: null,
    effectiveType: null,
    downlink: null,
    rtt: null
  })

  const observersRef = useRef<PerformanceObserver[]>([])
  const metricsRef = useRef(metrics)
  const reportingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Update metrics ref when state changes
  useEffect(() => {
    metricsRef.current = metrics
  }, [metrics])

  // Check if we should collect metrics (sampling)
  const shouldCollectMetrics = useCallback(() => {
    return Math.random() <= sampleRate
  }, [sampleRate])

  // Update metrics and check thresholds
  const updateMetrics = useCallback((updates: Partial<PerformanceMetrics>) => {
    setMetrics(prev => {
      const newMetrics = { ...prev, ...updates }
      
      // Check thresholds
      Object.entries(updates).forEach(([key, value]) => {
        if (typeof value === 'number' && key in PERFORMANCE_THRESHOLDS) {
          const threshold = PERFORMANCE_THRESHOLDS[key as keyof typeof PERFORMANCE_THRESHOLDS]
          if (value > threshold) {
            onThresholdExceeded?.(key, value, threshold)
          }
        }
      })
      
      return newMetrics
    })
  }, [onThresholdExceeded])

  // Collect Web Vitals
  const collectWebVitals = useCallback(() => {
    if (!enableWebVitals || !shouldCollectMetrics()) return

    try {
      // First Contentful Paint
      const paintEntries = performance.getEntriesByType('paint')
      const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint')
      if (fcpEntry) {
        updateMetrics({ firstContentfulPaint: fcpEntry.startTime })
      }

      // Navigation Timing
      const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
      if (navigationEntries.length > 0) {
        const nav = navigationEntries[0]
        updateMetrics({
          timeToFirstByte: nav.responseStart - nav.requestStart,
          domContentLoaded: nav.domContentLoadedEventEnd - nav.fetchStart,
          loadComplete: nav.loadEventEnd - nav.fetchStart
        })
      }
    } catch (error) {
      console.debug('Error collecting basic web vitals:', error)
    }
  }, [enableWebVitals, shouldCollectMetrics, updateMetrics])

  // Set up performance observers
  const setupPerformanceObservers = useCallback(() => {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return

    const observers: PerformanceObserver[] = []

    try {
      // Largest Contentful Paint Observer
      if (enableWebVitals) {
        const lcpObserver = new PerformanceObserver((list) => {
          if (!shouldCollectMetrics()) return
          
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1]
          if (lastEntry) {
            updateMetrics({ largestContentfulPaint: lastEntry.startTime })
          }
        })
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
        observers.push(lcpObserver)

        // Cumulative Layout Shift Observer
        const clsObserver = new PerformanceObserver((list) => {
          if (!shouldCollectMetrics()) return
          
          let clsValue = metricsRef.current.cumulativeLayoutShift || 0
          const entries = list.getEntries()
          
          entries.forEach((entry: PerformanceEntry & { value?: number; hadRecentInput?: boolean }) => {
            if (!entry.hadRecentInput) {
              clsValue += (entry.value || 0)
            }
          })
          
          updateMetrics({ cumulativeLayoutShift: clsValue })
        })
        clsObserver.observe({ entryTypes: ['layout-shift'] })
        observers.push(clsObserver)

        // First Input Delay Observer
        const fidObserver = new PerformanceObserver((list) => {
          if (!shouldCollectMetrics()) return
          
          const entries = list.getEntries()
          entries.forEach((entry: PerformanceEntry & { processingStart?: number }) => {
            updateMetrics({ firstInputDelay: (entry.processingStart || 0) - entry.startTime })
          })
        })
        fidObserver.observe({ entryTypes: ['first-input'] })
        observers.push(fidObserver)
      }

      // Long Tasks Observer (for Total Blocking Time)
      if (enableLongTasks) {
        const longTaskObserver = new PerformanceObserver((list) => {
          if (!shouldCollectMetrics()) return
          
          const entries = list.getEntries()
          let totalBlockingTime = metricsRef.current.totalBlockingTime || 0
          
          entries.forEach((entry) => {
            if (entry.duration > 50) {
              totalBlockingTime += entry.duration - 50
            }
          })
          
          updateMetrics({ totalBlockingTime })
        })
        longTaskObserver.observe({ entryTypes: ['longtask'] })
        observers.push(longTaskObserver)
      }

      // Resource Timing Observer (for image load times)
      if (enableResourceTiming) {
        const resourceObserver = new PerformanceObserver((list) => {
          if (!shouldCollectMetrics()) return
          
          const entries = list.getEntries()
          const imageLoadTimes: number[] = []
          
          entries.forEach((entry) => {
            if (entry.name.match(/\.(jpg|jpeg|png|gif|webp|svg|avif)$/i)) {
              imageLoadTimes.push(entry.duration)
            }
          })
          
          if (imageLoadTimes.length > 0) {
            updateMetrics({
              imageLoadTimes: [...metricsRef.current.imageLoadTimes, ...imageLoadTimes]
            })
          }
        })
        resourceObserver.observe({ entryTypes: ['resource'] })
        observers.push(resourceObserver)
      }

    } catch (error) {
      console.debug('Error setting up performance observers:', error)
    }

    observersRef.current = observers
    return observers
  }, [
    enableWebVitals,
    enableLongTasks,
    enableResourceTiming,
    shouldCollectMetrics,
    updateMetrics
  ])

  // Collect memory usage
  const collectMemoryMetrics = useCallback(() => {
    if (!enableMemoryMonitoring || !shouldCollectMetrics()) return

    try {
      if ('memory' in performance && (performance as { memory?: unknown }).memory) {
        const memory = (performance as { memory: {
          usedJSHeapSize: number;
          totalJSHeapSize: number;
          jsHeapSizeLimit: number;
        } }).memory
        updateMetrics({
          memoryUsage: {
            usedJSHeapSize: memory.usedJSHeapSize,
            totalJSHeapSize: memory.totalJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit
          }
        })
      }
    } catch (error) {
      console.debug('Error collecting memory metrics:', error)
    }
  }, [enableMemoryMonitoring, shouldCollectMetrics, updateMetrics])

  // Collect connection information
  const collectConnectionInfo = useCallback(() => {
    if (!shouldCollectMetrics()) return

    try {
      const connection = (navigator as {
        connection?: { type?: string; effectiveType?: string; downlink?: number; rtt?: number };
        mozConnection?: { type?: string; effectiveType?: string; downlink?: number; rtt?: number };
        webkitConnection?: { type?: string; effectiveType?: string; downlink?: number; rtt?: number };
      }).connection || (navigator as {
        mozConnection?: { type?: string; effectiveType?: string; downlink?: number; rtt?: number };
      }).mozConnection || (navigator as {
        webkitConnection?: { type?: string; effectiveType?: string; downlink?: number; rtt?: number };
      }).webkitConnection
      if (connection) {
        updateMetrics({
          connectionType: connection.type || null,
          effectiveType: connection.effectiveType || null,
          downlink: connection.downlink || null,
          rtt: connection.rtt || null
        })
      }
    } catch (error) {
      console.debug('Error collecting connection info:', error)
    }
  }, [shouldCollectMetrics, updateMetrics])

  // Measure interaction latency
  const measureInteractionLatency = useCallback((startTime: number) => {
    const endTime = performance.now()
    const latency = endTime - startTime
    
    updateMetrics({
      interactionLatency: [...metricsRef.current.interactionLatency, latency]
    })
    
    return latency
  }, [updateMetrics])

  // Get current performance snapshot
  const getPerformanceSnapshot = useCallback((): PerformanceMetrics => {
    collectWebVitals()
    collectMemoryMetrics()
    collectConnectionInfo()
    return metricsRef.current
  }, [collectWebVitals, collectMemoryMetrics, collectConnectionInfo])

  // Calculate average values
  const getAverageMetrics = useCallback(() => {
    const current = metricsRef.current
    
    return {
      ...current,
      averageImageLoadTime: current.imageLoadTimes.length > 0
        ? current.imageLoadTimes.reduce((a, b) => a + b, 0) / current.imageLoadTimes.length
        : null,
      averageInteractionLatency: current.interactionLatency.length > 0
        ? current.interactionLatency.reduce((a, b) => a + b, 0) / current.interactionLatency.length
        : null
    }
  }, [])

  // Initialize monitoring
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Set up observers
    setupPerformanceObservers()
    
    // Collect initial metrics
    collectWebVitals()
    collectMemoryMetrics()
    collectConnectionInfo()

    // Set up reporting interval
    if (reportingInterval > 0 && onMetricsUpdate) {
      reportingIntervalRef.current = setInterval(() => {
        const snapshot = getPerformanceSnapshot()
        onMetricsUpdate(snapshot)
      }, reportingInterval)
    }

    return () => {
      // Cleanup observers
      observersRef.current.forEach(observer => {
        try {
          observer.disconnect()
        } catch (error) {
          console.debug('Error disconnecting performance observer:', error)
        }
      })
      
      if (reportingIntervalRef.current) {
        clearInterval(reportingIntervalRef.current)
      }
    }
  }, [
    setupPerformanceObservers,
    collectWebVitals,
    collectMemoryMetrics,
    collectConnectionInfo,
    getPerformanceSnapshot,
    reportingInterval,
    onMetricsUpdate
  ])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      observersRef.current.forEach(observer => {
        try {
          observer.disconnect()
        } catch (error) {
          console.debug('Error disconnecting performance observer:', error)
        }
      })
    }
  }, [])

  return {
    metrics,
    getPerformanceSnapshot,
    getAverageMetrics,
    measureInteractionLatency,
    isSupported: typeof window !== 'undefined' && 'PerformanceObserver' in window
  }
}