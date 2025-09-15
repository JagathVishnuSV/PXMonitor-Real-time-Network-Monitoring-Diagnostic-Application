


try {
    
    Clear-DnsClientCache
   
    $test = Resolve-DnsName google.com -ErrorAction Stop
    if ($test) {
       
        Write-Output "DNS cache cleared successfully. Websites should load faster."
        exit 0
    }
} catch {

    Write-Output "Failed to clear DNS cache. Try reconnecting Wi-Fi. Error: $_"
    exit 1
}

