try {
    # Find the active network adapter by looking for the one with a default gateway.
    # This is the most reliable method.
    $netConfig = Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -ne $null } | Select-Object -First 1

    if (-not $netConfig) {
        Write-Error "Could not find an active network adapter with a default gateway. Please ensure you are connected to the internet."
        exit 1
    }

    $adapterName = $netConfig.InterfaceAlias

    # Release and renew the IP address for the specific adapter.
    ipconfig /release $adapterName | Out-Null
    Start-Sleep -Seconds 1
    ipconfig /renew $adapterName | Out-Null

    # Poll for a new IP address
    $ipObtained = $false
    $attempts = 15 # Poll for 30 seconds (15 attempts * 2 seconds)

    for ($i = 1; $i -le $attempts; $i++) {
        # Check if the adapter has a valid IPv4 address
        $ipAddress = Get-NetIPAddress -InterfaceAlias $adapterName -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.AddressState -eq 'Preferred' }
        if ($ipAddress) {
            $ipObtained = $true
            break
        }
        Start-Sleep -Seconds 2
    }
    
    if ($ipObtained) {
        Write-Output "Resolved"
        exit 0
    } else {
        Write-Error "Failed to obtain a new IP address for adapter '$adapterName' after 30 seconds."
        exit 1
    }
} catch {
    # Catch any unexpected terminating errors
    Write-Error "An unexpected error occurred: $($_.Exception.Message)"
    exit 1
}