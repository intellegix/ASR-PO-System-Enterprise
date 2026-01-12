// Update .env.production with URL-encoded password
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.production');
let envContent = fs.readFileSync(envPath, 'utf8');

// Replace the DATABASE_URL with URL-encoded password
const oldUrl = 'DATABASE_URL="postgresql://postgres.kcnguimsdpsijvdjrtwi:Devops$@2026@aws-0-us-west-2.pooler.supabase.com:5432/postgres"';
const newUrl = 'DATABASE_URL="postgresql://postgres.kcnguimsdpsijvdjrtwi:Devops%24%402026@aws-0-us-west-2.pooler.supabase.com:5432/postgres"';

envContent = envContent.replace(oldUrl, newUrl);

fs.writeFileSync(envPath, envContent);
console.log('✅ Updated .env.production with URL-encoded password');
console.log('🔗 Database URL now properly encoded for special characters');