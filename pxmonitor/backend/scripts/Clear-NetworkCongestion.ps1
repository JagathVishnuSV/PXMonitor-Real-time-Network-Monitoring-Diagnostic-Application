

try {
    Write-Output "Proceeding with clearing network caches..."

   
    ipconfig /flushdns
    netsh int ip reset

    Write-Output "Successfully cleared network caches. A computer restart may be required for all changes to take effect."
    exit 0

} catch {
    Write-Output "An error occurred while trying to relieve network congestion: $_"
    exit 1
}


