param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectPath
)

$ErrorActionPreference = "Stop"
$PackageRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = (Resolve-Path -LiteralPath $ProjectPath).Path

if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot "package.json"))) {
  throw "ProjectPath must point to the KIPROD Command Centre folder containing package.json."
}

$Files = @(
  "app/board-oversight/page.tsx",
  "app/clarification-requests/page.tsx",
  "scripts/validate-board-oversight-reconciliation.mjs"
)

foreach ($RelativePath in $Files) {
  $Source = Join-Path $PackageRoot $RelativePath
  $Destination = Join-Path $ProjectRoot $RelativePath
  $DestinationDirectory = Split-Path -Parent $Destination
  New-Item -ItemType Directory -Force -Path $DestinationDirectory | Out-Null
  Copy-Item -LiteralPath $Source -Destination $Destination -Force
  Write-Host "Installed $RelativePath"
}

Push-Location $ProjectRoot
try {
  node scripts/validate-board-oversight-reconciliation.mjs
} finally {
  Pop-Location
}

Write-Host "Board Oversight reconciliation v32 installed successfully."
Write-Host "Next: run npm run dev and open /board-oversight."
