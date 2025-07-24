#!/usr/bin/env node

/**
 * 技術負債分析スクリプト
 * 
 * コードの複雑度、保守性、テスト不足などを評価し
 * 技術負債スコアを算出する
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.join(__dirname, '..', 'src')

/**
 * 技術負債の各指標を計算
 */
class TechnicalDebtAnalyzer {
  constructor() {
    this.metrics = {
      complexity: 0,
      maintainability: 0,
      testCoverage: 0,
      documentation: 0,
      dependencies: 0,
      codeSmells: 0
    }
  }

  /**
   * サイクロマティック複雑度の計算
   */
  calculateComplexity(content) {
    const complexityKeywords = [
      'if', 'else', 'while', 'for', 'switch', 'case', 'catch', 'try', 'return'
    ]
    
    let complexity = 1 // 基本複雑度
    
    for (const keyword of complexityKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g')
      const matches = content.match(regex)
      if (matches) {
        complexity += matches.length
      }
    }
    
    // 論理演算子の特別処理
    const logicalOperators = content.match(/&&|\|\|/g) || []
    complexity += logicalOperators.length
    
    // 三項演算子の特別処理
    const ternaryOperators = content.match(/\?/g) || []
    complexity += ternaryOperators.length
    
    return complexity
  }

  /**
   * 保守性指標の計算
   */
  calculateMaintainability(content, filePath) {
    const lines = content.split('\n')
    const nonEmptyLines = lines.filter(line => line.trim() !== '').length
    
    // ファイルサイズ（行数）
    const sizeScore = nonEmptyLines > 500 ? 0 : 
                     nonEmptyLines > 200 ? 50 : 
                     nonEmptyLines > 100 ? 75 : 100
    
    // コメント率
    const commentLines = lines.filter(line => {
      const trimmed = line.trim()
      return trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')
    }).length
    
    const commentRatio = commentLines / nonEmptyLines
    const commentScore = commentRatio > 0.2 ? 100 : 
                        commentRatio > 0.1 ? 75 : 
                        commentRatio > 0.05 ? 50 : 25
    
    // 命名規則の一貫性
    const camelCaseMatches = content.match(/[a-z][A-Z]/g) || []
    const snake_caseMatches = content.match(/[a-z]_[a-z]/g) || []
    const namingScore = snake_caseMatches.length === 0 ? 100 : 
                       camelCaseMatches.length > snake_caseMatches.length ? 75 : 50
    
    return (sizeScore + commentScore + namingScore) / 3
  }

