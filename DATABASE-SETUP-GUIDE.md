# Production Database Setup Guide

## 🎯 Database Requirements for ASR Purchase Order System

**Database Type:** PostgreSQL 14+
**Storage Estimate:** 500MB - 2GB (initial), grows with PO volume
**Performance Requirements:**
- Concurrent connections: 20-50
- Response time: <100ms for queries
- Uptime: 99.9%+

---

## 🏆 RECOMMENDED OPTIONS (Ranked by Ease of Setup)

### Option 1: Supabase (🥇 RECOMMENDED)
**Best for:** Quick setup, excellent free tier, built-in backups
**Cost:** Free tier (up to 500MB), $25/month for production
**Setup Time:** 5 minutes

### Option 2: Neon (🥈 GREAT ALTERNATIVE)
**Best for:** Serverless scaling, modern interface
**Cost:** Free tier (3GB), $19/month for production
**Setup Time:** 5 minutes

### Option 3: Railway (🥉 SIMPLE OPTION)
**Best for:** Simple deployment, database + app hosting
**Cost:** $5-10/month
**Setup Time:** 10 minutes

### Option 4: Render (RELIABLE)
**Best for:** Integrated with app deployment
**Cost:** $7/month for 1GB
**Setup Time:** 10 minutes

---

## 🚀 OPTION 1: SUPABASE SETUP (RECOMMENDED)

### Step 1: Create Supabase Project
1. Go to https://supabase.com
2. Click **"Start your project"**
3. Sign in with GitHub (recommended)
4. Click **"New project"**
5. Fill in details:
   - **Organization:** Create new or select existing
   - **Project name:** `asr-purchase-order-prod`
   - **Database password:** Generate strong password (save it!)
   - **Region:** Choose closest to your users (US East/West)
6. Click **"Create new project"**

**⏱️ Wait 2-3 minutes for database to initialize**

### Step 2: Get Connection Details
1. In Supabase dashboard, go to **Settings** → **Database**
2. Scroll to **"Connection info"**
3. Copy the **Connection string**:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@[PROJECT-HOST]:6543/postgres
   ```

### Step 3: Configure Connection Pooling
1. In Supabase, go to **Settings** → **Database**
2. Under **"Connection pooling"**, note the pooled connection string:
   ```
   postgresql://postgres.xxxx:[PASSWORD]@[HOST]:6543/postgres?pgbouncer=true
   ```

---

## 🚀 OPTION 2: NEON SETUP

### Step 1: Create Neon Project
1. Go to https://neon.tech
2. Sign up with GitHub
3. Click **"Create a project"**
4. Fill in:
   - **Project name:** `asr-po-system-prod`
   - **Region:** Select closest region
   - **PostgreSQL version:** 15 (default)
5. Click **"Create project"**

### Step 2: Get Connection String
1. In Neon dashboard, go to **"Connection Details"**
2. Copy the connection string:
   ```
   postgresql://[username]:[password]@[hostname]/[dbname]?sslmode=require
   ```

---

## 🚀 OPTION 3: RAILWAY SETUP

### Step 1: Create Railway Account
1. Go to https://railway.app
2. Sign up with GitHub
3. Click **"New Project"** → **"Provision PostgreSQL"**

### Step 2: Get Database URL
1. Click on your PostgreSQL service
2. Go to **"Connect"** tab
3. Copy the **Database URL**

---

## ⚙️ CONFIGURE ASR SYSTEM WITH DATABASE

### Step 1: Update Environment Variables

**For Supabase:**
```bash
# Add to web/.env.production
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@[PROJECT-HOST]:6543/postgres?pgbouncer=true"
```

**For Neon:**
```bash
# Add to web/.env.production
DATABASE_URL="postgresql://[username]:[password]@[hostname]/[dbname]?sslmode=require"
```

**For Railway:**
```bash
# Add to web/.env.production
DATABASE_URL="postgresql://[user]:[password]@[host]:[port]/[database]"
```

### Step 2: Add Required Environment Variables

Open `web/.env.production` and ensure you have:

```bash
# Database
DATABASE_URL=your_database_connection_string_from_above

# Security (use the generated tokens from earlier)
NEXTAUTH_SECRET=4807c0c27e4a5a56dd265cb57a89f549e6d1b1a8c36f756e5d4dce4ccc21172e
JWT_SECRET=917964a5e56be6b138e92a69fa97839f4b03f6855ca6f0795a4d21d05dab7bd0
ENCRYPTION_KEY=4d77e44398d1d39f696c64b4d04b06388d6225990d6f1b0717598e96400c40e7

# Application
NODE_ENV=production
NEXTAUTH_URL=https://your-app-domain.com

# QuickBooks (update with your production credentials)
QB_CLIENT_ID=your_qb_client_id
QB_CLIENT_SECRET=your_qb_client_secret
QB_ENVIRONMENT=production
QB_BASE_URL=https://api.intuit.com

# Email (update with your SMTP provider)
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
EMAIL_FROM=noreply@yourdomain.com
```

### Step 3: Run Database Migrations

```bash
cd web
npm run db:push
```

**Expected output:**
```
Environment variables loaded from .env.production
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "postgres", schema "public" at "xxx.pooler.supabase.com:6543"

🚀  Your database is now in sync with your Prisma schema. Done in 2.34s

