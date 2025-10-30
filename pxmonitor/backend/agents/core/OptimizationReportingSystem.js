export class OptimizationReportingSystem {
  constructor() {
    this.version = '1.0.0';
    this.reportHistory = new Map();
    this.templates = new Map();
    this.userPreferences = {
      detailLevel: 'medium', // 'minimal', 'medium', 'detailed'
      includeMetrics: true,
      includeTechnicalDetails: false,
      preferredFormat: 'notification' // 'notification', 'full-report', 'summary'
    };
    
    this.initializeTemplates();
  }

  /**
   * Initialize report templates
   */
  initializeTemplates() {
    // Notification templates
    this.templates.set('notification_success', {
      title: '✅ Network Optimized',
      format: '{action_summary}. {primary_improvement}',
      maxLength: 100
    });
    
    this.templates.set('notification_partial', {
      title: '⚠️ Partial Optimization',
      format: '{successful_actions} of {total_actions} optimizations completed. {best_improvement}',
      maxLength: 120
    });
    
    this.templates.set('notification_failed', {
      title: '❌ Optimization Failed',
      format: 'Unable to optimize network: {failure_reason}',
      maxLength: 80
    });
    
    // Summary templates
    this.templates.set('summary_comprehensive', {
      sections: ['analysis', 'actions', 'results', 'improvements', 'recommendations'],
      includeMetrics: true,
      includeTechnicalDetails: false
    });
    
    this.templates.set('summary_user_friendly', {
      sections: ['status', 'actions_taken', 'improvements', 'next_steps'],
      includeMetrics: false,
      includeTechnicalDetails: false
    });
  }

  /**
   * Generates a comprehensive optimization report
   */
  generateOptimizationReport(agentName, analysisResult = {}, executionResult = {}, options = {}) {
    const reportId = `${agentName}_${Date.now()}`;
    const reportType = options.type || 'comprehensive';
    const processedAnalysis = this.processAnalysisResult(analysisResult);
    const processedExecution = this.processExecutionResult(executionResult);
    
    const baseReport = {
      id: reportId,
      timestamp: new Date().toISOString(),
      agentName: agentName,
      reportType: reportType,
      
      // Core data
      analysis: processedAnalysis,
      execution: processedExecution,
      
      // Generated content
      notifications: this.generateNotifications(processedAnalysis, processedExecution),
      summaries: this.generateSummaries(processedAnalysis, processedExecution, options),
      recommendations: this.generateRecommendations(processedAnalysis, processedExecution),
      
      // Metadata
      generatedAt: Date.now(),
      version: this.version
    };
    
    // Store report
    if (!this.reportHistory.has(agentName)) {
      this.reportHistory.set(agentName, []);
    }
    this.reportHistory.get(agentName).push(baseReport);
    
    // Keep only last 50 reports per agent
    const agentReports = this.reportHistory.get(agentName);
    if (agentReports.length > 50) {
      this.reportHistory.set(agentName, agentReports.slice(-50));
    }
    
    return baseReport;
  }

  /**
   * Processes analysis result for reporting
   */
  processAnalysisResult(analysisResult) {
    const reasoning = Array.isArray(analysisResult?.reasoning) ? analysisResult.reasoning : (analysisResult?.reasoning ? [analysisResult.reasoning] : []);
    const targetedActions = Array.isArray(analysisResult?.targetedActions) ? analysisResult.targetedActions : [];

    return {
      shouldOptimize: !!analysisResult?.shouldOptimize,
      currentStatus: analysisResult?.currentStatus || 'unknown',
      priority: analysisResult?.priority || 'medium',
      riskLevel: analysisResult?.riskLevel || 'medium',
      targetedActions,
      targetedActionCount: targetedActions.length,
      reasoning,
      potentialImprovements: analysisResult?.potentialImprovements || {},
      
      // Simplified analysis
      primaryIssues: this.extractPrimaryIssues({ ...analysisResult, reasoning }),
      recommendedActions: this.extractRecommendedActions({ ...analysisResult, targetedActions })
    };
  }

  /**
   * Processes execution result for reporting
   */
  processExecutionResult(executionResult) {
    const actionDetails = executionResult.action_details || [];
    const successful = actionDetails.filter(a => a.success);
    const failed = actionDetails.filter(a => !a.success);
    
    return {
      executionTime: executionResult.execution_time_ms || 0,
      actionsPlanned: executionResult.actions?.planned || 0,
      actionsExecuted: executionResult.actions?.executed || 0,
      actionsFailed: executionResult.actions?.failed || 0,
      successRate: executionResult.actions?.success_rate || 0,
      
      improvements: executionResult.improvements || {},
      summary: executionResult.summary || '',
      explanation: executionResult.explanation || '',
      
      // Processed details
      successfulActions: successful.map(a => ({
        action: a.action,
        reason: a.reason,
        outcome: this.summarizeActionOutcome(a)
      })),
      
      failedActions: failed.map(a => ({
        action: a.action,
        reason: a.reason,
        error: a.error
      })),
      
      // Overall assessment
      overallSuccess: (executionResult.actions?.success_rate || 0) > 50,
      hasSignificantImprovement: this.hasSignificantImprovement(executionResult.improvements),
      impactLevel: this.calculateImpactLevel(executionResult.improvements)
    };
  }

  /**
   * Generates notifications for different contexts
   */
  generateNotifications(analysisResult, executionResult) {
    const notifications = {};
    const overallSuccess = executionResult?.overallSuccess || false;
    const hasSignificantImprovement = executionResult?.hasSignificantImprovement || false;
    const actionsExecuted = executionResult?.actionsExecuted || 0;
    const actionsPlanned = executionResult?.actionsPlanned || 0;
    
    // Primary notification for UI
    if (overallSuccess) {
      if (hasSignificantImprovement) {
        notifications.primary = this.formatNotification('notification_success', {
          action_summary: this.summarizeActions(executionResult.successfulActions),
          primary_improvement: this.getPrimaryImprovement(executionResult.improvements)
        });
      } else {
        notifications.primary = this.formatNotification('notification_partial', {
          successful_actions: actionsExecuted,
          total_actions: actionsPlanned,
          best_improvement: this.getBestImprovement(executionResult.improvements)
        });
      }
    } else {
      notifications.primary = this.formatNotification('notification_failed', {
        failure_reason: this.getPrimaryFailureReason(executionResult.failedActions)
      });
    }
    
    // Secondary notifications for different contexts
    notifications.detailed = this.generateDetailedNotification(analysisResult, executionResult);
    notifications.technical = this.generateTechnicalNotification(analysisResult, executionResult);
    notifications.user_friendly = this.generateUserFriendlyNotification(analysisResult, executionResult);
    
    return notifications;
  }

  generateDetailedNotification(analysisResult, executionResult) {
    const improvements = Object.entries(executionResult?.improvements || {})
      .filter(([_, data]) => data && typeof data === 'object')
      .map(([metric, data]) => ({
        metric: this.humanizeMetric(metric),
        before: data.before,
        after: data.after,
        improvement: data.improvement_percent
      }));

    const failedActions = (executionResult?.failedActions || []).map(action => ({
      action: action.action,
      reason: action.reason,
      error: action.error
    }));

    return {
      title: executionResult?.overallSuccess ? '📋 Detailed Optimization Summary' : '🛠️ Optimization Review',
      message: executionResult?.overallSuccess
        ? `Completed ${executionResult.actionsExecuted || 0}/${executionResult.actionsPlanned || 0} actions at ${executionResult.successRate || 0}% success.`
        : 'Optimization encountered issues. Review the details below.',
      details: {
        priority: analysisResult?.priority || 'medium',
        riskLevel: analysisResult?.riskLevel || 'medium',
        actions: {
          executed: executionResult?.actionsExecuted || 0,
          planned: executionResult?.actionsPlanned || 0,
          failed: executionResult?.actionsFailed || 0
        },
        improvements: improvements.slice(0, 5),
        failures: failedActions.slice(0, 5)
      },
      timestamp: new Date().toISOString()
    };
  }

  generateTechnicalNotification(analysisResult, executionResult) {
    const riskLevel = analysisResult?.riskLevel || 'medium';
    const impactLevel = executionResult?.impactLevel || 'minimal';
    const targetedActions = analysisResult?.recommendedActions || [];

    return {
      title: '🧪 Technical Breakdown',
      message: `Risk ${riskLevel}, success ${executionResult?.successRate || 0}% (${executionResult?.actionsExecuted || 0}/${executionResult?.actionsPlanned || 0}), impact ${impactLevel}.`,
      details: {
        reasoning: analysisResult?.reasoning || [],
        targetedActions: targetedActions.slice(0, 5),
        impactLevel,
        significantRisks: analysisResult?.primaryIssues || []
      },
      timestamp: new Date().toISOString()
    };
  }

  generateUserFriendlyNotification(analysisResult, executionResult) {
    const success = executionResult?.overallSuccess;
    const improvement = this.getPrimaryImprovement(executionResult?.improvements || {});
    const actionSummary = this.summarizeActions(executionResult?.successfulActions || []);

    let message;
    if (success) {
      message = improvement === 'System optimized'
        ? 'Optimization completed successfully. Performance is stabilized.'
        : `Optimization successful. ${improvement}.`;
    } else if (executionResult?.actionsExecuted) {
      message = `Partial success: ${executionResult.actionsExecuted} actions helped, but some issues remain.`;
    } else {
      message = 'Optimization could not finish. We will monitor and try again soon.';
    }

    return {
      title: success ? '🎯 Optimization Successful' : 'ℹ️ Attention Needed',
      message,
      details: {
        actions: actionSummary,
        nextStep: this.getNextRecommendedAction(analysisResult, executionResult)
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generates various summary formats
   */
  generateSummaries(analysisResult, executionResult, options) {
    const summaries = {};
    
    // Executive summary
    summaries.executive = this.generateExecutiveSummary(analysisResult, executionResult);
    
    // Technical summary
    summaries.technical = this.generateTechnicalSummary(analysisResult, executionResult);
    
    // User-friendly summary
    summaries.user_friendly = this.generateUserFriendlySummary(analysisResult, executionResult);
    
    // Status summary for dashboard
    summaries.status = this.generateStatusSummary(analysisResult, executionResult);
    
    return summaries;
  }

  /**
   * Generates recommendations for future actions
   */
  generateRecommendations(analysisResult, executionResult) {
    const recommendations = {
      immediate: [],
      shortTerm: [],
      longTerm: [],
      preventive: []
    };
    
    // Based on execution results
    if (executionResult.actionsFailed > 0) {
      recommendations.immediate.push({
        action: 'investigate_failures',
        reason: `${executionResult.actionsFailed} optimization actions failed`,
        priority: 'high'
      });
    }
    
    if (!executionResult.hasSignificantImprovement && executionResult.overallSuccess) {
      recommendations.shortTerm.push({
        action: 'analyze_effectiveness',
        reason: 'Optimizations completed but with minimal improvement',
        priority: 'medium'
      });
    }
    
    // Based on analysis results
    if (analysisResult.riskLevel === 'high' || analysisResult.riskLevel === 'critical') {
      recommendations.immediate.push({
        action: 'monitor_closely',
        reason: `System at ${analysisResult.riskLevel} risk level`,
        priority: 'high'
      });
    }
    
    // Preventive recommendations
    if (analysisResult.primaryIssues.includes('latency')) {
      recommendations.preventive.push({
        action: 'schedule_dns_maintenance',
        reason: 'Recurring latency issues detected',
        priority: 'low'
      });
    }
    
    return recommendations;
  }

  /**
   * Formats a notification using templates
   */
  formatNotification(templateName, data) {
    const template = this.templates.get(templateName);
    if (!template) return 'Optimization completed';
    
    let message = template.format;
    
    // Replace placeholders
    for (const [key, value] of Object.entries(data)) {
      message = message.replace(`{${key}}`, value);
    }
    
    // Truncate if needed
    if (template.maxLength && message.length > template.maxLength) {
      message = message.substring(0, template.maxLength - 3) + '...';
    }
    
    return {
      title: template.title,
      message: message,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generates executive summary
   */
  generateExecutiveSummary(analysisResult, executionResult) {
    const status = executionResult.overallSuccess ? 'completed successfully' : 'encountered issues';
    const improvement = executionResult.hasSignificantImprovement ? 'with measurable improvements' : 'with minimal improvements';
    
    let summary = `Network optimization ${status}`;
    
    if (executionResult.overallSuccess) {
      summary += ` ${improvement}. `;
      summary += `${executionResult.actionsExecuted} of ${executionResult.actionsPlanned} planned actions were executed. `;
      
      if (executionResult.hasSignificantImprovement) {
        const primaryImprovement = this.getPrimaryImprovement(executionResult.improvements);
        summary += `Primary benefit: ${primaryImprovement}.`;
      }
    } else {
      summary += `. ${executionResult.actionsFailed} actions failed. `;
      summary += `Primary issue: ${this.getPrimaryFailureReason(executionResult.failedActions)}.`;
    }
    
    return {
      text: summary,
      status: executionResult.overallSuccess ? 'success' : 'partial',
      keyMetrics: this.extractKeyMetrics(executionResult.improvements),
      duration: `${Math.round(executionResult.executionTime / 1000)}s`
    };
  }

  /**
   * Generates technical summary
   */
  generateTechnicalSummary(analysisResult, executionResult) {
    return {
      analysisDetails: {
        triggeredBy: analysisResult.reasoning.join('; '),
        riskAssessment: analysisResult.riskLevel,
        targetedActions: analysisResult.targetedActions
      },
      executionDetails: {
        totalDuration: executionResult.executionTime,
        successRate: executionResult.successRate,
        actionBreakdown: {
          successful: executionResult.successfulActions.map(a => a.action),
          failed: executionResult.failedActions.map(a => a.action)
        }
      },
      performanceImpact: executionResult.improvements,
      systemState: {
        beforeOptimization: analysisResult.currentStatus,
        afterOptimization: this.determinePostOptimizationStatus(executionResult)
      }
    };
  }

  /**
   * Generates user-friendly summary
   */
  generateUserFriendlySummary(analysisResult, executionResult) {
    let summary = '';
    
    if (executionResult.overallSuccess) {
      summary = 'I successfully optimized your network performance. ';
      
      const improvements = Object.entries(executionResult.improvements)
        .filter(([_, data]) => data.improvement_percent > 5)
        .map(([metric, data]) => `${this.humanizeMetric(metric)} improved by ${data.improvement_percent}%`);
      
      if (improvements.length > 0) {
        summary += `Key improvements: ${improvements.join(', ')}.`;
      } else {
        summary += 'The optimization completed successfully with system stabilization.';
      }
    } else {
      summary = 'I attempted to optimize your network but encountered some issues. ';
      summary += `${executionResult.actionsExecuted} actions completed successfully, but ${executionResult.actionsFailed} failed. `;
      summary += 'Your network should still see some improvement.';
    }
    
    return {
      explanation: summary,
      whatHappened: this.explainWhatHappened(executionResult.successfulActions),
      whyItHappened: analysisResult.reasoning[0] || 'Network performance issues detected',
      whatImproved: this.explainWhatImproved(executionResult.improvements),
      nextSteps: this.suggestNextSteps(analysisResult, executionResult)
    };
  }

  /**
   * Generates status summary for dashboard
   */
  generateStatusSummary(analysisResult, executionResult) {
    return {
      overallStatus: executionResult.overallSuccess ? 'optimized' : 'partially_optimized',
      confidence: this.calculateConfidenceScore(executionResult),
      lastAction: new Date().toISOString(),
      nextRecommendedAction: this.getNextRecommendedAction(analysisResult, executionResult),
      healthScore: this.calculateHealthScore(executionResult.improvements),
      trending: this.determineTrend(executionResult.improvements)
    };
  }

  // Helper methods for report generation
  extractPrimaryIssues(analysisResult) {
    return (analysisResult.reasoning || [])
      .map(reason => {
        if (reason.includes('latency')) return 'latency';
        if (reason.includes('packet')) return 'packet_loss';
        if (reason.includes('bandwidth')) return 'bandwidth';
        return 'general';
      })
      .filter((issue, index, array) => array.indexOf(issue) === index);
  }

  extractRecommendedActions(analysisResult) {
    return (analysisResult.targetedActions || []).map(action => ({
      type: action.type,
      reason: action.reason,
      priority: action.priority
    }));
  }

  summarizeActionOutcome(action) {
    if (action.success) {
      return action.output ? 'Completed successfully' : 'Executed';
    } else {
      return action.error || 'Failed to execute';
    }
  }

  hasSignificantImprovement(improvements) {
    if (!improvements || typeof improvements !== 'object') {
      return false;
    }
    
    return Object.values(improvements).some(imp => 
      imp && 
      typeof imp === 'object' && 
      imp.improvement_percent !== undefined && 
      imp.improvement_percent >= 10
    );
  }

  calculateImpactLevel(improvements) {
    if (!improvements || typeof improvements !== 'object') {
      return 'none';
    }
    
    const improvementValues = Object.values(improvements)
      .filter(imp => imp && typeof imp === 'object' && imp.improvement_percent !== undefined)
      .map(imp => imp.improvement_percent);
    
    if (improvementValues.length === 0) return 'none';
    
    const avgImprovement = improvementValues.reduce((a, b) => a + b, 0) / improvementValues.length;
    
    if (avgImprovement >= 20) return 'high';
    if (avgImprovement >= 10) return 'medium';
    if (avgImprovement >= 5) return 'low';
    return 'minimal';
  }

  summarizeActions(actions) {
    if (actions.length === 0) return 'No actions';
    if (actions.length === 1) return actions[0].action.replace('_', ' ');
    if (actions.length <= 3) return actions.map(a => a.action.replace('_', ' ')).join(', ');
    return `${actions.length} network optimizations`;
  }

  getPrimaryImprovement(improvements) {
    const bestImprovement = Object.entries(improvements)
      .filter(([_, data]) => typeof data === 'object' && data.improvement_percent > 0)
      .sort((a, b) => b[1].improvement_percent - a[1].improvement_percent)[0];
    
    if (!bestImprovement) return 'System optimized';
    
    const [metric, data] = bestImprovement;
    return `${this.humanizeMetric(metric)} improved by ${data.improvement_percent}%`;
  }

  getBestImprovement(improvements) {
    const improvement = this.getPrimaryImprovement(improvements);
    return improvement === 'System optimized' ? 'Minor improvements applied' : improvement;
  }

  getPrimaryFailureReason(failedActions) {
    if (!Array.isArray(failedActions) || failedActions.length === 0) {
      return 'Unknown error';
    }

    const commonErrors = failedActions.map(a => a.error);
    const mostCommon = commonErrors.reduce((a, b, i, arr) => 
      arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
    );

    return mostCommon || 'System limitations';
  }

  humanizeMetric(metric) {
    const humanNames = {
      latency: 'Response time',
      packet_loss: 'Connection stability',
      bandwidth: 'Bandwidth efficiency',
      networkHealth: 'Network health'
    };
    
    return humanNames[metric] || metric.replace('_', ' ');
  }

  explainWhatHappened(successfulActions) {
    if (successfulActions.length === 0) return 'No optimizations were completed.';
    
    const actionDescriptions = {
      dns_flush: 'cleared DNS cache for faster lookups',
      bandwidth_optimize: 'optimized bandwidth allocation',
      connection_stabilize: 'stabilized network connection',
      wifi_reconnect: 'refreshed WiFi connection'
    };
    
    return successfulActions
      .map(action => actionDescriptions[action.action] || `executed ${action.action}`)
      .join(', ');
  }

  explainWhatImproved(improvements) {
    const improvementList = Object.entries(improvements)
      .filter(([_, data]) => data.improvement_percent > 0)
      .map(([metric, data]) => `${this.humanizeMetric(metric)} by ${data.improvement_percent}%`);
    
    if (improvementList.length === 0) return 'System performance stabilized';
    
    return `Improved: ${improvementList.join(', ')}`;
  }

  suggestNextSteps(analysisResult, executionResult) {
    if (executionResult.hasSignificantImprovement) {
      return 'Monitor performance and enjoy improved network speeds.';
    } else if (executionResult.overallSuccess) {
      return 'Consider manual network diagnostics if issues persist.';
    } else {
      return 'Check system settings and try optimization again later.';
    }
  }

  calculateConfidenceScore(executionResult) {
    let score = executionResult.successRate;
    
    if (executionResult.hasSignificantImprovement) score += 20;
    if (executionResult.impactLevel === 'high') score += 10;
    if (executionResult.actionsFailed === 0) score += 10;
    
    return Math.min(100, Math.round(score));
  }

  calculateHealthScore(improvements) {
    const improvementValues = Object.values(improvements)
      .filter(imp => typeof imp === 'object' && imp.improvement_percent !== undefined)
      .map(imp => imp.improvement_percent);
    
    if (improvementValues.length === 0) return 75; // Baseline
    
    const avgImprovement = improvementValues.reduce((a, b) => a + b, 0) / improvementValues.length;
    return Math.min(100, Math.round(75 + avgImprovement));
  }

  determineTrend(improvements) {
    const hasImprovement = Object.values(improvements).some(imp => 
      typeof imp === 'object' && imp.improvement_percent > 5
    );
    
    return hasImprovement ? 'improving' : 'stable';
  }

  getNextRecommendedAction(analysisResult, executionResult) {
    if (executionResult.actionsFailed > 0) {
      return 'Review failed optimizations';
    } else if (!executionResult.hasSignificantImprovement) {
      return 'Monitor for 10 minutes then re-evaluate';
    } else {
      return 'Continue monitoring';
    }
  }

  determinePostOptimizationStatus(executionResult) {
    if (executionResult.hasSignificantImprovement) return 'optimized';
    if (executionResult.overallSuccess) return 'improved';
    return 'stable';
  }

  extractKeyMetrics(improvements) {
    return Object.entries(improvements)
      .filter(([_, data]) => typeof data === 'object' && data.improvement_percent > 5)
      .map(([metric, data]) => ({
        metric: this.humanizeMetric(metric),
        improvement: `${data.improvement_percent}%`
      }));
  }

  /**
   * Gets reports for a specific agent
   */
  getAgentReports(agentName, limit = 10) {
    const reports = this.reportHistory.get(agentName) || [];
    return reports.slice(-limit).reverse(); // Most recent first
  }

  /**
   * Gets all reports across agents
   */
  getAllReports(limit = 50) {
    const allReports = [];
    
    for (const [agentName, reports] of this.reportHistory.entries()) {
      reports.forEach(report => {
        allReports.push({ ...report, agentName });
      });
    }
    
    return allReports
      .sort((a, b) => b.generatedAt - a.generatedAt)
      .slice(0, limit);
  }

  /**
   * Generates a daily summary report
   */
  generateDailySummary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();
    
    const todayReports = this.getAllReports(100).filter(report => 
      new Date(report.timestamp).getTime() > todayTimestamp
    );
    
    const totalOptimizations = todayReports.length;
    const successfulOptimizations = todayReports.filter(r => r.execution.overallSuccess).length;
    const significantImprovements = todayReports.filter(r => r.execution.hasSignificantImprovement).length;
    
    return {
      date: today.toISOString().split('T')[0],
      totalOptimizations,
      successfulOptimizations,
      significantImprovements,
      successRate: totalOptimizations > 0 ? Math.round((successfulOptimizations / totalOptimizations) * 100) : 0,
      improvementRate: totalOptimizations > 0 ? Math.round((significantImprovements / totalOptimizations) * 100) : 0,
      mostActiveAgent: this.getMostActiveAgent(todayReports),
      commonIssues: this.getCommonIssues(todayReports),
      averageExecutionTime: this.getAverageExecutionTime(todayReports)
    };
  }

  getMostActiveAgent(reports) {
    const agentCounts = {};
    reports.forEach(report => {
      agentCounts[report.agentName] = (agentCounts[report.agentName] || 0) + 1;
    });
    
    return Object.entries(agentCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';
  }

  getCommonIssues(reports) {
    const issues = [];
    reports.forEach(report => {
      if (report.analysis.primaryIssues) {
        issues.push(...report.analysis.primaryIssues);
      }
    });
    
    const issueCounts = {};
    issues.forEach(issue => {
      issueCounts[issue] = (issueCounts[issue] || 0) + 1;
    });
    
    return Object.entries(issueCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([issue, count]) => ({ issue, count }));
  }

  getAverageExecutionTime(reports) {
    if (reports.length === 0) return 0;
    
    const totalTime = reports.reduce((sum, report) => sum + (report.execution.executionTime || 0), 0);
    return Math.round(totalTime / reports.length);
  }
}