@echo off
REM SmartAudit Agent Setup Script for Windows
REM This script helps you set up the SmartAudit Agent quickly

echo ========================================================
echo.
echo      SmartAudit Agent Setup (Windows)
echo.
echo ========================================================
echo.

REM Check Node.js
echo Checking Node.js version...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed
    echo Please install Node.js ^>= 22.0 from https://nodejs.org
    pause
    exit /b 1
)
echo Node.js detected
echo.

REM Check pnpm
echo Checking pnpm...
pnpm -v >nul 2>&1
if %errorlevel% neq 0 (
    echo pnpm not found. Installing...
    npm install -g pnpm
    echo pnpm installed
) else (
    echo pnpm detected
)
echo.

REM Install dependencies
echo Installing dependencies...
pnpm install
if %errorlevel% neq 0 (
    echo Failed to install dependencies
    pause
    exit /b 1
)
echo Dependencies installed
echo.

REM Create .env if not exists
if not exist .env (
    echo Creating .env file from template...
    copy .env.example .env
    echo .env file created
    echo.
    echo IMPORTANT: Edit .env and add your API keys:
    echo   - GEMINI_API_KEY ^(required^)
    echo   - GITHUB_TOKEN ^(optional, for PR creation^)
    echo   - TESTNET_PRIVATE_KEY ^(optional, for dynamic testing^)
    echo   - TELEGRAM_TOKEN ^(optional, for notifications^)
    echo.
) else (
    echo .env file already exists
    echo.
)

REM Create directories
echo Creating directories...
if not exist memory mkdir memory
if not exist cloned-repos mkdir cloned-repos
echo Directories created
echo.

echo ========================================================
echo.
echo      Setup Complete!
echo.
echo ========================================================
echo.
echo Next Steps:
echo.
echo 1. Edit .env with your API keys:
echo    notepad .env
echo.
echo 2. Run a dry-run demo ^(no real API calls^):
echo    pnpm demo:dry
echo.
echo 3. Start the web server:
echo    pnpm dev:server
echo.
echo 4. Open http://localhost:3000 in your browser
echo.
echo For full documentation, see README-agent.md
echo.
pause
