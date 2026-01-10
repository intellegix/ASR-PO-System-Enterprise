# Hybrid Deployment Testing Guide

## Pre-Deployment Testing (Local)

### 1. Verify Local System Health:
```bash
cd web

# Check TypeScript compilation
npm run type-check

# Run database migrations
npm run db:push

# Test local development server
npm run dev
```

### 2. Test Database Connection:
```bash
# Test PostgreSQL connectivity
psql "postgresql://username:password@localhost:5432/asr_po_system" -c "SELECT 1;"

# Verify all tables exist
npm run db:studio
```

## Tunnel Setup Testing

### Option 1: Test CloudFlare Tunnel
```bash
# Start tunnel
cloudflared tunnel run asr-po-db

# Test from external machine:
telnet asr-po-db.yourdomain.com 5432
```

### Option 2: Test ngrok
```bash
# Start ngrok
ngrok tcp 5432

# Test connection using ngrok URL:
psql "postgresql://username:password@0.tcp.ngrok.io:PORT/asr_po_system" -c "SELECT 1;"
```

## Render Deployment Testing

### 1. Deploy to Render:
- Set environment variables in Render dashboard
- Deploy from your git repository
- Monitor build logs for errors

### 2. Test Database Connection from Render:
```javascript
// Add this test endpoint temporarily: /api/test-db
import prisma from '@/lib/db';

export async function GET() {
  try {
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    return Response.json({ status: 'connected', result });
  } catch (error) {
    return Response.json({ status: 'error', error: error.message }, { status: 500 });
  }
}
```

### 3. Test Application Functions:
1. **Authentication**: Login with test credentials
2. **Data Retrieval**: View PO list, vendor list
3. **Data Modification**: Create test PO
4. **PDF Generation**: Download PO PDF
5. **Approval Workflow**: Test PO submission/approval

## Security Verification

### 1. SSL/TLS Verification:
```bash
# Test SSL connection
openssl s_client -connect your-db-host:5432 -starttls postgres
```

### 2. Access Control Testing:
- Verify only authorized IPs can connect
- Test with wrong credentials (should fail)
- Monitor PostgreSQL logs for connection attempts

### 3. Data Protection:
- Verify sensitive data is encrypted in transit
- Check no credentials in logs
- Test backup/restore procedures

## Monitoring Setup

### 1. Database Monitoring:
```sql
-- Monitor active connections
SELECT * FROM pg_stat_activity WHERE datname = 'asr_po_system';

-- Check for suspicious queries
SELECT query, state, client_addr FROM pg_stat_activity
WHERE client_addr IS NOT NULL AND client_addr != '127.0.0.1';
```

### 2. Application Monitoring:
- Set up error tracking (Sentry, LogRocket)
- Monitor response times
- Track failed authentication attempts

## Troubleshooting Common Issues

### Connection Refused:
1. Check firewall rules
2. Verify PostgreSQL is listening on correct interface
3. Confirm tunnel is running
4. Test with local IP first

### SSL Errors:
1. Verify SSL certificates are valid
2. Check PostgreSQL SSL configuration
3. Test with `sslmode=require` in connection string

### Performance Issues:
1. Monitor connection pooling
2. Check network latency between Render and your tower
3. Optimize queries for remote connections
4. Consider connection pooling (PgBouncer)

## Rollback Plan

If issues occur:
1. **Quick Fix**: Switch to local development mode
2. **Temporary**: Use Render's managed PostgreSQL
3. **Long-term**: Migrate to cloud database (AWS RDS, Google Cloud SQL)