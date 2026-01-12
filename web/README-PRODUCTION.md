# ASR Purchase Order System - Production Deployment Guide

**Version**: 4.0.0 (Phase 4 - Production Ready)
**Last Updated**: January 9, 2026
**Target Audience**: System Administrators, DevOps Engineers

---

## 🚀 Production Deployment Overview

This guide covers the complete production deployment of the ASR Purchase Order System, an enterprise-grade business intelligence platform with 6 comprehensive business reports, real-time dashboards, and complete QuickBooks integration.

### System Requirements

#### Minimum Hardware Requirements
- **CPU**: 2 cores (4+ recommended)
- **RAM**: 4GB (8GB+ recommended)
- **Storage**: 50GB SSD (NVMe preferred)
- **Network**: Stable internet connection with low latency to database

#### Recommended Production Infrastructure
- **Application Server**: 4+ CPU cores, 8GB+ RAM, NVMe SSD
- **Database Server**: Separate instance, 2+ cores, 4GB+ RAM, SSD storage
- **Load Balancer**: For high availability (optional for single instance)

---

## 📋 Environment Variables Reference

### Required Configuration

| Variable | Purpose | Example | Security Level |
|----------|---------|---------|----------------|
| `NODE_ENV` | Application environment | `production` | Low |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db?sslmode=require` | **HIGH** |
| `NEXTAUTH_SECRET` | JWT signing secret | 64-character random hex string | **CRITICAL** |
| `NEXT_PUBLIC_APP_URL` | Public application URL | `https://po.allsurfaceroofing.com` | Low |

### QuickBooks Integration (Required)

| Variable | Purpose | Example | Security Level |
|----------|---------|---------|----------------|
| `QB_CLIENT_ID` | QuickBooks app client ID | `Q0123456789abcdef` | **HIGH** |
| `QB_CLIENT_SECRET` | QuickBooks app secret | `abcdef123456789` | **CRITICAL** |
| `QB_ENVIRONMENT` | QB environment | `production` ⚠️ | Medium |
| `QB_REDIRECT_URI` | OAuth callback URL | `https://domain.com/api/quickbooks/auth/callback` | Medium |

### Email Configuration (Required)

| Variable | Purpose | Example | Security Level |
|----------|---------|---------|----------------|
| `SMTP_HOST` | Email server host | `smtp.gmail.com` | Medium |
| `SMTP_PORT` | Email server port | `587` | Low |
| `SMTP_USER` | Email username | `noreply@company.com` | Medium |
| `SMTP_PASS` | Email password/token | App-specific password | **HIGH** |
| `EMAIL_FROM` | From email address | `noreply@allsurfaceroofing.com` | Low |

### Company Information

| Variable | Purpose | Example | Security Level |
|----------|---------|---------|----------------|
| `COMPANY_NAME` | Company name for PDFs | `All Surface Roofing & Waterproofing, Inc.` | Low |
| `COMPANY_EMAIL` | Company contact email | `purchasing@allsurfaceroofing.com` | Low |
| `COMPANY_PHONE` | Company phone number | `(555) 123-4567` | Low |
| `COMPANY_ADDRESS1` | Company address line 1 | `1234 Construction Way` | Low |
| `COMPANY_ADDRESS2` | Company address line 2 | `Los Angeles, CA 90001` | Low |

### Performance & Monitoring

| Variable | Purpose | Default | Notes |
|----------|---------|---------|-------|
| `ENABLE_PERFORMANCE_PROFILING` | Enable performance monitoring | `true` | Recommended for production |

---

## 🔒 Secrets Management

### Environment Variable Security Levels

#### **CRITICAL** - Never expose, rotate regularly
- `NEXTAUTH_SECRET` - JWT signing key
- `QB_CLIENT_SECRET` - QuickBooks application secret
- Database passwords in `DATABASE_URL`

#### **HIGH** - Restrict access, monitor usage
- `QB_CLIENT_ID` - QuickBooks application ID
- `SMTP_PASS` - Email service credentials
- Database usernames and connection details

#### **MEDIUM** - Internal information, limit exposure
- `SMTP_HOST`, `SMTP_USER` - Email configuration
- `QB_REDIRECT_URI` - OAuth callback URL

#### **LOW** - Public or semi-public information
- `COMPANY_*` variables - Used in PDFs and public communications
- `NEXT_PUBLIC_APP_URL` - Publicly accessible URL

### Best Practices

1. **Use Secrets Management Service**
   - Azure Key Vault, AWS Secrets Manager, or HashiCorp Vault
   - Never store secrets in environment files in production
   - Implement secret rotation policies

