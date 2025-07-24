#!/usr/bin/env node

/**
 * 依存関係クエリスクリプト - Bazel/Buck式
 * 
 * 使用例:
 * node dependency-query.js rdeps //src/services:auth   # authを使っているファイル一覧
 * node dependency-query.js deps //src/api:files        # filesが依存しているファイル一覧
 * node dependency-query.js impact //src/types:common   # commonの影響範囲（連鎖含む）
 * node dependency-query.js chain //src/services:files  # filesの依存チェーン詳細
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const reportPath = path.join(__dirname, '..', 'dependency', 'dependency-analysis-report.json')

/**
 * 依存関係レポートを読み込み
 */
function loadDependencyReport() {
  if (!fs.existsSync(reportPath)) {
    console.error('❌ Dependency analysis report not found.')
    console.error('Run "npm run deps:analyze" first.')
    process.exit(1)
  }
  
  return JSON.parse(fs.readFileSync(reportPath, 'utf8'))
}

/**
 * ファイルパスを正規化（//src/path:target 形式から実際のパスへ）
 */
function normalizeTarget(target) {
  // //src/services:auth -> services/auth
  if (target.startsWith('//src/')) {
    return target.replace('//src/', '').replace(':', '/')
  }
  
  // src/services/auth -> services/auth
  if (target.startsWith('src/')) {
    return target.replace('src/', '')
  }
  
  return target
}

/**
 * ファイルパスからターゲット表記に変換
 */
function pathToTarget(filePath) {
  // services/auth/AuthService.ts -> //src/services/auth:AuthService
  const parts = filePath.split('/')
  const file = parts.pop().replace('.ts', '')
  const dir = parts.join('/')
  return `//src/${dir}:${file}`
}

/**
 * 逆依存関係検索 (rdeps)
 */
function queryReverseDeps(target, report) {
  const normalized = normalizeTarget(target)
  const reverseDeps = report.reverseDependencies
  
  console.log(`🔍 Files that depend on "${target}":`)
  console.log('=' .repeat(50))
  
  const matches = []
  
  for (const [file, deps] of Object.entries(reverseDeps)) {
    if (file.includes(normalized) || file.endsWith(normalized + '.ts')) {
      matches.push({file, dependents: deps})
    }
  }
  
  if (matches.length === 0) {
    console.log('No files found matching the target.')
    return
  }
  
  for (const match of matches) {
    console.log(`\n📁 ${match.file}`)
    if (match.dependents.length === 0) {
      console.log('  └── No files depend on this')
    } else {
      match.dependents.forEach((dep, i) => {
        const isLast = i === match.dependents.length - 1
        console.log(`  ${isLast ? '└──' : '├──'} ${dep}`)
      })
    }
  }
  
  console.log(`\n📊 Total: ${matches.reduce((sum, m) => sum + m.dependents.length, 0)} dependencies found`)
}

/**
 * 直接依存関係検索 (deps)
 */
function queryDeps(target, report) {
  const normalized = normalizeTarget(target)
  
  console.log(`🔍 Dependencies of "${target}":`)
  console.log('=' .repeat(50))
  
  const matches = []
  
  // connectionCountsから直接依存を探す
  for (const [file, count] of Object.entries(report.connectionCounts)) {
    if (file.includes(normalized) || file.endsWith(normalized + '.ts')) {
      matches.push({file, count})
    }
  }
  
  if (matches.length === 0) {
    console.log('No files found matching the target.')
    return
  }
  
  for (const match of matches) {
    console.log(`\n📁 ${match.file}`)
    console.log(`  └── Has ${match.count} direct dependencies`)
    
    // 詳細な依存関係情報があれば表示
    // Note: 現在のレポートには個別の依存先リストが含まれていないため、
    // 将来的にはここで詳細な依存先を表示する
  }
}

/**
 * 影響範囲分析 (impact)
 */
