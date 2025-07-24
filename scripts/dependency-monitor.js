#!/usr/bin/env node

/**
 * 依存関係監視システム
 * 
 * ファイルの変更を監視し、依存関係の変更を自動検出
 * 影響範囲の計算と通知を行う
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createHash } from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.join(__dirname, '..', 'src')
const cacheDir = path.join(__dirname, '..', '.cache')

// キャッシュディレクトリの作成
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true })
}

/**
 * 依存関係監視クラス
 */
class DependencyMonitor {
  constructor() {
    this.dependencyGraph = new Map()
    this.reverseGraph = new Map()
    this.fileHashes = new Map()
    this.cacheFile = path.join(cacheDir, 'dependency-cache.json')
    this.loadCache()
  }

  /**
   * キャッシュの読み込み
   */
  loadCache() {
    try {
      if (fs.existsSync(this.cacheFile)) {
        const cache = JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'))
        this.dependencyGraph = new Map(cache.dependencies || [])
        this.reverseGraph = new Map(cache.reverseDependencies || [])
        this.fileHashes = new Map(cache.fileHashes || [])
      }
    } catch (error) {
      console.warn('Could not load dependency cache:', error.message)
    }
  }

  /**
   * キャッシュの保存
   */
  saveCache() {
    try {
      const cache = {
        dependencies: Array.from(this.dependencyGraph.entries()),
        reverseDependencies: Array.from(this.reverseGraph.entries()),
        fileHashes: Array.from(this.fileHashes.entries()),
        lastUpdate: new Date().toISOString()
      }
      fs.writeFileSync(this.cacheFile, JSON.stringify(cache, null, 2))
    } catch (error) {
      console.warn('Could not save dependency cache:', error.message)
    }
  }

