import { execFile } from 'child_process';
import { reverse as reverseDns } from 'dns/promises';
import geoip from 'geoip-lite';

// A cache to avoid re-looking up IPs repeatedly, improving performance.
const ipCache = new Map();

/**
 * Uses a robust PowerShell command to get all TCP and UDP connections.
 * @returns {Promise<object[]>} A promise that resolves to an array of connections.
 */
function getConnectionsWithPowerShell() {
  return new Promise((resolve, reject) => {
    // This command is more robust: it gets TCP & UDP, and includes process names directly.
    const psCommand = `
      $tcpConnections = Get-NetTCPConnection | Select-Object -Property OwningProcess, State, RemoteAddress, RemotePort
      $udpEndpoints = Get-NetUDPEndpoint | Select-Object -Property OwningProcess, LocalAddress, LocalPort

      $allConnections = @()
      $allConnections += $tcpConnections | Where-Object { $_.RemoteAddress -ne '::' -and $_.RemoteAddress -ne '0.0.0.0' } | ForEach-Object {
          [PSCustomObject]@{
              pid = $_.OwningProcess
              name = (Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).ProcessName
              remoteAddress = $_.RemoteAddress
              remotePort = $_.RemotePort
              protocol = 'TCP'
          }
      }
      # Note: UDP is connectionless, so we can only see what ports are open (listening).
      # This part can be expanded if needed, but for now we focus on active TCP.

      $allConnections | ConvertTo-Json -Depth 3
    `;

    execFile('powershell.exe', ['-NoProfile', '-Command', psCommand], { maxBuffer: 1024 * 1024 * 10 }, (err, stdout) => {
      if (err) {
        return reject(err);
      }
      if (!stdout) {
        return resolve([]); // Resolve with an empty array if there's no output
      }
      try {
        const connections = JSON.parse(stdout);
        resolve(Array.isArray(connections) ? connections : [connections]);
      } catch (e) {
        console.error("Failed to parse PowerShell JSON:", stdout); // Log the problematic output
        reject(e);
      }
    });
  });
}


/**
 * Takes an IP address and resolves its hostname and country.
 */
async function resolveIpDetails(ip) {
    if (ipCache.has(ip)) return ipCache.get(ip);
  
    let hostname = 'N/A';
    try {
      // Handle IPv6 addresses correctly for DNS lookup
      const sanitizedIp = ip.includes('%') ? ip.split('%')[0] : ip;
      const hostnames = await reverseDns(sanitizedIp);
      hostname = hostnames?.[0] || 'N/A';
    } catch (e) { /* Ignore errors for IPs with no reverse record */ }
  
    const geo = geoip.lookup(ip);
    const details = { hostname, country: geo?.country || 'N/A' };
    ipCache.set(ip, details);
    return details;
}

/**
 * Main exported function to get the complete, enriched list of connections.
 */
export async function getMappedConnections() {
  const rawConnections = await getConnectionsWithPowerShell();

  const enrichedConnections = await Promise.all(
    rawConnections.map(async (conn) => {
      // Filter out local and loopback addresses
      if (!conn.remoteAddress || conn.remoteAddress.startsWith('127.') || conn.remoteAddress === '::1') {
        return null;
      }
      const ipDetails = await resolveIpDetails(conn.remoteAddress);
      return {
        pid: conn.pid,
        name: conn.name,
        remoteAddress: conn.remoteAddress,
        remotePort: conn.remotePort,
        hostname: ipDetails.hostname,
        country: ipDetails.country,
      };
    })
  );
  
  // Remove null entries and sort by process name
  return enrichedConnections
    .filter(Boolean)
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}