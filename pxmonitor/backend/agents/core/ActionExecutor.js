import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execFileAsync = promisify(execFile);

export class ActionExecutor {
  constructor() {
    this.scriptMapping = {
      'flush_dns': 'Flush-DnsCache.ps1',
      'reconnect_wifi': 'Reconnect-WiFi.ps1',
      'optimize_bandwidth': 'Optimize-Bandwidth.ps1',
      'clear_network_congestion': 'Clear-NetworkCongestion.ps1',
      'switch_dns_server': 'Switch-DnsServer.ps1',
      'reset_network_ip': 'Reset-NetworkIP.ps1',
      'maintain_connection': 'Maintain-PowerfulConnection.ps1',
      'stable_connection': 'StableConnection.ps1'
    };
    
    this.scriptsPath = path.join(__dirname, '../../scripts');
    this.activeActions = new Set();
    this.actionResults = new Map();
    this.maxConcurrentActions = 3;
  }

  async initialize() {
    console.log('Initializing Action Executor...');
    
    // Verify scripts directory exists and scripts are available
    try {
      const { stdout } = await execFileAsync('powershell.exe', 
        ['-NoProfile', '-Command', `Test-Path "${this.scriptsPath}"`]);
      
      if (stdout.trim() !== 'True') {
        console.warn('⚠️ Scripts directory not found, some actions may not work');
      }
      
      console.log('Action Executor initialized');
      return true;
    } catch (error) {
      console.warn('⚠️ Could not verify scripts directory:', error.message);
    }
  }

  async executeAction(actionName, params = {}, context = {}) {
    if (this.activeActions.size >= this.maxConcurrentActions) {
      throw new Error('Maximum concurrent actions reached');
    }

    const actionId = `${actionName}_${Date.now()}`;
    this.activeActions.add(actionId);

    try {
      console.log(`🔧 Executing action: ${actionName}`);
      
      let result;
      switch (actionName) {
        case 'optimize_network':
          result = await this.optimizeNetwork(params, context);
          break;
        case 'prioritize_traffic':
          result = await this.prioritizeTraffic(params, context);
          break;
        case 'throttle_processes':
          result = await this.throttleProcesses(params, context);
          break;
        case 'enable_low_latency':
          result = await this.enableLowLatencyMode(params, context);
          break;
        case 'run_script':
          result = await this.runScript(params.script, params.args);
          break;
        case 'set_qos_policy':
          result = await this.setQoSPolicy(params, context);
          break;
        default:
          throw new Error(`Unknown action: ${actionName}`);
      }

      this.actionResults.set(actionId, {
        success: true,
        result,
        timestamp: new Date().toISOString(),
        context: context.timestamp
      });

      return {
        actionId,
        success: true,
        result,
        description: this.getActionDescription(actionName, params, result)
      };

    } catch (error) {
      console.error(`❌ Action ${actionName} failed:`, error);
      
      this.actionResults.set(actionId, {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        context: context.timestamp
      });

      return {
        actionId,
        success: false,
        error: error.message,
        description: `Failed to execute ${actionName}: ${error.message}`
      };
    } finally {
      this.activeActions.delete(actionId);
    }
  }

  async optimizeNetwork(params, context) {
    const actions = [];
    const results = [];

    // Determine optimization actions based on context
    if (context.networkMetrics?.latency > 100) {
      actions.push('flush_dns');
    }

    if (context.networkMetrics?.packetLoss > 0.05) {
      actions.push('reconnect_wifi');
      actions.push('reset_network_ip');
    }

    if (context.networkMetrics?.congestion > 0.8) {
      actions.push('clear_network_congestion');
      actions.push('optimize_bandwidth');
    }

    if (context.networkHealth < 60) {
      actions.push('stable_connection');
    }

    // Execute optimization scripts
    for (const action of actions) {
      try {
        const result = await this.runScript(action);
        results.push({ action, success: true, result });
      } catch (error) {
        results.push({ action, success: false, error: error.message });
      }
    }

    return {
      optimizationsApplied: actions,
      results,
      summary: `Applied ${results.filter(r => r.success).length}/${actions.length} optimizations`
    };
  }

