try {
    
    $ping = Test-Connection -ComputerName 8.8.8.8 -Count 1 -ErrorAction Stop
    $tcp = Test-NetConnection -ComputerName google.com -Port 443 -ErrorAction Stop
    $dns = Resolve-DnsName google.com -ErrorAction Stop
    if ($ping.ResponseTime -gt 100 -or -not $tcp.TcpTestSucceeded -or $dns.QueryTime -gt 100) {
        
        $ssid = (netsh wlan show interfaces | Select-String "SSID").Line.Split(":")[1].Trim()
        netsh wlan disconnect
        Start-Sleep -Seconds 2
        $result = netsh wlan connect name=$ssid
        if ($result -match "Connection request was completed successfully") {
            Write-Output "Reconnected Wi-Fi. Connection stabilized for your meeting."
            exit 0
        } else {
            Write-Output "Reconnection failed. Try optimizing network."
            exit 1
        }
    } else {
        Write-Output "Connection is stable. No action needed."
        exit 0
    }
} catch {
    Write-Output "Failed to stabilize connection. Error: $_"
    exit 1
}

