$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "KIPROD Command Centre - One System Fix" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

node "$PSScriptRoot\apply-kiprod-system-fix.mjs"

Write-Host ""
Write-Host "Running locked risk-policy verification..." -ForegroundColor Yellow
npm run verify:risk

Write-Host ""
Write-Host "Running production build..." -ForegroundColor Yellow
npm run build

Write-Host ""
Write-Host "FIX + VERIFICATION + BUILD COMPLETE" -ForegroundColor Green
Write-Host "Do not push until you have visually checked the local app." -ForegroundColor Green
