import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    exclude: ['**/node_modules/**', '**/e2e/**', '**/dist/**', '**/build/**'],
    testTimeout: 30000, // 30 seconds for individual tests
    hookTimeout: 10000, // 10 seconds for hooks
    teardownTimeout: 10000, // 10 seconds for teardown
    // Memory optimization
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: 2, // Limit concurrent threads
      }
    },
    // Isolation and cleanup
    isolate: true,
    sequence: {
      shuffle: false,
      concurrent: false // Run tests sequentially to avoid memory spikes
    },
    // Force garbage collection
    logHeapUsage: true
  },
})