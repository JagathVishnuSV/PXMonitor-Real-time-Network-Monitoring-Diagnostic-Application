# Optimize-Bandwidth.ps1
# This PowerShell script optimizes network settings for improved bandwidth.
# It adjusts TCP parameters and other networking configurations.

try {
    Write-Output "Configuring global QoS policy to prioritize all applications..."

    # Apply high-priority rule to ALL apps
    New-NetQosPolicy -Name "PrioritizeAllApps" `
        -NetworkProfile All `
        -PriorityValue8021Action 7 `
        -PolicyStore ActiveStore

    Write-Output "✅ High-priority bandwidth rule applied to ALL applications."
}
catch {
    Write-Output "⚠️ Failed to apply QoS policy. Error: $_"
}
