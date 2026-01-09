# ASR PO System - Render Deployment Fix Guide

## 🚨 Deployment Issue Diagnosis

**Problem**: Render deployment failed because the project has a dual structure with Next.js app in `web/` subdirectory.

**Root Cause**: Render was trying to build from the root directory instead of the `web/` directory where the actual Next.js application resides.

---

## ✅ Solution: Fixed Configuration Files

### 1. Created `render.yaml` (Primary Solution)
```yaml
services:
  - type: web
    name: asr-po-system
    runtime: node
    plan: starter
    region: oregon
    buildCommand: cd web && npm install && npx prisma generate && npm run build
    startCommand: cd web && npm start
```

### 2. Updated Root `package.json`
Added proper build/start scripts that navigate to the `web/` directory:
```json
{
  "scripts": {
    "build": "cd web && npm install && npx prisma generate && npm run build",
    "start": "cd web && npm start"
  }
}
```

### 3. Created Build Scripts
- `build.sh`: Comprehensive build script with verification
- `start.sh`: Production start script with environment checks

---

## 🛠️ Render Dashboard Configuration

### Option A: Use render.yaml (Recommended)
If you have the `render.yaml` file in your repository root, Render will automatically use it.

### Option B: Manual Dashboard Configuration
If render.yaml doesn't work, configure manually in Render dashboard:

**Build Command:**
```bash
cd web && npm install && npx prisma generate && npm run build
```

**Start Command:**
```bash
cd web && npm start
```

**Root Directory:**
```
.
```
(Leave as root, but commands navigate to web/)

---

## 🔧 Environment Variables Setup

### Required Environment Variables in Render:

1. **DATABASE_URL** (Auto-generated when you add PostgreSQL)
   ```
   postgresql://user:pass@host:port/db
   ```

2. **NEXTAUTH_SECRET** (Generate in Render dashboard)
   ```
   Click "Generate" for a secure 32-character string
   ```

3. **NEXTAUTH_URL**
   ```
   https://your-service-name.onrender.com
   ```

4. **NODE_ENV**
   ```
   production
   ```

5. **LOG_LEVEL** (Optional)
   ```
   info
   ```

---

## 📝 Step-by-Step Deployment Fix

### Step 1: Commit & Push Changes
```bash
cd "C:\Dev\ASR-PO-System"
git add .
git commit -m "fix: Configure Render deployment for web/ subdirectory

- Add render.yaml with proper build/start commands
- Update root package.json with deployment scripts
- Add build.sh and start.sh for comprehensive deployment
- Fix directory navigation for Render deployment"
git push origin main
```

### Step 2: Render Dashboard Updates

1. **Go to Render Dashboard** → Your Service

2. **Settings Tab** → **Build & Deploy**
   - **Build Command**: `cd web && npm install && npx prisma generate && npm run build`
   - **Start Command**: `cd web && npm start`
   - **Node Version**: Use latest LTS (18.x or 20.x)

3. **Environment Variables**
   - Verify all required variables are set
   - Regenerate NEXTAUTH_SECRET if needed

4. **Manual Deploy**
   - Click "Manual Deploy" → "Deploy latest commit"

### Step 3: Database Setup

1. **Connect PostgreSQL**
   - Ensure database is created and connected
   - DATABASE_URL should be auto-populated

2. **Run Migrations** (if needed)
   - After first successful deployment, you may need to run migrations
   - Connect to your Render shell and run: `npm run db:migrate`

---

## 🔍 Troubleshooting Common Issues

### Build Fails with "Cannot find module"
**Solution**: Ensure both root and web/ have node_modules installed
```bash
# Build command should include:
cd web && npm install && npx prisma generate && npm run build
```

### Prisma Client Not Generated
**Solution**: Ensure Prisma generation is in build command
```bash
cd web && npm install && npx prisma generate && npm run build
```

### Environment Variables Not Loading
**Solution**: Check Render dashboard environment variables
- DATABASE_URL must be set
- NEXTAUTH_SECRET must be 32+ characters
- NEXTAUTH_URL must match your Render service URL

### Database Connection Failed
**Solution**: Verify DATABASE_URL format
```
postgresql://user:password@host:port/database
```

### "Module not found: next/auth"
**Solution**: Ensure all dependencies are installed
```bash
cd web && npm install
```

---

## 🚀 Verification Steps

### After Deployment:

1. **Check Service Logs**
   - Render Dashboard → Logs
   - Look for "Ready in" message from Next.js

2. **Test Application**
   - Navigate to your Render URL
   - Test login functionality
   - Verify work order pages load

3. **Database Connectivity**
   - Test login with existing credentials
   - Verify work orders display correctly
   - Check API endpoints respond

---

## 🔄 Alternative Solutions (If Above Doesn't Work)

### Solution 2: Move Next.js to Root
```bash
# If render.yaml doesn't work, move web/ contents to root
cd C:\Dev\ASR-PO-System
mv web/* .
mv web/.* . 2>/dev/null || true  # Move hidden files
rmdir web
```

### Solution 3: Create Dockerfile
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY web/package*.json ./
RUN npm install
COPY web/ ./
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 📊 Current System Status

- ✅ **Work Order System**: Fully implemented and functional
- ✅ **Database Migration**: Applied with PO statistics triggers
- ✅ **Local Development**: Running on http://localhost:3005
- 🔧 **Render Deployment**: Fixed configuration files created
- ⏳ **Production Deployment**: Ready for redeployment

---

## 🎯 Next Steps

1. **Commit and push** the configuration changes
2. **Trigger manual deploy** in Render dashboard
3. **Monitor deployment logs** for successful build
4. **Test production application** once deployed
5. **Verify work order functionality** in production

The deployment should now work correctly with the fixed configuration! 🚀

---

*Deployment Guide Created: January 9, 2025*
*System Version: 2.0 - Work Order Management Release*