# Render Environment Variables for Hybrid Setup

## For CloudFlare Tunnel Setup:
```env
DATABASE_URL=postgresql://username:password@asr-po-db.yourdomain.com:5432/asr_po_system
NEXTAUTH_SECRET=your-secure-secret-here-must-be-at-least-32-characters-long
NODE_ENV=production
```

## For Direct Connection (with SSL):
```env
DATABASE_URL=postgresql://username:password@your-public-ip:5432/asr_po_system?sslmode=require
NEXTAUTH_SECRET=your-secure-secret-here-must-be-at-least-32-characters-long
NODE_ENV=production
```

## For ngrok Tunnel:
```env
DATABASE_URL=postgresql://username:password@your-ngrok-subdomain.ngrok.io:5432/asr_po_system
NEXTAUTH_SECRET=your-secure-secret-here-must-be-at-least-32-characters-long
NODE_ENV=production
```

## Security Notes:
- Never commit actual credentials to git
- Use strong passwords for database users
- Enable SSL/TLS for database connections
- Restrict database user permissions to only necessary tables
- Monitor database logs for suspicious activity