[CmdletBinding()]
param(
    [string]$GoExecutable = "go"
)

$ErrorActionPreference = "Stop"
$hostRoot = Split-Path -Parent $PSScriptRoot
$helperRoot = Join-Path $hostRoot "ble-helper"
$outputDirectory = Join-Path $hostRoot "bin"
$outputPath = Join-Path $outputDirectory "opencode-status-ble.exe"

$go = Get-Command $GoExecutable -ErrorAction SilentlyContinue
if (-not $go) {
    throw "Go was not found. Install Go 1.25 or newer or pass the complete path with -GoExecutable."
}

New-Item -ItemType Directory -Force $outputDirectory | Out-Null

Push-Location $helperRoot
try {
    & $go.Source build -o $outputPath .
    if ($LASTEXITCODE -ne 0) {
        throw "The Bluetooth helper build failed with exit code $LASTEXITCODE."
    }
}
finally {
    Pop-Location
}

Write-Host "Bluetooth helper built: $outputPath"
