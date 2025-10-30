@echo off
echo ====================================
echo PXMonitor AI Agent System Startup
echo ====================================
echo.

echo Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js found!
echo.

echo Starting PXMonitor with AI Agent System...
echo.
echo Features enabled:
echo  ✓ Context-Aware Network Optimization
echo  ✓ Traffic Prioritization Agent
echo  ✓ Security Monitoring Agent
echo  ✓ Performance Analytics Agent
echo  ✓ ML Predictive Analysis
echo  ✓ Real-time Dashboard
echo.

echo The system will:
echo  - Monitor network conditions every 30 seconds
echo  - Automatically optimize performance based on context
echo  - Provide real-time insights through the web dashboard
echo  - Learn from network patterns for predictive optimization
echo.

echo Web Dashboard will be available at:
echo  http://localhost:3001
echo.

echo Starting server...
echo.

cd /d "%~dp0"
node index.js

echo.
echo Server stopped. Press any key to exit...
pause >nul