[CmdletBinding()]
param(
    [ValidateRange(25, 1000)]
    [int]$PollIntervalMs = 50,

    [ValidateRange(10000, 30000)]
    [int]$DurationMs = 11000
)

$ErrorActionPreference = 'Stop'

function Get-CandidatePort {
    $candidates = Get-CimInstance Win32_PnPEntity |
        Where-Object {
            $_.Present -and
            $_.PNPDeviceID -match '^USB\\VID_239A&PID_0029' -and
            $_.Name -match '\((COM\d+)\)'
        } |
        ForEach-Object {
            [PSCustomObject]@{
                Port = $Matches[1]
                Name = $_.Name
                PnpDeviceId = $_.PNPDeviceID
            }
        }

    if (-not $candidates) {
        throw 'Keine nice!nano-Anwendungsfirmware (VID 239A, PID 0029) gefunden.'
    }
    if (@($candidates).Count -ne 1) {
        throw "Mehrere passende Boards gefunden: $($candidates.Port -join ', ')"
    }
    return $candidates[0]
}

function Invoke-Request {
    param(
        [Parameter(Mandatory)]
        [System.IO.Ports.SerialPort]$SerialPort,

        [Parameter(Mandatory)]
        [string]$Command
    )

    $SerialPort.WriteLine($Command)
    return $SerialPort.ReadLine().Trim()
}

$candidate = Get-CandidatePort
Write-Host "Kandidat: $($candidate.Name) [$($candidate.PnpDeviceId)]"

$serialPort = [System.IO.Ports.SerialPort]::new($candidate.Port, 115200)
$serialPort.NewLine = "`n"
$serialPort.ReadTimeout = 1500
$serialPort.WriteTimeout = 1500
$serialPort.DtrEnable = $true

try {
    $serialPort.Open()
    Start-Sleep -Milliseconds 400
    $serialPort.DiscardInBuffer()

    $hello = Invoke-Request $serialPort 'HELLO 1'
    if ($hello -notmatch '^DEVICE OPENCODE_STATUS protocol=1 firmware=[^ ]+ leds=1$') {
        throw "Handshake fehlgeschlagen: '$hello'"
    }
    Write-Host "HELLO 1              -> $hello"

    $demo = Invoke-Request $serialPort 'DISPLAY_DEMO'
    if ($demo -ne 'OK') {
        throw "DISPLAY_DEMO fehlgeschlagen: '$demo'"
    }

    Write-Host 'Zeit (ms)  simulierte Anzeige'
    Write-Host '---------  -------------------'
    $watch = [System.Diagnostics.Stopwatch]::StartNew()
    $lastResponse = $null
    while ($watch.ElapsedMilliseconds -lt $DurationMs) {
        $response = Invoke-Request $serialPort 'DISPLAY'
        if ($response -notmatch '^DISPLAY phase=(STARTUP_COLORS|STARTUP_PAUSE|BATTERY|BATTERY_PAUSE|CONNECTING|CONNECTED|STATUS) battery=(LOW|MEDIUM|HIGH|UNKNOWN_USB) supply_mv=\d+ left_rgb=\d+,\d+,\d+ right_rgb=\d+,\d+,\d+$') {
            throw "Unerwartete DISPLAY-Antwort: '$response'"
        }
        if ($response -ne $lastResponse) {
            Write-Host ('{0,9}  {1}' -f $watch.ElapsedMilliseconds, $response)
            $lastResponse = $response
        }
        Start-Sleep -Milliseconds $PollIntervalMs
    }

    Write-Host 'Diagnoseablauf abgeschlossen.' -ForegroundColor Green
}
finally {
    if ($serialPort.IsOpen) {
        $serialPort.Close()
    }
    $serialPort.Dispose()
}
