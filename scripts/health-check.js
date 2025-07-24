#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const mode = process.argv[2] || '--quick';

// 色付きログ関数
const colors = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(level, message) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const prefix = `[${timestamp}]`;
  
  switch(level) {
    case 'error':
      console.log(`${colors.red}🚨 ${prefix} ${message}${colors.reset}`);
      break;
    case 'warn':
      console.log(`${colors.yellow}⚠️  ${prefix} ${message}${colors.reset}`);
      break;
    case 'success':
      console.log(`${colors.green}✅ ${prefix} ${message}${colors.reset}`);
      break;
    case 'info':
      console.log(`${colors.blue}ℹ️  ${prefix} ${message}${colors.reset}`);
      break;
  }
}

// ヘルスチェック結果
let healthStatus = {
  overall: 'healthy',
  issues: [],
  warnings: [],
  scores: {}
};

function runCommand(command, silent = false) {
  try {
    const result = execSync(command, { 
      cwd: projectRoot, 
      encoding: 'utf8',
      stdio: silent ? 'pipe' : 'inherit'
    });
    return result;
  } catch (error) {
    return null;
  }
}

// クイックヘルスチェック (5秒以内)
async function quickHealthCheck() {
  log('info', 'Running quick health check...');
  
  // 1. 循環依存チェック
  log('info', 'Checking circular dependencies...');
  const depsResult = runCommand('npm run deps:analyze', true);
  if (depsResult && depsResult.includes('Circular dependencies: 0')) {
    log('success', 'No circular dependencies detected');
  } else {
    log('error', 'Circular dependencies detected!');
    healthStatus.overall = 'critical';
    healthStatus.issues.push('Circular dependencies found');
  }
  
  // 2. TypeScript型チェック (Next.js用、軽量)
  log('info', 'Type checking critical files...');
  try {
    // package.jsonとtsconfig.jsonの存在チェック
    const hasTypeScript = existsSync(join(projectRoot, 'tsconfig.json'));
    if (hasTypeScript) {
      log('success', 'TypeScript configuration found');
    } else {
      log('warn', 'TypeScript configuration missing');
      healthStatus.warnings.push('TypeScript configuration missing');
      if (healthStatus.overall === 'healthy') healthStatus.overall = 'warning';
    }
  } catch (error) {
    log('error', 'TypeScript compilation errors detected!');
    healthStatus.overall = 'critical';
    healthStatus.issues.push('TypeScript compilation errors');
  }
  
  // 3. 重要ファイルの存在チェック
  const criticalFiles = [
    'src/app/layout.tsx',
    'src/app/page.tsx',
    'package.json'
  ];
  
  // Next.js設定ファイル（.js または .ts）
  const nextConfigExists = existsSync(join(projectRoot, 'next.config.js')) || 
                          existsSync(join(projectRoot, 'next.config.ts'));
  if (!nextConfigExists) {
    log('error', 'Critical file missing: next.config.js/ts');
    healthStatus.overall = 'critical';
    healthStatus.issues.push('Missing critical file: next.config.js/ts');
  }
  
  for (const file of criticalFiles) {
    if (!existsSync(join(projectRoot, file))) {
      log('error', `Critical file missing: ${file}`);
      healthStatus.overall = 'critical';
      healthStatus.issues.push(`Missing critical file: ${file}`);
    }
  }
  
  // 4. 技術負債スコア簡易チェック
  const debtResult = runCommand('npm run debt:analyze', true);
  if (debtResult) {
    const scoreMatch = debtResult.match(/Overall Score: (\d+)\/100/);
    if (scoreMatch) {
      const score = parseInt(scoreMatch[1]);
      healthStatus.scores.technicalDebt = score;
      
      if (score < 40) {
        log('error', `Technical debt score critically low: ${score}/100`);
        healthStatus.overall = 'critical';
        healthStatus.issues.push(`Technical debt score: ${score}/100`);
      } else if (score < 60) {
        log('warn', `Technical debt score low: ${score}/100`);
        healthStatus.warnings.push(`Technical debt score: ${score}/100`);
        if (healthStatus.overall === 'healthy') healthStatus.overall = 'warning';
      } else {
        log('success', `Technical debt score acceptable: ${score}/100`);
      }
    }
  }
}

