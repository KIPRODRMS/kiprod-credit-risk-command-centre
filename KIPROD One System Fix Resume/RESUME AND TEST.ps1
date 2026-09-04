$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "KIPROD Command Centre - Resume One System Fix" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

node "$PSScriptRoot\resume-kiprod-system-fix.mjs"
if ($LASTEXITCODE -ne 0) {
    throw "Resume patch failed. Verification/build were NOT run."
}

Write-Host ""
Write-Host "Running locked risk-policy verification..." -ForegroundColor Yellow
npm run verify:risk
if ($LASTEXITCODE -ne 0) {
    throw "Risk-policy verification failed. Build was NOT run."
}

Write-Host ""
Write-Host "Running production build..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    throw "Production build failed."
}

Write-Host ""
Write-Host "FIX + VERIFICATION + BUILD ALL PASSED" -ForegroundColor Green
Write-Host "Now visually test the affected pages locally before push." -ForegroundColor Green
