@echo off
title BudgetBuddy Launcher
echo ========================================================
echo               Starting BudgetBuddy Servers
echo ========================================================
echo.

:: 1. Start Django Backend Server on Port 8000
echo [1/2] Starting Django Backend on http://127.0.0.1:8000/ ...
start "BudgetBuddy Backend (Port 8000)" cmd /k "cd /d ""%~dp0budgetbuddy_backend"" && python manage.py runserver 127.0.0.1:8000"

:: 2. Start React/Vite Frontend Server on Port 5173
echo [2/2] Starting React Vite Frontend on http://127.0.0.1:5173/ ...
start "BudgetBuddy Frontend (Port 5173)" cmd /k "cd /d ""%~dp0frontend"" && npm run dev"

echo.
echo ========================================================
echo Both servers have been launched in separate windows!
echo - Open your web browser at: http://127.0.0.1:5173/
echo - Backend API running at:    http://127.0.0.1:8000/
echo - Django Admin at:          http://127.0.0.1:8000/admin/
echo ========================================================
echo.
pause
