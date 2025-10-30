import { ContextEngine } from './ContextEngine.js';
import { ActionExecutor } from './ActionExecutor.js';
import { ConfigManager } from './ConfigManager.js';
import { AnalysisEngine } from './AnalysisEngine.js';
import { OptimizationStateManager } from './OptimizationStateManager.js';
import { OptimizationReportingSystem } from './OptimizationReportingSystem.js';
import { TrafficPrioritizationAgent } from '../specialized/TrafficPrioritizationAgent.js';
import { NetworkOptimizationAgent } from '../specialized/NetworkOptimizationAgent.js';
import { SecurityMonitoringAgent } from '../specialized/SecurityMonitoringAgent.js';
import { PerformanceAnalyticsAgent } from '../specialized/PerformanceAnalyticsAgent.js';
import { MLPredictiveAgent } from '../ml/MLPredictiveAgent.js';

export class AgentManager {
  constructor() {
    this.agents = new Map();
    this.contextEngine = new ContextEngine();
    this.actionExecutor = new ActionExecutor();
    this.configManager = new ConfigManager();
    this.analysisEngine = new AnalysisEngine();
    this.stateManager = new OptimizationStateManager();
    this.reportingSystem = new OptimizationReportingSystem();
    
    this.isRunning = false;
    this.actionHistory = [];
    this.config = {
      monitoring_interval: 30000, // 30 seconds
      max_concurrent_actions: 2, // Reduced for better control
      enable_predictive: true,
      log_actions: true,
      intelligent_optimization: true // New flag for intelligent mode
    };
    
    console.log('Intelligent AgentManager v2.0 initialized with analysis engine, state management, and reporting');
  }

  async initialize() {
    console.log('Initializing AI Network Assistant Agents...');
    
    try {
      // Initialize core components
      await this.configManager.initialize();
      await this.contextEngine.initialize();
      await this.actionExecutor.initialize();
      
      // Load configuration
      const config = this.configManager.getConfig();
      if (config.agentManager) {
        this.config = { ...this.config, ...config.agentManager };
      }

      // Register all agents with configuration
      this.registerAgent(new TrafficPrioritizationAgent(this.configManager.getAgentConfig('trafficPrioritization')));
      this.registerAgent(new NetworkOptimizationAgent(this.configManager.getAgentConfig('networkOptimization')));
      this.registerAgent(new SecurityMonitoringAgent(this.configManager.getAgentConfig('securityMonitoring')));
      this.registerAgent(new PerformanceAnalyticsAgent(this.configManager.getAgentConfig('performanceAnalytics')));
      
      if (this.config.enable_predictive) {
        this.registerAgent(new MLPredictiveAgent(this.configManager.getAgentConfig('mlPredictive')));
      }

      console.log(`Registered ${this.agents.size} agents successfully`);
      
      // Start context monitoring
      await this.startContextMonitoring();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Agent Manager:', error);
      return false;
    }
  }

  registerAgent(agent) {
    this.agents.set(agent.name, agent);
    
    // Register agent with state manager for intelligent optimization
    this.stateManager.registerAgent(agent.name, {
      baseCooldown: agent.cooldownPeriod || 300000,
      maxConsecutive: agent.maxConsecutiveOptimizations || 3
    });
    
    console.log(`Registered agent: ${agent.name} with intelligent state management`);
  }

  async startContextMonitoring() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('Starting context monitoring...');
    
    const monitorLoop = async () => {
      if (!this.isRunning) return;
      
      try {
        const context = await this.contextEngine.gatherContext();
        await this.processContext(context);
      } catch (error) {
        console.error('Error in monitoring loop:', error);
      }
      
      setTimeout(monitorLoop, this.config.monitoring_interval);
    };
    