  /**
   * テストカバレッジの推定
   */
  estimateTestCoverage(filePath) {
    const testDir = path.join(path.dirname(filePath), '__tests__')
    const testFile = path.join(testDir, path.basename(filePath, '.ts') + '.test.ts')
    
    if (fs.existsSync(testFile)) {
      const testContent = fs.readFileSync(testFile, 'utf8')
      const testCases = (testContent.match(/\bit\(/g) || []).length +
                       (testContent.match(/\btest\(/g) || []).length
      
      return testCases > 10 ? 100 : 
             testCases > 5 ? 75 : 
             testCases > 2 ? 50 : 25
    }
    
    return 0
  }

  /**
   * ドキュメンテーションスコア
   */
  calculateDocumentation(content) {
    const jsdocMatches = content.match(/\/\*\*[\s\S]*?\*\//g) || []
    const functions = content.match(/(?:function|const\s+\w+\s*=|class\s+\w+)/g) || []
    
    const docRatio = jsdocMatches.length / (functions.length || 1)
    
    return docRatio > 0.8 ? 100 : 
           docRatio > 0.5 ? 75 : 
           docRatio > 0.3 ? 50 : 25
  }

  /**
   * 依存関係複雑度
   */
  calculateDependencyComplexity(content) {
    const imports = content.match(/^import\s+.*from\s+['"].*['"]/gm) || []
    const relativeImports = imports.filter(imp => imp.includes('../') || imp.includes('./'))
    
    const importScore = imports.length > 15 ? 25 : 
                       imports.length > 10 ? 50 : 
                       imports.length > 5 ? 75 : 100
    
    const relativeScore = relativeImports.length > 10 ? 25 : 
                         relativeImports.length > 5 ? 50 : 
                         relativeImports.length > 2 ? 75 : 100
    
    return (importScore + relativeScore) / 2
  }

  /**
   * コードスメルの検出
   */
  detectCodeSmells(content) {
    const smells = []
    
    // 長すぎるメソッド
    const functions = content.match(/function\s+\w+\s*\([^)]*\)\s*{[^}]*}/g) || []
    const longFunctions = functions.filter(fn => fn.split('\n').length > 50)
    if (longFunctions.length > 0) {
      smells.push(`Long methods: ${longFunctions.length}`)
    }
    
    // 重複コード
    const lines = content.split('\n')
    const duplicates = new Map()
    lines.forEach(line => {
      const trimmed = line.trim()
      if (trimmed.length > 20) {
        duplicates.set(trimmed, (duplicates.get(trimmed) || 0) + 1)
      }
    })
    
    const duplicateLines = Array.from(duplicates.values()).filter(count => count > 1).length
    if (duplicateLines > 0) {
      smells.push(`Duplicate lines: ${duplicateLines}`)
    }
    
    // マジックナンバー
    const magicNumbers = content.match(/\b\d{2,}\b/g) || []
    if (magicNumbers.length > 5) {
      smells.push(`Magic numbers: ${magicNumbers.length}`)
    }
    
    // 過度にネストしたコード
    const deepNesting = content.match(/\s{20,}/g) || []
    if (deepNesting.length > 10) {
      smells.push(`Deep nesting: ${deepNesting.length}`)
    }
    
    return smells
  }

  /**
   * ファイル単位での技術負債分析
   */
  analyzeFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8')
    
    const complexity = this.calculateComplexity(content)
    const maintainability = this.calculateMaintainability(content, filePath)
    const testCoverage = this.estimateTestCoverage(filePath)
    const documentation = this.calculateDocumentation(content)
    const dependencyComplexity = this.calculateDependencyComplexity(content)
    const codeSmells = this.detectCodeSmells(content)
    
    const complexityScore = complexity < 5 ? 100 : 
                           complexity < 10 ? 75 : 
                           complexity < 20 ? 50 : 25
    
    const codeSmellScore = codeSmells.length === 0 ? 100 : 
                          codeSmells.length < 3 ? 75 : 
                          codeSmells.length < 5 ? 50 : 25
    
    const totalScore = (
      complexityScore * 0.2 +
      maintainability * 0.25 +
      testCoverage * 0.2 +
      documentation * 0.15 +
      dependencyComplexity * 0.1 +
      codeSmellScore * 0.1
    )
    
    return {
      file: path.relative(srcDir, filePath),
      metrics: {
        complexity,
        complexityScore,
        maintainability: Math.round(maintainability),
        testCoverage,
        documentation: Math.round(documentation),
        dependencyComplexity: Math.round(dependencyComplexity),
        codeSmells: codeSmells.length,
        codeSmellScore: Math.round(codeSmellScore)
      },
      totalScore: Math.round(totalScore),
      issues: codeSmells,
      priority: totalScore < 40 ? 'high' : 
               totalScore < 60 ? 'medium' : 'low'
    }
  }
}

/**
 * ディレクトリを再帰的に探索
 */
function findTsFiles(dir) {
  const files = []
  
  function walk(currentDir) {
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
 * メイン処理
 */
async function analyzeTechnicalDebt() {
  console.log('⚠️  Analyzing technical debt...')
  
  const analyzer = new TechnicalDebtAnalyzer()
  const tsFiles = findTsFiles(srcDir)
  
  console.log(`Found ${tsFiles.length} TypeScript files`)
  
  const results = tsFiles.map(file => analyzer.analyzeFile(file))
  
  // 結果の集計
  const avgScore = results.reduce((sum, r) => sum + r.totalScore, 0) / results.length
  const highPriorityIssues = results.filter(r => r.priority === 'high')
  const mediumPriorityIssues = results.filter(r => r.priority === 'medium')
  
  console.log('\n📊 Technical Debt Analysis:')
  console.log('==========================')
  
  console.log(`\n🎯 Overall Score: ${Math.round(avgScore)}/100`)
  console.log(`📁 Total files analyzed: ${results.length}`)
  console.log(`🔴 High priority issues: ${highPriorityIssues.length}`)
  console.log(`🟡 Medium priority issues: ${mediumPriorityIssues.length}`)
  console.log(`🟢 Low priority issues: ${results.length - highPriorityIssues.length - mediumPriorityIssues.length}`)
  
  if (highPriorityIssues.length > 0) {
    console.log('\n🔥 High Priority Issues:')
    highPriorityIssues.slice(0, 10).forEach(issue => {
      console.log(`  ${issue.file}: ${issue.totalScore}/100`)
      if (issue.issues.length > 0) {
        console.log(`    Issues: ${issue.issues.join(', ')}`)
      }
    })
  }
  
  console.log('\n📈 Worst Files (by score):')
  results.sort((a, b) => a.totalScore - b.totalScore)
    .slice(0, 10)
    .forEach(result => {
      console.log(`  ${result.file}: ${result.totalScore}/100`)
    })
  
  console.log('\n🏆 Best Files (by score):')
  results.sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 10)
    .forEach(result => {
      console.log(`  ${result.file}: ${result.totalScore}/100`)
    })
  
  // 詳細レポートの保存
  const reportPath = path.join(__dirname, '..', 'technical-debt-report.json')
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      overallScore: Math.round(avgScore),
      totalFiles: results.length,
      highPriorityIssues: highPriorityIssues.length,
      mediumPriorityIssues: mediumPriorityIssues.length,
      lowPriorityIssues: results.length - highPriorityIssues.length - mediumPriorityIssues.length
    },
    files: results,
    recommendations: generateRecommendations(results)
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`\n📄 Detailed report saved to: ${reportPath}`)
}

/**
 * 改善提案の生成
 */
function generateRecommendations(results) {
  const recommendations = []
  
  const avgComplexity = results.reduce((sum, r) => sum + r.metrics.complexity, 0) / results.length
  if (avgComplexity > 10) {
    recommendations.push('Consider refactoring complex functions into smaller, more focused methods')
  }
  
  const avgTestCoverage = results.reduce((sum, r) => sum + r.metrics.testCoverage, 0) / results.length
  if (avgTestCoverage < 60) {
    recommendations.push('Increase test coverage - aim for at least 80% coverage')
  }
  
  const avgDocumentation = results.reduce((sum, r) => sum + r.metrics.documentation, 0) / results.length
  if (avgDocumentation < 50) {
    recommendations.push('Add more JSDoc comments to improve code documentation')
  }
  
  const filesWithCodeSmells = results.filter(r => r.metrics.codeSmells > 0).length
  if (filesWithCodeSmells > results.length * 0.3) {
    recommendations.push('Address code smells - focus on reducing duplication and magic numbers')
  }
  
  return recommendations
}

// スクリプトの実行
analyzeTechnicalDebt().catch(console.error)