@echo off
REM ASR Purchase Order System - Database Backup Script
REM Run this script daily to backup the production database

echo Starting ASR PO System Database Backup...

REM Set password for pg_dump (use environment variable for security)
set PGPASSWORD=ASR_Po2026_SecureRender123!

REM Create backup directory if it doesn't exist
set BACKUP_DIR=C:\ASR\Backups\PO-System
if not exist "%BACKUP_DIR%" (
    mkdir "%BACKUP_DIR%"
    echo Created backup directory: %BACKUP_DIR%
)

REM Generate timestamp for backup filename
REM Format: YYYY-MM-DD_HH-MM-SS
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "timestamp=%YYYY%-%MM%-%DD%_%HH%-%Min%-%Sec%"

REM Set backup filename
set BACKUP_FILE=%BACKUP_DIR%\asr_po_backup_%timestamp%.sql

echo Creating backup: %BACKUP_FILE%

REM Create database backup
pg_dump -h localhost -U render_user -d asr_po_system --verbose > "%BACKUP_FILE%"

if %ERRORLEVEL% == 0 (
    echo ✓ Backup completed successfully!
    echo File: %BACKUP_FILE%

    REM Get file size
    for %%A in ("%BACKUP_FILE%") do set size=%%~zA
    echo Size: %size% bytes

    REM Compress backup (optional - requires 7zip or similar)
    REM 7z a "%BACKUP_FILE%.zip" "%BACKUP_FILE%" && del "%BACKUP_FILE%"

) else (
    echo ✗ Backup failed with error code: %ERRORLEVEL%
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo Cleaning up old backups (keeping last 7 days)...

REM Remove backups older than 7 days
forfiles /p "%BACKUP_DIR%" /s /m *.sql /d -7 /c "cmd /c del @path" 2>nul
if %ERRORLEVEL% == 0 (
    echo ✓ Old backups cleaned up
) else (
    echo No old backups to clean up
)

echo.
echo Current backups:
dir "%BACKUP_DIR%\*.sql" /o-d 2>nul

echo.
echo Backup process completed at %date% %time%
echo.

REM Clear password from environment
set PGPASSWORD=

REM Uncomment to pause for manual execution
REM pause