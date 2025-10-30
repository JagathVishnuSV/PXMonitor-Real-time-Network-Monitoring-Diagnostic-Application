export class OptimizationStateManager {
  constructor() {
    this.version = '1.0.0';
    this.agentStates = new Map();
    this.globalCooldowns = new Map();
    this.optimizationHistory = new Map();
    this.effectivenessTracker = new Map();
    
    // Global settings
    this.settings = {
      maxConcurrentOptimizations: 2,
      minTimeBetweenOptimizations: 60000, // 1 minute
      maxOptimizationsPerHour: 5,
      cooldownMultiplier: 1.5, // Increases cooldown after repeated optimizations
      successThreshold: 0.7 // 70% success rate to continue optimizations
    };
    
    // State tracking
    this.activeOptimizations = new Set();
    this.recentOptimizations = [];
    this.performanceImpacts = new Map();
  }

  /**
   * Registers an agent with the state manager
   */
  registerAgent(agentName, config = {}) {
    const defaultState = {
      name: agentName,
      enabled: true,
      consecutiveOptimizations: 0,
      lastOptimization: 0,
      lastSuccess: 0,
      currentCooldown: config.baseCooldown || 300000, // 5 minutes default
      baseCooldown: config.baseCooldown || 300000,
      maxConsecutiveOptimizations: config.maxConsecutive || 3,
      successCount: 0,
      failureCount: 0,
      totalOptimizations: 0,
      averageImprovement: 0,
      riskLevel: 'low',
      status: 'ready'
    };
    
    this.agentStates.set(agentName, defaultState);
    this.optimizationHistory.set(agentName, []);
    this.effectivenessTracker.set(agentName, {
      recentResults: [],
      successRate: 1.0,
      averageImprovement: 0,
      reliability: 1.0
    });
    
    console.log(`📝 Registered agent: ${agentName} with state management`);
  }

  /**
   * Checks if an agent can perform optimization
   */
  canOptimize(agentName, analysisResult) {
    const state = this.agentStates.get(agentName);
    if (!state) {
      console.warn(`⚠️ Agent ${agentName} not registered with state manager`);
      return { allowed: false, reason: 'Agent not registered' };
    }

    const now = Date.now();
    
    // Check if agent is enabled
    if (!state.enabled) {
      return { allowed: false, reason: 'Agent is disabled' };
    }

    // Check if agent is in cooldown
    if (now - state.lastOptimization < state.currentCooldown) {
      const remainingTime = Math.ceil((state.currentCooldown - (now - state.lastOptimization)) / 1000);
      return { 
        allowed: false, 
        reason: `Agent in cooldown for ${remainingTime} more seconds` 
      };
    }

    // Check consecutive optimization limit
    if (state.consecutiveOptimizations >= state.maxConsecutiveOptimizations) {
      return { 
        allowed: false, 
        reason: `Maximum consecutive optimizations reached (${state.consecutiveOptimizations}/${state.maxConsecutiveOptimizations})` 
      };
    }

    // Check global concurrent optimization limit
    if (this.activeOptimizations.size >= this.settings.maxConcurrentOptimizations) {
      return { 
        allowed: false, 
        reason: `Maximum concurrent optimizations reached (${this.activeOptimizations.size}/${this.settings.maxConcurrentOptimizations})` 
      };
    }

    // Check hourly optimization limit
    const hourlyOptimizations = this.getOptimizationsInLastHour(agentName);
    if (hourlyOptimizations >= this.settings.maxOptimizationsPerHour) {
      return { 
        allowed: false, 
        reason: `Hourly optimization limit reached (${hourlyOptimizations}/${this.settings.maxOptimizationsPerHour})` 
      };
    }

    // Check effectiveness threshold
    const effectiveness = this.effectivenessTracker.get(agentName);
    if (effectiveness.successRate < this.settings.successThreshold && state.totalOptimizations > 3) {
      return { 
        allowed: false, 
        reason: `Agent effectiveness below threshold (${Math.round(effectiveness.successRate * 100)}% < ${Math.round(this.settings.successThreshold * 100)}%)` 
      };
    }

    // Check for redundant optimizations
    const redundancyCheck = this.checkForRedundancy(agentName, analysisResult);
    if (!redundancyCheck.allowed) {
      return redundancyCheck;
    }

    return { 
      allowed: true, 
      reason: 'All checks passed',
      riskAssessment: this.assessOptimizationRisk(agentName, analysisResult)
    };
  }

  /**
   * Starts an optimization session
   */
  startOptimization(agentName, analysisResult) {
    const state = this.agentStates.get(agentName);
    if (!state) return false;

    const now = Date.now();
    const optimizationId = `${agentName}_${now}`;
    
    // Update agent state
    state.lastOptimization = now;
    state.consecutiveOptimizations++;
    state.totalOptimizations++;
    state.status = 'optimizing';
    
    // Add to active optimizations
    this.activeOptimizations.add(optimizationId);
    
    // Record optimization start
    const history = this.optimizationHistory.get(agentName);
    history.push({
      id: optimizationId,
      startTime: now,
      analysisResult: analysisResult,
      status: 'running',
      actions: analysisResult.targetedActions || []
    });
    
    console.log(`🚀 Started optimization: ${optimizationId}`);
    return optimizationId;
  }

  /**
   * Completes an optimization session
   */
  completeOptimization(agentName, optimizationId, result) {
    const state = this.agentStates.get(agentName);
    if (!state) return;

    const now = Date.now();
    
    // Remove from active optimizations
    this.activeOptimizations.delete(optimizationId);
    
    // Update agent state based on result
    if (result.success) {
      state.successCount++;
      state.lastSuccess = now;
      
      // Reset consecutive optimizations if successful and sufficient improvement
      const hasSignificantImprovement = this.hasSignificantImprovement(result);
      if (hasSignificantImprovement) {
        state.consecutiveOptimizations = 0;
        state.currentCooldown = state.baseCooldown; // Reset cooldown to base
      } else {
        // Increase cooldown if improvement was minimal
        state.currentCooldown = Math.min(state.currentCooldown * 1.2, state.baseCooldown * 3);
      }
    } else {
      state.failureCount++;
      // Increase cooldown after failure
      state.currentCooldown = Math.min(state.currentCooldown * this.settings.cooldownMultiplier, state.baseCooldown * 4);
    }
    
    state.status = 'ready';
    
    // Update optimization history
    const history = this.optimizationHistory.get(agentName);
    const optimizationRecord = history.find(h => h.id === optimizationId);
    if (optimizationRecord) {
      optimizationRecord.endTime = now;
      optimizationRecord.duration = now - optimizationRecord.startTime;
      optimizationRecord.result = result;
      optimizationRecord.status = result.success ? 'completed' : 'failed';
    }
    
    // Update effectiveness tracking
    this.updateEffectivenessTracking(agentName, result);
    
    // Update recent optimizations for global tracking
    this.recentOptimizations.push({
      agentName,
      optimizationId,
      timestamp: now,
      success: result.success,
      improvement: result.improvements || {}
    });
    
    // Keep only recent optimizations (last 100)
    if (this.recentOptimizations.length > 100) {
      this.recentOptimizations = this.recentOptimizations.slice(-100);
    }
    
    console.log(`🏁 Completed optimization: ${optimizationId} (${result.success ? 'SUCCESS' : 'FAILED'})`);
  }

  /**
   * Checks for redundant optimizations
   */
  checkForRedundancy(agentName, analysisResult) {
    const history = this.optimizationHistory.get(agentName) || [];
    const now = Date.now();
    const redundancyWindow = 600000; // 10 minutes
    
    // Get recent optimizations
    const recentOptimizations = history.filter(h => 
      now - h.startTime < redundancyWindow && h.status === 'completed'
    );
    
    if (recentOptimizations.length === 0) {
      return { allowed: true };
    }
    
    // Check for similar optimization patterns
    const currentActions = (analysisResult.targetedActions || []).map(a => a.type).sort();
    
    for (const recent of recentOptimizations) {
      const recentActions = (recent.actions || []).map(a => a.type).sort();
      
      // Calculate similarity
      const similarity = this.calculateActionSimilarity(currentActions, recentActions);
      
      if (similarity > 0.8) { // 80% similarity threshold
        const timeSinceOptimization = now - recent.startTime;
        const minTimeBetween = this.settings.minTimeBetweenOptimizations;
        
        if (timeSinceOptimization < minTimeBetween) {
          return {
            allowed: false,
            reason: `Similar optimization performed ${Math.ceil(timeSinceOptimization / 1000)}s ago (${Math.round(similarity * 100)}% similar)`
          };
        }
      }
    }
    
    return { allowed: true };
  }

  /**
   * Calculates similarity between two action arrays
   */
  calculateActionSimilarity(actions1, actions2) {
    if (actions1.length === 0 && actions2.length === 0) return 1;
    if (actions1.length === 0 || actions2.length === 0) return 0;
    
    const intersection = actions1.filter(a => actions2.includes(a));
    const union = [...new Set([...actions1, ...actions2])];
    
    return intersection.length / union.length;
  }

  /**
   * Assesses optimization risk
   */
  assessOptimizationRisk(agentName, analysisResult) {
    const state = this.agentStates.get(agentName);
    const effectiveness = this.effectivenessTracker.get(agentName);
    
    let riskScore = 0;
    const risks = [];
    
    // Risk factors
    if (state.consecutiveOptimizations >= 2) {
      riskScore += 0.3;
      risks.push('Multiple consecutive optimizations');
    }
    
    if (effectiveness.successRate < 0.8) {
      riskScore += 0.2;
      risks.push('Below average success rate');
    }
    
    if (analysisResult.targetedActions && analysisResult.targetedActions.length > 3) {
      riskScore += 0.2;
      risks.push('High number of planned actions');
    }
    
    if (analysisResult.riskLevel === 'high' || analysisResult.riskLevel === 'critical') {
      riskScore += 0.4;
      risks.push('High-risk system conditions');
    }
    
    // Recent failures increase risk
    const recentFailures = this.getRecentFailures(agentName, 3600000); // Last hour
    if (recentFailures > 0) {
      riskScore += recentFailures * 0.15;
      risks.push(`${recentFailures} recent failures`);
    }
    
    let riskLevel;
    if (riskScore < 0.3) riskLevel = 'low';
    else if (riskScore < 0.6) riskLevel = 'medium';
    else if (riskScore < 0.8) riskLevel = 'high';
    else riskLevel = 'critical';
    
    return {
      riskLevel,
      riskScore: Math.round(riskScore * 100),
      riskFactors: risks
    };
  }

  /**
   * Updates effectiveness tracking for an agent
   */
  updateEffectivenessTracking(agentName, result) {
    const tracker = this.effectivenessTracker.get(agentName);
    
    // Add recent result
    tracker.recentResults.push({
      timestamp: Date.now(),
      success: result.success,
      improvement: this.calculateOverallImprovement(result.improvements || {})
    });
    
    // Keep only last 20 results
    if (tracker.recentResults.length > 20) {
      tracker.recentResults = tracker.recentResults.slice(-20);
    }
    
    // Recalculate metrics
    const recentSuccesses = tracker.recentResults.filter(r => r.success).length;
    tracker.successRate = tracker.recentResults.length > 0 ? recentSuccesses / tracker.recentResults.length : 1.0;
    
    const improvements = tracker.recentResults.filter(r => r.improvement > 0).map(r => r.improvement);
    tracker.averageImprovement = improvements.length > 0 
      ? improvements.reduce((a, b) => a + b, 0) / improvements.length 
      : 0;
    
    // Calculate reliability based on consistency
    const successRates = [];
    for (let i = 0; i < tracker.recentResults.length - 4; i++) {
      const subset = tracker.recentResults.slice(i, i + 5);
      const subsetSuccessRate = subset.filter(r => r.success).length / subset.length;
      successRates.push(subsetSuccessRate);
    }
    
    if (successRates.length > 0) {
      const variance = this.calculateVariance(successRates);
      tracker.reliability = Math.max(0, 1 - variance);
    }
  }

  /**
   * Calculates overall improvement from improvement metrics
   */
  calculateOverallImprovement(improvements) {
    const improvementValues = Object.values(improvements)
      .filter(imp => typeof imp === 'object' && imp.improvement_percent !== undefined)
      .map(imp => imp.improvement_percent);
    
    if (improvementValues.length === 0) return 0;
    
    return improvementValues.reduce((a, b) => a + b, 0) / improvementValues.length;
  }

  /**
   * Calculates variance for reliability assessment
   */
  calculateVariance(values) {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Checks if optimization had significant improvement
   */
  hasSignificantImprovement(result) {
    const improvements = result.improvements || {};
    
    return Object.values(improvements).some(imp => 
      typeof imp === 'object' && 
      imp.improvement_percent !== undefined && 
      imp.improvement_percent >= 15 // 15% improvement threshold
    );
  }

  /**
   * Gets number of optimizations in the last hour
   */
  getOptimizationsInLastHour(agentName) {
    const history = this.optimizationHistory.get(agentName) || [];
    const oneHourAgo = Date.now() - 3600000;
    
    return history.filter(h => h.startTime > oneHourAgo).length;
  }

  /**
   * Gets number of recent failures
   */
  getRecentFailures(agentName, timeWindow) {
    const history = this.optimizationHistory.get(agentName) || [];
    const cutoff = Date.now() - timeWindow;
    
    return history.filter(h => 
      h.startTime > cutoff && 
      h.status === 'failed'
    ).length;
  }

  /**
   * Gets comprehensive state for an agent
   */
  getAgentState(agentName) {
    const state = this.agentStates.get(agentName);
    const effectiveness = this.effectivenessTracker.get(agentName);
    const history = this.optimizationHistory.get(agentName) || [];
    const recentHistory = history.slice(-10);
    
    if (!state) return null;
    
    return {
      ...state,
      effectiveness: {
        successRate: Math.round(effectiveness.successRate * 100),
        averageImprovement: Math.round(effectiveness.averageImprovement),
        reliability: Math.round(effectiveness.reliability * 100)
      },
      recentHistory: recentHistory.map(h => ({
        id: h.id,
        startTime: h.startTime,
        duration: h.duration,
        status: h.status,
        actionCount: h.actions.length
      })),
      cooldownRemaining: Math.max(0, state.currentCooldown - (Date.now() - state.lastOptimization))
    };
  }

  /**
   * Resets consecutive optimizations for an agent (for manual reset)
   */
  resetConsecutiveOptimizations(agentName) {
    const state = this.agentStates.get(agentName);
    if (state) {
      state.consecutiveOptimizations = 0;
      state.currentCooldown = state.baseCooldown;
      console.log(`🔄 Reset consecutive optimizations for ${agentName}`);
    }
  }

  /**
   * Gets global system state
   */
  getGlobalState() {
    const states = Array.from(this.agentStates.values());
    
    return {
      totalAgents: states.length,
      activeOptimizations: this.activeOptimizations.size,
      enabledAgents: states.filter(s => s.enabled).length,
      agentsInCooldown: states.filter(s => Date.now() - s.lastOptimization < s.currentCooldown).length,
      totalOptimizationsToday: this.getTotalOptimizationsToday(),
      systemLoad: this.calculateSystemLoad(),
      averageSuccessRate: this.calculateAverageSuccessRate()
    };
  }

  /**
   * Gets total optimizations performed today
   */
  getTotalOptimizationsToday() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartTimestamp = todayStart.getTime();
    
    return this.recentOptimizations.filter(opt => opt.timestamp > todayStartTimestamp).length;
  }

  /**
   * Calculates current system optimization load
   */
  calculateSystemLoad() {
    const recentOptimizations = this.recentOptimizations.filter(opt => 
      Date.now() - opt.timestamp < 3600000 // Last hour
    ).length;
    
    const maxHourlyOptimizations = this.settings.maxOptimizationsPerHour * this.agentStates.size;
    return Math.min(100, Math.round((recentOptimizations / maxHourlyOptimizations) * 100));
  }

  /**
   * Calculates average success rate across all agents
   */
  calculateAverageSuccessRate() {
    const trackers = Array.from(this.effectivenessTracker.values());
    if (trackers.length === 0) return 100;
    
    const totalSuccessRate = trackers.reduce((sum, tracker) => sum + tracker.successRate, 0);
    return Math.round((totalSuccessRate / trackers.length) * 100);
  }
}