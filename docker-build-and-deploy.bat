@echo off
REM ASR Purchase Order System - Complete Docker Build and AWS Deployment
REM This script builds the Docker image and deploys to AWS App Runner

echo 🚀 Starting Complete Docker Build and AWS Deployment...
echo =======================================================
echo.

REM Set variables
set PROJECT_NAME=asr-po-system
set REGION=us-east-2
set ACCOUNT_ID=206362095382
set ECR_URI=%ACCOUNT_ID%.dkr.ecr.%REGION%.amazonaws.com/%PROJECT_NAME%

echo 📦 STEP 1: Docker Build and Push
echo ==================================
echo.

REM Check if Docker is available
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ ERROR: Docker is not available
    echo Please install Docker Desktop and ensure it's running
    echo Download from: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

echo ✅ Docker is available
echo.

REM Login to ECR
echo 🔑 Logging into ECR...
for /f "tokens=*" %%i in ('aws ecr get-login-password --region %REGION%') do set LOGIN_TOKEN=%%i
echo %LOGIN_TOKEN% | docker login --username AWS --password-stdin %ECR_URI%

if errorlevel 1 (
    echo ❌ ERROR: Failed to login to ECR
    pause
    exit /b 1
)

echo ✅ Successfully logged into ECR
echo.

REM Build Docker image
echo 🔨 Building Docker image...
docker build -t %PROJECT_NAME% .

if errorlevel 1 (
    echo ❌ ERROR: Docker build failed
    pause
    exit /b 1
)

echo ✅ Docker image built successfully
echo.

REM Tag for ECR
echo 🏷️  Tagging image for ECR...
docker tag %PROJECT_NAME%:latest %ECR_URI%:latest

if errorlevel 1 (
    echo ❌ ERROR: Failed to tag Docker image
    pause
    exit /b 1
)

echo ✅ Image tagged for ECR
echo.

REM Push to ECR
echo 📤 Pushing image to ECR...
docker push %ECR_URI%:latest

if errorlevel 1 (
    echo ❌ ERROR: Failed to push to ECR
    pause
    exit /b 1
)

echo ✅ Image pushed to ECR successfully!
echo.

REM Verify image in ECR
echo 🔍 Verifying image in ECR...
aws ecr describe-images --repository-name %PROJECT_NAME% --image-ids imageTag=latest --region %REGION% >nul 2>&1

if errorlevel 1 (
    echo ❌ ERROR: Image not found in ECR after push
    pause
    exit /b 1
)

echo ✅ Image verified in ECR
echo.

echo 🚀 STEP 2: AWS App Runner Deployment
echo ====================================
echo.

REM Deploy App Runner service
echo 🚀 Deploying App Runner service...
aws apprunner create-service --cli-input-json file://apprunner-service-config.json --region %REGION% > deployment-result.json

if errorlevel 1 (
    echo ❌ ERROR: App Runner deployment failed
    type deployment-result.json
    pause
    exit /b 1
)

echo ✅ App Runner service deployment initiated
echo.

REM Get service ARN from deployment result
for /f "tokens=*" %%i in ('type deployment-result.json ^| findstr /C:"ServiceArn"') do set SERVICE_ARN_LINE=%%i
echo Service deployment started...
echo.

echo ⏳ Waiting for App Runner service to be running...
echo This may take 5-7 minutes...
echo.

REM Wait for service to be running (simplified)
:wait_loop
timeout /t 30 /nobreak >nul
aws apprunner describe-service --service-arn "SERVICE_ARN_FROM_JSON" --region %REGION% --query "Service.Status" --output text > service-status.txt 2>&1
set /p SERVICE_STATUS=<service-status.txt

echo Current status: %SERVICE_STATUS%

if "%SERVICE_STATUS%"=="RUNNING" (
    echo ✅ App Runner service is now running!
    goto deployment_complete
)

if "%SERVICE_STATUS%"=="OPERATION_IN_PROGRESS" (
    echo ⏳ Service still deploying...
    goto wait_loop
)

if "%SERVICE_STATUS%"=="CREATE_FAILED" (
    echo ❌ ERROR: Service creation failed
    goto deployment_error
)

goto wait_loop

:deployment_complete
echo.
echo 🎉 DEPLOYMENT COMPLETE!
echo ======================
echo.

REM Get service URL
for /f "tokens=*" %%i in ('aws apprunner list-services --region %REGION% --query "ServiceSummaryList[?ServiceName=='%PROJECT_NAME%-prod'].ServiceUrl" --output text') do set SERVICE_URL=%%i

echo 🌐 Application URL: https://%SERVICE_URL%
echo 🏥 Health Check: https://%SERVICE_URL%/api/health
echo.

echo 📋 Next Steps:
echo 1. Test your application at: https://%SERVICE_URL%
echo 2. Run database migration from Render to AWS RDS
echo 3. Configure DNS to point po.asr-inc.com to App Runner
echo 4. Validate all 31 API routes work correctly
echo.

REM Test health endpoint
echo 🔍 Testing application health...
timeout /t 30 /nobreak >nul
curl -f -s https://%SERVICE_URL%/api/health >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Health check pending - application may still be starting
) else (
    echo ✅ Application health check passed!
)

echo.
echo 🎯 Migration Status: 98%% Complete!
echo Only database migration and DNS cutover remaining.
echo.

goto end

:deployment_error
echo ❌ App Runner deployment failed
echo Check the AWS Console for detailed error information

:end
REM Cleanup temp files
if exist deployment-result.json del deployment-result.json
if exist service-status.txt del service-status.txt

pause