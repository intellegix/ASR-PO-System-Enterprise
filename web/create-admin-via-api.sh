#!/bin/bash

# Create Admin User via API (if backend server is running)
echo "🚀 Creating Intellegix admin user via API..."

# Check if local server is running
if ! curl -f -s http://localhost:3000/api/health > /dev/null; then
    echo "❌ Local backend server not running"
    echo "💡 Start with: cd web && npm run dev"
    echo "📁 Or run the SQL script directly: create-admin-user.sql"
    exit 1
fi

# Create the admin user
curl -X POST http://localhost:3000/api/admin/create-user \
  -H "Content-Type: application/json" \
  -d '{
    "email": "Intellegix@allsurfaceroofing.com",
    "password": "Devops$@2026",
    "firstName": "Intellegix",
    "lastName": "Admin",
    "role": "MAJORITY_OWNER",
    "isActive": true
  }'

echo ""
echo "✅ Admin user creation request sent!"
echo ""
echo "🎯 Login credentials:"
echo "   Username: Intellegix"
echo "   Password: Devops$@2026"
echo "   Access: Full Admin (MAJORITY_OWNER)"