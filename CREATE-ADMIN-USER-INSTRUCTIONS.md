# Create Intellegix Admin User

## 🎯 Admin Account Details
- **Username**: `Intellegix` (can login with just this)
- **Email**: `Intellegix@allsurfaceroofing.com`
- **Password**: `Devops$@2026`
- **Role**: `MAJORITY_OWNER` (Full Admin Access)
- **Access**: System-wide admin, all permissions

## 🔧 Method 1: SQL Script (Recommended)

### Steps:
1. **Start your local PostgreSQL database**
2. **Connect to your database**:
   ```bash
   psql -d po_system -U your_username
   ```

3. **Run the SQL script**:
   ```bash
   \i create-admin-user.sql
   ```

   Or copy/paste the contents of `create-admin-user.sql` into your database client.

4. **Verify creation**: The script will show a success message with login details

## 🌐 Method 2: API Endpoint (If Backend Running)

### Steps:
1. **Start the local backend server**:
   ```bash
   cd web
   npm run dev
   ```

2. **Run the API script**:
   ```bash
   chmod +x create-admin-via-api.sh
   ./create-admin-via-api.sh
   ```

   Or manually make the API call:
   ```bash
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
   ```

## 🚀 Login Instructions

Once the admin user is created, you can login to the system using either:

### Option 1: Username Only
- **Username**: `Intellegix`
- **Password**: `Devops$@2026`

The system will automatically append `@allsurfaceroofing.com` to make it `Intellegix@allsurfaceroofing.com`

### Option 2: Full Email
- **Email**: `Intellegix@allsurfaceroofing.com`
- **Password**: `Devops$@2026`

## 🌍 Login URLs

### Local Development:
`http://localhost:3000/login`

### Live Render Deployment:
`https://asr-po-system-frontend.onrender.com/login`

## 🔑 Admin Capabilities

With `MAJORITY_OWNER` role, the Intellegix account has:
- ✅ Create, edit, delete purchase orders
- ✅ Approve/reject purchase orders at any level
- ✅ Access all divisions and projects
- ✅ Manage users and permissions
- ✅ View all reports and analytics
- ✅ System administration functions
- ✅ Full audit log access

## 🛠️ Files Created

- `create-admin-user.sql` - Direct database script
- `web/scripts/generate-password-hash.js` - Password hash generator
- `web/create-admin-via-api.sh` - API-based creation script
- `CREATE-ADMIN-USER-INSTRUCTIONS.md` - This instruction file

## ✅ Success Verification

After creation, test the login:
1. Go to the login page
2. Enter `Intellegix` as username
3. Enter `Devops$@2026` as password
4. Verify full admin access to all system features

## 🔐 Security Notes

- Password uses special characters and meets security requirements
- Account has system-wide access - protect credentials carefully
- Can be used for emergency access to the system
- No division restrictions - has access to all company data