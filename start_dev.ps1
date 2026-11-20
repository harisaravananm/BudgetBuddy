# BudgetBuddy PowerShell Launcher
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "             Starting BudgetBuddy Servers               " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition

# 1. Start Django Backend on Port 8000
Write-Host "[1/2] Starting Django Backend on http://127.0.0.1:8000/ ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptRoot\budgetbuddy_backend'; python manage.py runserver 127.0.0.1:8000"

# 2. Start React/Vite Frontend on Port 5173
Write-Host "[2/2] Starting React Frontend on http://127.0.0.1:5173/ ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:PATH = 'C:\Program Files\nodejs;' + `$env:PATH; cd '$scriptRoot\frontend'; npm run dev"

Write-Host ""
Write-Host "Servers launched!" -ForegroundColor Yellow
Write-Host "Frontend UI:  http://127.0.0.1:5173/" -ForegroundColor White
Write-Host "Backend API:  http://127.0.0.1:8000/" -ForegroundColor White
Write-Host "Django Admin: http://127.0.0.1:8000/admin/" -ForegroundColor White