✔ Generated Prisma Client (v7.2.0) to .\node_modules\@prisma\client in 156ms
```

### Step 4: Verify Database Connection

```bash
npx tsx scripts/data-audit.ts
```

**Expected result:** Should connect successfully and show empty tables (ready for data).

---

## 🔧 DATABASE OPTIMIZATION SETUP

### Create Optimal Indexes

```bash
cd web
npx tsx -e "
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function createIndexes() {
  console.log('Creating production database indexes...');

  // Performance indexes for PO queries
  await prisma.$executeRaw\`CREATE INDEX IF NOT EXISTS idx_po_headers_created_at ON po_headers(created_at DESC)\`;
  await prisma.$executeRaw\`CREATE INDEX IF NOT EXISTS idx_po_headers_status_division ON po_headers(status, division_id)\`;
  await prisma.$executeRaw\`CREATE INDEX IF NOT EXISTS idx_po_line_items_po_status ON po_line_items(po_id, status)\`;

  // Approval trail indexes
  await prisma.$executeRaw\`CREATE INDEX IF NOT EXISTS idx_po_approvals_po_timestamp ON po_approvals(po_id, timestamp DESC)\`;
  await prisma.$executeRaw\`CREATE INDEX IF NOT EXISTS idx_po_approvals_user_action ON po_approvals(actor_user_id, action)\`;

  // Vendor and project indexes
  await prisma.$executeRaw\`CREATE INDEX IF NOT EXISTS idx_vendors_active_name ON vendors(is_active, vendor_name)\`;
  await prisma.$executeRaw\`CREATE INDEX IF NOT EXISTS idx_projects_status_division ON projects(status, primary_division_id)\`;

  // Work order indexes
  await prisma.$executeRaw\`CREATE INDEX IF NOT EXISTS idx_work_orders_project_status ON work_orders(project_id, status)\`;

  console.log('✅ All production indexes created successfully!');
}

createIndexes().then(() => process.exit(0)).catch(console.error);
"
```

---

## 🔒 SECURITY CONFIGURATION

### Database Security Settings

**For Supabase:**
1. Go to **Settings** → **Database** → **Connection pooling**
2. Enable **"Connection pooling"**
3. Set **Pool mode:** Transaction
4. Set **Pool size:** 15

**For all providers:**
- Ensure SSL is enabled (should be default)
- Use connection pooling
- Limit database user permissions to necessary operations only

### Network Security
- Database should only accept connections with SSL
- Use connection pooling to prevent connection exhaustion
- Monitor for unusual query patterns

---

## 📊 DATABASE MONITORING SETUP

### Health Check Configuration

Create a simple health check:

```bash
# Test database connectivity
cd web
npx tsx -e "
import { PrismaClient } from '@prisma/client';
async function healthCheck() {
  const prisma = new PrismaClient();
  try {
    await prisma.\$executeRaw\`SELECT 1\`;
    console.log('✅ Database connection healthy');
    await prisma.\$disconnect();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}
healthCheck();
"
```

### Monitoring Recommendations

1. **Connection Monitoring:**
   - Track active connections
   - Monitor connection pool usage
   - Set alerts for connection limits

2. **Performance Monitoring:**
   - Query response times
   - Slow query identification
   - Index usage statistics

3. **Storage Monitoring:**
   - Database size growth
   - Backup completion status
   - Storage space utilization

---

## 🗃️ BACKUP CONFIGURATION

### Automatic Backups

**Supabase:** Backups included automatically
**Neon:** Point-in-time restore included
**Railway/Render:** Configure backup add-ons

### Manual Backup Setup

```bash
# Create backup script
cd web
cat > scripts/backup-production.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="asr_po_backup_${DATE}.sql"

echo "Creating database backup..."
pg_dump $DATABASE_URL > backups/$BACKUP_FILE
gzip backups/$BACKUP_FILE

echo "Backup created: backups/${BACKUP_FILE}.gz"
EOF

chmod +x scripts/backup-production.sh
mkdir -p backups
```

---

## ✅ VERIFICATION CHECKLIST

### Post-Setup Verification

- [ ] **Database Connection:** `npx tsx scripts/data-audit.ts` runs without errors
- [ ] **Schema Applied:** All tables created successfully
- [ ] **Indexes Created:** Performance indexes in place
- [ ] **Connection Pooling:** Enabled and configured
- [ ] **SSL Enabled:** Secure connection verified
- [ ] **Backup Strategy:** Automated backups configured
- [ ] **Monitoring:** Basic health checks working

### Production Readiness Test

```bash
cd web
npm run type-check  # Should pass
npm run build      # Should build successfully
```

---

## 🆘 TROUBLESHOOTING

### Common Issues

**Connection Timeout:**
```bash
# Check if DATABASE_URL is correct
echo $DATABASE_URL

# Test direct connection
psql $DATABASE_URL -c "SELECT version();"
```

**SSL Certificate Issues:**
```bash
# Add SSL mode to connection string
DATABASE_URL="postgresql://user:pass@host:port/db?sslmode=require"
```

**Migration Failures:**
```bash
# Reset and retry
npx prisma db push --force-reset
```

### Support Contacts
- **Supabase:** https://supabase.com/support
- **Neon:** https://neon.tech/docs/support
- **Railway:** https://help.railway.app
- **Render:** https://render.com/docs/support

---

## 🎯 NEXT STEPS AFTER DATABASE SETUP

1. **✅ Update .env.production** with DATABASE_URL
2. **✅ Run migrations** (`npm run db:push`)
3. **✅ Verify connection** (`npx tsx scripts/data-audit.ts`)
4. **✅ Create production indexes**
5. **✅ Configure monitoring and backups**
6. **🔄 Continue with QuickBooks and email setup**

**Estimated Setup Time:** 15-30 minutes
**Result:** Production-ready PostgreSQL database with optimizations, backups, and monitoring