const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up frontend-only build...');

try {
  // Use minimal config for frontend-only build
  fs.copyFileSync('next.config.minimal.ts', 'next.config.ts');
  console.log('✅ Copied minimal config');

  // Completely remove API directory during build
  const apiDir = path.join('src', 'app', 'api');
  const apiDisabledDir = path.join('src', 'app', 'api-disabled');
  const tempDir = path.join('..', 'temp-api-backup');

  // Remove both api and api-disabled directories
  if (fs.existsSync(apiDir)) {
    fs.renameSync(apiDir, tempDir);
    console.log('✅ API routes moved to temp');
  } else if (fs.existsSync(apiDisabledDir)) {
    fs.renameSync(apiDisabledDir, tempDir);
    console.log('✅ API routes restored from disabled state');
  }

  // Create stub auth files for frontend-only build
  const authConfigPath = path.join('src', 'lib', 'auth');
  const authBackupPath = path.join('..', 'temp-auth-backup');

  let authMoved = false;
  if (fs.existsSync(authConfigPath)) {
    try {
      fs.renameSync(authConfigPath, authBackupPath);
      console.log('✅ Auth config moved to backup');
      authMoved = true;
    } catch (error) {
      console.log('⚠️  Could not move auth config, will overwrite with stubs');
    }
  }

  // Create minimal stub auth directory and files
  if (!fs.existsSync(authConfigPath)) {
    fs.mkdirSync(authConfigPath, { recursive: true });
  }

  // Create stub config.ts
  fs.writeFileSync(path.join(authConfigPath, 'config.ts'), `
// Stub auth config for frontend-only build
export const authOptions = {
  providers: [],
  session: { strategy: 'jwt' as const },
  pages: {
    signIn: '/login',
  },
};
export { authOptions as default };
`);

  // Create stub permissions.ts
  fs.writeFileSync(path.join(authConfigPath, 'permissions.ts'), `
// Stub permissions for frontend-only build
export const getRoleDisplayName = (role: string) => role;
export const hasPermission = () => false;
export const UserRole = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
};
`);

  console.log('✅ Created stub auth files');

  // Create clean .env.production without NextAuth
  const envContent = `# Frontend-only build environment
NEXT_PUBLIC_ENVIRONMENT=render-frontend
NEXT_PUBLIC_API_URL=https://your-ngrok-url.ngrok.io
NODE_ENV=production
`;

  fs.writeFileSync('.env.production', envContent);
  console.log('✅ Created clean build environment');

  // Save build state for restore
  const buildState = {
    authMoved,
    timestamp: new Date().toISOString()
  };
  fs.writeFileSync('build-state.json', JSON.stringify(buildState, null, 2));

  console.log('🏗️  Ready for Next.js build...');
} catch (error) {
  console.error('❌ Setup failed:', error.message);
  process.exit(1);
}