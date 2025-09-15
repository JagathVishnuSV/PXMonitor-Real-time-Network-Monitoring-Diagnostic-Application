<#
.SYNOPSIS
    Toggle System Full Power Mode for network stability.

.DESCRIPTION
    -Enable  : Activates full power mode
    -Disable : Restores normal settings (DEFAULT)
#>

param (
    [switch]$Enable,
    [switch]$Disable
)

# --- Default: Disable ---
if (-not $Enable -and -not $Disable) { $Disable = $true }

# --- Ensure running as Admin ---
if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)) {
    Write-Output "❌ This script must be run as Administrator. Exiting..."
    exit 1
}

# --- Logging ---
$logFile = "C:\ProgramData\PXMonitor\fullpower_mode.log"
if (-not (Test-Path $logFile)) { New-Item -ItemType File -Path $logFile -Force | Out-Null }
function Log($msg) { Add-Content -Path $logFile -Value "$(Get-Date -Format 'u') - $msg" }

# --- Paths ---
$planFile = "C:\ProgramData\PXMonitor\prev_powerplan.txt"
$highPerfPlan = "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c"  # Windows High Performance GUID

if ($Enable) {
    try {
        Log "Activating System Full Power Mode..."

        # --- Get active adapter ---
        $adapter = Get-NetAdapter | Where-Object { $_.Status -eq "Up" -and $_.HardwareInterface -eq $true } | Select-Object -First 1
        if (-not $adapter) { throw "No active network adapter found." }
        Log "Active adapter: $($adapter.Name)"

        # --- Disable adapter power saving (registry tweak) ---
        $pmKey = "HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e972-e325-11ce-bfc1-08002be10318}\"
        $nicKey = Get-ChildItem $pmKey -ErrorAction SilentlyContinue | Where-Object { (Get-ItemProperty $_.PSPath -ErrorAction SilentlyContinue).NetCfgInstanceId -eq $adapter.InterfaceGuid }
        if ($nicKey) {
            Set-ItemProperty -Path $nicKey.PSPath -Name "PnPCapabilities" -Value 24
            Log "Disabled power saving for adapter."
        }

        # --- Save current power plan ---
        $currentPlan = (powercfg /GETACTIVESCHEME) -replace '.*GUID:\s*([a-f0-9-]+).*','$1'
        Set-Content -Path $planFile -Value $currentPlan
        Log "Saved current power plan: $currentPlan"

        # --- Switch to High Performance ---
        powercfg /SETACTIVE $highPerfPlan | Out-Null
        Log "Switched to High Performance plan."

        # --- Start continuous localhost ping job ---
        if (-not (Get-Job -Name "LocalhostPing" -ErrorAction SilentlyContinue)) {
            Start-Job -Name "LocalhostPing" -ScriptBlock {
                while ($true) { Test-Connection -ComputerName 127.0.0.1 -Count 1 | Out-Null; Start-Sleep -Seconds 2 }
            } | Out-Null
            Log "Started localhost ping job to keep NIC active."
        }

        Write-Output "✅ System Full Power Mode ENABLED. Keep script/app running."
    }
    catch {
        Write-Output "❌ Failed to enable Full Power Mode. Error: $_"
        Log "Enable failed: $_"
    }
}

if ($Disable) {
    try {
        Log "Deactivating System Full Power Mode..."

        # --- Stop localhost ping job ---
        $pingJob = Get-Job -Name "LocalhostPing" -ErrorAction SilentlyContinue
        if ($pingJob) {
            Stop-Job $pingJob.Id
            Remove-Job $pingJob.Id
            Log "Stopped localhost ping job."
        }

        # --- Restore previous power plan ---
        if (Test-Path $planFile) {
            $prevPlan = Get-Content $planFile
            powercfg /SETACTIVE $prevPlan | Out-Null
            Log "Restored previous power plan: $prevPlan"
        }

        Write-Output "✅ System Full Power Mode DISABLED. Settings restored."
    }
    catch {
        Write-Output "❌ Failed to disable Full Power Mode. Error: $_"
        Log "Disable failed: $_"
    }
}
