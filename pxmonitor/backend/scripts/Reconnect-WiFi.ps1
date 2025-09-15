
# Reconnect-WiFi.ps1
# This PowerShell script disconnects and then reconnects to the current WiFi network.
# It can help resolve connectivity issues with wireless networks.

try {
    # Get current Wi-Fi SSID (filter only SSID, not BSSID)
    $ssid = (netsh wlan show interfaces | Select-String "^\s*SSID\s*:" | ForEach-Object { $_.Line.Split(":")[1].Trim() })

    if (-not $ssid) { 
        throw "No Wi-Fi connected." 
    }

    # Disconnect and wait
    netsh wlan disconnect
    Start-Sleep -Seconds 5   # safer wait time

    # Reconnect using saved profile
    netsh wlan connect name=$ssid | Out-Null
    Start-Sleep -Seconds 5   # allow connection to stabilize

    # Verify reconnection
    $connectedSsid = (netsh wlan show interfaces | Select-String "^\s*SSID\s*:" | ForEach-Object { $_.Line.Split(":")[1].Trim() })

    if ($connectedSsid -eq $ssid) {
        Write-Output "Wi-Fi reconnected successfully to '$ssid'. Connection should be stable."
        exit 0
    } else {
        Write-Output "Wi-Fi reconnection failed. Try restarting router."
        exit 1
    }
} catch {
    Write-Output "Failed to reconnect Wi-Fi. Error: $_"
    exit 1
}
