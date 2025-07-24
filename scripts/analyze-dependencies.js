#!/usr/bin/env node

/**
 * 依存関係分析スクリプト
 * 
 * 既存のTypeScriptファイルの依存関係を分析し、
 * 循環依存とアーキテクチャの問題を検出する
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.join(__dirname, '..', 'src')

// 依存関係のマップ
const dependencyMap = new Map() // Forward dependencies: file -> [files it depends on]
const reverseDependencyMap = new Map() // Reverse dependencies: file -> [files that depend on it]
const exports = new Map()

/**
 * TypeScriptファイルからimport文を抽出
 */
function extractImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const imports = []
  
  // import文の正規表現
  const importRegex = /^import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"](\.\/|\.\.\/|[^'".\/][^'"]*)['"]/gm
  
  let match
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1]
    
    // 相対パスの解決
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      const absolutePath = path.resolve(path.dirname(filePath), importPath)
      imports.push(absolutePath)
    } else {
      // 外部ライブラリまたは絶対パス
      imports.push(importPath)
    }
  }
  
  return imports
}

/**
 * TypeScriptファイルからexport文を抽出
 */
function extractExports(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const exportList = []
  
  // export文の正規表現
  const exportRegex = /^export\s+(?:(?:default\s+)?(?:class|function|const|let|var|interface|type|enum)\s+(\w+)|(?:default\s+)?(\w+)|\{([^}]*)\})/gm
  
  let match
  while ((match = exportRegex.exec(content)) !== null) {
    if (match[1]) {
      exportList.push(match[1])
    } else if (match[2]) {
      exportList.push(match[2])
    } else if (match[3]) {
      // 複数export
      const names = match[3].split(',').map(name => name.trim().split(' as ')[0])
      exportList.push(...names)
    }
  }
  
  return exportList
}

/**
 * ディレクトリを再帰的に探索してTypeScriptファイルを取得
 */
function findTsFiles(dir) {
  const files = []
  
  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)
      
      if (entry.isDirectory()) {
        walk(fullPath)
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        files.push(fullPath)
      }
    }
  }
  
  walk(dir)
  return files
}

/**
 * 循環依存を検出
 */
function findCircularDependencies(dependencies) {
  const visiting = new Set()
  const visited = new Set()
  const cycles = []
  
  function dfs(node, path) {
    if (visiting.has(node)) {
      // 循環依存を発見
      const cycleStart = path.indexOf(node)
      const cycle = path.slice(cycleStart).concat(node)
      cycles.push(cycle)
      return
    }
    
    if (visited.has(node)) {
      return
    }
    
    visiting.add(node)
    path.push(node)
    
    const deps = dependencies.get(node) || []
    for (const dep of deps) {
      if (dependencies.has(dep)) {
        dfs(dep, [...path])
      }
    }
    
    visiting.delete(node)
    visited.add(node)
    path.pop()
  }
  
  for (const node of dependencies.keys()) {
    if (!visited.has(node)) {
      dfs(node, [])
    }
  }
  
  return cycles
}

/**
 * 逆依存関係マップを構築
 */
function buildReverseDependencyMap(dependencies) {
  const reverseMap = new Map()
  
  // すべてのファイルを初期化
  for (const file of dependencies.keys()) {
    reverseMap.set(file, [])
  }
  
  // 逆依存関係を構築
  for (const [file, deps] of dependencies) {
    for (const dep of deps) {
      if (dependencies.has(dep)) {
        if (!reverseMap.has(dep)) {
          reverseMap.set(dep, [])
        }
        reverseMap.get(dep).push(file)
      }
    }
  }
  
  return reverseMap
}

/**
 * 指定ファイルに対する完全な影響範囲を計算（連鎖を含む）
 */
