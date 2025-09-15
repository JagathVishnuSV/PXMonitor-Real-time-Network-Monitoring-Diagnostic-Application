try {
    # Clear DNS cache
    Clear-DnsClientCache

    # Get the active network adapter (status "Up" and not virtual/loopback)
    $adapter = Get-NetAdapter | Where-Object { $_.Status -eq "Up" -and $_.HardwareInterface }

    if (-not $adapter) {
        Write-Output "No active network adapter found."
        exit 1
    }

    # Switch to Google DNS (8.8.8.8 and 8.8.4.4)
    Set-DnsClientServerAddress -InterfaceAlias $adapter.InterfaceAlias -ServerAddresses ("8.8.8.8", "8.8.4.4")

    # Verify resolution
    $test = Resolve-DnsName google.com -ErrorAction Stop
    if ($test) {
        Write-Output "Switched to faster DNS server on adapter '$($adapter.InterfaceAlias)'. Websites should load quicker."
        exit 0
    } else {
        Write-Output "DNS switch failed. Try reconnecting Wi-Fi."
        exit 1
    }
} catch {
    Write-Output "Failed to switch DNS server. Error: $_"
    exit 1
}