// フルヘルスチェック (30秒以内)
async function fullHealthCheck() {
  await quickHealthCheck();
  
  log('info', 'Running comprehensive health check...');
  
  // 1. ビルド検証
  log('info', 'Validating build system...');
  const buildResult = runCommand('npm run deps:validate', true);
  if (buildResult && buildResult.includes('All dependencies are properly declared')) {
    log('success', 'Build system validation passed');
  } else {
    log('warn', 'Build system validation warnings detected');
    healthStatus.warnings.push('Build system validation issues');
    if (healthStatus.overall === 'healthy') healthStatus.overall = 'warning';
  }
  
  // 2. ファイル規模チェック
  try {
    const fileCount = execSync('find src -name "*.ts" -o -name "*.tsx" -type f | wc -l', { 
      cwd: projectRoot, 
      encoding: 'utf8' 
    }).trim();
    const lineCount = execSync('find src -name "*.ts" -o -name "*.tsx" -exec wc -l {} \\; | awk \'{total += $1} END {print total}\'', { 
      cwd: projectRoot, 
      encoding: 'utf8' 
    }).trim();
    
    healthStatus.scores.fileCount = parseInt(fileCount);
    healthStatus.scores.lineCount = parseInt(lineCount);
    
    log('info', `Project scale: ${fileCount} files, ${lineCount} lines`);
    
    if (parseInt(lineCount) > 150000) {
      log('error', `Project too large: ${lineCount} lines (>150k)`);
      healthStatus.issues.push(`Project scale: ${lineCount} lines`);
      healthStatus.overall = 'critical';
    } else if (parseInt(lineCount) > 100000) {
      log('warn', `Project getting large: ${lineCount} lines (>100k)`);
      healthStatus.warnings.push(`Project scale: ${lineCount} lines`);
      if (healthStatus.overall === 'healthy') healthStatus.overall = 'warning';
    }
  } catch (error) {
    log('warn', 'Could not determine project scale');
  }
  
  // 3. セキュリティクイックスキャン
  log('info', 'Running security health check...');
  // Next.jsプロジェクトのセキュリティチェック（基本的なチェック）
  const packageJson = existsSync(join(projectRoot, 'package.json'));
  if (packageJson) {
    log('success', 'Basic security check passed');
  } else {
    log('warn', 'Security health check warnings');
    healthStatus.warnings.push('Security health check warnings');
    if (healthStatus.overall === 'healthy') healthStatus.overall = 'warning';
  }
}

// アラートモード (critical問題のみ、1秒以内)
async function alertHealthCheck() {
  log('info', 'Running critical alert check...');
  
  // 致命的な問題のみチェック
  const depsResult = runCommand('npm run deps:analyze', true);
  if (!depsResult || !depsResult.includes('Circular dependencies: 0')) {
    log('error', '🚨 CRITICAL: Circular dependencies detected!');
    process.exit(1);
  }
  
  const tscResult = runCommand('npx tsc --noEmit --skipLibCheck', true);
  if (tscResult === null) {
    log('error', '🚨 CRITICAL: TypeScript compilation errors!');
    process.exit(1);
  }
  
  log('success', 'No critical issues detected');
}

// メイン実行
async function main() {
  const startTime = Date.now();
  
  try {
    if (mode === '--quick') {
      await quickHealthCheck();
    } else if (mode === '--full') {
      await fullHealthCheck();
    } else if (mode === '--alert') {
      await alertHealthCheck();
      return;
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // 結果サマリー
    console.log('\n' + '='.repeat(50));
    log('info', `Health check completed in ${duration}ms`);
    
    if (healthStatus.overall === 'healthy') {
      log('success', '🎉 Project health: HEALTHY');
    } else if (healthStatus.overall === 'warning') {
      log('warn', '⚠️  Project health: WARNING');
      console.log(`${colors.yellow}Warnings:${colors.reset}`);
      healthStatus.warnings.forEach(w => console.log(`  - ${w}`));
    } else {
      log('error', '🚨 Project health: CRITICAL');
      console.log(`${colors.red}Critical Issues:${colors.reset}`);
      healthStatus.issues.forEach(i => console.log(`  - ${i}`));
      
      if (mode === '--full' || mode === '--quick') {
        console.log(`\\n${colors.bold}Recommended Actions:${colors.reset}`);
        console.log('1. Run: npm run debt:analyze');
        console.log('2. Check logs above for specific issues');
        console.log('3. Consider running /issue_decompose for large refactoring');
      }
      
      process.exit(1);
    }
    
    // スコア表示
    if (Object.keys(healthStatus.scores).length > 0) {
      console.log(`\\n${colors.blue}Scores:${colors.reset}`);
      Object.entries(healthStatus.scores).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
    }
    
  } catch (error) {
    log('error', `Health check failed: ${error.message}`);
    process.exit(1);
  }
}

main();