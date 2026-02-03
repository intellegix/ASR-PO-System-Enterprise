const fs = require('fs');
const path = require('path');

console.log('🔄 Restoring API routes...');

try {
  // Restore API directory from outside temp location
  const apiDir = path.join('src', 'app', 'api');
  const tempDir = path.join('..', 'temp-api-backup');

  if (fs.existsSync(tempDir)) {
    if (fs.existsSync(apiDir)) {
      fs.rmSync(apiDir, { recursive: true, force: true });
    }
    fs.renameSync(tempDir, apiDir);
    console.log('✅ API routes restored');
  }

  // Restore auth configuration
  const authConfigPath = path.join('src', 'lib', 'auth');
  const authBackupPath = path.join('..', 'temp-auth-backup');

  if (fs.existsSync(authBackupPath)) {
    if (fs.existsSync(authConfigPath)) {
      fs.rmSync(authConfigPath, { recursive: true, force: true });
    }
    fs.renameSync(authBackupPath, authConfigPath);
    console.log('✅ Auth config restored');
  }

  // Clean up temporary environment file
  if (fs.existsSync('.env.production')) {
    fs.unlinkSync('.env.production');
    console.log('✅ Cleaned up build environment');
  }

  console.log('🎉 Build process complete!');
} catch (error) {
  console.error('❌ Restore failed:', error.message);
  process.exit(1);
}