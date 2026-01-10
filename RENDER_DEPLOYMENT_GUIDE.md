# ASR Purchase Order System - Render Deployment Guide

## Overview
This guide covers deploying the ASR PO System frontend to Render while keeping the PostgreSQL database on your local tower, connected via ngrok tunnel.

## Prerequisites Checklist

### ✅ Database Setup (Local Tower)
- [ ] PostgreSQL configured with SSL enabled
- [ ] `render_user` database user created with proper permissions
- [ ] Windows Firewall rule added for PostgreSQL port 5432
- [ ] SSL certificates generated and installed

### ✅ ngrok Tunnel Setup
- [ ] ngrok installed and authenticated
- [ ] ngrok configuration file created (`%USERPROFILE%\.ngrok2\ngrok.yml`)
- [ ] ngrok tunnel started and URL noted (e.g., `0.tcp.ngrok.io:12345`)
- [ ] Database connectivity tested through tunnel

### ✅ Application Ready
- [ ] TypeScript compilation passes (`npm run type-check`)
- [ ] All tests pass (`npm run test:ci`)
- [ ] Application builds successfully (`npm run build`)
- [ ] Health check endpoint accessible

---

## Step 1: Create Render Account

1. Go to https://render.com
2. Sign up with GitHub account (recommended for auto-deploy)
3. Connect your GitHub repository containing the ASR PO System

---

## Step 2: Create New Web Service

### Basic Configuration
1. **Dashboard** → **New** → **Web Service**
2. **Connect Repository**: Select your ASR PO System repository
3. **Service Name**: `asr-po-system` (or your preferred name)
4. **Region**: Choose closest to your location
5. **Branch**: `main` (or your production branch)

### Build & Deploy Settings
```
Root Directory: web
Build Command: npm install && npm run build
Start Command: npm start
```

### Runtime Settings
- **Runtime**: Node.js
- **Node Version**: 18.x or later
- **Auto-Deploy**: ✅ Enable (deploys on every push)

---

## Step 3: Environment Variables

**CRITICAL**: Add these environment variables in Render Dashboard → Environment:

### Required Variables
```env
DATABASE_URL=postgresql://render_user:ASR_Po2026_SecureRender123!@YOUR_NGROK_URL:PORT/asr_po_system?sslmode=require
NEXTAUTH_SECRET=ASR_PO_2026_SECURE_JWT_SECRET_MINIMUM_32_CHARS_REQUIRED_FOR_PRODUCTION
NEXTAUTH_URL=https://your-app-name.onrender.com
NODE_ENV=production
```

### Optional Variables
```env
LOG_LEVEL=warn
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=austin@asrinc.com
SMTP_PASS=your-gmail-app-password
```

### Important Notes:
- **Replace `YOUR_NGROK_URL:PORT`** with actual ngrok tunnel URL (e.g., `0.tcp.ngrok.io:12345`)
- **Replace `your-app-name`** with actual Render app name
- **Generate secure NEXTAUTH_SECRET** (minimum 32 characters):
  ```bash
  openssl rand -hex 32
  ```

---

## Step 4: Custom Domains (Optional)

### Using Custom Domain
1. **Dashboard** → **Settings** → **Custom Domains**
2. Add your domain (e.g., `po.asrinc.com`)
3. Update DNS records as instructed by Render
4. Update `NEXTAUTH_URL` environment variable

### SSL Certificate
- Render automatically provides SSL certificates for custom domains
- No additional configuration needed

---

## Step 5: Deploy

### Initial Deployment
1. Click **Deploy Latest Commit** in Render dashboard
2. Monitor build logs for errors
3. Wait for deployment to complete (~3-5 minutes)

### Deployment Logs to Monitor
```
Build Phase:
- npm install
- npm run build
- npm run postbuild (Prisma generate)

Deploy Phase:
- Starting application
- Health check passes
- Application ready
```

---

## Step 6: Verification Testing

### 6.1 Health Check
Visit: `https://your-app-name.onrender.com/api/health`

Expected Response:
```json
{
  "status": "healthy",
  "database": "connected",
  "metrics": {
    "users": 8,
    "vendors": 10,
    "activeProjects": 5
  },
  "timestamp": "2026-01-09T...",
  "version": "1.0.0"
}
```

### 6.2 Authentication Test
1. Visit: `https://your-app-name.onrender.com`
2. Login with test credentials:
   - **Email**: `owner1@allsurfaceroofing.com`
   - **Password**: `demo123` (if not updated)