2. **Environment Variable Security**
   ```bash
   # Generate secure NEXTAUTH_SECRET
   openssl rand -hex 32

   # Ensure .env.production is not in git
   echo ".env.production" >> .gitignore

   # Set restrictive file permissions
   chmod 600 .env.production
   ```

3. **Database Connection Security**
   ```bash
   # Always use SSL in production
   DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require&connection_limit=20
   ```

---

## 🗄️ Database Configuration

### Production Database Setup

#### PostgreSQL Configuration
```sql
-- Create production database
CREATE DATABASE asr_po_system_prod;

-- Create dedicated user with limited privileges
CREATE USER po_system_prod WITH PASSWORD 'secure_random_password';

-- Grant only necessary permissions
GRANT CONNECT ON DATABASE asr_po_system_prod TO po_system_prod;
GRANT USAGE ON SCHEMA public TO po_system_prod;
GRANT CREATE ON SCHEMA public TO po_system_prod;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO po_system_prod;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO po_system_prod;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO po_system_prod;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO po_system_prod;
```

#### Connection Pooling
- **Recommended Pool Size**: 20-30 connections
- **Connection URL Format**: `?connection_limit=20`
- **SSL Required**: `?sslmode=require`

#### Database Optimization
```typescript
// Automatic index creation is available
import { DatabaseOptimizer } from '@/lib/performance/database-optimization';

// Run once after deployment
await DatabaseOptimizer.createOptimalIndexes();
```

### Database Security Checklist

- [ ] Use dedicated database user with minimal privileges
- [ ] Enable SSL/TLS encryption for all connections
- [ ] Configure connection pooling (20-30 connections)
- [ ] Set up automated backups (daily minimum, 30-day retention)
- [ ] Enable query logging for security monitoring
- [ ] Configure firewall rules (restrict to application server IPs)
- [ ] Regular security updates and patches
- [ ] Monitor for unusual query patterns

---

## 🔐 Security Configuration

### Application Security

#### Authentication & Authorization
- **NextAuth.js** with secure JWT tokens
- **Role-based access control**: MAJORITY_OWNER, DIVISION_LEADER, OPERATIONS_MANAGER, ACCOUNTING
- **Session management** with automatic expiration
- **Password hashing** with bcrypt (12 rounds)

#### API Security
- **Rate limiting**: 200 requests per minute per IP
- **Input validation**: Zod schemas for all endpoints
- **SQL injection protection**: Parameterized queries via Prisma
- **XSS protection**: Content Security Policy headers
- **CSRF protection**: Built into NextAuth.js

#### Data Security
- **Audit trail**: Complete PO lifecycle tracking
- **IP address logging**: Security compliance
- **Data encryption**: At rest and in transit
- **Secure file handling**: PDF generation with validation

### Production Security Checklist

- [ ] Generate cryptographically secure `NEXTAUTH_SECRET` (64+ chars)
- [ ] Configure HTTPS with valid SSL certificate
- [ ] Enable HTTP Strict Transport Security (HSTS)
- [ ] Set up Content Security Policy (CSP) headers
- [ ] Configure secure cookie settings
- [ ] Enable audit logging for all financial transactions
- [ ] Set up intrusion detection monitoring
- [ ] Regular security vulnerability scans
- [ ] Implement backup encryption
- [ ] Configure log retention policies

---

## 🔌 Third-Party Integrations

### QuickBooks Integration

