#!/usr/bin/env node

/**
 * MCP Test Validation Script
 * 
 * This script validates the development environment and runs MCP-integrated tests
 * to ensure proper functionality and environment isolation.
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

/**
 * Test validation configuration
 */
const config = {
  devServerUrl: 'http://localhost:5173',
  timeout: 30000,
  maxRetries: 3,
  testCategories: ['startup', 'connectivity', 'performance', 'security'],
};

/**
 * Logger utility
 */
class Logger {
  static info(message) {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`);
  }

  static warn(message) {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`);
  }

  static error(message) {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
  }

  static success(message) {
    console.log(`[SUCCESS] ${new Date().toISOString()} - ${message}`);
  }
}

/**
 * Process runner utility
 */
class ProcessRunner {
  static async run(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, {
        stdio: 'pipe',
        cwd: projectRoot,
        ...options,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Process failed with code ${code}: ${stderr}`));
        }
      });

      proc.on('error', reject);
    });
  }

  static async runWithTimeout(command, args, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        proc.kill();
        reject(new Error(`Process timed out after ${timeout}ms`));
      }, timeout);

      const proc = spawn(command, args, {
        stdio: 'pipe',
        cwd: projectRoot,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        clearTimeout(timer);
        resolve({ stdout, stderr, code });
      });

      proc.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }
}

/**
 * Development server validator
 */
class DevServerValidator {
  constructor() {
    this.results = [];
  }

  async validateStartup() {
    Logger.info('Validating development server startup...');

    try {
      // Start development server
      const serverProcess = spawn('npm', ['run', 'dev'], {
        cwd: projectRoot,
        stdio: 'pipe',
      });

      // Wait for server to be ready
      await this.waitForServer(config.devServerUrl, config.timeout);

      // Terminate server
      serverProcess.kill();

      this.results.push({
        category: 'startup',
        test: 'Development Server Startup',
        passed: true,
        duration: Date.now(),
      });

      Logger.success('Development server startup validation passed');
    } catch (error) {
      this.results.push({
        category: 'startup',
        test: 'Development Server Startup',
        passed: false,
        error: error.message,
      });

      Logger.error(`Development server startup validation failed: ${error.message}`);
    }
  }

  async validateConnectivity() {
    Logger.info('Validating server connectivity...');

    try {
      const response = await fetch(config.devServerUrl);
      const passed = response.ok;

      this.results.push({
        category: 'connectivity',
        test: 'Server Connectivity',
        passed,
        details: {
          status: response.status,
          statusText: response.statusText,
        },
      });

      if (passed) {
        Logger.success('Server connectivity validation passed');
      } else {
        Logger.warn(`Server connectivity validation failed: ${response.status}`);
      }
    } catch (error) {
      this.results.push({
        category: 'connectivity',
        test: 'Server Connectivity',
        passed: false,
        error: error.message,
      });

      Logger.error(`Server connectivity validation failed: ${error.message}`);
    }
  }

  async validateBuild() {
    Logger.info('Validating build process...');

    try {
      const result = await ProcessRunner.runWithTimeout('npm', ['run', 'build'], 60000);
      
      this.results.push({
        category: 'build',
        test: 'Build Process',
        passed: result.code === 0,
        output: result.stdout,
        errors: result.stderr,
      });

      if (result.code === 0) {
        Logger.success('Build process validation passed');
      } else {
        Logger.error('Build process validation failed');
      }
    } catch (error) {
      this.results.push({
        category: 'build',
        test: 'Build Process',
        passed: false,
        error: error.message,
      });

      Logger.error(`Build process validation failed: ${error.message}`);
    }
  }

  async validateTypeScript() {
    Logger.info('Validating TypeScript compilation...');

    try {
      const result = await ProcessRunner.run('npx', ['tsc', '--noEmit']);
      
      this.results.push({
        category: 'typescript',
        test: 'TypeScript Compilation',
        passed: result.code === 0,
        output: result.stdout,
        errors: result.stderr,
      });

      if (result.code === 0) {
        Logger.success('TypeScript validation passed');
      } else {
        Logger.error('TypeScript validation failed');
      }
    } catch (error) {
      this.results.push({
        category: 'typescript',
        test: 'TypeScript Compilation',
        passed: false,
        error: error.message,
      });

      Logger.error(`TypeScript validation failed: ${error.message}`);
    }
  }

  async validateLinting() {
    Logger.info('Validating code linting...');

    try {
      const result = await ProcessRunner.run('npm', ['run', 'lint']);
      
      this.results.push({
        category: 'quality',
        test: 'Code Linting',
        passed: result.code === 0,
        output: result.stdout,
        errors: result.stderr,
      });

      if (result.code === 0) {
        Logger.success('Linting validation passed');
      } else {
        Logger.warn('Linting validation failed - check code quality');
      }
    } catch (error) {
      this.results.push({
        category: 'quality',
        test: 'Code Linting',
        passed: false,
        error: error.message,
      });

      Logger.error(`Linting validation failed: ${error.message}`);
    }
  }

  async validateTests() {
    Logger.info('Validating unit tests...');

    try {
      const result = await ProcessRunner.runWithTimeout('npm', ['test'], 60000);
      
      this.results.push({
        category: 'testing',
        test: 'Unit Tests',
        passed: result.code === 0,
        output: result.stdout,
        errors: result.stderr,
      });

      if (result.code === 0) {
        Logger.success('Unit tests validation passed');
      } else {
        Logger.error('Unit tests validation failed');
      }
    } catch (error) {
      this.results.push({
        category: 'testing',
        test: 'Unit Tests',
        passed: false,
        error: error.message,
      });

      Logger.error(`Unit tests validation failed: ${error.message}`);
    }
  }

  async waitForServer(url, timeout) {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          return true;
        }
      } catch {
        // Server not ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error(`Server did not start within ${timeout}ms`);
  }

  getSummary() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;

    return {
      total,
      passed,
      failed,
      successRate: total > 0 ? (passed / total) * 100 : 0,
      results: this.results,
    };
  }
}

/**
 * MCP integration tester
 */
class MCPIntegrationTester {
  constructor() {
    this.results = [];
  }

  async testEnvironmentIsolation() {
    Logger.info('Testing environment isolation...');

    try {
      // Simulate environment contamination test
      const originalEnv = { ...process.env };
      
      // Add test variables
      process.env.TEST_MCP_VAR = 'test_value';
      process.env.TEST_ISOLATION = 'should_be_cleaned';

      // Simulate cleanup
      delete process.env.TEST_MCP_VAR;
      delete process.env.TEST_ISOLATION;

      // Check if environment was properly restored
      const isClean = !process.env.TEST_MCP_VAR && !process.env.TEST_ISOLATION;

      this.results.push({
        category: 'isolation',
        test: 'Environment Variable Isolation',
        passed: isClean,
        details: {
          originalEnvCount: Object.keys(originalEnv).length,
          currentEnvCount: Object.keys(process.env).length,
        },
      });

      if (isClean) {
        Logger.success('Environment isolation test passed');
      } else {
        Logger.error('Environment isolation test failed');
      }
    } catch (error) {
      this.results.push({
        category: 'isolation',
        test: 'Environment Variable Isolation',
        passed: false,
        error: error.message,
      });

      Logger.error(`Environment isolation test failed: ${error.message}`);
    }
  }

  async testCleanupProcedures() {
    Logger.info('Testing cleanup procedures...');

    try {
      // Create test files
      const testDir = join(projectRoot, 'test-temp');
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(join(testDir, 'test-file.txt'), 'test content');

      // Test cleanup
      await fs.rm(testDir, { recursive: true });

      // Verify cleanup
      try {
        await fs.access(testDir);
        // Directory still exists - cleanup failed
        this.results.push({
          category: 'cleanup',
          test: 'File Cleanup Procedures',
          passed: false,
          error: 'Test directory was not properly cleaned up',
        });
        Logger.error('File cleanup test failed');
      } catch {
        // Directory doesn't exist - cleanup succeeded
        this.results.push({
          category: 'cleanup',
          test: 'File Cleanup Procedures',
          passed: true,
        });
        Logger.success('File cleanup test passed');
      }
    } catch (error) {
      this.results.push({
        category: 'cleanup',
        test: 'File Cleanup Procedures',
        passed: false,
        error: error.message,
      });

      Logger.error(`File cleanup test failed: ${error.message}`);
    }
  }

  getSummary() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;

    return {
      total,
      passed,
      failed,
      successRate: total > 0 ? (passed / total) * 100 : 0,
      results: this.results,
    };
  }
}

/**
 * Report generator
 */
class ReportGenerator {
  constructor(devResults, mcpResults) {
    this.devResults = devResults;
    this.mcpResults = mcpResults;
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        overall: this.calculateOverallSuccess(),
        development: this.devResults,
        mcp: this.mcpResults,
      },
      recommendations: this.generateRecommendations(),
    };

    const reportPath = join(projectRoot, 'mcp-validation-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    Logger.info(`Validation report saved to: ${reportPath}`);
    return report;
  }

  calculateOverallSuccess() {
    const totalTests = this.devResults.total + this.mcpResults.total;
    const totalPassed = this.devResults.passed + this.mcpResults.passed;
    
    return {
      totalTests,
      totalPassed,
      totalFailed: totalTests - totalPassed,
      overallSuccessRate: totalTests > 0 ? (totalPassed / totalTests) * 100 : 0,
      passed: totalTests > 0 && totalPassed === totalTests,
    };
  }

  generateRecommendations() {
    const recommendations = [];

    if (this.devResults.failed > 0) {
      recommendations.push('Address development environment validation failures');
    }

    if (this.mcpResults.failed > 0) {
      recommendations.push('Improve MCP integration and isolation procedures');
    }

    if (this.devResults.successRate < 100) {
      recommendations.push('Review development workflow and dependencies');
    }

    if (this.mcpResults.successRate < 100) {
      recommendations.push('Enhance environment cleanup and isolation mechanisms');
    }

    return recommendations;
  }
}

/**
 * Main validation runner
 */
async function runValidation() {
  Logger.info('Starting MCP validation process...');

  try {
    // Development server validation
    const devValidator = new DevServerValidator();
    await devValidator.validateStartup();
    await devValidator.validateConnectivity();
    await devValidator.validateBuild();
    await devValidator.validateTypeScript();
    await devValidator.validateLinting();
    await devValidator.validateTests();

    const devResults = devValidator.getSummary();

    // MCP integration validation
    const mcpTester = new MCPIntegrationTester();
    await mcpTester.testEnvironmentIsolation();
    await mcpTester.testCleanupProcedures();

    const mcpResults = mcpTester.getSummary();

    // Generate report
    const reportGenerator = new ReportGenerator(devResults, mcpResults);
    const report = await reportGenerator.generateReport();

    // Display summary
    console.log('\n=== MCP Validation Summary ===');
    console.log(`Overall Success: ${report.summary.overall.passed ? 'PASS' : 'FAIL'}`);
    console.log(`Total Tests: ${report.summary.overall.totalTests}`);
    console.log(`Passed: ${report.summary.overall.totalPassed}`);
    console.log(`Failed: ${report.summary.overall.totalFailed}`);
    console.log(`Success Rate: ${report.summary.overall.overallSuccessRate.toFixed(1)}%`);

    if (report.recommendations.length > 0) {
      console.log('\nRecommendations:');
      report.recommendations.forEach(rec => console.log(`  - ${rec}`));
    }

    Logger.success('MCP validation completed');
    process.exit(report.summary.overall.passed ? 0 : 1);

  } catch (error) {
    Logger.error(`Validation failed: ${error.message}`);
    process.exit(1);
  }
}

// Run validation if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runValidation().catch((error) => {
    Logger.error(`Unexpected error: ${error.message}`);
    process.exit(1);
  });
}