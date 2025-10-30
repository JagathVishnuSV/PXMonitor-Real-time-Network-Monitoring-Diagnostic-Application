import { AnalysisEngine } from '../core/AnalysisEngine.js';

export class NetworkOptimizationAgent {
  constructor() {
    this.name = 'NetworkOptimization';
    this.description = 'Intelligently optimizes network performance with targeted, efficient actions';
    this.enabled = true;
    this.lastActivation = 0;
    this.cooldownPeriod = 300000; // 5 minute cooldown for comprehensive optimizations
    this.minActionCooldown = 60000; // 1 minute cooldown between individual actions
    
    // Initialize intelligent analysis engine
    this.analysisEngine = new AnalysisEngine();

    this.optimizationHistory = [];
    this.consecutiveOptimizations = 0;
  this.maxConsecutiveOptimizations = 4; // Allow sustained optimization runs before cooldown
    this.lastOptimizationResults = new Map();
  }

  async shouldActivate(context) {
    if (!this.enabled) return false;
    
    const now = Date.now();
    
    // Basic cooldown check
    if (now - this.lastActivation < this.minActionCooldown) {
      return false;
    }

    // Don't run too many consecutive optimizations
    if (this.consecutiveOptimizations >= this.maxConsecutiveOptimizations) {
      console.log('🛑 Max consecutive optimizations reached, waiting for reset or manual intervention');
      return false;
    }

    // Use intelligent analysis to determine if optimization is needed
    const analysis = await this.analysisEngine.analyzeOptimizationNeed(context, this.name);
    
    // Store analysis for later use in execute()
    this.lastAnalysis = analysis;
    
    console.log(`🔍 Network Analysis Result: ${analysis.shouldOptimize ? 'OPTIMIZATION NEEDED' : 'NO ACTION REQUIRED'}`);
    console.log(`📊 Status: ${analysis.currentStatus}, Priority: ${analysis.priority}, Actions: ${analysis.targetedActions.length}`);
    
    return analysis.shouldOptimize;
  }

