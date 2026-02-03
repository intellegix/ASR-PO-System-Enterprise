@echo off
setlocal enabledelayedexpansion

echo ========================================
echo ASR Purchase Order System - AWS Deploy
echo ========================================
echo.

REM Configuration
set PROJECT_NAME=asr-po-system
set REGION=us-east-2
set ACCOUNT_ID=206362095382
set ECR_URI=%ACCOUNT_ID%.dkr.ecr.%REGION%.amazonaws.com/%PROJECT_NAME%

REM Step 1: Check prerequisites
echo Step 1: Checking prerequisites...
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker not available
    echo Please install Docker Desktop and try again
    exit /b 1
)
echo OK: Docker is available

aws sts get-caller-identity >nul 2>&1
if errorlevel 1 (
    echo ERROR: AWS CLI not configured
    exit /b 1
)
echo OK: AWS CLI configured
echo.

REM Step 2: ECR Login
echo Step 2: Logging into ECR...
for /f "usebackq delims=" %%i in (`aws ecr get-login-password --region %REGION%`) do set TOKEN=%%i
echo !TOKEN! | docker login --username AWS --password-stdin %ECR_URI%
if errorlevel 1 (
    echo ERROR: ECR login failed
    exit /b 1
)
echo OK: Logged into ECR
echo.

REM Step 3: Build Docker image
echo Step 3: Building Docker image...
docker build -t %PROJECT_NAME% .
if errorlevel 1 (
    echo ERROR: Docker build failed
    exit /b 1
)
echo OK: Docker image built
echo.

REM Step 4: Tag and push
echo Step 4: Tagging and pushing to ECR...
docker tag %PROJECT_NAME%:latest %ECR_URI%:latest
if errorlevel 1 (
    echo ERROR: Docker tag failed
    exit /b 1
)

docker push %ECR_URI%:latest
if errorlevel 1 (
    echo ERROR: Docker push failed
    exit /b 1
)
echo OK: Image pushed to ECR
echo.

REM Step 5: Deploy App Runner
echo Step 5: Deploying App Runner service...
aws apprunner create-service --cli-input-json file://apprunner-service-config.json --region %REGION% > deploy-result.tmp
if errorlevel 1 (
    echo ERROR: App Runner deployment failed
    type deploy-result.tmp
    exit /b 1
)
echo OK: App Runner deployment initiated
echo.

echo Waiting for deployment to complete...
echo This may take 5-10 minutes...
timeout /t 300 /nobreak >nul

REM Get service URL
for /f "usebackq delims=" %%i in (`aws apprunner list-services --region %REGION% --query "ServiceSummaryList[?ServiceName=='%PROJECT_NAME%-prod'].ServiceUrl" --output text`) do set SERVICE_URL=%%i

echo.
echo ========================================
echo DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo Application URL: https://!SERVICE_URL!
echo Health Check: https://!SERVICE_URL!/api/health
echo.
echo Next Steps:
echo 1. Test your application
echo 2. Migrate database from Render
echo 3. Configure DNS cutover
echo.

REM Cleanup
if exist deploy-result.tmp del deploy-result.tmp

pause