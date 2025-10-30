export class AnalysisEngine {
  constructor() {
    this.name = 'AnalysisEngine';
    this.version = '2.0.0';
    
    // Threshold definitions for intelligent analysis
    this.thresholds = {
      latency: { optimal: 20, acceptable: 50, poor: 100, critical: 200 },
      packetLoss: { optimal: 0.001, acceptable: 0.01, poor: 0.03, critical: 0.05 },
      bandwidth: { optimal: 0.3, acceptable: 0.6, poor: 0.8, critical: 0.9 },
      networkHealth: { optimal: 90, acceptable: 70, poor: 50, critical: 30 },
      cpuUsage: { optimal: 30, acceptable: 60, poor: 80, critical: 95 },
      memoryUsage: { optimal: 40, acceptable: 70, poor: 85, critical: 95 }
    };

    // Optimization effectiveness tracking
    this.optimizationHistory = new Map();
    this.effectivenessScores = new Map();
    
    // Minimum improvement thresholds to justify optimization
    this.improvementThresholds = {
      latency: 10, // ms improvement needed
      packetLoss: 0.005, // 0.5% improvement needed
      bandwidth: 0.1, // 10% improvement needed
      networkHealth: 5 // 5 point improvement needed
    };
  }

  /**
   * Analyzes current metrics and determines if optimization is warranted
   */
  async analyzeOptimizationNeed(context, agentName) {
    const analysis = {
      agent: agentName,
      timestamp: Date.now(),
      shouldOptimize: false,
      targetedActions: [],
      reasoning: [],
      potentialImprovements: {},
      currentStatus: this.assessCurrentStatus(context),
      riskLevel: 'low'
    };

    const metrics = context.networkMetrics || {};
    
    // Analyze each metric individually for targeted optimizations
    await this.analyzeLatency(metrics, analysis, context);
    await this.analyzePacketLoss(metrics, analysis, context);
    await this.analyzeBandwidth(metrics, analysis, context);
    await this.analyzeNetworkHealth(context, analysis);
    await this.analyzeSystemResources(context, analysis);

    // Check if we've tried similar optimizations recently
    await this.checkOptimizationHistory(analysis, agentName);

    // Calculate overall optimization necessity
    analysis.shouldOptimize = analysis.targetedActions.length > 0;
    analysis.priority = this.calculatePriority(analysis);
    
    return analysis;
  }

  /**
   * Analyzes latency metrics for targeted optimization
   */
  async analyzeLatency(metrics, analysis, context) {
    const latency = metrics.latency || 0;
    const threshold = this.thresholds.latency;
    
    if (latency <= threshold.acceptable) {
      analysis.reasoning.push(`Latency is acceptable (${latency}ms ≤ ${threshold.acceptable}ms)`);
      return;
    }

    const potentialImprovement = Math.max(0, latency - threshold.optimal);
    
    if (potentialImprovement >= this.improvementThresholds.latency) {
      // Determine specific latency optimization actions
      if (latency > threshold.critical) {
        analysis.targetedActions.push({
          type: 'dns_flush',
          reason: `Critical latency (${latency}ms) requires DNS cache flush`,
          expectedImprovement: Math.min(potentialImprovement * 0.3, 50),
          priority: 'high'
        });
        
        analysis.targetedActions.push({
          type: 'network_reset',
          reason: `Critical latency may require network stack reset`,
          expectedImprovement: Math.min(potentialImprovement * 0.5, 80),
          priority: 'high'
        });
        
        analysis.riskLevel = 'high';
      } else if (latency > threshold.poor) {
        analysis.targetedActions.push({
          type: 'dns_flush',
          reason: `High latency (${latency}ms) benefits from DNS optimization`,
          expectedImprovement: Math.min(potentialImprovement * 0.4, 30),
          priority: 'medium'
        });
        
        analysis.riskLevel = 'medium';
      }
      
      analysis.potentialImprovements.latency = potentialImprovement;
      analysis.reasoning.push(`Latency optimization warranted: ${latency}ms → ~${(latency - potentialImprovement * 0.4).toFixed(1)}ms`);
    }
  }

  /**
   * Analyzes packet loss for targeted optimization
   */
  async analyzePacketLoss(metrics, analysis, context) {
    const packetLoss = metrics.packet_loss || 0;
    const threshold = this.thresholds.packetLoss;
    
    if (packetLoss <= threshold.acceptable) {
      analysis.reasoning.push(`Packet loss is acceptable (${(packetLoss * 100).toFixed(2)}% ≤ ${(threshold.acceptable * 100).toFixed(2)}%)`);
      return;
    }

    const potentialImprovement = Math.max(0, packetLoss - threshold.optimal);
    
    if (potentialImprovement >= this.improvementThresholds.packetLoss) {
      if (packetLoss > threshold.critical) {
        analysis.targetedActions.push({
          type: 'connection_stabilize',
          reason: `Critical packet loss (${(packetLoss * 100).toFixed(2)}%) requires connection stabilization`,
          expectedImprovement: potentialImprovement * 0.6,
          priority: 'high'
        });
        
        analysis.targetedActions.push({
          type: 'wifi_reconnect',
          reason: `High packet loss may indicate connection issues`,
          expectedImprovement: potentialImprovement * 0.4,
          priority: 'medium'
        });
        
        analysis.riskLevel = 'high';
      } else if (packetLoss > threshold.poor) {
        analysis.targetedActions.push({
          type: 'connection_stabilize',
          reason: `High packet loss (${(packetLoss * 100).toFixed(2)}%) needs stabilization`,
          expectedImprovement: potentialImprovement * 0.5,
          priority: 'medium'
        });
      }
      
      analysis.potentialImprovements.packetLoss = potentialImprovement;
      analysis.reasoning.push(`Packet loss optimization warranted: ${(packetLoss * 100).toFixed(2)}% → ~${((packetLoss - potentialImprovement * 0.5) * 100).toFixed(2)}%`);
    }
  }

  /**
   * Analyzes bandwidth utilization for targeted optimization
   */
  async analyzeBandwidth(metrics, analysis, context) {
    const bandwidth = metrics.bandwidth_utilization || 0;
    const threshold = this.thresholds.bandwidth;
    
    if (bandwidth <= threshold.acceptable) {
      analysis.reasoning.push(`Bandwidth utilization is acceptable (${(bandwidth * 100).toFixed(1)}% ≤ ${(threshold.acceptable * 100).toFixed(1)}%)`);
      return;
    }

    const potentialImprovement = Math.max(0, bandwidth - threshold.optimal);
    
    if (potentialImprovement >= this.improvementThresholds.bandwidth) {
      if (bandwidth > threshold.critical) {
        analysis.targetedActions.push({
          type: 'bandwidth_optimize',
          reason: `Critical bandwidth usage (${(bandwidth * 100).toFixed(1)}%) requires optimization`,
          expectedImprovement: potentialImprovement * 0.3,
          priority: 'high'
        });
        
        analysis.targetedActions.push({
          type: 'traffic_prioritize',
          reason: `High bandwidth usage needs traffic prioritization`,
          expectedImprovement: potentialImprovement * 0.2,
          priority: 'medium'
        });
        
        analysis.riskLevel = 'high';
      } else if (bandwidth > threshold.poor) {
        analysis.targetedActions.push({
          type: 'bandwidth_optimize',
          reason: `High bandwidth usage (${(bandwidth * 100).toFixed(1)}%) benefits from optimization`,
          expectedImprovement: potentialImprovement * 0.4,
          priority: 'medium'
        });
      }
      
      analysis.potentialImprovements.bandwidth = potentialImprovement;
      analysis.reasoning.push(`Bandwidth optimization warranted: ${(bandwidth * 100).toFixed(1)}% → ~${((bandwidth - potentialImprovement * 0.3) * 100).toFixed(1)}%`);
    }
  }

  /**
   * Analyzes overall network health
   */
  async analyzeNetworkHealth(context, analysis) {
    const networkHealth = context.networkHealth || 100;
    const threshold = this.thresholds.networkHealth;
    
    if (networkHealth >= threshold.acceptable) {
      analysis.reasoning.push(`Network health is acceptable (${networkHealth} ≥ ${threshold.acceptable})`);
      return;
    }

    const potentialImprovement = Math.max(0, threshold.optimal - networkHealth);
    
    if (potentialImprovement >= this.improvementThresholds.networkHealth) {
      if (networkHealth < threshold.critical) {
        analysis.targetedActions.push({
          type: 'comprehensive_optimization',
          reason: `Critical network health (${networkHealth}) requires comprehensive optimization`,
          expectedImprovement: potentialImprovement * 0.6,
          priority: 'critical'
        });
        
        analysis.riskLevel = 'critical';
      } else if (networkHealth < threshold.poor) {
        analysis.targetedActions.push({
          type: 'targeted_optimization',
          reason: `Poor network health (${networkHealth}) needs targeted optimization`,
          expectedImprovement: potentialImprovement * 0.4,
          priority: 'high'
        });
        
        analysis.riskLevel = 'high';
      }
      
      analysis.potentialImprovements.networkHealth = potentialImprovement;
      analysis.reasoning.push(`Network health optimization warranted: ${networkHealth} → ~${(networkHealth + potentialImprovement * 0.5).toFixed(1)}`);
    }
  }

  /**
   * Analyzes system resources
   */
  async analyzeSystemResources(context, analysis) {
    const systemMetrics = context.systemMetrics || {};
    const cpuUsage = systemMetrics.cpu || 0;
    const memoryUsage = systemMetrics.memory || 0;
    
    // Only add system optimizations if they won't interfere with network optimizations
    if (cpuUsage > this.thresholds.cpuUsage.poor && analysis.targetedActions.length < 2) {
      analysis.targetedActions.push({
        type: 'process_optimize',
        reason: `High CPU usage (${cpuUsage}%) may impact network performance`,
        expectedImprovement: Math.min((cpuUsage - this.thresholds.cpuUsage.acceptable) * 0.3, 20),
        priority: 'low'
      });
    }
    
    if (memoryUsage > this.thresholds.memoryUsage.poor && analysis.targetedActions.length < 2) {
      analysis.targetedActions.push({
        type: 'memory_optimize',
        reason: `High memory usage (${memoryUsage}%) may impact system performance`,
        expectedImprovement: Math.min((memoryUsage - this.thresholds.memoryUsage.acceptable) * 0.2, 15),
        priority: 'low'
      });
    }
  }

  /**
   * Checks optimization history to prevent redundant actions
   */
  async checkOptimizationHistory(analysis, agentName) {
    const historyKey = `${agentName}_recent`;
    const recentOptimizations = this.optimizationHistory.get(historyKey) || [];
    const now = Date.now();
    const cooldownPeriod = 300000; // 5 minutes cooldown
    
    // Filter out expired optimizations
    const activeOptimizations = recentOptimizations.filter(opt => now - opt.timestamp < cooldownPeriod);
    
    // Check for recent similar optimizations
    analysis.targetedActions = analysis.targetedActions.filter(action => {
      const recentSimilar = activeOptimizations.find(opt => 
        opt.type === action.type && now - opt.timestamp < cooldownPeriod
      );
      
      if (recentSimilar) {
        analysis.reasoning.push(`Skipping ${action.type}: recently executed ${Math.round((now - recentSimilar.timestamp) / 60000)} minutes ago`);
        return false;
      }
      
      return true;
    });
    
    // Update history
    this.optimizationHistory.set(historyKey, activeOptimizations);
  }

  /**
   * Calculates optimization priority based on analysis
   */
  calculatePriority(analysis) {
    if (analysis.riskLevel === 'critical') return 'critical';
    if (analysis.riskLevel === 'high') return 'high';
    
    const highPriorityActions = analysis.targetedActions.filter(a => a.priority === 'high').length;
    const totalActions = analysis.targetedActions.length;
    
    if (highPriorityActions > 0 && totalActions <= 2) return 'high';
    if (totalActions > 0) return 'medium';
    
    return 'low';
  }

  /**
   * Assesses current system status
   */
  assessCurrentStatus(context) {
    const metrics = context.networkMetrics || {};
    const networkHealth = context.networkHealth || 100;
    
    if (networkHealth >= this.thresholds.networkHealth.optimal) {
      return 'optimal';
    } else if (networkHealth >= this.thresholds.networkHealth.acceptable) {
      return 'good';
    } else if (networkHealth >= this.thresholds.networkHealth.poor) {
      return 'degraded';
    } else {
      return 'critical';
    }
  }

  /**
   * Records optimization effectiveness for learning
   */
  recordOptimizationResult(agentName, actionType, beforeMetrics, afterMetrics, success) {
    const effectivenessKey = `${agentName}_${actionType}`;
    const effectiveness = this.effectivenessScores.get(effectivenessKey) || { attempts: 0, successes: 0, improvements: [] };
    
    effectiveness.attempts++;
    if (success) {
      effectiveness.successes++;
      
      // Calculate actual improvement
      const improvement = this.calculateImprovement(beforeMetrics, afterMetrics);
      effectiveness.improvements.push(improvement);
      
      // Keep only recent improvements (last 10)
      if (effectiveness.improvements.length > 10) {
        effectiveness.improvements = effectiveness.improvements.slice(-10);
      }
    }
    
    this.effectivenessScores.set(effectivenessKey, effectiveness);
    
    // Update optimization history
    const historyKey = `${agentName}_recent`;
    const recentOptimizations = this.optimizationHistory.get(historyKey) || [];
    recentOptimizations.push({
      type: actionType,
      timestamp: Date.now(),
      success,
      improvement: success ? this.calculateImprovement(beforeMetrics, afterMetrics) : 0
    });
    
    this.optimizationHistory.set(historyKey, recentOptimizations);
  }

  /**
   * Calculates improvement between before and after metrics
   */
  calculateImprovement(beforeMetrics, afterMetrics) {
    let totalImprovement = 0;
    let improvementCount = 0;
    
    if (beforeMetrics.latency && afterMetrics.latency) {
      const latencyImprovement = Math.max(0, beforeMetrics.latency - afterMetrics.latency);
      totalImprovement += latencyImprovement / beforeMetrics.latency;
      improvementCount++;
    }
    
    if (beforeMetrics.packet_loss && afterMetrics.packet_loss) {
      const packetLossImprovement = Math.max(0, beforeMetrics.packet_loss - afterMetrics.packet_loss);
      totalImprovement += packetLossImprovement / beforeMetrics.packet_loss;
      improvementCount++;
    }
    
    return improvementCount > 0 ? totalImprovement / improvementCount : 0;
  }

  /**
   * Gets effectiveness statistics for an agent
   */
  getEffectivenessStats(agentName) {
    const stats = {};
    
    for (const [key, data] of this.effectivenessScores.entries()) {
      if (key.startsWith(agentName)) {
        const actionType = key.replace(`${agentName}_`, '');
        stats[actionType] = {
          successRate: data.attempts > 0 ? (data.successes / data.attempts) * 100 : 0,
          averageImprovement: data.improvements.length > 0 
            ? data.improvements.reduce((a, b) => a + b, 0) / data.improvements.length * 100
            : 0,
          totalAttempts: data.attempts
        };
      }
    }
    
    return stats;
  }

  /**
   * Generates a comprehensive analysis report
   */
  generateAnalysisReport(analysis) {
    const report = {
      timestamp: new Date().toISOString(),
      agent: analysis.agent,
      currentStatus: analysis.currentStatus,
      shouldOptimize: analysis.shouldOptimize,
      priority: analysis.priority,
      riskLevel: analysis.riskLevel,
      summary: this.generateSummary(analysis),
      targetedActions: analysis.targetedActions,
      reasoning: analysis.reasoning,
      potentialImprovements: analysis.potentialImprovements
    };
    
    return report;
  }

  /**
   * Generates a human-readable summary
   */
  generateSummary(analysis) {
    if (!analysis.shouldOptimize) {
      return `System performance is ${analysis.currentStatus}. No optimization needed at this time.`;
    }
    
    const actionCount = analysis.targetedActions.length;
    const primaryAction = analysis.targetedActions[0];
    
    if (actionCount === 1) {
      return `${primaryAction.reason}. Executing targeted ${primaryAction.type} optimization.`;
    } else {
      return `${actionCount} performance issues detected. Executing targeted optimizations: ${analysis.targetedActions.map(a => a.type).join(', ')}.`;
    }
  }
}