  async prioritizeTraffic(params, context) {
    const { processes = [], priority = 'high' } = params;
    const results = [];

    for (const processName of processes) {
      try {
        // Use Windows QoS policies to prioritize traffic
        const qosCommand = `
          $policy = Get-NetQosPolicy -Name "${processName}_priority" -ErrorAction SilentlyContinue
          if (-not $policy) {
            New-NetQosPolicy -Name "${processName}_priority" -AppPathNameMatchCondition "*${processName}*" -NetworkProfile All -PriorityValue8021Action ${priority === 'high' ? 6 : priority === 'medium' ? 4 : 2}
          }
        `;

        await execFileAsync('powershell.exe', 
          ['-NoProfile', '-Command', qosCommand],
          { maxBuffer: 1024 * 1024 });

        results.push({ process: processName, success: true, priority });
      } catch (error) {
        results.push({ process: processName, success: false, error: error.message });
      }
    }

    return {
      processesConfigured: results.filter(r => r.success).length,
      results,
      summary: `Configured traffic priority for ${results.filter(r => r.success).length} processes`
    };
  }

  async throttleProcesses(params, context) {
    const { processes = [], bandwidth = '1MB' } = params;
    const results = [];

    for (const processName of processes) {
      try {
        // Use Windows QoS to throttle bandwidth
        const throttleCommand = `
          $policy = Get-NetQosPolicy -Name "${processName}_throttle" -ErrorAction SilentlyContinue
          if ($policy) {
            Remove-NetQosPolicy -Name "${processName}_throttle" -Confirm:$false
          }
          New-NetQosPolicy -Name "${processName}_throttle" -AppPathNameMatchCondition "*${processName}*" -NetworkProfile All -ThrottleRateActionBitsPerSecond ${this.parseBandwidth(bandwidth)}
        `;

        await execFileAsync('powershell.exe', 
          ['-NoProfile', '-Command', throttleCommand],
          { maxBuffer: 1024 * 1024 });

        results.push({ process: processName, success: true, bandwidth });
      } catch (error) {
        results.push({ process: processName, success: false, error: error.message });
      }
    }

    return {
      processesThrottled: results.filter(r => r.success).length,
      results,
      summary: `Throttled ${results.filter(r => r.success).length} processes to ${bandwidth}`
    };
  }

  async enableLowLatencyMode(params, context) {
    const actions = [
      'optimize_bandwidth',
      'clear_network_congestion',
      'flush_dns'
    ];

    const results = [];

    // Execute low-latency optimizations
    for (const action of actions) {
      try {
        const result = await this.runScript(action);
        results.push({ action, success: true, result });
      } catch (error) {
        results.push({ action, success: false, error: error.message });
      }
    }

    // Set gaming QoS policies
    try {
      const gamingQoSCommand = `
        # Set gaming applications to high priority
        $gamingApps = @('steam', 'discord', 'battle.net', 'epicgameslauncher')
        foreach ($app in $gamingApps) {
          $policy = Get-NetQosPolicy -Name "$app_gaming" -ErrorAction SilentlyContinue
          if (-not $policy) {
            New-NetQosPolicy -Name "$app_gaming" -AppPathNameMatchCondition "*$app*" -NetworkProfile All -PriorityValue8021Action 7
          }
        }
      `;

      await execFileAsync('powershell.exe', 
        ['-NoProfile', '-Command', gamingQoSCommand],
        { maxBuffer: 1024 * 1024 });

      results.push({ action: 'gaming_qos', success: true });
    } catch (error) {
      results.push({ action: 'gaming_qos', success: false, error: error.message });
    }

    return {
      optimizationsApplied: results.filter(r => r.success).length,
      results,
      summary: `Enabled low-latency mode with ${results.filter(r => r.success).length} optimizations`
    };
  }

