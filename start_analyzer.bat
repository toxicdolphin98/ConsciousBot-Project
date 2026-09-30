@echo off
:: ================================================================================
:: CONSCIOUS_BOT TELEMETRY ANALYSER LAUNCHER SYSTEM
:: ================================================================================
title ConsciousBot Telemetry Supervisor Dashboard
mode con: cols=85 lines=32
color 0B

:INIT_CHECK
cls
echo ================================================================================
echo [⚙️ TELEMETRY SYSTEM] Initializing Dashboard Subprocess Registry...
echo ================================================================================
echo.

:: Verify Node.js is accessible in the system path environment
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ [FATAL ERROR] Node.js execution binary not found in system environment!
    echo    Please install Node.js or update your PATH variables before restarting.
    echo.
    pause
    exit /b
)

:: Verify the script actually exists in the active directory path
if not exist "telemetry_analyzer.js" (
    echo ❌ [FATAL ERROR] target script 'telemetry_analyzer.js' was not found!
    echo    Ensure this batch file sits directly in your primary project root folder.
    echo.
    pause
    exit /b
)

:LAUNCH_ROUTINE
echo [⚡ LAUNCHING] Spawning telemetry stream framework...
echo --------------------------------------------------------------------------------
echo.

:: Execute script with low process priority to save CPU overhead for Ollama and Minecraft
start "ConsciousBot Dashboard Engine" /low node telemetry_analyzer.js

if %errorlevel% neq 0 (
    echo.
    echo ⚠️ [RUNTIME WARNING] Engine terminated unexpectedly with error code %errorlevel%.
    echo    Attempting automatic supervisor recycling loop in 5 seconds...
    timeout /t 5 >nul
    goto LAUNCH_ROUTINE
)

exit /b
