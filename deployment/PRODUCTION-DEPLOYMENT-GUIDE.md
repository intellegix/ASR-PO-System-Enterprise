# ASR Purchase Order System - Production Deployment Guide

**Phase 4D - Deployment Setup**
**Document Version**: 1.0.0
**Last Updated**: 2024-01-12

## 🎯 Overview

This guide provides comprehensive instructions for deploying the ASR Purchase Order System to production environment. The system has been validated through Phase 4C Performance Testing and is ready for enterprise production deployment.

## 📋 Pre-Deployment Checklist

### ✅ System Requirements

**Server Specifications (Minimum)**:
- **CPU**: 2 cores (4 cores recommended)
- **Memory**: 4GB RAM (8GB recommended)
- **Storage**: 50GB SSD (100GB recommended)
- **Network**: 1Gbps connection
- **OS**: Ubuntu 20.04 LTS or similar

**Database Requirements**:
- **PostgreSQL**: 14+ (15+ recommended)
- **Storage**: 20GB (with growth planning)
- **Connections**: 200 concurrent connections
- **Backup Storage**: 3x database size

**Redis Requirements**:
- **Memory**: 512MB (1GB recommended)
- **Persistence**: AOF + RDB enabled
- **Network**: Low latency to application server

### ✅ Dependencies Verification

```bash
# Verify Node.js version
node --version  # Should be v18+

# Verify PostgreSQL
psql --version  # Should be 14+

# Verify Redis
redis-cli --version  # Should be 6+

# Verify Docker (if using containers)
docker --version
docker-compose --version
```

### ✅ Environment Preparation

1. **Domain & SSL**: Ensure domain is configured with valid SSL certificate
2. **Environment Variables**: Configure all production environment variables
3. **Database**: Create production database with proper permissions
4. **Redis**: Set up Redis instance with authentication
5. **SMTP**: Configure email service for notifications
6. **Monitoring**: Set up monitoring endpoints and alerting

## 🚀 Deployment Methods

### Method 1: Docker Deployment (Recommended)

#### Step 1: Prepare Environment

```bash
# Clone repository
git clone https://github.com/your-org/asr-po-system.git
cd asr-po-system

# Copy production environment file
cp deployment/production-env.example .env.production

# Edit environment variables
nano .env.production
```

#### Step 2: Build Production Image

```bash
# Build Docker image
docker build -f deployment/Dockerfile.production -t asr-po-system:latest ./web

# Verify image
docker images | grep asr-po-system
```

#### Step 3: Deploy with Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    image: asr-po-system:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - postgres
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: asr_po_production
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./deployment/database-production-setup.sql:/docker-entrypoint-initdb.d/setup.sql
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    command: redis-server /usr/local/etc/redis/redis.conf
    volumes:
      - ./deployment/redis-production-config.conf:/usr/local/etc/redis/redis.conf
      - redis_data:/data
    ports:
      - "6379:6379"

volumes:
  postgres_data:
  redis_data:
```

```bash
# Deploy
docker-compose -f docker-compose.prod.yml up -d

# Verify deployment
docker-compose -f docker-compose.prod.yml ps
```

### Method 2: Platform-as-a-Service (Vercel/Render/Railway)

#### Vercel Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to production
cd web
vercel --prod

# Configure environment variables in Vercel dashboard
# Add all variables from production-env.example
```

#### Render Deployment

```yaml
# render.yaml
services:
  - type: web
    name: asr-po-system
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: asr-po-db
          property: connectionString

databases:
  - name: asr-po-db
    databaseName: asr_po_production
    postgresMajorVersion: 15
```

## 🔧 Database Setup

### Step 1: Create Production Database

```sql
-- Connect as superuser
CREATE DATABASE asr_po_production;
CREATE USER asr_po_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE asr_po_production TO asr_po_user;

-- Connect to application database
\c asr_po_production

-- Create application schema
\i deployment/database-production-setup.sql
```

### Step 2: Run Database Migrations

```bash
# Navigate to web directory
cd web

# Run Prisma migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Seed initial data (if needed)
npx prisma db seed
```

### Step 3: Verify Database Setup

```sql
-- Check tables exist
\dt

-- Verify indexes
SELECT indexname, indexdef FROM pg_indexes
WHERE schemaname = 'public' AND indexname LIKE 'idx_%';

-- Check performance settings
SELECT name, setting FROM pg_settings
WHERE name IN ('shared_buffers', 'work_mem', 'max_connections');
```

## 📊 Redis Setup

### Step 1: Configure Redis

```bash
# Copy Redis configuration
sudo cp deployment/redis-production-config.conf /etc/redis/redis.conf

# Start Redis with configuration
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify Redis is running
redis-cli ping
```

### Step 2: Test Cache Integration

```bash
# Test Redis connectivity from application
curl https://your-domain.com/api/health/cache

# Expected response:
# {"status":"healthy","redis":true,"fallback":true}
```

## 🔐 Security Configuration

### Step 1: SSL/TLS Setup

```nginx
# /etc/nginx/sites-available/asr-po-system
server {
    listen 443 ssl http2;
    server_name asr-po.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/asr-po.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/asr-po.yourdomain.com/privkey.pem;

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
        proxy_read_timeout 300s;
    }

    location /api/health {
        proxy_pass http://localhost:3000;
        access_log off;
    }
}

server {
    listen 80;
    server_name asr-po.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

### Step 2: Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw deny 3000  # Don't expose app port directly
sudo ufw deny 5432  # Don't expose database port
sudo ufw deny 6379  # Don't expose Redis port
sudo ufw enable
```

