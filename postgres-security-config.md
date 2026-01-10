# PostgreSQL Security Configuration for External Access

## PostgreSQL Configuration (postgresql.conf):
```conf
# Connection Settings
listen_addresses = '*'
port = 5432
max_connections = 100

# SSL Settings (REQUIRED for external access)
ssl = on
ssl_cert_file = 'server.crt'
ssl_key_file = 'server.key'
ssl_ca_file = 'ca.crt'
ssl_crl_file = ''
ssl_ciphers = 'HIGH:MEDIUM:+3DES:!aNULL'
ssl_prefer_server_ciphers = on
```

## PostgreSQL Access Control (pg_hba.conf):
```conf
# TYPE  DATABASE        USER            ADDRESS                 METHOD
# Local connections
local   all             all                                     peer
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5

# Remote connections (SECURE)
hostssl asr_po_system   render_user     0.0.0.0/0               md5
```

## Create Dedicated User:
```sql
-- Connect as postgres user
CREATE USER render_user WITH PASSWORD 'very-strong-password-here';
GRANT CONNECT ON DATABASE asr_po_system TO render_user;
GRANT USAGE ON SCHEMA public TO render_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO render_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO render_user;
```

## Windows Firewall Configuration:
```cmd
# Allow PostgreSQL through Windows Firewall
netsh advfirewall firewall add rule name="PostgreSQL" dir=in action=allow protocol=TCP localport=5432

# Or use Windows Defender Firewall GUI:
# - Inbound Rules > New Rule > Port > TCP > 5432 > Allow
```

## Router Port Forwarding:
- External Port: 5432
- Internal IP: Your tower's local IP
- Internal Port: 5432
- Protocol: TCP

## Security Warnings:
⚠️ This exposes your database to the internet
⚠️ Ensure strong passwords and SSL certificates
⚠️ Monitor logs for unauthorized access attempts
⚠️ Consider IP whitelisting if possible