function calculateImpactScope(targetFile, reverseDeps, maxDepth = 10) {
  const impacted = new Set()
  const queue = [{file: targetFile, depth: 0}]
  const visited = new Set()
  
  while (queue.length > 0) {
    const {file, depth} = queue.shift()
    
    if (visited.has(file) || depth > maxDepth) {
      continue
    }
    
    visited.add(file)
    impacted.add(file)
    
    const dependents = reverseDeps.get(file) || []
    for (const dependent of dependents) {
      queue.push({file: dependent, depth: depth + 1})
    }
  }
  
  impacted.delete(targetFile) // 自分自身は除外
  return Array.from(impacted)
}

/**
 * 依存関係チェーンを詳細分析
 */
function analyzeDependencyChains(dependencies, reverseDeps) {
  const chains = new Map()
  
  for (const file of dependencies.keys()) {
    const forwardChain = getForwardChain(file, dependencies, 5)
    const reverseChain = getReverseChain(file, reverseDeps, 5)
    
    chains.set(file, {
      forward: forwardChain,
      reverse: reverseChain,
      impactScope: calculateImpactScope(file, reverseDeps)
    })
  }
  
  return chains
}

/**
 * 前方依存チェーン（このファイルが依存している先）
 */
function getForwardChain(file, dependencies, maxDepth) {
  const chain = []
  const visited = new Set()
  
  function traverse(currentFile, depth) {
    if (depth >= maxDepth || visited.has(currentFile)) return
    
    visited.add(currentFile)
    const deps = dependencies.get(currentFile) || []
    
    for (const dep of deps) {
      if (dependencies.has(dep)) {
        chain.push({
          from: currentFile,
          to: dep,
          depth: depth
        })
        traverse(dep, depth + 1)
      }
    }
  }
  
  traverse(file, 0)
  return chain
}

/**
 * 後方依存チェーン（このファイルに依存しているもの）
 */
function getReverseChain(file, reverseDeps, maxDepth) {
  const chain = []
  const visited = new Set()
  
  function traverse(currentFile, depth) {
    if (depth >= maxDepth || visited.has(currentFile)) return
    
    visited.add(currentFile)
    const dependents = reverseDeps.get(currentFile) || []
    
    for (const dependent of dependents) {
      chain.push({
        from: currentFile,
        to: dependent,
        depth: depth
      })
      traverse(dependent, depth + 1)
    }
  }
  
  traverse(file, 0)
  return chain
}

/**
 * 依存関係の深さを計算
 */
function calculateDependencyDepth(dependencies) {
  const depths = new Map()
  
  function calculateDepth(node, visiting = new Set()) {
    if (depths.has(node)) {
      return depths.get(node)
    }
    
    if (visiting.has(node)) {
      return 0 // 循環依存の場合
    }
    
    visiting.add(node)
    
    const deps = dependencies.get(node) || []
    let maxDepth = 0
    
    for (const dep of deps) {
      if (dependencies.has(dep)) {
        maxDepth = Math.max(maxDepth, calculateDepth(dep, visiting))
      }
    }
    
    visiting.delete(node)
    depths.set(node, maxDepth + 1)
    
    return maxDepth + 1
  }
  
  for (const node of dependencies.keys()) {
    calculateDepth(node)
  }
  
  return depths
}

/**
 * メイン処理
 */
