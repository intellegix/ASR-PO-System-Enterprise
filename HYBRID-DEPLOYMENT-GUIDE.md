# ASR Purchase Order System - Hybrid Deployment Guide
## Frontend on Render + Local Backend

**Status**: Ready for deployment
**Setup Time**: 20 minutes
**Benefits**: Mobile testing + Local data control

---

## 🎯 **Architecture Overview**

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Render.com     │────▶│    ngrok.io     │────▶│ Local Computer  │
│  Frontend App   │     │  Tunnel Service │     │ Backend + DB    │
│  (Static Build) │     │  (Secure HTTPS) │     │ (All APIs)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Benefits**:
- ✅ Test on mobile devices anywhere in the world
- ✅ All business data stays on your local computer
- ✅ Full development access to database and backend
- ✅ Real-time code changes without redeployment
- ✅ Secure HTTPS tunnel for production-like testing

---

## 🚀 **Quick Setup (20 Minutes)**

### **Step 1: Install and Setup ngrok (5 minutes)**

```bash
# Download and install ngrok (Windows)
# Visit: https://ngrok.com/download
# Or use chocolatey:
choco install ngrok

# Authenticate ngrok (free account required)
ngrok authtoken YOUR_NGROK_AUTH_TOKEN

# Test ngrok installation
ngrok --help
```

### **Step 2: Start Local Backend (2 minutes)**

```bash
cd "C:\Users\AustinKidwell\ASR Dropbox\Austin Kidwell\08_Financial_PayrollOperations\P.O System\web"

# Start your local backend
npm run dev

# Verify health endpoint
curl http://localhost:3000/api/health
```

### **Step 3: Expose Backend via ngrok (2 minutes)**

```bash
# In a new terminal, start ngrok tunnel
ngrok http 3000

# Copy the HTTPS URL (looks like: https://abc123.ngrok.io)
# Example output:
# Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

### **Step 4: Deploy Frontend to Render (10 minutes)**

#### A. Create Render Account and Service
1. Go to [render.com](https://render.com) and sign up
2. Click **"New +"** → **"Static Site"**
3. Connect your GitHub repository
4. Configure build settings:
   - **Build Command**: `npm run render:build`
   - **Publish Directory**: `web/out`
   - **Root Directory**: `web`

#### B. Set Environment Variables in Render
```bash
# In Render dashboard, go to Environment tab and add:
NEXT_PUBLIC_ENVIRONMENT=render-frontend
NEXT_PUBLIC_API_URL=https://your-ngrok-url.ngrok.io  # Use your actual ngrok URL
NODE_ENV=production
NEXTAUTH_URL=https://your-app-name.onrender.com     # Use your actual Render URL
NEXTAUTH_SECRET=your-secure-32-character-secret-here # Same as local
```

#### C. Deploy
- Click **"Create Static Site"**
- Render will automatically build and deploy
- Get your frontend URL: `https://your-app-name.onrender.com`

### **Step 5: Update Local Backend CORS (1 minute)**

```bash
# Add your Render frontend URL to environment
echo "RENDER_FRONTEND_URL=https://your-app-name.onrender.com" >> .env

# Restart your local backend
npm run dev
```

---

## 🔧 **Development Workflow**

### **Daily Startup Sequence**
```bash
# Terminal 1: Start local backend
cd web
npm run dev

# Terminal 2: Start ngrok tunnel
ngrok http 3000

# Copy ngrok URL and update Render environment if changed
# Your app is now accessible worldwide at your Render URL
```

### **Testing Workflow**
1. **Desktop Development**: Use `http://localhost:3000`
2. **Mobile Testing**: Use `https://your-app-name.onrender.com`
3. **Share with Team**: Share Render URL for stakeholder review
4. **API Debugging**: All API calls go through ngrok to your local backend

### **Code Changes**
- **Frontend Changes**: Deploy to Render (auto-deploys on git push)
- **Backend Changes**: Instantly available (running locally)
- **Database Changes**: Run migrations locally, instantly available

---

## 📱 **Mobile Testing Features**

### **Progressive Web App**
Your deployed frontend includes full PWA features:
- **Offline Support**: Core functionality works without internet
- **Install Prompt**: Add to home screen on mobile devices
- **Push Notifications**: Real-time updates (when implemented)
- **Responsive Design**: Optimized for all screen sizes

### **Mobile-Specific Testing**
```bash
# Test responsive breakpoints
# All Tailwind CSS breakpoints work:
# sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px

# Test touch interactions
# All touch gestures for PO approval workflow

# Test network conditions
# Use Chrome DevTools to simulate slow networks
```