#### Production Setup
1. **Create QuickBooks App**
   - Log in to [Intuit Developer Dashboard](https://developer.intuit.com/)
   - Create production app (separate from development)
   - Note: Production apps require business verification

2. **Configuration**
   ```env
   QB_CLIENT_ID=your_production_app_id
   QB_CLIENT_SECRET=your_production_app_secret
   QB_ENVIRONMENT=production
   QB_REDIRECT_URI=https://your-domain.com/api/quickbooks/auth/callback
   ```

3. **Features**
   - OAuth 2.0 authentication
   - Automatic PO to Bill synchronization
   - GL account mapping and validation
   - Real-time data sync with error handling

#### Security Considerations
- QuickBooks tokens are encrypted and stored securely
- Automatic token refresh handling
- Comprehensive error logging and retry logic
- Rate limiting compliance with Intuit's API limits

### Email Service Integration

#### Production SMTP
```env
# Gmail Business (recommended)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@yourcompany.com
SMTP_PASS=app-specific-password

# Microsoft 365
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
```

#### Email Features
- **Professional templates** with company branding
- **Multi-recipient support** with role-based routing
- **Lifecycle automation** for PO status changes
- **PDF attachments** for vendor communications

---

## 📊 Performance Monitoring

### Built-in Performance Framework

The system includes comprehensive performance monitoring:

#### Performance Metrics
- **Dashboard load time**: Target < 2 seconds
- **Report generation**: Target < 10 seconds
- **API response time**: Target < 500ms (95th percentile)
- **Concurrent users**: Supports 100+ simultaneous users

#### Load Testing
```bash
# Run complete load testing suite
./load-testing/run-load-tests.sh

# Specific test types
./load-testing/run-load-tests.sh stress      # High load testing
./load-testing/run-load-tests.sh baseline   # Normal load baseline
```

#### Monitoring Tools
- **Winston logging** with structured JSON output
- **Performance profiling** with detailed timing
- **Database optimization** with automatic indexing
- **Caching strategy** with Redis integration

### Production Monitoring Setup

1. **Enable Performance Profiling**
   ```env
   ENABLE_PERFORMANCE_PROFILING=true
   ```

2. **Configure Log Retention**
   - Error logs: 30 days minimum
   - Audit logs: 7 years (financial compliance)
   - Performance logs: 90 days

3. **Set up Alerting**
   - API response time > 2 seconds
   - Error rate > 5%
   - Database connection failures
   - QuickBooks sync failures

---

## 🚀 Deployment Process

### Pre-Deployment Checklist

#### Environment Preparation
- [ ] Production database configured and accessible
- [ ] SSL certificate installed and valid
- [ ] DNS records pointing to production server
- [ ] All environment variables configured
- [ ] Secrets management system in place
- [ ] Backup procedures tested

#### Application Preparation
- [ ] TypeScript compilation successful (zero errors)
- [ ] Load testing completed successfully
- [ ] Security audit passed
- [ ] Performance benchmarks met
- [ ] QuickBooks integration tested in sandbox
- [ ] Email notifications verified

### Deployment Steps

#### 1. Server Preparation
```bash
# Install Node.js 18+ and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Create application user
sudo useradd -m -s /bin/bash poapp
sudo mkdir -p /opt/asr-po-system
sudo chown poapp:poapp /opt/asr-po-system
```

#### 2. Application Deployment
```bash
# Clone and build application
cd /opt/asr-po-system
git clone https://github.com/your-repo/asr-po-system.git .
npm ci --only=production
npm run build

# Set up environment
sudo cp .env.production.example .env.production
sudo nano .env.production  # Configure with actual values
sudo chown poapp:poapp .env.production
sudo chmod 600 .env.production
```

#### 3. Database Migration
```bash
# Run Prisma migrations
npx prisma migrate deploy

# Create optimal database indexes
npm run db:optimize
```

#### 4. Process Management
```bash
# Start application with PM2
pm2 start npm --name "asr-po-system" -- start
pm2 startup
pm2 save

# Configure log rotation
pm2 install pm2-logrotate
```

#### 5. Reverse Proxy (Nginx)
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Post-Deployment Verification

#### System Health Checks
```bash
# Verify application is running
curl https://your-domain.com/api/health

# Check database connectivity
npm run db:verify

# Test QuickBooks integration
curl https://your-domain.com/api/quickbooks/status

# Verify email functionality
npm run test:email
```

#### Functional Testing
- [ ] User login/logout functionality
- [ ] PO creation and approval workflow
- [ ] All 6 business reports generate correctly
- [ ] PDF/Excel exports work properly
- [ ] Email notifications send successfully
- [ ] QuickBooks sync completes without errors
- [ ] Audit trail captures all actions

---

## 🔄 Backup & Disaster Recovery

### Automated Backup Strategy

#### Database Backups
```bash
#!/bin/bash
# Daily backup script
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > /backups/asr_po_system_$DATE.sql
gzip /backups/asr_po_system_$DATE.sql

# Retain backups for 30 days
find /backups -name "*.sql.gz" -mtime +30 -delete
```

#### Application Backups
- **Code**: Git repository with tagged releases
- **Environment Config**: Secure backup of environment variables
- **Uploaded Files**: File system backup with versioning
- **Logs**: Archive audit logs for compliance (7 years)

### Disaster Recovery Plan

#### RTO/RPO Objectives
- **Recovery Time Objective (RTO)**: 4 hours
- **Recovery Point Objective (RPO)**: 24 hours

#### Recovery Procedures
1. **Database Recovery**: Restore from latest backup
2. **Application Recovery**: Deploy from Git with known good configuration
3. **Data Validation**: Verify data integrity and QuickBooks sync status
4. **User Communication**: Notify stakeholders of system status

---

## 🛠️ Maintenance & Operations

### Regular Maintenance Tasks

#### Daily
- [ ] Monitor application logs for errors
- [ ] Check system resource usage (CPU, memory, disk)
- [ ] Verify backup completion
- [ ] Monitor QuickBooks sync status

#### Weekly
- [ ] Review performance metrics and trends
- [ ] Check for software security updates
- [ ] Analyze slow query logs
- [ ] Verify SSL certificate status

#### Monthly
- [ ] Run comprehensive load testing
- [ ] Update performance benchmarks
- [ ] Security vulnerability assessment
- [ ] Database maintenance (analyze, vacuum)

#### Quarterly
- [ ] Capacity planning review
- [ ] Disaster recovery test
- [ ] Security audit
- [ ] Performance optimization review

### Troubleshooting Guide

#### Common Issues

**Database Connection Failures**
```bash
# Check database connectivity
psql $DATABASE_URL -c "SELECT 1;"

# Verify connection pool status
pm2 logs asr-po-system | grep "database"
```

**QuickBooks Sync Issues**
```bash
# Check QB token status
curl -H "Authorization: Bearer $TOKEN" https://your-domain.com/api/quickbooks/status

# Review sync logs
tail -f logs/audit.log | grep "quickbooks"
```

**Performance Issues**
```bash
# Run performance analysis
npm run performance:analyze

# Check resource usage
top -p $(pgrep -f "asr-po-system")
```

### Log Analysis

#### Log Locations
- **Application Logs**: `logs/combined.log`
- **Error Logs**: `logs/error.log`
- **Audit Logs**: `logs/audit.log`
- **PM2 Logs**: `~/.pm2/logs/`

#### Important Log Events
- Authentication attempts and failures
- PO creation, approval, and status changes
- QuickBooks synchronization events
- Database performance warnings
- Security-related events

---

## 🏗️ Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     ASR Purchase Order System                   │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (Next.js App Router)                                 │
│  ├── React Components                                          │
│  ├── Progressive Web App (PWA)                                 │
│  └── Real-time Dashboard                                       │
├─────────────────────────────────────────────────────────────────┤
│  Backend API (Next.js API Routes)                              │
│  ├── Authentication (NextAuth.js)                              │
│  ├── Business Logic & Validation                               │
│  ├── PDF Generation (Puppeteer)                                │
│  └── Email Service (Nodemailer)                                │
├─────────────────────────────────────────────────────────────────┤
│  Database Layer                                                │
│  ├── PostgreSQL (Primary Data)                                 │
│  ├── Prisma ORM (Type-safe queries)                            │
│  └── Redis Cache (Optional - Performance)                      │
├─────────────────────────────────────────────────────────────────┤
│  External Integrations                                         │
│  ├── QuickBooks Online API                                     │
│  ├── SMTP Email Service                                        │
│  └── Performance Monitoring                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Key Features Delivered

#### Business Intelligence Platform (6 Reports)
1. **GL Analysis**: Cost center and budget variance analysis
2. **Vendor Analysis**: Performance metrics and compliance
3. **Budget vs Actual**: Project budget monitoring
4. **Approval Bottleneck**: Workflow optimization
5. **PO Summary**: Comprehensive purchase order analytics
6. **Project Details**: Cost tracking and resource utilization

#### Enterprise Features
- **Real-time Dashboards** with KPI monitoring
- **Role-based Access Control** with 4 user roles
- **Complete Audit Trail** with compliance export
- **Email Automation** with professional templates
- **Mobile Progressive Web App** with offline support
- **QuickBooks Integration** with OAuth 2.0
- **Performance Framework** with load testing
- **Enterprise PDF Generation** with error handling

---

## 📞 Support & Contacts

### Technical Support
- **System Administrator**: [Your IT Contact]
- **Database Administrator**: [DBA Contact]
- **QuickBooks Integration**: [Accounting Contact]

### Business Contacts
- **Project Owner**: Austin Kidwell (CEO, ASR Inc)
- **Primary Users**: Division Leaders, Accounting Team
- **Training Coordinator**: [Training Contact]

### External Services
- **QuickBooks Support**: Intuit Developer Support
- **Email Service**: [Your SMTP Provider Support]
- **Hosting Provider**: [Your Hosting Provider]

---

## 📈 Performance Benchmarks

### Target Performance Metrics
- **Dashboard Load Time**: < 2 seconds ✅
- **Report Generation**: < 10 seconds for yearly data ✅
- **API Response Time**: < 500ms for 95th percentile ✅
- **Concurrent Users**: Support 100+ simultaneous users ✅
- **System Uptime**: > 99.9% target
- **Error Rate**: < 5% under normal load

### Load Testing Results
Run the comprehensive load testing suite to validate performance:
```bash
./load-testing/run-load-tests.sh
```

Results are documented in `/load-testing/results/` with detailed performance analysis and recommendations.

---

*This production guide ensures the ASR Purchase Order System is deployed with enterprise-grade security, performance, and reliability. The system delivers a complete business intelligence platform ready for internal ASR staff deployment.*