async function analyzeDependencies() {
  console.log('🔍 Analyzing dependencies...')
  
  // TypeScriptファイルを取得
  const tsFiles = findTsFiles(srcDir)
  console.log(`Found ${tsFiles.length} TypeScript files`)
  
  // 依存関係とエクスポートを抽出
  for (const file of tsFiles) {
    const imports = extractImports(file)
    const exportList = extractExports(file)
    
    dependencyMap.set(file, imports)
    exports.set(file, exportList)
  }
  
  // 逆依存関係マップを構築
  const reverseDeps = buildReverseDependencyMap(dependencyMap)
  
  // 循環依存を検出
  const cycles = findCircularDependencies(dependencyMap)
  
  // 依存関係の深さを計算
  const depths = calculateDependencyDepth(dependencyMap)
  
  // 依存関係チェーンを分析
  const chains = analyzeDependencyChains(dependencyMap, reverseDeps)
  
  // 結果を表示
  console.log('\n📊 Analysis Results:')
  console.log('==================')
  
  console.log(`\n📁 Total files: ${tsFiles.length}`)
  console.log(`🔗 Total dependencies: ${Array.from(dependencyMap.values()).reduce((sum, deps) => sum + deps.length, 0)}`)
  console.log(`🔄 Circular dependencies: ${cycles.length}`)
  
  if (cycles.length > 0) {
    console.log('\n❌ Circular Dependencies Found:')
    cycles.forEach((cycle, index) => {
      console.log(`  ${index + 1}. ${cycle.map(f => path.relative(srcDir, f)).join(' → ')}`)
    })
  }
  
  console.log('\n📈 Dependency Depth Analysis:')
  const sortedByDepth = Array.from(depths.entries()).sort((a, b) => b[1] - a[1])
  
  sortedByDepth.slice(0, 10).forEach(([file, depth]) => {
    console.log(`  ${path.relative(srcDir, file)}: depth ${depth}`)
  })
  
  console.log('\n🎯 Most Connected Files:')
  const connectionCount = new Map()
  const reverseConnectionCount = new Map()
  
  for (const [file, deps] of dependencyMap) {
    connectionCount.set(file, deps.length)
  }
  
  for (const [file, deps] of reverseDeps) {
    reverseConnectionCount.set(file, deps.length)
  }
  
  const sortedByConnections = Array.from(connectionCount.entries()).sort((a, b) => b[1] - a[1])
  const sortedByReverseConnections = Array.from(reverseConnectionCount.entries()).sort((a, b) => b[1] - a[1])
  
  console.log('\n📤 Files with Most Dependencies (outgoing):')
  sortedByConnections.slice(0, 5).forEach(([file, count]) => {
    console.log(`  ${path.relative(srcDir, file)}: ${count} dependencies`)
  })
  
  console.log('\n📥 Files with Most Dependents (incoming):')
  sortedByReverseConnections.slice(0, 5).forEach(([file, count]) => {
    console.log(`  ${path.relative(srcDir, file)}: used by ${count} files`)
  })
  
  console.log('\n🔗 High Impact Files (top 5):')
  const impactScores = new Map()
  for (const [file, chainData] of chains) {
    impactScores.set(file, chainData.impactScope.length)
  }
  
  const sortedByImpact = Array.from(impactScores.entries()).sort((a, b) => b[1] - a[1])
  sortedByImpact.slice(0, 5).forEach(([file, impact]) => {
    console.log(`  ${path.relative(srcDir, file)}: affects ${impact} files`)
  })
  
  // 結果をファイルに保存
  const reportPath = path.join(__dirname, '..', 'dependency', 'dependency-analysis-report.json')
  const report = {
    timestamp: new Date().toISOString(),
    totalFiles: tsFiles.length,
    totalDependencies: Array.from(dependencyMap.values()).reduce((sum, deps) => sum + deps.length, 0),
    circularDependencies: cycles.map(cycle => cycle.map(f => path.relative(srcDir, f))),
    dependencyDepths: Object.fromEntries(
      Array.from(depths.entries()).map(([file, depth]) => [path.relative(srcDir, file), depth])
    ),
    connectionCounts: Object.fromEntries(
      Array.from(connectionCount.entries()).map(([file, count]) => [path.relative(srcDir, file), count])
    ),
    reverseDependencies: Object.fromEntries(
      Array.from(reverseDeps.entries()).map(([file, deps]) => [
        path.relative(srcDir, file), 
        deps.map(d => path.relative(srcDir, d))
      ])
    ),
    impactAnalysis: Object.fromEntries(
      Array.from(chains.entries()).map(([file, chainData]) => [
        path.relative(srcDir, file),
        {
          directDependents: (reverseDeps.get(file) || []).map(d => path.relative(srcDir, d)),
          fullImpactScope: chainData.impactScope.map(d => path.relative(srcDir, d)),
          impactCount: chainData.impactScope.length
        }
      ])
    )
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`\n📄 Detailed report saved to: ${reportPath}`)
}

// スクリプトの実行
analyzeDependencies().catch(console.error)