### 6.3 Functionality Test
- [ ] Dashboard loads with data
- [ ] Purchase order creation works
- [ ] PDF generation works
- [ ] Approval workflow functions
- [ ] All API endpoints respond correctly

---

## Step 7: Monitoring Setup

### 7.1 Render Built-in Monitoring
- **Dashboard** → **Metrics** shows CPU, memory, response times
- **Logs** tab shows application and build logs
- Set up **Alerts** for downtime or errors

### 7.2 Custom Monitoring
Create monitoring script to check health endpoint:
```bash
#!/bin/bash
curl -f https://your-app-name.onrender.com/api/health || echo "Health check failed"
```

### 7.3 Database Connection Monitoring
Check ngrok tunnel status:
```bash
curl http://localhost:4040/api/tunnels
```

---

## Step 8: Backup Procedures

### 8.1 Database Backups (Local Tower)
Run the provided backup script daily:
```cmd
backup-script.bat
```

### 8.2 Application Code Backup
- Code is backed up in GitHub repository
- Render automatically keeps deployment history
- No additional backup needed for application

---

## Troubleshooting Common Issues

### Build Failures
**Issue**: `npm install` fails
**Solution**: Check Node.js version compatibility, update dependencies

**Issue**: TypeScript compilation errors
**Solution**: Fix TypeScript errors locally first, test with `npm run type-check`

### Database Connection Issues
**Issue**: `Database connection failed`
**Solutions**:
1. Check ngrok tunnel is running: `curl http://localhost:4040/api/tunnels`
2. Verify DATABASE_URL format in environment variables
3. Test connection locally: `telnet YOUR_NGROK_URL PORT`
4. Check PostgreSQL logs on local tower

### SSL/TLS Issues
**Issue**: `SSL connection failed`
**Solutions**:
1. Verify PostgreSQL SSL configuration
2. Check certificate files exist and are readable
3. Use `sslmode=require` in DATABASE_URL
4. Test with `sslmode=disable` temporarily for debugging

### Performance Issues
**Issue**: Slow response times
**Solutions**:
1. Check network latency between Render and your location
2. Optimize database queries
3. Implement Redis caching
4. Consider upgrading Render plan

---

## Security Checklist

### ✅ Database Security
- [ ] Strong password for `render_user` (32+ characters)
- [ ] SSL/TLS enabled for all connections
- [ ] Minimal database permissions granted
- [ ] Regular backup schedule implemented
- [ ] Connection monitoring enabled

### ✅ Application Security
- [ ] Secure NEXTAUTH_SECRET generated
- [ ] Environment variables properly configured
- [ ] No sensitive data in logs
- [ ] HTTPS enforced (handled by Render)
- [ ] Rate limiting configured (if needed)

### ✅ Network Security
- [ ] ngrok tunnel secured (consider paid plan for custom domain)
- [ ] Firewall rules configured properly
- [ ] Regular security updates applied

---

## Maintenance Tasks

### Daily
- [ ] Check application health endpoint
- [ ] Verify ngrok tunnel is running
- [ ] Run database backup script

### Weekly
- [ ] Review application logs for errors
- [ ] Check database connection metrics
- [ ] Update dependencies if needed

### Monthly
- [ ] Security audit and updates
- [ ] Performance review
- [ ] Backup verification
- [ ] SSL certificate expiry check

---

## Emergency Procedures

### Application Down
1. Check Render status page
2. Restart service from Render dashboard
3. Check build logs for errors
4. Verify environment variables

### Database Connection Lost
1. Check ngrok tunnel status
2. Restart ngrok tunnel
3. Update DATABASE_URL if ngrok URL changed
4. Redeploy application if needed

### Rollback Procedure
1. **Quick Fix**: Revert to previous deployment in Render
2. **Database Issue**: Switch to local development temporarily
3. **Complete Rollback**: Use Render's deployment history

---

## Cost Monitoring

### Render Costs
- **Starter Plan**: $7/month (512MB RAM, shared CPU)
- **Standard Plan**: $25/month (2GB RAM, shared CPU)
- **Pro Plan**: $85/month (4GB RAM, dedicated CPU)

### ngrok Costs
- **Free**: Random URLs, limited features
- **Personal**: $5/month, custom domains
- **Pro**: $10/month, additional features

### Total Monthly Cost: ~$12-35/month

---

## Support Contacts

### Technical Issues
- **Render Support**: https://render.com/support
- **ngrok Support**: https://ngrok.com/support
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/

### Emergency Contacts
- Document your team's contact information for deployment issues
- Include database administrator contact
- Note any vendor support contracts