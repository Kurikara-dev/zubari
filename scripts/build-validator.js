#!/usr/bin/env node

/**
 * BUILD設定の検証ツール
 * 
 * BUILD.tsファイルで宣言された依存関係と
 * 実際のimport文を比較して違反を検出
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.join(__dirname, '..', 'src')

/**
 * BUILD設定の読み込み
 */
async function loadBuildConfig(buildPath) {
  try {
    const module = await import(buildPath)
    return module.BUILD_CONFIG
  } catch (error) {
    console.warn(`Warning: Could not load BUILD config from ${buildPath}`)
    return null
  }
}

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
      let absolutePath = path.resolve(path.dirname(filePath), importPath)
      
      // .tsまたは.jsファイルの場合
      if (!absolutePath.endsWith('.ts') && !absolutePath.endsWith('.js')) {
        // index.tsファイルを探す
        const indexPath = path.join(absolutePath, 'index.ts')
        if (fs.existsSync(indexPath)) {
          absolutePath = indexPath
        } else {
          absolutePath += '.ts'
        }
      }
      
      imports.push({
        original: importPath,
        resolved: absolutePath,
        isRelative: true
      })
    } else {
      // 外部ライブラリまたは絶対パス
      imports.push({
        original: importPath,
        resolved: importPath,
        isRelative: false
      })
    }
  }
  
  return imports
}

/**
 * BUILD設定パスを実際のファイルパスに変換
 */
function resolveBuildPath(buildPath, basePath) {
  // //src/types:common -> src/types/common
  const cleanPath = buildPath.replace(/^\/\//, '').replace(/:.*$/, '')
  return path.resolve(basePath, '..', cleanPath)
}

/**
 * 依存関係の検証
 */
function validateDependencies(filePath, buildConfig, actualImports) {
  const violations = []
  const allowedDeps = new Set()
  
  // BUILD設定で許可された依存関係を解決
  if (buildConfig && buildConfig.deps) {
    for (const dep of buildConfig.deps) {
      const resolvedPath = resolveBuildPath(dep, srcDir)
      allowedDeps.add(resolvedPath)
      
      // ディレクトリの場合、その中のすべてのファイルを許可
      if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
        const files = fs.readdirSync(resolvedPath, { recursive: true })
        files.forEach(file => {
          if (file.endsWith('.ts')) {
            allowedDeps.add(path.join(resolvedPath, file))
          }
        })
      }
    }
  }
  
  // 実際のimportと比較
  for (const imp of actualImports) {
    if (imp.isRelative) {
      // 相対パスの場合、BUILD設定で許可されているかチェック
      if (buildConfig && buildConfig.deps) {
        let isAllowed = false
        
        for (const dep of buildConfig.deps) {
          const resolvedDepPath = resolveBuildPath(dep, srcDir)
          if (imp.resolved.startsWith(resolvedDepPath)) {
            isAllowed = true
            break
          }
        }
        
        if (!isAllowed) {
          violations.push({
            type: 'UNDECLARED_DEPENDENCY',
            file: path.relative(srcDir, filePath),
            import: imp.original,
            message: `Import '${imp.original}' is not declared in BUILD deps`
          })
        }
      }
    } else {
      // 外部ライブラリの場合、external_depsで許可されているかチェック
      if (buildConfig && buildConfig.external_deps) {
        if (!buildConfig.external_deps.includes(imp.original)) {
          violations.push({
            type: 'UNDECLARED_EXTERNAL_DEPENDENCY',
            file: path.relative(srcDir, filePath),
            import: imp.original,
            message: `External import '${imp.original}' is not declared in BUILD external_deps`
          })
        }
      }
    }
  }
  
  return violations
}

/**
 * 可視性の検証
 */
function validateVisibility(filePath, buildConfig, importingFile) {
  const violations = []
  
  if (buildConfig && buildConfig.visibility) {
    let isVisible = false
    
    for (const visibilityPattern of buildConfig.visibility) {
      if (visibilityPattern === "//src:__subpackages__") {
        // srcディレクトリ内すべて許可
        if (importingFile.startsWith(srcDir)) {
          isVisible = true
          break
        }
      } else if (visibilityPattern.endsWith(":__pkg__")) {
        // 特定のパッケージ内のみ許可
        const packagePath = visibilityPattern.replace(":__pkg__", "").replace(/^\/\//, "")
        const resolvedPackagePath = path.resolve(srcDir, '..', packagePath)
        if (importingFile.startsWith(resolvedPackagePath)) {
          isVisible = true
          break
        }
      }
    }
    
    if (!isVisible) {
      violations.push({
        type: 'VISIBILITY_VIOLATION',
        file: path.relative(srcDir, importingFile),
        target: path.relative(srcDir, filePath),
        message: `Module '${path.relative(srcDir, filePath)}' is not visible from '${path.relative(srcDir, importingFile)}'`
      })
    }
  }
  
  return violations
}

/**
 * ディレクトリを再帰的に探索
 */
function findFiles(dir, extensions = ['.ts']) {
  const files = []
  
  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        walk(fullPath)
      } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
        if (!entry.name.endsWith('.d.ts')) {
          files.push(fullPath)
        }
      }
    }
  }
  
  walk(dir)
  return files
}

/**
 * メイン処理
 */
async function validateBuildSystem() {
  console.log('🔍 Validating BUILD system...')
  
  // BUILD.tsファイルを探す
  const buildFiles = findFiles(srcDir, ['.ts']).filter(file => file.endsWith('BUILD.ts'))
  const tsFiles = findFiles(srcDir, ['.ts']).filter(file => !file.endsWith('BUILD.ts'))
  
  console.log(`Found ${buildFiles.length} BUILD files`)
  console.log(`Found ${tsFiles.length} TypeScript files`)
  
  const allViolations = []
  
  // 各BUILD設定を読み込み
  const buildConfigs = new Map()
  for (const buildFile of buildFiles) {
    const config = await loadBuildConfig(buildFile)
    if (config) {
      const moduleDir = path.dirname(buildFile)
      buildConfigs.set(moduleDir, config)
    }
  }
  
  // 各TypeScriptファイルを検証
  for (const tsFile of tsFiles) {
    const fileDir = path.dirname(tsFile)
    const buildConfig = buildConfigs.get(fileDir)
    
    if (buildConfig) {
      const imports = extractImports(tsFile)
      const violations = validateDependencies(tsFile, buildConfig, imports)
      allViolations.push(...violations)
    }
  }
  
  // 結果を表示
  console.log('\n📊 BUILD System Validation Results:')
  console.log('===================================')
  
  if (allViolations.length === 0) {
    console.log('✅ All dependencies are properly declared!')
  } else {
    console.log(`❌ Found ${allViolations.length} violations:`)
    
    const groupedViolations = {}
    allViolations.forEach(violation => {
      if (!groupedViolations[violation.type]) {
        groupedViolations[violation.type] = []
      }
      groupedViolations[violation.type].push(violation)
    })
    
    Object.entries(groupedViolations).forEach(([type, violations]) => {
      console.log(`\n🔸 ${type} (${violations.length} violations):`)
      violations.forEach(violation => {
        console.log(`  ${violation.file}: ${violation.message}`)
      })
    })
  }
  
  // 詳細レポートの保存
  const reportPath = path.join(__dirname, '..', 'build-validation-report.json')
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFiles: tsFiles.length,
      buildFiles: buildFiles.length,
      violations: allViolations.length
    },
    violations: allViolations
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`\n📄 Detailed report saved to: ${reportPath}`)
}

// スクリプトの実行
validateBuildSystem().catch(console.error)