@echo off
setlocal
title Natural Trace - site preview
cd /d "%~dp0"

echo.
echo  Natural Trace website preview
echo  =============================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo  Node.js is not installed, or not on PATH.
  echo  Install it from https://nodejs.org and run this again.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\.bin\eleventy.cmd" (
  echo  Installing dependencies, this only happens once...
  call npm install
  if errorlevel 1 (
    echo.
    echo  npm install failed. Check the messages above.
    pause
    exit /b 1
  )
)

echo  Starting the dev server on http://localhost:8080
echo  The browser opens in a few seconds.
echo.
echo  Leave this window open while you work. Every time you save a file in
echo  src\ the site rebuilds and the browser refreshes on its own.
echo.
echo  Press Ctrl+C or close this window to stop.
echo.

start /b "" cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:8080/"

call "node_modules\.bin\eleventy.cmd" --serve --port 8080

echo.
echo  Server stopped.
pause