  async setQoSPolicy(params, context) {
    const { policyName, appPath, priority, bandwidth } = params;
    
    try {
      let qosCommand = `
        $policy = Get-NetQosPolicy -Name "${policyName}" -ErrorAction SilentlyContinue
        if ($policy) {
          Remove-NetQosPolicy -Name "${policyName}" -Confirm:$false
        }
        New-NetQosPolicy -Name "${policyName}" -AppPathNameMatchCondition "${appPath}" -NetworkProfile All`;

      if (priority) {
        qosCommand += ` -PriorityValue8021Action ${priority}`;
      }

      if (bandwidth) {
        qosCommand += ` -ThrottleRateActionBitsPerSecond ${this.parseBandwidth(bandwidth)}`;
      }

      await execFileAsync('powershell.exe', 
        ['-NoProfile', '-Command', qosCommand],
        { maxBuffer: 1024 * 1024 });

      return {
        policyName,
        success: true,
        summary: `Created QoS policy: ${policyName}`
      };
    } catch (error) {
      throw new Error(`Failed to set QoS policy: ${error.message}`);
    }
  }

  async runScript(scriptName, args = []) {
    const scriptFile = this.scriptMapping[scriptName];
    if (!scriptFile) {
      throw new Error(`Unknown script: ${scriptName}`);
    }

    const scriptPath = path.join(this.scriptsPath, scriptFile);
    
    try {
      console.log(`🔧 Running PowerShell script: ${scriptFile}`);
      
      const { stdout, stderr } = await execFileAsync('powershell.exe', 
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, ...args],
        { 
          maxBuffer: 1024 * 1024,
          timeout: 30000 // 30 second timeout
        });

      console.log(`✅ Script ${scriptName} completed successfully`);
      
      return {
        script: scriptName,
        output: stdout.trim(),
        errors: stderr.trim(),
        success: true
      };
    } catch (error) {
      console.error(`❌ Script ${scriptName} failed:`, error.message);
      throw new Error(`Script ${scriptName} failed: ${error.message}`);
    }
  }

  parseBandwidth(bandwidth) {
    const units = {
      'KB': 1024 * 8,
      'MB': 1024 * 1024 * 8,
      'GB': 1024 * 1024 * 1024 * 8
    };

    const match = bandwidth.match(/^(\d+(?:\.\d+)?)\s*(KB|MB|GB)?$/i);
    if (!match) {
      throw new Error(`Invalid bandwidth format: ${bandwidth}`);
    }

    const value = parseFloat(match[1]);
    const unit = (match[2] || 'KB').toUpperCase();
    
    return Math.floor(value * (units[unit] || units.KB));
  }

  getActionDescription(actionName, params, result) {
    switch (actionName) {
      case 'optimize_network':
        return `Network optimization completed: ${result.summary}`;
      case 'prioritize_traffic':
        return `Traffic prioritization applied to ${result.processesConfigured} processes`;
      case 'throttle_processes':
        return `Bandwidth throttling applied to ${result.processesThrottled} processes`;
      case 'enable_low_latency':
        return `Low-latency mode enabled with ${result.optimizationsApplied} optimizations`;
      case 'run_script':
        return `Script ${params.script} executed successfully`;
      case 'set_qos_policy':
        return `QoS policy '${result.policyName}' created`;
      default:
        return `Action ${actionName} completed`;
    }
  }

  getActiveActions() {
    return Array.from(this.activeActions);
  }

  getActionHistory(limit = 20) {
    const entries = Array.from(this.actionResults.entries())
      .sort((a, b) => new Date(b[1].timestamp) - new Date(a[1].timestamp))
      .slice(0, limit);

    return entries.map(([id, data]) => ({ id, ...data }));
  }

  async cleanup() {
    // Remove temporary QoS policies created by agents
    try {
      const cleanupCommand = `
        Get-NetQosPolicy | Where-Object { $_.Name -like "*_priority" -or $_.Name -like "*_throttle" -or $_.Name -like "*_gaming" } | Remove-NetQosPolicy -Confirm:$false
      `;

      await execFileAsync('powershell.exe', 
        ['-NoProfile', '-Command', cleanupCommand],
        { maxBuffer: 1024 * 1024 });

      console.log('🧹 Cleaned up temporary QoS policies');
    } catch (error) {
      console.warn('Warning: Could not clean up QoS policies:', error.message);
    }
  }
}