function queryImpact(target, report) {
  const normalized = normalizeTarget(target)
  
  console.log(`🔍 Impact analysis for "${target}":`)
  console.log('=' .repeat(50))
  
  const impactData = report.impactAnalysis
  const matches = []
  
  for (const [file, impact] of Object.entries(impactData)) {
    if (file.includes(normalized) || file.endsWith(normalized + '.ts')) {
      matches.push({file, ...impact})
    }
  }
  
  if (matches.length === 0) {
    console.log('No files found matching the target.')
    return
  }
  
  for (const match of matches) {
    console.log(`\n📁 ${match.file}`)
    console.log(`📊 Direct dependents: ${match.directDependents.length}`)
    console.log(`🌊 Full impact scope: ${match.impactCount} files`)
    
    if (match.directDependents.length > 0) {
      console.log('\n📋 Direct dependents:')
      match.directDependents.slice(0, 10).forEach((dep, i) => {
        const isLast = i === match.directDependents.length - 1 || i === 9
        console.log(`  ${isLast ? '└──' : '├──'} ${dep}`)
      })
      
      if (match.directDependents.length > 10) {
        console.log(`  └── ... and ${match.directDependents.length - 10} more`)
      }
    }
    
    if (match.fullImpactScope.length > 0) {
      console.log('\n🌊 Full impact scope (first 15):')
      match.fullImpactScope.slice(0, 15).forEach((dep, i) => {
        const isLast = i === match.fullImpactScope.length - 1 || i === 14
        console.log(`  ${isLast ? '└──' : '├──'} ${dep}`)
      })
      
      if (match.fullImpactScope.length > 15) {
        console.log(`  └── ... and ${match.fullImpactScope.length - 15} more`)
      }
    }
  }
}

/**
 * 依存チェーン分析 (chain)
 */
function queryChain(target, report) {
  const normalized = normalizeTarget(target)
  
  console.log(`🔍 Dependency chain for "${target}":`)
  console.log('=' .repeat(50))
  
  // 逆依存関係から連鎖を構築
  const reverseDeps = report.reverseDependencies
  const impactData = report.impactAnalysis
  
  const matches = []
  
  for (const [file, deps] of Object.entries(reverseDeps)) {
    if (file.includes(normalized) || file.endsWith(normalized + '.ts')) {
      const impact = impactData[file] || {directDependents: [], fullImpactScope: [], impactCount: 0}
      matches.push({file, directDependents: deps, ...impact})
    }
  }
  
  if (matches.length === 0) {
    console.log('No files found matching the target.')
    return
  }
  
  for (const match of matches) {
    console.log(`\n📁 ${match.file}`)
    
    if (match.directDependents.length === 0) {
      console.log('  └── 🍃 Leaf node (no dependents)')
    } else {
      console.log('  └── 🔗 Dependency chain:')
      
      // 階層的にチェーンを表示
      const visited = new Set()
      const showChain = (file, depth = 0) => {
        if (visited.has(file) || depth > 3) return
        visited.add(file)
        
        const deps = reverseDeps[file] || []
        deps.slice(0, 3).forEach((dep, i) => {
          const isLast = i === deps.length - 1 || i === 2
          const prefix = '  '.repeat(depth + 2) + (isLast ? '└──' : '├──')
          console.log(`${prefix} ${dep}`)
          
          if (depth < 2) {
            showChain(dep, depth + 1)
          }
        })
        
        if (deps.length > 3) {
          const prefix = '  '.repeat(depth + 2) + '└──'
          console.log(`${prefix} ... and ${deps.length - 3} more`)
        }
      }
      
      showChain(match.file)
    }
    
    console.log(`\n  📊 Statistics:`)
    console.log(`     • Direct dependents: ${match.directDependents.length}`)
    console.log(`     • Total impact: ${match.impactCount} files`)
  }
}

/**
 * メイン処理
 */
function main() {
  const args = process.argv.slice(2)
  
  if (args.length < 2) {
    console.log('🔍 Dependency Query Tool')
    console.log('========================')
    console.log('')
    console.log('Usage: node dependency-query.js <command> <target>')
    console.log('')
    console.log('Commands:')
    console.log('  rdeps <target>   - Find files that depend on target (reverse dependencies)')
    console.log('  deps <target>    - Find what target depends on (forward dependencies)')
    console.log('  impact <target>  - Analyze full impact scope with cascading effects')
    console.log('  chain <target>   - Show detailed dependency chain')
    console.log('')
    console.log('Target format:')
    console.log('  //src/services:auth     - Bazel/Buck style')
    console.log('  services/auth           - Directory path style')
    console.log('  AuthService             - File name style')
    console.log('')
    console.log('Examples:')
    console.log('  node dependency-query.js rdeps //src/types:common')
    console.log('  node dependency-query.js impact services/auth')
    console.log('  node dependency-query.js chain FileService')
    process.exit(1)
  }
  
  const [command, target] = args
  const report = loadDependencyReport()
  
  switch (command) {
    case 'rdeps':
      queryReverseDeps(target, report)
      break
    case 'deps':
      queryDeps(target, report)
      break
    case 'impact':
      queryImpact(target, report)
      break
    case 'chain':
      queryChain(target, report)
      break
    default:
      console.error(`❌ Unknown command: ${command}`)
      console.error('Available commands: rdeps, deps, impact, chain')
      process.exit(1)
  }
}

main()