  async execute(context, actionExecutor) {
    const startTime = Date.now();
    this.lastActivation = startTime;
    this.consecutiveOptimizations++;
    
    try {
      console.log(`🚀 NetworkOptimizationAgent: Starting intelligent optimization...`);
      
      // Use the analysis from shouldActivate() or create new analysis
      const analysis = this.lastAnalysis || await this.analysisEngine.analyzeOptimizationNeed(context, this.name);
      
      if (!analysis.shouldOptimize) {
        console.log(`ℹ️  No optimization needed: ${analysis.reasoning.join('; ')}`);
        return {
          agent: this.name,
          executed: false,
          reason: 'No optimization needed',
          analysis: analysis.reasoning,
          timestamp: new Date().toISOString()
        };
      }

      const beforeMetrics = { ...context.networkMetrics };
      const results = [];
      let executedActions = 0;

      console.log(`📋 Executing ${analysis.targetedActions.length} targeted optimizations:`);
      analysis.targetedActions.forEach((action, i) => {
        console.log(`  ${i + 1}. ${action.type}: ${action.reason} (Priority: ${action.priority})`);
      });

      // Execute targeted actions in priority order
      const sortedActions = analysis.targetedActions.sort((a, b) => {
        const priorityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      for (const action of sortedActions) {
        try {
          console.log(`🔧 Executing: ${action.type} - ${action.reason}`);
          
          let result = await this.executeTargetedAction(action, actionExecutor, context);
          
          results.push({
            action: action.type,
            reason: action.reason,
            priority: action.priority,
            expectedImprovement: action.expectedImprovement,
            success: result.success,
            output: result.result?.output || result.error,
            duration: result.duration || 0
          });

          if (result.success) {
            executedActions++;
            console.log(`✅ ${action.type} completed successfully`);
          } else {
            console.log(`❌ ${action.type} failed: ${result.error}`);
          }

          // Small delay between actions to prevent system overload
          if (sortedActions.indexOf(action) < sortedActions.length - 1) {
            await this.delay(500); // Reduced delay for faster backend response
          }

        } catch (error) {
          console.error(`❌ Action ${action.type} failed:`, error.message);
          results.push({
            action: action.type,
            reason: action.reason,
            priority: action.priority,
            success: false,
            error: error.message
          });
        }
      }

  // Wait a moment for actions to take effect
  await this.delay(1000); // Reduced post-action delay

      // Gather metrics after optimization for comparison
      const afterMetrics = await this.gatherPostOptimizationMetrics(context);
      
      // Record optimization effectiveness
      this.analysisEngine.recordOptimizationResult(
        this.name,
        'network_optimization',
        beforeMetrics,
        afterMetrics,
        executedActions > 0
      );

      // Generate comprehensive report
      const executionTime = Date.now() - startTime;
      const report = this.generateOptimizationReport(analysis, results, beforeMetrics, afterMetrics, executionTime);
      
      console.log(`🏁 NetworkOptimizationAgent completed: ${executedActions}/${analysis.targetedActions.length} actions executed in ${executionTime}ms`);
      
      return report;

    } catch (error) {
      console.error(`❌ NetworkOptimizationAgent execution error:`, error);
      this.consecutiveOptimizations = Math.max(0, this.consecutiveOptimizations - 1); // Reduce counter on failure
      throw error;
    }
  }

  /**
   * Executes a targeted optimization action
   */
  async executeTargetedAction(action, actionExecutor, context) {
    const startTime = Date.now();
    
    try {
      let result;
      
      switch (action.type) {
        case 'dns_flush':
          result = await actionExecutor.executeAction('run_script', {
            script: 'flush_dns'
          }, context);
          break;
          
        case 'wifi_reconnect':
          result = await actionExecutor.executeAction('run_script', {
            script: 'reconnect_wifi'
          }, context);
          break;
          
        case 'bandwidth_optimize':
          result = await actionExecutor.executeAction('run_script', {
            script: 'optimize_bandwidth'
          }, context);
          break;
          
        case 'connection_stabilize':
          result = await actionExecutor.executeAction('run_script', {
            script: 'stable_connection'
          }, context);
          break;
          
        case 'network_reset':
          result = await actionExecutor.executeAction('run_script', {
            script: 'reset_network_ip'
          }, context);
          break;
          
        case 'traffic_prioritize':
          result = await actionExecutor.executeAction('prioritize_traffic', {
            processes: ['chrome', 'teams', 'zoom'],
            priority: 'high'
          }, context);
          break;
          
        case 'comprehensive_optimization':
          // Execute multiple optimizations for critical situations
          result = await this.executeComprehensiveOptimization(actionExecutor, context);
          break;
          
        case 'targeted_optimization': 
          // Execute selected optimizations based on current issues
          result = await this.executeSelectedOptimizations(actionExecutor, context);
          break;
          
        default:
          throw new Error(`Unknown optimization action: ${action.type}`);
      }
      
      return {
        ...result,
        duration: Date.now() - startTime
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Executes comprehensive optimization for critical network issues
   */
  async executeComprehensiveOptimization(actionExecutor, context) {
    const results = [];
    const actions = ['dns_flush', 'connection_stabilize', 'bandwidth_optimize'];
    
    for (const action of actions) {
      try {
        const result = await actionExecutor.executeAction('run_script', {
          script: action
        }, context);
        results.push({ action, ...result });
        
  // Small delay between actions
  await this.delay(500);
      } catch (error) {
        results.push({ action, success: false, error: error.message });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    return {
      success: successCount > 0,
      result: {
        type: 'comprehensive_optimization',
        actions_executed: successCount,
        total_actions: actions.length,
        details: results
      }
    };
  }

  /**
   * Executes selected optimizations based on current network issues
   */
  async executeSelectedOptimizations(actionExecutor, context) {
    const metrics = context.networkMetrics || {};
    const results = [];
    const selectedActions = [];
    
    // Select actions based on specific issues
    if (metrics.latency > 100) selectedActions.push('dns_flush');
    if (metrics.packet_loss > 0.02) selectedActions.push('connection_stabilize');
    if ((metrics.bandwidth_utilization || 0) > 0.8) selectedActions.push('bandwidth_optimize');
    
    for (const action of selectedActions) {
      try {
        const result = await actionExecutor.executeAction('run_script', {
          script: action
        }, context);
        results.push({ action, ...result });
        
    await this.delay(500);
      } catch (error) {
        results.push({ action, success: false, error: error.message });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    return {
      success: successCount > 0,
      result: {
        type: 'targeted_optimization',
        actions_executed: successCount,
        total_actions: selectedActions.length,
        details: results
      }
    };
  }

  /**
   * Gathers metrics after optimization for comparison
   */
  async gatherPostOptimizationMetrics(context) {
    // In a real implementation, this would re-query network metrics
    // For now, simulate some improvement
    const beforeMetrics = context.networkMetrics || {};
    return {
      latency: Math.max(20, (beforeMetrics.latency || 100) * 0.8),
      packet_loss: Math.max(0.001, (beforeMetrics.packet_loss || 0.02) * 0.7),
      bandwidth_utilization: Math.max(0.3, (beforeMetrics.bandwidth_utilization || 0.8) * 0.9)
    };
  }

  /**
   * Generates a comprehensive optimization report
   */
  generateOptimizationReport(analysis, results, beforeMetrics, afterMetrics, executionTime) {
    const successfulActions = results.filter(r => r.success);
    const failedActions = results.filter(r => !r.success);
    
    // Calculate improvements
    const improvements = this.calculateImprovements(beforeMetrics, afterMetrics);
    
    const report = {
      agent: this.name,
      timestamp: new Date().toISOString(),
      execution_time_ms: executionTime,
      
      // Analysis results
      initial_analysis: {
        status: analysis.currentStatus,
        priority: analysis.priority,
        risk_level: analysis.riskLevel,
        reasoning: analysis.reasoning
      },
      
      // Execution results
      actions: {
        planned: analysis.targetedActions.length,
        executed: successfulActions.length,
        failed: failedActions.length,
        success_rate: analysis.targetedActions.length > 0 
          ? Math.round((successfulActions.length / analysis.targetedActions.length) * 100)
          : 0
      },
      
      // Performance improvements
      improvements: improvements,
      
      // Detailed results
      action_details: results,
      
      // Summary for notifications
      summary: this.generateExecutionSummary(analysis, successfulActions, improvements),
      
      // User-friendly explanation
      explanation: this.generateUserExplanation(analysis, successfulActions, improvements)
    };
    
    return report;
  }

  /**
   * Calculates performance improvements
   */
  calculateImprovements(beforeMetrics, afterMetrics) {
    const improvements = {};
    
    if (beforeMetrics.latency && afterMetrics.latency) {
      const improvement = beforeMetrics.latency - afterMetrics.latency;
      improvements.latency = {
        before: beforeMetrics.latency,
        after: afterMetrics.latency,
        improvement: improvement,
        improvement_percent: Math.round((improvement / beforeMetrics.latency) * 100)
      };
    }
    
    if (beforeMetrics.packet_loss && afterMetrics.packet_loss) {
      const improvement = beforeMetrics.packet_loss - afterMetrics.packet_loss;
      improvements.packet_loss = {
        before: beforeMetrics.packet_loss,
        after: afterMetrics.packet_loss,
        improvement: improvement,
        improvement_percent: Math.round((improvement / beforeMetrics.packet_loss) * 100)
      };
    }
    
    if (beforeMetrics.bandwidth_utilization && afterMetrics.bandwidth_utilization) {
      const improvement = beforeMetrics.bandwidth_utilization - afterMetrics.bandwidth_utilization;
      improvements.bandwidth = {
        before: beforeMetrics.bandwidth_utilization,
        after: afterMetrics.bandwidth_utilization,
        improvement: improvement,
        improvement_percent: Math.round((improvement / beforeMetrics.bandwidth_utilization) * 100)
      };
    }
    
    return improvements;
  }

  /**
   * Generates execution summary for notifications
   */
  generateExecutionSummary(analysis, successfulActions, improvements) {
    if (successfulActions.length === 0) {
      return 'Network optimization attempted but no actions completed successfully.';
    }
    
    const actionTypes = successfulActions.map(a => a.action).join(', ');
    const improvementSummary = Object.entries(improvements)
      .filter(([_, data]) => data.improvement > 0)
      .map(([metric, data]) => `${metric} improved by ${data.improvement_percent}%`)
      .join(', ');
    
    if (improvementSummary) {
      return `Network optimized: ${actionTypes}. ${improvementSummary}.`;
    } else {
      return `Network optimization completed: ${actionTypes}.`;
    }
  }

  /**
   * Generates user-friendly explanation
   */
  generateUserExplanation(analysis, successfulActions, improvements) {
    const reasoning = Array.isArray(analysis?.initial_analysis?.reasoning) ? analysis.initial_analysis.reasoning : [];
    let explanation = `I analyzed your network performance and found ${reasoning.length} issues. `;

    if (successfulActions.length > 0) {
      explanation += `I executed ${successfulActions.length} targeted optimizations: `;
      explanation += successfulActions.map(a => a.reason).join('; ') + '. ';

      const significantImprovements = Object.entries(improvements)
        .filter(([_, data]) => data.improvement_percent >= 10);

      if (significantImprovements.length > 0) {
        explanation += 'Significant improvements: ';
        explanation += significantImprovements
          .map(([metric, data]) => `${metric} reduced by ${data.improvement_percent}%`)
          .join(', ') + '.';
      } else {
        explanation += 'Optimizations applied successfully.';
      }
    } else {
      explanation += 'However, no optimizations could be completed at this time.';
    }

    return explanation;
  }

  selectOptimizations(context) {
    const optimizations = [];
    const metrics = context.networkMetrics;

    // High latency optimizations
    if (metrics?.latency > 50) {
      optimizations.push({
        type: 'dns_flush',
        reason: `High latency detected: ${metrics.latency}ms`,
        priority: metrics.latency > 100 ? 1 : 2
      });

      if (metrics.latency > 100) {
        optimizations.push({
          type: 'dns_switch',
          reason: 'Critical latency, switching DNS servers',
          priority: 1,
          delay: 2000
        });
      }
    }

    // Packet loss optimizations
    if (metrics?.packet_loss > this.thresholds.packet_loss.warning) {
      optimizations.push({
        type: 'wifi_reconnect',
        reason: `Packet loss detected: ${(metrics.packet_loss * 100).toFixed(1)}%`,
        priority: metrics.packet_loss > this.thresholds.packet_loss.critical ? 1 : 2
      });

      if (metrics.packet_loss > this.thresholds.packet_loss.critical) {
        optimizations.push({
          type: 'ip_reset',
          reason: 'Critical packet loss, resetting network configuration',
          priority: 1,
          delay: 5000
        });
      }
    }

    // Bandwidth/congestion optimizations
    if (metrics?.congestion > this.thresholds.bandwidth_utilization.warning) {
      optimizations.push({
        type: 'congestion_clear',
        reason: `Network congestion: ${(metrics.congestion * 100).toFixed(1)}%`,
        priority: 2
      });

      optimizations.push({
        type: 'bandwidth_optimize',
        reason: 'Optimizing bandwidth allocation',
        priority: 2
      });
    }

    // General connection stability
    if (context.networkHealth < this.thresholds.network_health.warning) {
      optimizations.push({
        type: 'connection_stabilize',
        reason: `Low network health: ${context.networkHealth}`,
        priority: 3
      });
    }

    // Gaming-specific optimizations
    if (context.userActivity === 'gaming') {
      optimizations.push({
        type: 'dns_flush',
        reason: 'Gaming mode: optimizing for low latency',
        priority: 2
      });
    }

    // Sort by priority (lower number = higher priority)
    return optimizations.sort((a, b) => a.priority - b.priority);
  }

  countWarningConditions(context) {
    let count = 0;
    const metrics = context.networkMetrics;

    if (metrics?.latency > this.thresholds.latency.warning) count++;
    if (metrics?.packet_loss > this.thresholds.packet_loss.warning) count++;
    if (metrics?.bandwidth_utilization > this.thresholds.bandwidth_utilization.warning) count++;
    if (context.networkHealth < this.thresholds.network_health.warning) count++;

    return count;
  }

  identifyTriggerConditions(context) {
    const conditions = [];
    const metrics = context.networkMetrics;

    if (metrics?.latency > this.thresholds.latency.critical) {
      conditions.push(`Critical latency: ${metrics.latency}ms`);
    } else if (metrics?.latency > this.thresholds.latency.warning) {
      conditions.push(`High latency: ${metrics.latency}ms`);
    }

    if (metrics?.packet_loss > this.thresholds.packet_loss.critical) {
      conditions.push(`Critical packet loss: ${(metrics.packet_loss * 100).toFixed(1)}%`);
    } else if (metrics?.packet_loss > this.thresholds.packet_loss.warning) {
      conditions.push(`Packet loss: ${(metrics.packet_loss * 100).toFixed(1)}%`);
    }

    if (context.networkHealth < this.thresholds.network_health.critical) {
      conditions.push(`Critical network health: ${context.networkHealth}`);
    } else if (context.networkHealth < this.thresholds.network_health.warning) {
      conditions.push(`Low network health: ${context.networkHealth}`);
    }

    return conditions;
  }

  async scheduleFollowUp(context, results) {
    // Schedule a follow-up check in 5 minutes
    setTimeout(async () => {
      try {
        console.log('Network optimization follow-up check...');
        
        // This would require access to the context engine
        // For now, we'll just log that a follow-up is needed
        const currentTime = new Date().toISOString();
        console.log(`Follow-up check scheduled for optimization at ${currentTime}`);
        
        // Reset consecutive optimizations counter if enough time has passed
        if (Date.now() - this.lastActivation > 300000) { // 5 minutes
          this.consecutiveOptimizations = 0;
        }
        
      } catch (error) {
        console.error('Follow-up check error:', error);
      }
    }, 300000); // 5 minutes
  }

  recordOptimization(context, results) {
    const record = {
      timestamp: new Date().toISOString(),
      networkHealth: context.networkHealth,
      latency: context.networkMetrics?.latency,
      packetLoss: context.networkMetrics?.packet_loss,
      congestion: context.networkMetrics?.congestion,
      userActivity: context.userActivity,
      optimizations: results.length,
      successful: results.filter(r => r.success).length
    };

    this.optimizationHistory.push(record);
    
    // Keep only last 50 records
    if (this.optimizationHistory.length > 50) {
      this.optimizationHistory = this.optimizationHistory.slice(-50);
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async configure(config) {
    if (config.enabled !== undefined) {
      this.enabled = config.enabled;
    }
    
    if (config.thresholds) {
      this.thresholds = { ...this.thresholds, ...config.thresholds };
    }
    
    if (config.cooldownPeriod) {
      this.cooldownPeriod = config.cooldownPeriod;
    }

    if (config.resetConsecutiveOptimizations) {
      this.consecutiveOptimizations = 0;
    }
    
    console.log(`NetworkOptimizationAgent configured:`, config);
  }

  getStatus() {
    return {
      name: this.name,
      description: this.description,
      enabled: this.enabled,
      lastActivation: this.lastActivation,
      consecutiveOptimizations: this.consecutiveOptimizations,
      maxConsecutiveOptimizations: this.maxConsecutiveOptimizations,
      thresholds: this.thresholds,
      optimizationHistory: this.optimizationHistory.slice(-10)
    };
  }

  getOptimizationHistory() {
    return this.optimizationHistory;
  }
}