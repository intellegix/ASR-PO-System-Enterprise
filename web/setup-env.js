// Quick setup script to configure production environment
const fs = require('fs');
const path = require('path');

const envContent = `# ASR Purchase Order System - Production Environment
NODE_ENV=production

# Database Connection (Supabase)
DATABASE_URL="postgresql://postgres.kcnguimsdpsijvdjrtwi:Devops$@2026@aws-0-us-west-2.pooler.supabase.com:5432/postgres"

# Security Tokens
NEXTAUTH_SECRET=4807c0c27e4a5a56dd265cb57a89f549e6d1b1a8c36f756e5d4dce4ccc21172e
JWT_SECRET=917964a5e56be6b138e92a69fa97839f4b03f6855ca6f0795a4d21d05dab7bd0
ENCRYPTION_KEY=4d77e44398d1d39f696c64b4d04b06388d6225990d6f1b0717598e96400c40e7

# Application URL (update with your production domain)
NEXTAUTH_URL=https://your-app-domain.com

# QuickBooks Integration (update with your credentials)
QB_CLIENT_ID=your_qb_client_id
QB_CLIENT_SECRET=your_qb_client_secret
QB_ENVIRONMENT=production
QB_BASE_URL=https://api.intuit.com

# Email Configuration (update with your SMTP provider)
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
EMAIL_FROM=noreply@yourdomain.com
`;

const envPath = path.join(__dirname, '.env.production');

try {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Created .env.production file successfully!');
    console.log('📁 Location:', envPath);
    console.log('');
    console.log('🔧 Next steps:');
    console.log('1. Update QuickBooks credentials (QB_CLIENT_ID, QB_CLIENT_SECRET)');
    console.log('2. Update email settings (SMTP_HOST, SMTP_USER, SMTP_PASS, EMAIL_FROM)');
    console.log('3. Update NEXTAUTH_URL with your production domain');
    console.log('');
    console.log('✅ DATABASE_URL is already configured for your Supabase database!');
} catch (error) {
    console.error('❌ Error creating .env.production file:', error.message);
}