    monitorLoop();
  }

  async processContext(context) {
    if (!this.config.intelligent_optimization) {
      // Fall back to original behavior if intelligent optimization is disabled
      return this.processContextLegacy(context);
    }

    const eligibleAgents = [];
    
    // Use intelligent analysis for each agent
    for (const [name, agent] of this.agents) {
      try {
        // First check if agent can optimize (state management)
        const canOptimize = this.stateManager.canOptimize(name, context);
        
        if (!canOptimize.allowed) {
          console.log(`Agent ${name} blocked: ${canOptimize.reason}`);
          continue;
        }

        // Then check if agent should activate (intelligent analysis)
        if (await agent.shouldActivate(context)) {
          eligibleAgents.push({ 
            name, 
            agent, 
            canOptimize,
            priority: canOptimize.riskAssessment?.riskLevel || 'medium'
          });
        }
      } catch (error) {
        console.error(`Error checking activation for agent ${name}:`, error);
      }
    }

    if (eligibleAgents.length === 0) {
      console.log('No agents require activation at this time');
      return;
    }

    // Sort by priority and execute (respect concurrency limit)
    const priorityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
    eligibleAgents.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    const executionPromises = eligibleAgents
      .slice(0, this.config.max_concurrent_actions)
      .map(async ({ name, agent, canOptimize }) => {
        const optimizationId = this.stateManager.startOptimization(name, canOptimize.riskAssessment);
        
        try {
          console.log(`Activating intelligent agent: ${name} (${canOptimize.riskAssessment?.riskLevel || 'medium'} priority)`);
          
          const result = await agent.execute(context, this.actionExecutor);
          
          // Complete optimization in state manager
          this.stateManager.completeOptimization(name, optimizationId, {
            success: true,
            improvements: result.improvements || {}
          });
          
          // Generate comprehensive report
          const report = this.reportingSystem.generateOptimizationReport(
            name, 
            canOptimize.riskAssessment, 
            result
          );
          
          // Log with enhanced reporting
          if (this.config.log_actions) {
            this.logIntelligentAction(name, result, context, report);
          }
          
          return { name, success: true, result, report };
        } catch (error) {
          console.error(`Intelligent agent ${name} execution failed:`, error);
          
          // Complete optimization with failure
          this.stateManager.completeOptimization(name, optimizationId, {
            success: false,
            error: error.message
          });
          
          return { name, success: false, error: error.message };
        }
      });

    const results = await Promise.allSettled(executionPromises);
    return results;
  }

  /**
   * Legacy context processing (fallback)
   */
  async processContextLegacy(context) {
    const activeAgents = [];
    
    // Check which agents should activate
    for (const [name, agent] of this.agents) {
      try {
        if (await agent.shouldActivate(context)) {
          activeAgents.push({ name, agent });
        }
      } catch (error) {
        console.error(`Error checking activation for agent ${name}:`, error);
      }
    }

    // Execute agents (respect concurrency limit)
    const executionPromises = activeAgents
      .slice(0, this.config.max_concurrent_actions)
      .map(async ({ name, agent }) => {
        try {
          console.log(`Activating legacy agent: ${name}`);
          const result = await agent.execute(context, this.actionExecutor);
          
          if (this.config.log_actions && result) {
            this.logAction(name, result, context);
          }
          
          return { name, success: true, result };
        } catch (error) {
          console.error(`Agent ${name} execution failed:`, error);
          return { name, success: false, error: error.message };
        }
      });

    await Promise.allSettled(executionPromises);
  }

  /**
   * Enhanced logging for intelligent actions
   */
  logIntelligentAction(agentName, result, context, report) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      agent: agentName,
      intelligent: true,
      
      // Enhanced action details
      action: {
        type: result.agent || 'optimization',
        summary: report.summaries?.user_friendly?.explanation || result.summary,
        success: result.actions?.success_rate > 50,
        duration: result.execution_time_ms || 0,
        actionsExecuted: result.actions?.executed || 0,
        actionsPlanned: result.actions?.planned || 0,
        improvementLevel: report.execution?.impactLevel || 'minimal'
      },
      
      // Context and analysis
      context: {
        timeOfDay: context.timeOfDay,
        userActivity: context.userActivity,
        networkHealth: context.networkHealth || 0,
        analysisStatus: report.analysis?.currentStatus,
        riskLevel: report.analysis?.riskLevel
      },
      
      // Improvements achieved
      improvements: result.improvements || {},
      
      // User-friendly explanation
      explanation: report.summaries?.user_friendly?.explanation,
      
      // Notification text
      notification: report.notifications?.primary?.message
    };
    
    this.actionHistory.push(logEntry);
    
    // Keep only last 100 actions
    if (this.actionHistory.length > 100) {
      this.actionHistory = this.actionHistory.slice(-100);
    }
    
    // Enhanced console logging
    console.log(`Intelligent Agent Action - ${agentName}:`);
    console.log(`Result: ${logEntry.action.summary}`);
    console.log(`Impact: ${logEntry.action.improvementLevel} (${logEntry.action.actionsExecuted}/${logEntry.action.actionsPlanned} actions)`);
    console.log(`Context: ${logEntry.context.analysisStatus} network, ${logEntry.context.riskLevel} risk`);
    
    if (logEntry.notification) {
      console.log(`  💬 Notification: ${logEntry.notification}`);
    }
  }

  logAction(agentName, action, context) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      agent: agentName,
      action: action,
      context: {
        timeOfDay: context.timeOfDay,
        userActivity: context.userActivity,
        networkHealth: context.networkMetrics?.health || 'unknown'
      }
    };
    
    this.actionHistory.push(logEntry);
    
    // Keep only last 100 actions
    if (this.actionHistory.length > 100) {
      this.actionHistory = this.actionHistory.slice(-100);
    }
    
    // Log to console for immediate visibility
    console.log(`Agent Action - ${agentName}: ${JSON.stringify(action)}`);
    console.log(`Context: Network Health=${context.networkMetrics?.health || 0}, Activity=${context.userActivity}, Time=${context.timeOfDay}`);
  }

  async stop() {
    this.isRunning = false;
    console.log('Stopping Agent Manager...');
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      activeAgents: Array.from(this.agents.keys()),
      currentContext: this.contextEngine.currentContext,
      lastActions: this.actionHistory.slice(-10),
      config: this.config,
      configSummary: this.configManager.getConfigSummary()
    };
  }

  async configureAgent(agentName, config) {
    const agent = this.agents.get(agentName);
    if (agent && agent.configure) {
      await agent.configure(config);
      // Update stored configuration
      await this.configManager.updateAgentConfig(agentName, config);
      console.log(`Agent ${agentName} configured successfully`);
      return true;
    }
    return false;
  }

  async updateConfiguration(config) {
    try {
      // Validate configuration
      const validation = await this.configManager.validateConfig(config);
      if (!validation.isValid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }

      // Save configuration
      await this.configManager.saveConfig(config);

      // Update runtime configuration
      if (config.agentManager) {
        this.config = { ...this.config, ...config.agentManager };
      }

      // Update agent configurations
      if (config.agents) {
        for (const [agentName, agentConfig] of Object.entries(config.agents)) {
          await this.configureAgent(agentName, agentConfig);
        }
      }

      console.log('Configuration updated successfully');
      return true;
    } catch (error) {
      console.error('Failed to update configuration:', error);
      throw error;
    }
  }

  getConfiguration() {
    return this.configManager.getConfig();
  }

  async resetConfiguration() {
    return await this.configManager.resetToDefaults();
  }

  async exportConfiguration() {
    return await this.configManager.exportConfig();
  }

  async importConfiguration(configPath) {
    const config = await this.configManager.importConfig(configPath);
    await this.updateConfiguration(config);
    return config;
  }

  // Intelligent System Methods
  getSystemReport() {
    return {
      globalState: this.stateManager.getGlobalState(),
      dailySummary: this.reportingSystem.generateDailySummary(),
      recentReports: this.reportingSystem.getAllReports(10),
      agentStatuses: this.getAgentStatus()
    };
  }

  async getAgentAnalysis(agentName) {
    const agent = this.agents.get(agentName);
    if (!agent) return null;

    const context = await this.contextEngine.gatherContext();
    const analysis = await this.analysisEngine.analyzeOptimizationNeed(context, agentName);
    const agentState = this.stateManager.getAgentState(agentName);
    const recentReports = this.reportingSystem.getAgentReports(agentName, 5);

    return {
      agentName,
      currentAnalysis: analysis,
      agentState,
      recentActivity: recentReports,
      recommendations: this.generateAgentRecommendations(agentName, analysis, agentState)
    };
  }

  generateAgentRecommendations(agentName, analysis, agentState) {
    const recommendations = [];
    if (agentState.successRate < 70) {
      recommendations.push({
        type: 'improvement',
        message: 'Consider reviewing agent configuration - success rate below optimal',
        priority: 'medium'
      });
    }
    if (agentState.cooldownRemaining > 0) {
      recommendations.push({
        type: 'timing',
        message: `Agent in cooldown for ${Math.ceil(agentState.cooldownRemaining / 1000)}s`,
        priority: 'info'
      });
    }
    if (analysis.shouldOptimize && analysis.priority === 'high') {
      recommendations.push({
        type: 'action',
        message: 'High-priority optimization needed',
        priority: 'high'
      });
    }
    return recommendations;
  }

  async executeAgentManually(agentName) {
    const agent = this.agents.get(agentName);
    if (!agent) throw new Error(`Agent ${agentName} not found`);

    const context = await this.contextEngine.gatherContext();
    this.stateManager.resetConsecutiveOptimizations(agentName);
    
    const analysis = await this.analysisEngine.analyzeOptimizationNeed(context, agentName);
    analysis.shouldOptimize = true;
    
    const optimizationId = this.stateManager.startOptimization(agentName, analysis);
    
    try {
      console.log(`🎮 Manual execution: ${agentName}`);
      const result = await agent.execute(context, this.actionExecutor);
      
      this.stateManager.completeOptimization(agentName, optimizationId, {
        success: true,
        improvements: result.improvements || {}
      });
      
      const report = this.reportingSystem.generateOptimizationReport(agentName, analysis, result);
      this.logIntelligentAction(agentName, result, context, report);
      
      return { success: true, result, report };
    } catch (error) {
      this.stateManager.completeOptimization(agentName, optimizationId, {
        success: false,
        error: error.message
      });
      throw error;
    }
  }

  updateConfig(newConfig) {
    // Deprecated: Use updateConfiguration instead
    console.warn('updateConfig is deprecated, use updateConfiguration instead');
    this.config = { ...this.config, ...newConfig };
    console.log('Agent Manager configuration updated');
  }

  getRecentActions(limit = 10) {
    return this.actionHistory.slice(-limit);
  }
}