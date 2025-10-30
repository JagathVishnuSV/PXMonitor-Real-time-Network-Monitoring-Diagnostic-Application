import { getMappedConnections } from '../../connection_mapper.js';
import { execFile, exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

export class ContextEngine {
  constructor() {
    this.currentContext = {};
    this.contextHistory = [];
    this.rules = new Map();
    this.networkMetricsCache = null;
    this.lastMetricsUpdate = 0;
    this.cacheTimeout = 10000; // 10 seconds
  }

  async initialize() {
    console.log('Initializing Context Engine...');
    
    // Load context rules
    this.loadContextRules();
    
    // Perform initial context gathering
    await this.gatherContext();
    
    console.log('Context Engine initialized successfully');
  }

  loadContextRules() {
    // Time-based context rules
    this.rules.set('time_work', {
      startHour: 9, endHour: 17,
      priority: ['work', 'productivity'],
      throttle: ['entertainment', 'gaming']
    });
    
    this.rules.set('time_entertainment', {
      startHour: 18, endHour: 22,
      priority: ['entertainment', 'streaming'],
      throttle: []
    });
    
    this.rules.set('time_sleep', {
      startHour: 23, endHour: 6,
      priority: ['system', 'updates'],
      throttle: ['entertainment', 'gaming']
    });
  }

  async gatherContext() {
    const startTime = Date.now();
    
    try {
      const context = {
        timestamp: startTime,
        timeOfDay: this.getTimeContext(),
        networkMetrics: await this.getNetworkMetrics(),
        activeProcesses: await this.getActiveProcesses(),
        connections: await this.getActiveConnections(),
        systemLoad: await this.getSystemLoad(),
        userActivity: await this.detectUserActivity(),
        networkInterfaces: await this.getNetworkInterfaces(),
        systemInfo: this.getSystemInfo()
      };

      // Calculate derived metrics
      context.networkHealth = this.calculateNetworkHealth(context.networkMetrics);
      context.systemHealth = this.calculateSystemHealth(context.systemLoad);
      context.priority = this.determinePriority(context);

      this.currentContext = context;
      this.contextHistory.push(context);
      
      // Keep only last 100 contexts
      if (this.contextHistory.length > 100) {
        this.contextHistory = this.contextHistory.slice(-100);
      }

      return context;
    } catch (error) {
      console.error('Error gathering context:', error);
      return this.currentContext || {};
    }
  }

  getTimeContext() {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    if (hour >= 9 && hour <= 17 && !isWeekend) return 'work_hours';
    if (hour >= 18 && hour <= 22) return 'entertainment_hours';
    if (hour >= 23 || hour <= 6) return 'sleep_hours';
    if (isWeekend) return 'weekend';
    return 'general';
  }

  async getNetworkMetrics() {
    const now = Date.now();
    
    // Use cached metrics if recent
    if (this.networkMetricsCache && 
        (now - this.lastMetricsUpdate) < this.cacheTimeout) {
      return this.networkMetricsCache;
    }

    try {
      // Get network statistics using PowerShell
      const psCommand = `
        $adapters = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' }
        $stats = @()
        foreach ($adapter in $adapters) {
          $stat = Get-Counter "\\Network Interface($($adapter.InterfaceDescription))\\Bytes Total/sec" -MaxSamples 1 -ErrorAction SilentlyContinue
          if ($stat) {
            $stats += [PSCustomObject]@{
              Name = $adapter.Name
              BytesPerSec = $stat.CounterSamples[0].CookedValue
              Status = $adapter.Status
            }
          }
        }
        $stats | ConvertTo-Json -Depth 2
      `;

      const { stdout } = await execFileAsync('powershell.exe', 
        ['-NoProfile', '-Command', psCommand], 
        { maxBuffer: 1024 * 1024 });

      let networkStats = [];
      if (stdout.trim()) {
        const parsed = JSON.parse(stdout);
        networkStats = Array.isArray(parsed) ? parsed : [parsed];
      }

      // Calculate metrics
      const totalBytesPerSec = networkStats.reduce((sum, stat) => 
        sum + (stat.BytesPerSec || 0), 0);

      const metrics = {
        timestamp: now,
        totalBandwidth: totalBytesPerSec,
        latency: await this.measureLatency(),
        packetLoss: await this.measurePacketLoss(),
        activeConnections: await this.getConnectionCount(),
        congestion: this.calculateCongestion(totalBytesPerSec),
        interfaces: networkStats
      };

      this.networkMetricsCache = metrics;
      this.lastMetricsUpdate = now;
      
      return metrics;
    } catch (error) {
      console.error('Error getting network metrics:', error);
      return {
        timestamp: now,
        totalBandwidth: 0,
        latency: 0,
        packetLoss: 0,
        activeConnections: 0,
        congestion: 0,
        interfaces: []
      };
    }
  }

  async measureLatency() {
    try {
      const { stdout } = await execAsync('ping -n 1 8.8.8.8');
      const match = stdout.match(/time=(\d+)ms/);
      return match ? parseInt(match[1]) : 0;
    } catch (error) {
      return 0;
    }
  }

  async measurePacketLoss() {
    try {
      const { stdout } = await execAsync('ping -n 4 8.8.8.8');
      const match = stdout.match(/\((\d+)% loss\)/);
      return match ? parseInt(match[1]) / 100 : 0;
    } catch (error) {
      return 0;
    }
  }

  async getConnectionCount() {
    try {
      const connections = await getMappedConnections();
      return connections.length;
    } catch (error) {
      return 0;
    }
  }

  calculateCongestion(bytesPerSec) {
    // Estimate congestion based on bandwidth usage
    // This is a simplified calculation - you can make it more sophisticated
    const maxBandwidth = 100 * 1024 * 1024; // Assume 100 Mbps max
    return Math.min(bytesPerSec / maxBandwidth, 1.0);
  }

  async getActiveProcesses() {
    try {
      const psCommand = `
        Get-Process | Where-Object { $_.CPU -gt 0 } | 
        Select-Object Name, Id, CPU, WorkingSet, ProcessName |
        Sort-Object CPU -Descending | Select-Object -First 20 |
        ConvertTo-Json -Depth 2
      `;

      const { stdout } = await execFileAsync('powershell.exe', 
        ['-NoProfile', '-Command', psCommand], 
        { maxBuffer: 1024 * 1024 });

      if (!stdout.trim()) return [];
      
      const processes = JSON.parse(stdout);
      return Array.isArray(processes) ? processes : [processes];
    } catch (error) {
      console.error('Error getting processes:', error);
      return [];
    }
  }

  async getActiveConnections() {
    try {
      return await getMappedConnections();
    } catch (error) {
      console.error('Error getting connections:', error);
      return [];
    }
  }

  async getSystemLoad() {
    try {
      const cpus = os.cpus();
      const loadAvg = os.loadavg();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      
      return {
        cpuCount: cpus.length,
        cpuLoad: loadAvg[0], // 1-minute load average
        memoryUsage: (totalMem - freeMem) / totalMem,
        totalMemory: totalMem,
        freeMemory: freeMem,
        uptime: os.uptime()
      };
    } catch (error) {
      console.error('Error getting system load:', error);
      return {
        cpuCount: 1,
        cpuLoad: 0,
        memoryUsage: 0,
        totalMemory: 0,
        freeMemory: 0,
        uptime: 0
      };
    }
  }

  async detectUserActivity() {
    try {
      const processes = await this.getActiveProcesses();
      
      const patterns = {
        gaming: ['steam', 'discord', 'epicgameslauncher', 'battle.net', 'origin', 'uplay'],
        work: ['teams', 'outlook', 'excel', 'word', 'powerpoint', 'code', 'notepad++'],
        entertainment: ['netflix', 'spotify', 'vlc', 'chrome', 'firefox', 'edge'],
        development: ['code', 'visual studio', 'git', 'node', 'python', 'docker'],
        communication: ['teams', 'discord', 'skype', 'zoom', 'slack']
      };

      const activityScores = {};
      
      for (const [activity, processNames] of Object.entries(patterns)) {
        activityScores[activity] = processes.filter(p => 
          processNames.some(name => 
            p.Name && p.Name.toLowerCase().includes(name.toLowerCase())
          )
        ).length;
      }

      // Find the activity with the highest score
      const maxActivity = Object.entries(activityScores)
        .reduce((a, b) => activityScores[a[0]] > activityScores[b[0]] ? a : b);

      return maxActivity[1] > 0 ? maxActivity[0] : 'idle';
    } catch (error) {
      console.error('Error detecting user activity:', error);
      return 'idle';
    }
  }

  async getNetworkInterfaces() {
    try {
      const interfaces = os.networkInterfaces();
      const result = [];
      
      for (const [name, addresses] of Object.entries(interfaces)) {
        const ipv4 = addresses.find(addr => addr.family === 'IPv4' && !addr.internal);
        if (ipv4) {
          result.push({
            name,
            address: ipv4.address,
            netmask: ipv4.netmask,
            mac: ipv4.mac
          });
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error getting network interfaces:', error);
      return [];
    }
  }

  getSystemInfo() {
    return {
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      release: os.release(),
      type: os.type()
    };
  }

  calculateNetworkHealth(metrics) {
    let score = 100;
    
    // Latency impact (0-50ms: good, 50-100ms: fair, >100ms: poor)
    if (metrics.latency > 100) score -= 30;
    else if (metrics.latency > 50) score -= 15;
    
    // Packet loss impact
    score -= (metrics.packetLoss * 100) * 2;
    
    // Congestion impact
    if (metrics.congestion > 0.8) score -= 25;
    else if (metrics.congestion > 0.6) score -= 15;
    
    return Math.max(0, Math.min(100, score));
  }

  calculateSystemHealth(systemLoad) {
    let score = 100;
    
    // CPU load impact
    if (systemLoad.cpuLoad > 0.8) score -= 30;
    else if (systemLoad.cpuLoad > 0.6) score -= 15;
    
    // Memory usage impact
    if (systemLoad.memoryUsage > 0.9) score -= 25;
    else if (systemLoad.memoryUsage > 0.8) score -= 10;
    
    return Math.max(0, Math.min(100, score));
  }

  determinePriority(context) {
    const { timeOfDay, userActivity, networkHealth, systemHealth } = context;
    
    // High priority situations
    if (networkHealth < 50 || systemHealth < 50) return 'critical';
    if (userActivity === 'gaming') return 'performance';
    if (timeOfDay === 'work_hours' && userActivity === 'work') return 'productivity';
    if (timeOfDay === 'entertainment_hours') return 'entertainment';
    
    return 'normal';
  }

  getContextHistory(limit = 10) {
    return this.contextHistory.slice(-limit);
  }
}