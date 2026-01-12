#!/usr/bin/env tsx

/**
 * Phase 4F Production Readiness Check
 * Verifies system configuration and production readiness without requiring database access
 */

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ReadinessCheck {
  category: string;
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'info';
  message: string;
  recommendation?: string;
}

class ProductionReadinessChecker {
  private checks: ReadinessCheck[] = [];
  private webDir: string;
  private rootDir: string;

  constructor() {
    this.webDir = path.resolve(__dirname, '..');
    this.rootDir = path.resolve(this.webDir, '..');
  }

  private addCheck(category: string, name: string, status: ReadinessCheck['status'], message: string, recommendation?: string) {
    this.checks.push({ category, name, status, message, recommendation });
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async readFile(filePath: string): Promise<string | null> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch {
      return null;
    }
  }

  async checkEnvironmentConfiguration(): Promise<void> {
    console.log('🔧 Checking Environment Configuration...');

    // Check for environment files
    const envFiles = [
      { file: '.env', required: false },
      { file: '.env.local', required: false },
      { file: '.env.production', required: true },
      { file: '.env.example', required: true }
    ];

    for (const { file, required } of envFiles) {
      const filePath = path.join(this.webDir, file);
      const exists = await this.fileExists(filePath);

      if (required && !exists) {
        this.addCheck(
          'Environment',
          `${file} file`,
          'fail',
          `Missing required ${file} file`,
          `Create ${file} based on template in docs/templates/environment/`
        );
      } else if (exists) {
        this.addCheck('Environment', `${file} file`, 'pass', `${file} exists`);

        // Check if .env.production has required variables
        if (file === '.env.production') {
          const content = await this.readFile(filePath);
          if (content) {
            const requiredVars = [
              'DATABASE_URL',
              'NEXTAUTH_SECRET',
              'JWT_SECRET',
              'ENCRYPTION_KEY',
              'QB_CLIENT_ID',
              'QB_CLIENT_SECRET',
              'SMTP_HOST',
              'SMTP_USER',
              'SMTP_PASS',
              'EMAIL_FROM'
            ];

            const missingVars = requiredVars.filter(varName => !content.includes(varName));

            if (missingVars.length === 0) {
              this.addCheck('Environment', 'Production variables', 'pass', 'All required production environment variables present');
            } else {
              this.addCheck(
                'Environment',
                'Production variables',
                'fail',
                `Missing environment variables: ${missingVars.join(', ')}`,
                'Complete .env.production file with all required variables'
              );
            }
          }
        }
      } else {
        this.addCheck('Environment', `${file} file`, 'warning', `Optional ${file} file not found`);
      }
    }

    // Check NODE_ENV
    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv === 'production') {
      this.addCheck('Environment', 'NODE_ENV', 'pass', 'NODE_ENV set to production');
    } else {
      this.addCheck(
        'Environment',
        'NODE_ENV',
        'warning',
        `NODE_ENV is ${nodeEnv || 'undefined'}, should be 'production' for production deployment`
      );
    }
  }

  async checkDocumentation(): Promise<void> {
    console.log('📚 Checking Documentation...');

    const requiredDocs = [
      'docs/OPERATIONS.md',
      'docs/USER-GUIDE.md',
      'docs/ADMIN-GUIDE.md',
      'docs/API-REFERENCE.md',
      'docs/TROUBLESHOOTING-GUIDE.md'
    ];

    for (const docPath of requiredDocs) {
      const fullPath = path.join(this.rootDir, docPath);
      const exists = await this.fileExists(fullPath);

      if (exists) {
        const content = await this.readFile(fullPath);
        const wordCount = content ? content.split(/\s+/).length : 0;
        this.addCheck(
          'Documentation',
          path.basename(docPath),
          'pass',
          `Documentation exists (${Math.round(wordCount / 250)} pages estimated)`
        );
      } else {
        this.addCheck(
          'Documentation',
          path.basename(docPath),
          'fail',
          'Required documentation missing',
          `Create ${docPath} based on Phase 4E documentation plan`
        );
      }
    }

    // Check supporting documentation structure
    const supportDirs = [
      'docs/screenshots',
      'docs/templates',
      'docs/workflows'
    ];

    for (const dirPath of supportDirs) {
      const fullPath = path.join(this.rootDir, dirPath);
      const exists = await this.fileExists(fullPath);

      if (exists) {
        this.addCheck('Documentation', `${path.basename(dirPath)} directory`, 'pass', 'Support directory exists');
      } else {
        this.addCheck(
          'Documentation',
          `${path.basename(dirPath)} directory`,
          'warning',
          'Support directory missing',
          `Create ${dirPath} for enhanced documentation organization`
        );
      }
    }
  }

  async checkDatabaseConfiguration(): Promise<void> {
    console.log('🗄️  Checking Database Configuration...');

    // Check Prisma configuration
    const schemaPath = path.join(this.webDir, 'prisma', 'schema.prisma');
    const schemaExists = await this.fileExists(schemaPath);

    if (schemaExists) {
      this.addCheck('Database', 'Prisma schema', 'pass', 'Database schema file exists');

      const schema = await this.readFile(schemaPath);
      if (schema?.includes('provider = "postgresql"')) {
        this.addCheck('Database', 'Database provider', 'pass', 'PostgreSQL provider configured');
      } else {
        this.addCheck('Database', 'Database provider', 'warning', 'Database provider configuration should be verified');
      }
    } else {
      this.addCheck('Database', 'Prisma schema', 'fail', 'Database schema file missing');
    }

    // Check for DATABASE_URL
    if (process.env.DATABASE_URL) {
      this.addCheck('Database', 'Connection string', 'pass', 'DATABASE_URL environment variable set');
    } else {
      this.addCheck(
        'Database',
        'Connection string',
        'fail',
        'DATABASE_URL environment variable not set',
        'Set DATABASE_URL in .env.production file'
      );
    }

    // Check database optimization files
    const dbOptPath = path.join(this.webDir, 'src', 'lib', 'performance', 'database-optimization.ts');
    const dbOptExists = await this.fileExists(dbOptPath);

    if (dbOptExists) {
      this.addCheck('Database', 'Optimization tools', 'pass', 'Database optimization tools available');
    } else {
      this.addCheck('Database', 'Optimization tools', 'warning', 'Database optimization tools not found');
    }
  }

  async checkApplicationStructure(): Promise<void> {
    console.log('🏗️  Checking Application Structure...');

    // Check critical application files
    const criticalFiles = [
      'src/lib/db.ts',
      'src/lib/auth/permissions.ts',
      'src/app/api/health/route.ts',
      'package.json',
      'tailwind.config.js'
    ];

    for (const filePath of criticalFiles) {
      const fullPath = path.join(this.webDir, filePath);
      const exists = await this.fileExists(fullPath);

      if (exists) {
        this.addCheck('Application', path.basename(filePath), 'pass', `${filePath} exists`);
      } else {
        this.addCheck(
          'Application',
          path.basename(filePath),
          'fail',
          `Critical file ${filePath} missing`,
          `Create or restore ${filePath}`
        );
      }
    }

    // Check for Next.js config (either .js or .ts)
    const nextConfigJs = path.join(this.webDir, 'next.config.js');
    const nextConfigTs = path.join(this.webDir, 'next.config.ts');

    const nextConfigJsExists = await this.fileExists(nextConfigJs);
    const nextConfigTsExists = await this.fileExists(nextConfigTs);

    if (nextConfigJsExists || nextConfigTsExists) {
      const configType = nextConfigJsExists ? 'next.config.js' : 'next.config.ts';
      this.addCheck('Application', 'Next.js config', 'pass', `${configType} exists`);
    } else {
      this.addCheck(
        'Application',
        'Next.js config',
        'fail',
        'Next.js configuration missing',
        'Create next.config.js or next.config.ts'
      );
    }

    // Check for TypeScript configuration
    const tsconfigPath = path.join(this.webDir, 'tsconfig.json');
    const tsconfigExists = await this.fileExists(tsconfigPath);

    if (tsconfigExists) {
      this.addCheck('Application', 'TypeScript config', 'pass', 'TypeScript configuration exists');
    } else {
      this.addCheck('Application', 'TypeScript config', 'fail', 'TypeScript configuration missing');
    }
  }

  async checkBuildAndDependencies(): Promise<void> {
    console.log('📦 Checking Build and Dependencies...');

    // Check package.json and dependencies
    const packagePath = path.join(this.webDir, 'package.json');
    const packageExists = await this.fileExists(packagePath);

    if (packageExists) {
      const packageContent = await this.readFile(packagePath);
      if (packageContent) {
        const packageJson = JSON.parse(packageContent);

        // Check for required dependencies
        const requiredDeps = [
          '@prisma/client',
          '@prisma/adapter-pg',
          'next',
          'react',
          'pg',
          'bcrypt',
          'next-auth'
        ];

        const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies?.[dep]);

        if (missingDeps.length === 0) {
          this.addCheck('Build', 'Required dependencies', 'pass', 'All required dependencies present');
        } else {
          this.addCheck(
            'Build',
            'Required dependencies',
            'fail',
            `Missing dependencies: ${missingDeps.join(', ')}`,
            'Run npm install to install missing dependencies'
          );
        }

        // Check for build scripts
        const requiredScripts = ['build', 'start', 'dev'];
        const missingScripts = requiredScripts.filter(script => !packageJson.scripts?.[script]);

        if (missingScripts.length === 0) {
          this.addCheck('Build', 'Build scripts', 'pass', 'All required build scripts present');
        } else {
          this.addCheck('Build', 'Build scripts', 'fail', `Missing scripts: ${missingScripts.join(', ')}`);
        }
      }
    }

    // Check node_modules exists
    const nodeModulesPath = path.join(this.webDir, 'node_modules');
    const nodeModulesExists = await this.fileExists(nodeModulesPath);

    if (nodeModulesExists) {
      this.addCheck('Build', 'Node modules', 'pass', 'Dependencies installed');
    } else {
      this.addCheck(
        'Build',
        'Node modules',
        'fail',
        'Dependencies not installed',
        'Run npm install to install dependencies'
      );
    }
  }

  async checkSecurityConfiguration(): Promise<void> {
    console.log('🔒 Checking Security Configuration...');

    // Check for security-related files
    const securityFiles = [
      'src/middleware.ts',
      'src/lib/auth'
    ];

    for (const filePath of securityFiles) {
      const fullPath = path.join(this.webDir, filePath);
      const exists = await this.fileExists(fullPath);

      if (exists) {
        this.addCheck('Security', path.basename(filePath), 'pass', `Security component ${filePath} exists`);
      } else {
        this.addCheck('Security', path.basename(filePath), 'warning', `Security component ${filePath} not found`);
      }
    }

    // Check for sensitive files that should be excluded
    const sensitiveFiles = [
      '.env',
      '.env.local',
      '.env.production'
    ];

    for (const filePath of sensitiveFiles) {
      const fullPath = path.join(this.webDir, filePath);
      const exists = await this.fileExists(fullPath);

      if (exists) {
        this.addCheck(
          'Security',
          `${filePath} exclusion`,
          'info',
          `${filePath} exists - ensure it's not in version control`,
          `Verify ${filePath} is in .gitignore`
        );
      }
    }
  }

  async checkDeploymentReadiness(): Promise<void> {
    console.log('🚀 Checking Deployment Readiness...');

    // Check for deployment configuration files
    const deploymentFiles = [
      'Dockerfile',
      'docker-compose.yml',
      '.dockerignore',
      'vercel.json',
      'render.yaml'
    ];

    let foundDeploymentConfig = false;

    for (const filePath of deploymentFiles) {
      const fullPath = path.join(this.rootDir, filePath);
      const exists = await this.fileExists(fullPath);

      if (exists) {
        this.addCheck('Deployment', path.basename(filePath), 'pass', `Deployment config ${filePath} exists`);
        foundDeploymentConfig = true;
      }
    }

    if (!foundDeploymentConfig) {
      this.addCheck(
        'Deployment',
        'Deployment configuration',
        'warning',
        'No deployment configuration files found',
        'Create Docker or platform-specific deployment configuration'
      );
    }

    // Check for .gitignore
    const gitignorePath = path.join(this.webDir, '.gitignore');
    const gitignoreExists = await this.fileExists(gitignorePath);

    if (gitignoreExists) {
      const gitignore = await this.readFile(gitignorePath);
      const requiredIgnores = ['.env', 'node_modules', '.next', 'dist'];
      const missingIgnores = requiredIgnores.filter(pattern => !gitignore?.includes(pattern));

      if (missingIgnores.length === 0) {
        this.addCheck('Deployment', '.gitignore', 'pass', 'All required patterns in .gitignore');
      } else {
        this.addCheck(
          'Deployment',
          '.gitignore',
          'warning',
          `Missing .gitignore patterns: ${missingIgnores.join(', ')}`
        );
      }
    } else {
      this.addCheck('Deployment', '.gitignore', 'fail', '.gitignore file missing');
    }
  }

  generateSummaryReport(): void {
    const categories = [...new Set(this.checks.map(check => check.category))];
    const statusCounts = {
      pass: this.checks.filter(c => c.status === 'pass').length,
      fail: this.checks.filter(c => c.status === 'fail').length,
      warning: this.checks.filter(c => c.status === 'warning').length,
      info: this.checks.filter(c => c.status === 'info').length
    };

    console.log('\n' + '='.repeat(60));
    console.log('📊 PHASE 4F PRODUCTION READINESS REPORT');
    console.log('='.repeat(60));

    console.log(`\n📈 SUMMARY:`);
    console.log(`   ✅ Pass: ${statusCounts.pass}`);
    console.log(`   ❌ Fail: ${statusCounts.fail}`);
    console.log(`   ⚠️  Warning: ${statusCounts.warning}`);
    console.log(`   ℹ️  Info: ${statusCounts.info}`);
    console.log(`   📊 Total: ${this.checks.length} checks`);

    for (const category of categories) {
      const categoryChecks = this.checks.filter(check => check.category === category);
      const categoryPass = categoryChecks.filter(c => c.status === 'pass').length;
      const categoryTotal = categoryChecks.length;

      console.log(`\n📂 ${category.toUpperCase()} (${categoryPass}/${categoryTotal} passed):`);

      for (const check of categoryChecks) {
        const icon = {
          pass: '✅',
          fail: '❌',
          warning: '⚠️',
          info: 'ℹ️'
        }[check.status];

        console.log(`   ${icon} ${check.name}: ${check.message}`);

        if (check.recommendation) {
          console.log(`      💡 ${check.recommendation}`);
        }
      }
    }

    // Generate overall readiness assessment
    const criticalFailures = this.checks.filter(c => c.status === 'fail').length;
    const warnings = this.checks.filter(c => c.status === 'warning').length;

    console.log('\n' + '='.repeat(60));
    console.log('🎯 PRODUCTION READINESS ASSESSMENT:');

    if (criticalFailures === 0 && warnings === 0) {
      console.log('   🎉 READY FOR PRODUCTION - All checks passed!');
    } else if (criticalFailures === 0) {
      console.log(`   ⚠️  MOSTLY READY - ${warnings} warnings to address`);
    } else {
      console.log(`   ❌ NOT READY - ${criticalFailures} critical issues must be resolved`);
    }

    console.log('\n📋 NEXT STEPS:');
    const failedChecks = this.checks.filter(c => c.status === 'fail' && c.recommendation);
    if (failedChecks.length > 0) {
      console.log('   Priority actions required:');
      failedChecks.forEach((check, index) => {
        console.log(`   ${index + 1}. ${check.recommendation}`);
      });
    }

    const warningChecks = this.checks.filter(c => c.status === 'warning' && c.recommendation);
    if (warningChecks.length > 0) {
      console.log('\n   Recommended improvements:');
      warningChecks.forEach((check, index) => {
        console.log(`   ${index + 1}. ${check.recommendation}`);
      });
    }

    console.log('\n' + '='.repeat(60));
  }

  async runAllChecks(): Promise<void> {
    console.log('🚀 Phase 4F Production Readiness Check Starting...\n');

    await this.checkEnvironmentConfiguration();
    await this.checkDocumentation();
    await this.checkDatabaseConfiguration();
    await this.checkApplicationStructure();
    await this.checkBuildAndDependencies();
    await this.checkSecurityConfiguration();
    await this.checkDeploymentReadiness();

    this.generateSummaryReport();
  }
}

async function main() {
  const checker = new ProductionReadinessChecker();
  try {
    await checker.runAllChecks();
  } catch (error) {
    console.error('❌ Error running production readiness checks:', error);
    process.exit(1);
  }
}

// Run checks if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}