  /**
   * ファイルハッシュの計算
   */
  calculateFileHash(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8')
      return createHash('sha256').update(content).digest('hex')
    } catch (error) {
      return null
    }
  }

  /**
   * import文の抽出
   */
  extractImports(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8')
      const imports = []
      
      const importRegex = /^import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"](\.\/|\.\.\/|[^'".\/][^'"]*)['"]/gm
      
      let match
      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1]
        
        if (importPath.startsWith('./') || importPath.startsWith('../')) {
          let resolvedPath = path.resolve(path.dirname(filePath), importPath)
          
          // .tsファイルの解決
          if (!resolvedPath.endsWith('.ts') && !resolvedPath.endsWith('.js')) {
            const indexPath = path.join(resolvedPath, 'index.ts')
            if (fs.existsSync(indexPath)) {
              resolvedPath = indexPath
            } else {
              resolvedPath += '.ts'
            }
          }
          
          if (fs.existsSync(resolvedPath)) {
            imports.push(resolvedPath)
          }
        }
      }
      
      return imports
    } catch (error) {
      return []
    }
  }

  /**
   * 依存関係グラフの構築
   */
  buildDependencyGraph() {
    console.log('🔄 Building dependency graph...')
    
    const tsFiles = this.findTsFiles(srcDir)
    let changedFiles = 0
    
    for (const file of tsFiles) {
      const currentHash = this.calculateFileHash(file)
      const cachedHash = this.fileHashes.get(file)
      
      if (currentHash !== cachedHash) {
        changedFiles++
        this.fileHashes.set(file, currentHash)
        
        // 依存関係の抽出
        const imports = this.extractImports(file)
        this.dependencyGraph.set(file, imports)
        
        // 逆依存関係の更新
        for (const importFile of imports) {
          if (!this.reverseGraph.has(importFile)) {
            this.reverseGraph.set(importFile, [])
          }
          if (!this.reverseGraph.get(importFile).includes(file)) {
            this.reverseGraph.get(importFile).push(file)
          }
        }
      }
    }
    
    console.log(`📊 Graph updated: ${changedFiles} files changed`)
    return changedFiles > 0
  }

  /**
   * 影響範囲の計算
   */
  calculateImpactScope(changedFile) {
    const impactedFiles = new Set()
    const queue = [changedFile]
    const visited = new Set()
    
    while (queue.length > 0) {
      const current = queue.shift()
      if (visited.has(current)) continue
      
      visited.add(current)
      impactedFiles.add(current)
      
      // このファイルに依存しているファイルを追加
      const dependents = this.reverseGraph.get(current) || []
      for (const dependent of dependents) {
        if (!visited.has(dependent)) {
          queue.push(dependent)
        }
      }
    }
    
    return Array.from(impactedFiles)
  }

  /**
   * 変更の分析
   */
  analyzeChanges() {
    console.log('🔍 Analyzing changes...')
    
    const changes = []
    const tsFiles = this.findTsFiles(srcDir)
    
    for (const file of tsFiles) {
      const currentHash = this.calculateFileHash(file)
      const cachedHash = this.fileHashes.get(file)
      
      if (currentHash !== cachedHash) {
        const impactScope = this.calculateImpactScope(file)
        const relativeFile = path.relative(srcDir, file)
        
        changes.push({
          file: relativeFile,
          impactedFiles: impactScope.length,
          impactedFilesList: impactScope.map(f => path.relative(srcDir, f)),
          previousHash: cachedHash,
          currentHash: currentHash,
          timestamp: new Date().toISOString()
        })
      }
    }
    
    return changes
  }

  /**
   * 依存関係の統計情報
   */
  generateStatistics() {
    const stats = {
      totalFiles: this.dependencyGraph.size,
      totalDependencies: Array.from(this.dependencyGraph.values()).reduce((sum, deps) => sum + deps.length, 0),
      averageDependencies: 0,
      maxDependencies: 0,
      mostConnectedFiles: [],
      isolatedFiles: []
    }
    
    stats.averageDependencies = stats.totalDependencies / stats.totalFiles
    
    // 最も多くの依存関係を持つファイル
    const connectionCounts = []
    for (const [file, deps] of this.dependencyGraph) {
      const count = deps.length
      connectionCounts.push({ file: path.relative(srcDir, file), count })
      stats.maxDependencies = Math.max(stats.maxDependencies, count)
    }
    
    connectionCounts.sort((a, b) => b.count - a.count)
    stats.mostConnectedFiles = connectionCounts.slice(0, 10)
    
    // 孤立ファイル
    stats.isolatedFiles = connectionCounts.filter(item => item.count === 0).map(item => item.file)
    
    return stats
  }

  /**
   * TypeScriptファイルの検索
   */
  findTsFiles(dir) {
    const files = []
    
    const walk = (currentDir) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name)
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          walk(fullPath)
        } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
          files.push(fullPath)
        }
      }
    }
    
    walk(dir)
    return files
  }

  /**
   * 監視レポートの生成
   */
  generateReport() {
    const changes = this.analyzeChanges()
    const stats = this.generateStatistics()
    
    const report = {
      timestamp: new Date().toISOString(),
      changes,
      statistics: stats,
      recommendations: this.generateRecommendations(changes, stats)
    }
    
    return report
  }

  /**
   * 推奨事項の生成
   */
  generateRecommendations(changes, stats) {
    const recommendations = []
    
    // 高影響度の変更
    const highImpactChanges = changes.filter(change => change.impactedFiles > 10)
    if (highImpactChanges.length > 0) {
      recommendations.push({
        type: 'HIGH_IMPACT_CHANGES',
        message: `${highImpactChanges.length} files have high impact (>10 affected files)`,
        action: 'Consider reviewing these changes carefully and running full test suite'
      })
    }
    
    // 依存関係の複雑さ
    if (stats.averageDependencies > 5) {
      recommendations.push({
        type: 'HIGH_COMPLEXITY',
        message: `Average dependencies per file: ${stats.averageDependencies.toFixed(1)}`,
        action: 'Consider refactoring to reduce coupling'
      })
    }
    
    // 孤立ファイル
    if (stats.isolatedFiles.length > 0) {
      recommendations.push({
        type: 'ISOLATED_FILES',
        message: `${stats.isolatedFiles.length} files have no dependencies`,
        action: 'Review if these files are still needed'
      })
    }
    
    return recommendations
  }

  /**
   * メイン実行メソッド
   */
  async run() {
    console.log('🚀 Starting dependency monitoring...')
    
    const graphChanged = this.buildDependencyGraph()
    const report = this.generateReport()
    
    if (graphChanged) {
      this.saveCache()
    }
    
    // 結果の表示
    console.log('\n📊 Dependency Monitor Report:')
    console.log('=============================')
    
    console.log(`\n📁 Total files: ${report.statistics.totalFiles}`)
    console.log(`🔗 Total dependencies: ${report.statistics.totalDependencies}`)
    console.log(`📈 Average dependencies: ${report.statistics.averageDependencies.toFixed(1)}`)
    console.log(`🔥 Max dependencies: ${report.statistics.maxDependencies}`)
    
    if (report.changes.length > 0) {
      console.log(`\n🔄 Changes detected: ${report.changes.length}`)
      report.changes.forEach(change => {
        console.log(`  ${change.file}: ${change.impactedFiles} files affected`)
      })
    } else {
      console.log('\n✅ No changes detected since last run')
    }
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:')
      report.recommendations.forEach(rec => {
        console.log(`  🔸 ${rec.type}: ${rec.message}`)
        console.log(`    Action: ${rec.action}`)
      })
    }
    
    // レポートの保存
    const reportPath = path.join(__dirname, '..', 'dependency-monitor-report.json')
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(`\n📄 Report saved to: ${reportPath}`)
  }
}

// スクリプトの実行
const monitor = new DependencyMonitor()
monitor.run().catch(console.error)