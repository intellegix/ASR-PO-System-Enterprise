@echo off
echo.
echo 🚀 Starting ASR PO System Load Testing - Phase 4C Performance Validation
echo ========================================================================
echo.

REM Check if we're in the correct directory
if not exist artillery-config.yml (
    echo ❌ Artillery config not found. Please run this from the load-testing directory.
    pause
    exit /b 1
)

REM Check if Artillery is installed
npx artillery --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Artillery not found. Installing...
    npm install artillery
    if %errorlevel% neq 0 (
        echo ❌ Failed to install Artillery. Please check your npm installation.
        pause
        exit /b 1
    )
)

echo ✅ Artillery is available
echo.

REM Performance Targets
echo 🎯 Performance Targets for Phase 4C:
echo    • Dashboard load: ^< 2 seconds
echo    • Report generation: ^< 10 seconds
echo    • API response: ^< 500ms (95th percentile)
echo    • Error rate: ^< 1%%
echo.

REM Create results directory
if not exist results mkdir results

REM Check if the web server is running (optional check)
echo 🔍 Checking if web server is accessible...
curl -f http://localhost:3000/api/health >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Warning: Cannot reach web server on localhost:3000
    echo    Please ensure the development server is running:
    echo    cd web ^&^& npm run dev
    echo.
    echo    Continue anyway? (Y/N)
    set /p continue=
    if /i "%continue%" neq "Y" (
        echo Exiting...
        pause
        exit /b 1
    )
) else (
    echo ✅ Web server is responding
)
echo.

REM Run basic health check first
echo 🔍 Running quick API health check...
npx artillery quick --count 3 --num 1 http://localhost:3000/api/health
echo.

REM Get timestamp for results file
for /f "tokens=1-6 delims=/: " %%a in ("%date% %time%") do set timestamp=%%c%%a%%b-%%d%%e%%f
set timestamp=%timestamp: =0%
set results_file=results\load-test-%timestamp%.json

echo 🧪 Starting Comprehensive Load Testing...
echo ========================================================================
echo.
echo Running Artillery test suite against ASR PO System...
echo Results will be saved to: %results_file%
echo.

REM Run the main load test
npx artillery run artillery-config.yml --output %results_file%

REM Check results
if %errorlevel% equ 0 (
    echo.
    echo ✅ Load testing completed successfully!
    echo.
    echo 📊 Results Analysis:
    echo    • Detailed metrics saved to: %results_file%
    echo    • Key metrics to verify:
    echo      - Response times (p95 ^< 2000ms for dashboard, p99 ^< 10000ms for reports)
    echo      - Error rates (^< 1%%)
    echo      - Throughput and concurrent user handling
    echo.
    echo 🎯 Next Steps in Phase 4C:
    echo    • Verify Redis caching implementation
    echo    • Test PDF/Excel export functionality
    echo    • Optimize export performance for large datasets
    echo    • Create performance monitoring dashboard
    echo.
    echo Load testing results: %results_file%
) else (
    echo.
    echo ❌ Load testing failed with error code %errorlevel%
    echo.
    echo Common issues:
    echo    • Web server not running (run: cd web ^&^& npm run dev)
    echo    • Database connection issues
    echo    • API endpoints returning errors
    echo    • Artillery configuration problems
    echo.
)

echo.
echo Press any key to continue...
pause >nul