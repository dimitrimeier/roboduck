[CmdletBinding()]
param(
    [string]$GoExecutable = "go",
    [switch]$Build
)

$ErrorActionPreference = "Stop"
$hostRoot = Split-Path -Parent $PSScriptRoot

if ($Build) {
    & (Join-Path $PSScriptRoot "Build-BluetoothHelper.ps1") -GoExecutable $GoExecutable
}

$helperPath = Join-Path $hostRoot "bin\opencode-status-ble.exe"
if (-not (Test-Path $helperPath -PathType Leaf)) {
    throw "Bluetooth helper not found. Run 'npm run build:bluetooth' once with Go 1.25 or newer."
}

$env:OPENCODE_STATUS_TRANSPORT = "bluetooth"

Push-Location $hostRoot
try {
    & npm run dev
    exit $LASTEXITCODE
}
finally {
    Pop-Location
}
