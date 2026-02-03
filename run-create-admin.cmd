@echo off
echo ====================================
echo  Creating Intellegix Admin User
echo ====================================
echo.

REM Check if PostgreSQL is available
where psql >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ PostgreSQL psql command not found
    echo 💡 Please install PostgreSQL or add it to your PATH
    echo 📁 Alternative: Run the SQL manually in your database client
    echo.
    echo SQL file location: create-admin-user.sql
    echo.
    pause
    exit /b 1
)

echo 🔍 PostgreSQL found, attempting to connect...
echo.

REM Try to connect and run the SQL script
echo 💡 You may need to enter your database password...
psql -d po_system -U postgres -f create-admin-user.sql

if %errorlevel% equ 0 (
    echo.
    echo ✅ Admin user created successfully!
    echo.
    echo 🎯 Login Credentials:
    echo    Username: Intellegix
    echo    Password: Devops$@2026
    echo    Role: MAJORITY_OWNER (Full Admin)
    echo.
    echo 🌐 Login URLs:
    echo    Local: http://localhost:3000/login
    echo    Live: https://asr-po-system-frontend.onrender.com/login
    echo.
) else (
    echo.
    echo ❌ Failed to create admin user
    echo 💡 Common solutions:
    echo    1. Start PostgreSQL service
    echo    2. Create database: createdb po_system
    echo    3. Check connection string in .env.local
    echo    4. Run SQL manually in pgAdmin or other client
    echo.
)

pause