[CmdletBinding()]
param(
    [ValidateRange(100, 10000)]
    [int]$StepDurationMs = 1800
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
        throw 'Keine nice!nano-Anwendungsfirmware (VID 239A, PID 0029) gefunden. Ist noch das Laufwerk NICENANO sichtbar, befindet sich das Board im Bootloader.'
    }

    if (@($candidates).Count -ne 1) {
        $ports = ($candidates.Port -join ', ')
        throw "Mehrere passende Boards gefunden ($ports). Der PoC-Test erwartet genau ein Board."
    }

    return $candidates[0]
}

function Invoke-StatusCommand {
    param(
        [Parameter(Mandatory)]
        [System.IO.Ports.SerialPort]$SerialPort,

        [Parameter(Mandatory)]
        [string]$Command,

        [Parameter(Mandatory)]
        [string]$ExpectedResponse
    )

    $SerialPort.WriteLine($Command)
    $response = $SerialPort.ReadLine().Trim()
    if ($response -notmatch $ExpectedResponse) {
        throw "Unerwartete Antwort auf '$Command': '$response'"
    }

    Write-Host ("{0,-22} -> {1}" -f $Command, $response)
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

    Invoke-StatusCommand $serialPort 'HELLO 1' '^DEVICE OPENCODE_STATUS protocol=1 firmware=[^ ]+ leds=1$'
    Invoke-StatusCommand $serialPort 'BATTERY' '^BATTERY raw=\d+ adc_mv=\d+ source_mv=\d+$'
    Invoke-StatusCommand $serialPort 'SUPPLY' '^SUPPLY raw=\d+ adc_mv=\d+ supply_mv=\d+$'
    Invoke-StatusCommand $serialPort 'DISPLAY' '^DISPLAY phase=(STARTUP_COLORS|BATTERY|CONNECTING|CONNECTED|STATUS) battery=(LOW|MEDIUM|HIGH|UNKNOWN_USB) supply_mv=\d+ rgb=\d+,\d+,\d+$'
    Invoke-StatusCommand $serialPort 'HELLO 2' '^ERROR PROTOCOL_VERSION$'
    Invoke-StatusCommand $serialPort 'SET 1 RUNNING' '^ERROR LED_INDEX$'
    Invoke-StatusCommand $serialPort 'SET 0 UNKNOWN' '^ERROR STATE$'
    Invoke-StatusCommand $serialPort 'BRIGHTNESS 256' '^ERROR BAD_ARGUMENTS$'
    Invoke-StatusCommand $serialPort 'UNKNOWN' '^ERROR UNKNOWN_COMMAND$'
    Invoke-StatusCommand $serialPort 'RESET_STATE' '^OK$'
    Invoke-StatusCommand $serialPort 'BRIGHTNESS 128' '^OK$'

    foreach ($state in @('IDLE', 'RUNNING', 'ASKING', 'FINISHED', 'ERROR', 'OFF')) {
        Invoke-StatusCommand $serialPort "SET 0 $state" '^OK$'
        Start-Sleep -Milliseconds $StepDurationMs
    }

    Invoke-StatusCommand $serialPort 'PING' '^PONG$'
    Invoke-StatusCommand $serialPort 'SYNC_COMPLETE' '^OK$'
    Write-Host 'Protokolltest erfolgreich; LED-Muster bitte visuell bestaetigen.' -ForegroundColor Green
}
finally {
    if ($serialPort.IsOpen) {
        $serialPort.Close()
    }
    $serialPort.Dispose()
}