---

## 🔒 **Security Considerations**

### **ngrok Security**
- ✅ **HTTPS Encryption**: All traffic encrypted end-to-end
- ✅ **Authentication**: ngrok requires auth token
- ✅ **Temporary URLs**: URLs change on restart (security by obscurity)
- ⚠️ **Rate Limiting**: Free tier has connection limits

### **CORS Configuration**
```typescript
// Current CORS setup allows:
- http://localhost:3000 (local development)
- https://your-app-name.onrender.com (deployed frontend)
- Your ngrok URL (secure tunnel)
```

### **Environment Security**
- ✅ Backend database stays local (never exposed)
- ✅ API keys and secrets stay on your machine
- ✅ User sessions managed locally
- ✅ Audit trail data stays in local database

---

## 🔍 **Troubleshooting**

### **Common Issues**

#### **CORS Errors**
```bash
# Error: "Access to fetch at 'https://abc123.ngrok.io/api/...' from origin 'https://your-app.onrender.com' has been blocked"

# Solution: Verify CORS environment variables
echo $RENDER_FRONTEND_URL
# Should output: https://your-app-name.onrender.com

# Restart local backend after setting
npm run dev
```

#### **ngrok Connection Issues**
```bash
# Error: "tunnel session failed: not found"

# Solution 1: Verify auth token
ngrok authtoken YOUR_TOKEN

# Solution 2: Use different port if 3000 is busy
ngrok http 3001
# Update local backend to run on 3001: npm run dev -- -p 3001
```

#### **API Timeouts**
```bash
# Error: "Request timeout"

# Check ngrok status
curl https://your-ngrok-url.ngrok.io/api/health

# Increase timeout in api-client.ts if needed
# Current timeout: 30 seconds
```

### **Performance Monitoring**
```bash
# Monitor API response times
curl -w "@curl-format.txt" https://your-ngrok-url.ngrok.io/api/health

# Check ngrok traffic
# Visit: http://localhost:4040 (ngrok inspector)

# Monitor Render deployment
# Visit: Render dashboard → Logs tab
```

---

## 📊 **Cost Analysis**

### **Render.com Pricing** (Static Site)
- ✅ **Free Tier**: Perfect for development and testing
- ✅ **Custom Domain**: Available on free tier
- ✅ **SSL Certificate**: Automatic and free
- ✅ **Build Minutes**: 500/month free (more than enough)

### **ngrok Pricing**
- ✅ **Free Tier**: 1 online tunnel, perfect for development
- 💡 **Pro ($8/month)**: Custom domains, more tunnels if needed
- 💡 **Business**: Team features if multiple developers

### **Total Monthly Cost**
- **Development Setup**: $0 (completely free)
- **Enhanced Features**: $8/month (if you want custom ngrok domain)

---

## 🚀 **Production Transition Path**

When ready to fully deploy to production:

### **Option A: Full Render Deployment**
```bash
# Deploy both frontend and backend to Render
# Use Render PostgreSQL database
# Follow existing production deployment guide
```

### **Option B: AWS App Runner** (Current Plan)
```bash
# Deploy to AWS App Runner as planned
# Use existing Docker configuration
# Migrate to RDS PostgreSQL
```

### **Option C: Keep Hybrid** (Long-term Development)
```bash
# Keep frontend on Render for stakeholder access
# Keep backend local for active development
# Perfect for ongoing feature development
```

---

## ✅ **Verification Checklist**

After setup, verify all features work:

### **Authentication**
- [ ] Login from Render frontend
- [ ] Session persists across mobile/desktop
- [ ] Logout works properly
- [ ] Role-based access functions correctly

### **Purchase Orders**
- [ ] Create new PO from mobile
- [ ] Upload attachments
- [ ] Approval workflow functions
- [ ] PDF generation works
- [ ] Email notifications send (if configured)

### **Reports and Dashboards**
- [ ] Cross-division dashboard loads
- [ ] All 6 reports generate properly
- [ ] Charts render correctly on mobile
- [ ] Export functions work

### **Performance**
- [ ] API response times under 2 seconds
- [ ] Mobile UI is responsive
- [ ] Offline functionality works
- [ ] PWA install prompt appears

---

**Status**: ✅ Ready for Deployment
**Estimated Setup Time**: 20 minutes
**Mobile Testing**: Immediate global access
**Data Security**: All sensitive data remains local

**Next Step**: Run the setup commands above and start mobile testing!