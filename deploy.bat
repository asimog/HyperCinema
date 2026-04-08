@echo off
REM Full deployment script - deploys worker, video-service, then Firebase App Hosting
REM Usage: deploy.bat

echo ========================================
echo Step 1: Rebuild worker Docker image
echo ========================================
gcloud builds submit --config cloudbuild/worker.yaml --substitutions _IMAGE=gcr.io/hashart-fun/hypercinema-worker:latest . --project hashart-fun --quiet
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Worker build failed!
    exit /b 1
)

echo.
echo ========================================
echo Step 2: Deploy worker to Cloud Run
echo ========================================
gcloud run deploy hypercinema-worker --image gcr.io/hashart-fun/hypercinema-worker:latest --project hashart-fun --platform managed --region us-central1 --port 8080 --quiet
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Worker deployment failed!
    exit /b 1
)

echo.
echo ========================================
echo Step 3: Get worker URL
echo ========================================
for /f "delims=" %%i in ('gcloud run services describe hypercinema-worker --project hashart-fun --platform managed --region us-central1 --format="value(status.url)"') do set WORKER_URL=%%i
echo Worker URL: %WORKER_URL%

echo.
echo ========================================
echo Step 4: Rebuild video-service Docker image
echo ========================================
gcloud builds submit --config cloudbuild/video-service.yaml --substitutions _IMAGE=gcr.io/hashart-fun/video-service:latest . --project hashart-fun --quiet
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Video service build failed!
    exit /b 1
)

echo.
echo ========================================
echo Step 5: Deploy video-service to Cloud Run
echo ========================================
gcloud run deploy video-service --image gcr.io/hashart-fun/video-service:latest --project hashart-fun --platform managed --region us-central1 --port 8090 --quiet
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Video service deployment failed!
    exit /b 1
)

echo.
echo ========================================
echo Step 6: Get video-service URL
echo ========================================
for /f "delims=" %%i in ('gcloud run services describe video-service --project hashart-fun --platform managed --region us-central1 --format="value(status.url)"') do set VIDEO_URL=%%i
echo Video service URL: %VIDEO_URL%

echo.
echo ========================================
echo Step 7: Update Firebase App Hosting secrets
echo ========================================
echo %VIDEO_URL% | firebase apphosting:secrets:set VIDEO_API_BASE_URL_HYPERCINEMA --project hashart-fun
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Could not update VIDEO_API_BASE_URL_HYPERCINEMA secret
)

echo %WORKER_URL% | firebase apphosting:secrets:set WORKER_URL_HYPERCINEMA --project hashart-fun
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Could not update WORKER_URL_HYPERCINEMA secret
)

echo.
echo ========================================
echo Step 8: Deploy Next.js app to Firebase App Hosting
echo ========================================
firebase deploy --only apphosting --project hashart-fun
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Next.js deployment failed!
    exit /b 1
)

echo.
echo ========================================
echo Deployment complete!
echo ========================================
echo Worker: %WORKER_URL%
echo Video service: %VIDEO_URL%
echo Web app: https://hypercinema--hashart-fun.us-central1.hosted.app
