# ngrok Setup for Database Access

## Quick Setup (for testing):
```bash
# 1. Install ngrok: https://ngrok.com/download
# 2. Create account and get auth token
# 3. Configure ngrok:
ngrok config add-authtoken YOUR_AUTH_TOKEN

# 4. Create tunnel for PostgreSQL:
ngrok tcp 5432

# 5. Note the forwarding URL (e.g., 0.tcp.ngrok.io:12345)
```

## Persistent Setup (for production):
```bash
# Create ngrok.yml config file:
version: "2"
authtoken: YOUR_AUTH_TOKEN
tunnels:
  postgres:
    addr: 5432
    proto: tcp
    hostname: your-reserved-hostname.ngrok.io  # Requires paid plan

# Start tunnel:
ngrok start postgres
```

## Render Configuration:
```env
DATABASE_URL=postgresql://username:password@0.tcp.ngrok.io:12345/asr_po_system
```

## Security Considerations:
- Free ngrok tunnels have random URLs that change
- Paid plans provide static hostnames
- Enable authentication on PostgreSQL
- Use SSL connections