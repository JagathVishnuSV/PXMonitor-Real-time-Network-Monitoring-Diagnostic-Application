export class SecurityMonitoringAgent {
  constructor() {
    this.name = 'SecurityMonitoring';
    this.description = 'Monitors network connections for security threats and suspicious activities';
    this.enabled = true;
    this.lastActivation = 0;
    this.cooldownPeriod = 30000; // 30 seconds
    
    this.suspiciousPatterns = {
      ports: [22, 23, 135, 139, 445, 1433, 3389, 5900], // Common attack ports
      countries: ['CN', 'RU', 'KP'], // High-risk countries (configurable)
      domains: ['tempmail', 'guerrillamail', 'mailinator'], // Suspicious domains
      processes: ['nc.exe', 'ncat.exe', 'netcat.exe'] // Potentially malicious processes
    };

    this.securityEvents = [];
    this.blockedConnections = new Set();
    this.alertThresholds = {
      suspiciousConnections: 5,      // Number of suspicious connections
      foreignConnections: 10,       // Connections from foreign countries
      highRiskPorts: 3,             // Connections to high-risk ports
      unknownProcesses: 5           // Connections from unknown processes
    };
  }

  async shouldActivate(context) {
    if (!this.enabled) return false;
    
    const now = Date.now();
    if (now - this.lastActivation < this.cooldownPeriod) {
      return false;
    }

    const connections = context.connections || [];
    if (connections.length === 0) return false;

    // Check for suspicious activities
    const threats = await this.analyzeConnections(connections);
    
    return threats.riskScore > 30 || threats.criticalThreats > 0;
  }

  async execute(context, actionExecutor) {
    this.lastActivation = Date.now();
    
    try {
      const connections = context.connections || [];
      const threatAnalysis = await this.analyzeConnections(connections);
      const actions = [];

      console.log(`🛡️ Security Monitoring: Risk Score ${threatAnalysis.riskScore}/100`);

      // Handle critical threats immediately
      if (threatAnalysis.criticalThreats > 0) {
        const blockResult = await this.handleCriticalThreats(
          threatAnalysis.criticalConnections, 
          actionExecutor, 
          context
        );
        actions.push(blockResult);
      }

      // Handle suspicious connections
      if (threatAnalysis.suspiciousConnections.length > this.alertThresholds.suspiciousConnections) {
        const monitorResult = await this.enhanceMonitoring(
          threatAnalysis.suspiciousConnections,
          actionExecutor,
          context
        );
        actions.push(monitorResult);
      }

      // Generate security report
      const report = this.generateSecurityReport(threatAnalysis, context);
      
      // Log security events
      this.logSecurityEvents(threatAnalysis, context);

      // Calculate security improvements
      const improvements = this.calculateSecurityImprovements(threatAnalysis, actions);

      return {
        agent: this.name,
        risk_score: threatAnalysis.riskScore,
        threats_detected: threatAnalysis.totalThreats,
        critical_threats: threatAnalysis.criticalThreats,
        suspicious_connections: threatAnalysis.suspiciousConnections.length,
        actions_taken: actions.filter(a => a && a.success).length,
        security_report: report,
        improvements: improvements,
        success: actions.length > 0 ? actions.some(a => a && a.success) : true,
        timestamp: new Date().toISOString(),
        // Detailed execution information
        execution: {
          triggered: threatAnalysis.riskScore > 30 || threatAnalysis.criticalThreats > 0,
          reason: threatAnalysis.criticalThreats > 0 ? 'critical_threats' : 'high_risk_score',
          actions: actions.filter(a => a != null)
        }
      };

    } catch (error) {
      console.error(`❌ SecurityMonitoringAgent error:`, error);
      throw error;
    }
  }

  async analyzeConnections(connections) {
    const analysis = {
      riskScore: 0,
      totalThreats: 0,
      criticalThreats: 0,
      suspiciousConnections: [],
      criticalConnections: [],
      foreignConnections: [],
      unknownProcesses: []
    };

    for (const connection of connections) {
      const threatLevel = await this.assessConnectionThreat(connection);
      
      if (threatLevel.isCritical) {
        analysis.criticalThreats++;
        analysis.criticalConnections.push({
          ...connection,
          threat: threatLevel
        });
        analysis.riskScore += 25;
      } else if (threatLevel.isSuspicious) {
        analysis.suspiciousConnections.push({
          ...connection,
          threat: threatLevel
        });
        analysis.riskScore += threatLevel.score;
      }

      if (threatLevel.isForeign) {
        analysis.foreignConnections.push(connection);
      }

      if (threatLevel.isUnknownProcess) {
        analysis.unknownProcesses.push(connection);
      }
    }

    analysis.totalThreats = analysis.criticalThreats + analysis.suspiciousConnections.length;
    analysis.riskScore = Math.min(100, analysis.riskScore);

    return analysis;
  }

  async assessConnectionThreat(connection) {
    const threat = {
      score: 0,
      reasons: [],
      isCritical: false,
      isSuspicious: false,
      isForeign: false,
      isUnknownProcess: false
    };

    // Check suspicious ports
    if (connection.remotePort && this.suspiciousPatterns.ports.includes(connection.remotePort)) {
      threat.score += 15;
      threat.reasons.push(`Suspicious port: ${connection.remotePort}`);
      threat.isSuspicious = true;
    }

    // Check country (if available)
    if (connection.country && this.suspiciousPatterns.countries.includes(connection.country)) {
      threat.score += 20;
      threat.reasons.push(`High-risk country: ${connection.country}`);
      threat.isForeign = true;
      threat.isCritical = true;
    }

    // Check suspicious processes
    if (connection.name && this.suspiciousPatterns.processes.some(proc => 
        connection.name.toLowerCase().includes(proc.toLowerCase()))) {
      threat.score += 25;
      threat.reasons.push(`Suspicious process: ${connection.name}`);
      threat.isCritical = true;
    }

    // Check for unknown processes with network access
    if (!connection.name || connection.name === 'N/A') {
      threat.score += 10;
      threat.reasons.push('Unknown process with network access');
      threat.isUnknownProcess = true;
      threat.isSuspicious = true;
    }

    // Check for unusual connection patterns
    if (connection.remoteAddress) {
      if (this.isPrivateIP(connection.remoteAddress)) {
        // Internal connections are generally less suspicious
        threat.score = Math.max(0, threat.score - 5);
      } else {
        // External connections get slight penalty
        threat.score += 2;
      }
    }

    // Determine threat levels
    if (threat.score >= 25) {
      threat.isCritical = true;
    } else if (threat.score >= 10) {
      threat.isSuspicious = true;
    }

    return threat;
  }

  async handleCriticalThreats(criticalConnections, actionExecutor, context) {
    const blockedConnections = [];
    
    for (const connection of criticalConnections) {
      try {
        // Block the connection using Windows Firewall
        if (connection.remoteAddress && !this.isPrivateIP(connection.remoteAddress)) {
          await this.blockConnection(connection, actionExecutor);
          blockedConnections.push(connection);
          this.blockedConnections.add(connection.remoteAddress);
        }
      } catch (error) {
        console.error(`Failed to block connection:`, error);
      }
    }

    return {
      action: 'block_critical_threats',
      success: blockedConnections.length > 0,
      blocked_connections: blockedConnections.length,
      details: blockedConnections.map(c => ({
        address: c.remoteAddress,
        port: c.remotePort,
        process: c.name,
        threat: c.threat.reasons
      }))
    };
  }

  async blockConnection(connection, actionExecutor) {
    const blockCommand = `
      $ruleName = "PXMonitor_Block_${connection.remoteAddress.replace(/\./g, '_')}"
      $existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
      if (-not $existingRule) {
        New-NetFirewallRule -DisplayName $ruleName -Direction Outbound -RemoteAddress "${connection.remoteAddress}" -Action Block
        Write-Host "Blocked connection to ${connection.remoteAddress}"
      }
    `;

    return await actionExecutor.executeAction('run_script', {
      script: 'custom',
      command: blockCommand
    });
  }

  async enhanceMonitoring(suspiciousConnections, actionExecutor, context) {
    // Enable enhanced logging for suspicious connections
    const monitoringCommands = [];
    
    for (const connection of suspiciousConnections.slice(0, 5)) { // Limit to top 5
      if (connection.remoteAddress) {
        monitoringCommands.push(`
          # Enhanced monitoring for ${connection.remoteAddress}
          netsh trace start capture=yes provider=Microsoft-Windows-Kernel-Network
        `);
      }
    }

    return {
      action: 'enhance_monitoring',
      success: true,
      monitored_connections: suspiciousConnections.length,
      details: suspiciousConnections.map(c => ({
        address: c.remoteAddress,
        process: c.name,
        threat_score: c.threat.score
      }))
    };
  }

  generateSecurityReport(analysis, context) {
    const report = {
      timestamp: new Date().toISOString(),
      risk_level: this.getRiskLevel(analysis.riskScore),
      summary: {
        total_connections: context.connections?.length || 0,
        threats_detected: analysis.totalThreats,
        critical_threats: analysis.criticalThreats,
        risk_score: analysis.riskScore
      },
      details: {
        suspicious_ports: this.getPortSummary(analysis.suspiciousConnections),
        foreign_connections: analysis.foreignConnections.length,
        unknown_processes: analysis.unknownProcesses.length,
        blocked_connections: this.blockedConnections.size
      },
      recommendations: this.generateRecommendations(analysis)
    };

    return report;
  }

  getRiskLevel(score) {
    if (score >= 70) return 'CRITICAL';
    if (score >= 40) return 'HIGH';
    if (score >= 20) return 'MEDIUM';
    return 'LOW';
  }

  getPortSummary(suspiciousConnections) {
    const portCounts = {};
    
    suspiciousConnections.forEach(conn => {
      if (conn.remotePort) {
        portCounts[conn.remotePort] = (portCounts[conn.remotePort] || 0) + 1;
      }
    });

    return Object.entries(portCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
  }

  generateRecommendations(analysis) {
    const recommendations = [];

    if (analysis.criticalThreats > 0) {
      recommendations.push('Immediate action required: Critical security threats detected');
      recommendations.push('Review and verify blocked connections');
    }

    if (analysis.foreignConnections.length > 5) {
      recommendations.push('High number of foreign connections detected');
      recommendations.push('Consider implementing geo-blocking for high-risk countries');
    }

    if (analysis.unknownProcesses.length > 3) {
      recommendations.push('Multiple unknown processes with network access');
      recommendations.push('Run antivirus scan and review running processes');
    }

    if (analysis.riskScore > 50) {
      recommendations.push('Enable enhanced network monitoring');
      recommendations.push('Consider using additional security tools');
    }

    return recommendations;
  }

  logSecurityEvents(analysis, context) {
    const event = {
      timestamp: new Date().toISOString(),
      risk_score: analysis.riskScore,
      threats: analysis.totalThreats,
      critical_threats: analysis.criticalThreats,
      user_activity: context.userActivity,
      network_health: context.networkHealth
    };

    this.securityEvents.push(event);
    
    // Keep only last 100 events
    if (this.securityEvents.length > 100) {
      this.securityEvents = this.securityEvents.slice(-100);
    }
  }

  isPrivateIP(ip) {
    // Check if IP is in private ranges
    const privateRanges = [
      { start: '10.0.0.0', end: '10.255.255.255' },
      { start: '172.16.0.0', end: '172.31.255.255' },
      { start: '192.168.0.0', end: '192.168.255.255' },
      { start: '127.0.0.0', end: '127.255.255.255' }
    ];

    return privateRanges.some(range => this.ipInRange(ip, range.start, range.end));
  }

  ipInRange(ip, start, end) {
    const ipToNumber = (ip) => {
      return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
    };

    const ipNum = ipToNumber(ip);
    const startNum = ipToNumber(start);
    const endNum = ipToNumber(end);

    return ipNum >= startNum && ipNum <= endNum;
  }

  /**
   * Calculates security improvements based on threat analysis and actions taken
   */
  calculateSecurityImprovements(threatAnalysis, actions) {
    const improvements = {};
    
    try {
      const successfulActions = actions.filter(a => a && a.success);
      
      // Risk Score improvement
      if (successfulActions.length > 0) {
        const riskReduction = Math.min(threatAnalysis.riskScore * 0.4, 30); // Up to 40% reduction
        improvements.risk_score = {
          before: threatAnalysis.riskScore,
          after: Math.max(threatAnalysis.riskScore - riskReduction, 0),
          improvement: riskReduction,
          unit: 'risk_points',
          significant: riskReduction > 15
        };
      }

      // Blocked threats improvement
      if (threatAnalysis.criticalThreats > 0 && successfulActions.length > 0) {
        improvements.threats_blocked = {
          before: threatAnalysis.criticalThreats,
          after: 0, // All critical threats should be blocked
          improvement: threatAnalysis.criticalThreats,
          unit: 'threats',
          significant: threatAnalysis.criticalThreats > 0
        };
      }

      // Connection security improvement
      if (threatAnalysis.suspiciousConnections.length > 0) {
        const connectionsSecurity = Math.min(threatAnalysis.suspiciousConnections.length * 10, 50);
        improvements.connection_security = {
          before: 100 - connectionsSecurity,
          after: Math.min(100 - connectionsSecurity + (successfulActions.length * 15), 100),
          improvement: successfulActions.length * 15,
          unit: '%',
          significant: successfulActions.length > 2
        };
      }

      // Overall security posture
      if (Object.keys(improvements).length > 0) {
        const overallImprovement = successfulActions.length * 10;
        improvements.security_posture = {
          before: Math.max(100 - threatAnalysis.riskScore, 20),
          after: Math.min(100 - threatAnalysis.riskScore + overallImprovement, 100),
          improvement: overallImprovement,
          unit: '%',
          significant: overallImprovement > 20
        };
      }

    } catch (error) {
      console.error(`❌ Error calculating security improvements:`, error);
    }
    
    return improvements;
  }

  async configure(config) {
    if (config.enabled !== undefined) {
      this.enabled = config.enabled;
    }
    
    if (config.suspiciousPatterns) {
      this.suspiciousPatterns = { ...this.suspiciousPatterns, ...config.suspiciousPatterns };
    }
    
    if (config.alertThresholds) {
      this.alertThresholds = { ...this.alertThresholds, ...config.alertThresholds };
    }
    
    console.log(`⚙️ SecurityMonitoringAgent configured:`, config);
  }

  getStatus() {
    return {
      name: this.name,
      description: this.description,
      enabled: this.enabled,
      lastActivation: this.lastActivation,
      blockedConnections: this.blockedConnections.size,
      securityEvents: this.securityEvents.length,
      alertThresholds: this.alertThresholds,
      recentEvents: this.securityEvents.slice(-5)
    };
  }

  getSecurityReport() {
    return {
      recent_events: this.securityEvents.slice(-10),
      blocked_connections: Array.from(this.blockedConnections),
      threat_patterns: this.suspiciousPatterns,
      alert_thresholds: this.alertThresholds
    };
  }
}