@echo off
REM ===========================================================
REM HyperCinema — Vercel + Railway Deployment Script
REM ===========================================================
REM Architecture:
REM   Frontend  → Vercel  (Next.js)
REM   Backend   → Railway (worker + video-service + PostgreSQL)
REM
REM Prerequisites:
REM   1. Install Railway CLI: npm i -g @railway/cli
REM   2. Install Vercel CLI: npm i -g vercel
REM   3. Login: railway login && vercel login
REM   4. Link Railway project: railway link
REM   5. Link Vercel project: vercel link
REM
REM Usage:
REM   deploy.bat              — deploy all services
REM   deploy.bat frontend     — deploy Vercel frontend only
REM   deploy.bat backend      — deploy Railway backend services
REM   deploy.bat worker       — deploy Railway worker only
REM   deploy.bat video        — deploy Railway video-service only
REM ===========================================================

setlocal enabledelayedexpansion

REM Check Railway CLI
where railway >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Railway CLI not installed.
    echo Run: npm i -g @railway/cli
    echo Then: railway login
    exit /b 1
)

REM Check authentication
railway whoami >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Not logged into Railway.
    echo Run: railway login
    exit /b 1
)

set DEPLOY_TARGET=%1
set /i FAILURES=0

if "%DEPLOY_TARGET%"=="" goto deploy_all
if /i "%DEPLOY_TARGET%"=="frontend" goto deploy_frontend
if /i "%DEPLOY_TARGET%"=="backend" goto deploy_backend
if /i "%DEPLOY_TARGET%"=="worker" goto deploy_worker
if /i "%DEPLOY_TARGET%"=="video" goto deploy_video

echo Unknown target: %DEPLOY_TARGET%
echo Usage: deploy.bat [frontend^|backend^|worker^|video]
exit /b 1

:deploy_all
echo ========================================
echo Deploying all services
echo ========================================
echo.

echo [1/2] Deploying Railway backend services...
call :deploy_backend
if !ERRORLEVEL! NEQ 0 set /i FAILURES+=1

echo.
echo [2/2] Deploying Vercel frontend...
call :deploy_frontend
if !ERRORLEVEL! NEQ 0 set /i FAILURES+=1

echo.
if !FAILURES! GTR 0 (
    echo ========================================
    echo Deployment completed with !FAILURES! failure^(s^)
    echo ========================================
    exit /b 1
) else (
    echo ========================================
    echo All services deployed successfully!
    echo ========================================
    exit /b 0
)

:deploy_backend
echo ----------------------------------------
echo Deploying Railway backend (worker + video)
echo ----------------------------------------
railway up --detach
echo Railway backend deployment triggered.
echo Monitor at: https://railway.com
exit /b 0

:deploy_frontend
echo ----------------------------------------
echo Deploying Vercel frontend (Next.js)
echo ----------------------------------------
vercel --prod
echo Vercel frontend deployment complete.
exit /b 0

:deploy_worker
echo ----------------------------------------
echo Deploying Railway worker service
echo ----------------------------------------
railway up --service hypercinema-worker --detach
echo Worker service deployment triggered.
echo Monitor at: https://railway.com
exit /b 0

:deploy_video
echo ----------------------------------------
echo Deploying Railway video service (Docker)
echo ----------------------------------------
railway up --service hypercinema-video --detach
echo Video service deployment triggered.
echo Monitor at: https://railway.com
echo.
echo NOTE: Video service includes ffmpeg and OpenMontage (built into Docker image).
echo       Ensure VIDEO_API_BASE_URL and DATABASE_URL are set in Railway.
exit /b 0