### Step 3: Application Security

```bash
# Set proper file permissions
chmod 600 .env.production
chown app:app .env.production

# Secure backup directory
chmod 750 /var/backups/asr-po-system
chown root:backup /var/backups/asr-po-system
```

## 📈 Monitoring Setup

### Step 1: Health Checks

```bash
# Verify all health check endpoints
curl https://asr-po.yourdomain.com/api/health
curl https://asr-po.yourdomain.com/api/health/database
curl https://asr-po.yourdomain.com/api/health/cache
curl https://asr-po.yourdomain.com/api/health/integrations
```

### Step 2: Uptime Monitoring

Configure UptimeRobot or similar service with endpoints from `monitoring-alerting-config.yml`.

### Step 3: Performance Monitoring

```bash
# Set up performance monitoring endpoint
curl https://asr-po.yourdomain.com/api/monitoring/performance

# Verify metrics collection
curl https://asr-po.yourdomain.com/admin/performance-dashboard
```

## 💾 Backup Configuration

### Step 1: Set up Automated Backups

```bash
# Copy backup script
sudo cp deployment/backup-automation.sh /usr/local/bin/asr-backup
sudo chmod +x /usr/local/bin/asr-backup

# Configure environment for backups
sudo cp deployment/backup-env /etc/environment

# Set up cron job
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/asr-backup
```

### Step 2: Test Backup System

```bash
# Run manual backup
sudo /usr/local/bin/asr-backup

# Verify backup files
ls -la /var/backups/asr-po-system/

# Test restore procedure
# Note: Only run this on non-production database!
# pg_restore --clean --if-exists -d test_db backup_file.sql.gz
```

## 🧪 Post-Deployment Verification

### Step 1: Functional Testing

```bash
# Test application startup
curl -f https://asr-po.yourdomain.com/

# Test authentication
curl -X POST https://asr-po.yourdomain.com/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Test API endpoints
curl https://asr-po.yourdomain.com/api/po/list
curl https://asr-po.yourdomain.com/api/dashboards/kpi-metrics

# Test report generation
curl "https://asr-po.yourdomain.com/api/reports/po-summary?format=csv"
```

### Step 2: Performance Validation

```bash
# Run load tests from deployment environment
cd load-testing
npm install -g artillery
artillery run artillery-config.yml --target https://asr-po.yourdomain.com
```

### Step 3: Integration Testing

```bash
# Test QuickBooks integration
curl https://asr-po.yourdomain.com/api/quickbooks/test-connection

# Test email notifications
curl -X POST https://asr-po.yourdomain.com/api/test/send-email

# Test export functionality
curl "https://asr-po.yourdomain.com/api/reports/vendor-analysis?format=pdf"
```

## 🔄 Rollback Procedures

### Emergency Rollback (< 5 minutes)

```bash
# Docker rollback
docker-compose -f docker-compose.prod.yml down
docker tag asr-po-system:previous asr-po-system:latest
docker-compose -f docker-compose.prod.yml up -d

# Verify rollback
curl https://asr-po.yourdomain.com/api/health
```

### Database Rollback (CRITICAL - Use with extreme caution)

```bash
# Stop application
docker-compose -f docker-compose.prod.yml stop app

# Restore database from backup
pg_restore --clean --if-exists \
  -h localhost -p 5432 -U postgres \
  -d asr_po_production \
  /var/backups/asr-po-system/backup_file.sql.gz

# Restart application
docker-compose -f docker-compose.prod.yml start app
```

### Application Configuration Rollback

```bash
# Revert to previous environment configuration
cp .env.production.backup .env.production

# Restart application
docker-compose -f docker-compose.prod.yml restart app
```

## 📞 Support and Troubleshooting

### Common Issues

**Application won't start:**
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs app

# Check environment variables
docker exec -it asr-po-system env | grep NODE_ENV

# Verify database connection
docker exec -it asr-po-system npm run db:check
```

**Database connection issues:**
```bash
# Test database connectivity
pg_isready -h localhost -p 5432

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log

# Verify database permissions
psql -h localhost -U asr_po_user -d asr_po_production -c "SELECT 1;"
```

**Performance issues:**
```bash
# Check system resources
htop
df -h
free -h

# Check application performance
curl https://asr-po.yourdomain.com/api/monitoring/performance

# Check database performance
psql -d asr_po_production -c "SELECT * FROM v_performance_metrics;"
```

### Emergency Contacts

- **System Administrator**: admin@yourdomain.com
- **Development Team**: dev-team@yourdomain.com
- **Database Administrator**: dba@yourdomain.com
- **24/7 Support**: +1-XXX-XXX-XXXX

### Escalation Procedures

1. **Level 1**: Check monitoring dashboard and logs
2. **Level 2**: Contact system administrator
3. **Level 3**: Engage development team
4. **Level 4**: Consider rollback procedures
5. **Level 5**: Contact emergency support

## 📚 Additional Resources

- **Performance Monitoring Dashboard**: https://asr-po.yourdomain.com/admin/performance
- **System Health Dashboard**: https://asr-po.yourdomain.com/api/health
- **Load Testing Results**: `load-testing/results/`
- **Backup Reports**: `/var/backups/asr-po-system/`
- **Application Logs**: `docker-compose logs -f app`

---

**Document Prepared By**: ASR DevOps Team
**Review Cycle**: Quarterly
**Next Review**: 2024-04-12

**Deployment Status**: ✅ Ready for Production

This guide ensures a successful, secure, and monitored deployment of the ASR Purchase Order System to production environment with full enterprise capabilities.