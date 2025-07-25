#!/usr/bin/env node
/**
 * Test runner with automatic cleanup to prevent memory leaks
 */

import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

let vitestProcesses = []

// Cleanup function
function cleanup() {
  if (vitestProcesses.length > 0) {
    console.log(`\n🧹 Cleaning up ${vitestProcesses.length} test processes...`)
    vitestProcesses.forEach(proc => {
      try {
        if (!proc.killed) {
          proc.kill('SIGKILL')
        }
      } catch (error) {
        // Process already dead
      }
    })
    vitestProcesses = []
    
    // Force kill any remaining vitest processes
    const killCommand = process.platform === 'win32' 
      ? 'taskkill /F /IM node.exe' 
      : 'pkill -f "vitest" || true'
    
    require('child_process').execSync(killCommand, { stdio: 'ignore' })
  }
}

// Run tests with cleanup
function runTestsWithCleanup() {
  const args = ['run']
  
  console.log('🚀 Starting vitest with memory optimization...')
  
  const vitestProcess = spawn('npx', ['vitest', ...args], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_OPTIONS: '--max-old-space-size=1536'
    }
  })
  
  vitestProcesses.push(vitestProcess)
  
  // Timeout after 2 minutes
  const timeout = setTimeout(() => {
    console.log('\n⚠️  Test timeout reached. Cleaning up...')
    cleanup()
    process.exit(1)
  }, 120000)
  
  vitestProcess.on('close', (code) => {
    clearTimeout(timeout)
    cleanup()
    
    if (code === 0) {
      console.log('✅ Tests completed successfully')
    } else {
      console.log(`❌ Tests failed with code ${code}`)
    }
    
    process.exit(code)
  })
  
  vitestProcess.on('error', (error) => {
    clearTimeout(timeout)
    console.error('❌ Test process error:', error)
    cleanup()
    process.exit(1)
  })
}

// Handle process termination
process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)
process.on('exit', cleanup)

// Run the tests
runTestsWithCleanup()