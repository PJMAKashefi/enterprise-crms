@echo off
echo ====================================================
echo Starting EDMS Application...
echo ====================================================
echo Step 1: Checking and installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to install dependencies. Make sure Node.js is installed on your computer.
    echo You can download Node.js from https://nodejs.org/
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo Step 2: Launching development server...
echo App will be available at: http://localhost:3000
echo (To stop the server, press Ctrl + C in this window)
echo ====================================================
call npm run dev
pause
