#!/usr/bin/env tsx

/**
 * Environment Variables Verification Script for Production
 * Generates secure tokens and verifies .env.production configuration
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

interface EnvCheck {
  name: string;
  required: boolean;
  description: string;
  example?: string;
  generateSecure?: () => string;
}

const requiredEnvVars: EnvCheck[] = [
  {
    name: 'DATABASE_URL',
    required: true,
    description: 'PostgreSQL database connection string',
    example: 'postgresql://username:password@hostname:port/database'
  },
  {
    name: 'NEXTAUTH_SECRET',
    required: true,
    description: 'NextAuth.js secret for session encryption (32+ characters)',
    generateSecure: () => crypto.randomBytes(32).toString('hex')
  },
  {
    name: 'JWT_SECRET',
    required: true,
    description: 'JWT secret for API authentication (32+ characters)',
    generateSecure: () => crypto.randomBytes(32).toString('hex')
  },
  {
    name: 'ENCRYPTION_KEY',
    required: true,
    description: 'Application encryption key for sensitive data (32+ characters)',
    generateSecure: () => crypto.randomBytes(32).toString('hex')
  },
  {
    name: 'QB_CLIENT_ID',
    required: true,
    description: 'QuickBooks OAuth 2.0 Client ID from Intuit Developer Dashboard'
  },
  {
    name: 'QB_CLIENT_SECRET',
    required: true,
    description: 'QuickBooks OAuth 2.0 Client Secret from Intuit Developer Dashboard'
  },
  {
    name: 'SMTP_HOST',
    required: true,
    description: 'SMTP server hostname for email notifications',
    example: 'smtp.gmail.com'
  },
  {
    name: 'SMTP_PORT',
    required: false,
    description: 'SMTP server port (usually 587 for TLS)',
    example: '587'
  },
  {
    name: 'SMTP_USER',
    required: true,
    description: 'SMTP username/email for authentication'
  },
  {
    name: 'SMTP_PASS',
    required: true,
    description: 'SMTP password or app-specific password'
  },
  {
    name: 'EMAIL_FROM',
    required: true,
    description: 'From email address for system notifications',
    example: 'noreply@asr-inc.com'
  },
  {
    name: 'NEXTAUTH_URL',
    required: true,
    description: 'Production application URL',
    example: 'https://po.asr-inc.com'
  },
  {
    name: 'NODE_ENV',
    required: true,
    description: 'Environment designation',
    example: 'production'
  },
  {
    name: 'REDIS_URL',
    required: false,
    description: 'Redis connection string for caching',
    example: 'redis://localhost:6379'
  }
];

async function generateSecureTokens(): Promise<void> {
  console.log('🔐 GENERATED SECURE TOKENS FOR .env.production');
  console.log('=' .repeat(60));
  console.log('IMPORTANT: Copy these tokens to your .env.production file');
  console.log('=' .repeat(60));

  for (const envVar of requiredEnvVars) {
    if (envVar.generateSecure) {
      const secureToken = envVar.generateSecure();
      console.log(`${envVar.name}=${secureToken}`);
    }
  }

  console.log('\n' + '=' .repeat(60));
  console.log('⚠️  SECURITY WARNING:');
  console.log('- Store these tokens securely');
  console.log('- Never commit .env.production to version control');
  console.log('- Use different tokens for staging and production');
  console.log('- Rotate tokens periodically for security');
  console.log('=' .repeat(60));
}

async function verifyProductionEnv(): Promise<void> {
  const envPath = path.join(__dirname, '..', '.env.production');

  try {
    const envContent = await fs.readFile(envPath, 'utf-8');

    console.log('📋 ENVIRONMENT VERIFICATION REPORT');
    console.log('=' .repeat(50));

    let allPresent = true;
    let warnings = 0;

    for (const envVar of requiredEnvVars) {
      const regex = new RegExp(`^${envVar.name}=(.+)$`, 'm');
      const match = envContent.match(regex);

      if (match && match[1] && match[1] !== '{{PLACEHOLDER}}') {
        const value = match[1];
        console.log(`✅ ${envVar.name}: Present`);

        // Additional validation for specific variables
        if (envVar.name.includes('SECRET') || envVar.name.includes('KEY')) {
          if (value.length < 32) {
            console.log(`   ⚠️  WARNING: ${envVar.name} should be at least 32 characters`);
            warnings++;
          }
        }

        if (envVar.name === 'DATABASE_URL' && !value.startsWith('postgresql://')) {
          console.log(`   ⚠️  WARNING: DATABASE_URL should start with postgresql://`);
          warnings++;
        }

        if (envVar.name === 'EMAIL_FROM' && !value.includes('@')) {
          console.log(`   ⚠️  WARNING: EMAIL_FROM should be a valid email address`);
          warnings++;
        }

      } else if (envVar.required) {
        console.log(`❌ ${envVar.name}: Missing or placeholder`);
        console.log(`   Description: ${envVar.description}`);
        if (envVar.example) {
          console.log(`   Example: ${envVar.example}`);
        }
        allPresent = false;
      } else {
        console.log(`⚠️  ${envVar.name}: Optional but not set`);
        console.log(`   Description: ${envVar.description}`);
        warnings++;
      }
    }

    console.log('\n' + '=' .repeat(50));
    console.log('🎯 SUMMARY:');

    if (allPresent && warnings === 0) {
      console.log('✅ All required environment variables are properly configured!');
    } else if (allPresent) {
      console.log(`⚠️  All required variables present but ${warnings} warnings to address`);
    } else {
      console.log('❌ Missing required environment variables - production not ready');
    }

    console.log('=' .repeat(50));

  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log('❌ .env.production file not found');
      console.log('💡 Create .env.production based on template in docs/templates/environment/');
    } else {
      console.log('❌ Error reading .env.production:', error.message);
    }
  }
}

async function createProductionEnvTemplate(): Promise<void> {
  const templatePath = path.join(__dirname, '..', '.env.production.template');

  let template = `# ASR Purchase Order System - Production Environment Configuration
# Generated: ${new Date().toISOString()}
#
# INSTRUCTIONS:
# 1. Copy this file to .env.production
# 2. Replace all placeholder values with actual production values
# 3. Never commit .env.production to version control

# ============================================================================
# ENVIRONMENT
# ============================================================================
NODE_ENV=production

# ============================================================================
# DATABASE
# ============================================================================
DATABASE_URL={{YOUR_POSTGRESQL_CONNECTION_STRING}}

# ============================================================================
# APPLICATION SECRETS
# ============================================================================
`;

  // Add generated secure tokens
  for (const envVar of requiredEnvVars) {
    if (envVar.generateSecure) {
      template += `${envVar.name}=${envVar.generateSecure()}\n`;
    } else if (envVar.required && !envVar.example) {
      template += `${envVar.name}={{${envVar.name}}}\n`;
    } else if (envVar.example) {
      template += `${envVar.name}=${envVar.example}\n`;
    }
  }

  template += `
# ============================================================================
# QUICKBOOKS INTEGRATION
# ============================================================================
# Get these from: https://developer.intuit.com
QB_CLIENT_ID={{YOUR_QB_CLIENT_ID}}
QB_CLIENT_SECRET={{YOUR_QB_CLIENT_SECRET}}
QB_ENVIRONMENT=production
QB_BASE_URL=https://api.intuit.com
QB_REDIRECT_URI={{PRODUCTION_APP_URL}}/api/quickbooks/callback

# ============================================================================
# EMAIL CONFIGURATION
# ============================================================================
SMTP_HOST={{YOUR_SMTP_HOST}}
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER={{YOUR_SMTP_USERNAME}}
SMTP_PASS={{YOUR_SMTP_PASSWORD}}
EMAIL_FROM={{YOUR_FROM_EMAIL}}
EMAIL_FROM_NAME=ASR Purchase Order System

# ============================================================================
# APPLICATION CONFIGURATION
# ============================================================================
NEXTAUTH_URL={{YOUR_PRODUCTION_URL}}

# ============================================================================
# OPTIONAL CONFIGURATION
# ============================================================================
REDIS_URL={{REDIS_CONNECTION_STRING}}
LOG_LEVEL=info
ENABLE_MONITORING=true
`;

  await fs.writeFile(templatePath, template);
  console.log(`✅ Created production environment template at: ${templatePath}`);
  console.log('💡 Copy this to .env.production and fill in the actual values');
}

async function main(): Promise<void> {
  const action = process.argv[2];

  switch (action) {
    case 'generate':
      await generateSecureTokens();
      break;
    case 'verify':
      await verifyProductionEnv();
      break;
    case 'template':
      await createProductionEnvTemplate();
      break;
    default:
      console.log('🚀 ASR Purchase Order System - Environment Configuration Tool');
      console.log('');
      console.log('Usage:');
      console.log('  npm run env:generate    - Generate secure tokens');
      console.log('  npm run env:verify      - Verify .env.production');
      console.log('  npm run env:template    - Create .env.production template');
      console.log('');
      console.log('For Phase 4F production readiness:');
      console.log('  1. Run: npm run env:template');
      console.log('  2. Copy .env.production.template to .env.production');
      console.log('  3. Fill in actual production values');
      console.log('  4. Run: npm run env:verify');
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}