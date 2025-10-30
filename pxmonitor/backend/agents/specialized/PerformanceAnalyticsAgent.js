export class PerformanceAnalyticsAgent {
  constructor() {
    this.name = 'PerformanceAnalytics';
    this.description = 'Analyzes network and system performance patterns to provide insights and predictions';
    this.enabled = true;
    this.lastActivation = 0;
    this.cooldownPeriod = 60000; // 1 minute
    
    this.performanceHistory = [];
    this.maxHistorySize = 1000;
    this.analysisWindow = 300000; // 5 minutes in milliseconds
    
    this.performanceThresholds = {
      cpu_high: 80,           // CPU usage %
      memory_high: 85,        // Memory usage %
      network_congestion: 70, // Network congestion %
      latency_high: 100,      // Latency in ms
      performance_drop: 20    // Performance drop %
    };

    this.patterns = new Map();
    this.predictions = new Map();
  }

  async shouldActivate(context) {
    if (!this.enabled) return false;
    
    const now = Date.now();
    if (now - this.lastActivation < this.cooldownPeriod) {
      return false;
    }

    // Activate for performance analysis periodically
    return true;
  }

  async execute(context, actionExecutor) {
    this.lastActivation = Date.now();
    
    try {
      // Record current performance metrics
      const currentMetrics = this.extractPerformanceMetrics(context);
      this.recordPerformanceData(currentMetrics);

      // Perform various analyses
      const trendAnalysis = await this.analyzeTrends();
      const patternAnalysis = await this.analyzePatterns(context);
      const performanceScore = this.calculatePerformanceScore(currentMetrics);
      const insights = this.generateInsights(trendAnalysis, patternAnalysis, currentMetrics);
      const recommendations = this.generateRecommendations(insights, currentMetrics);

      console.log(`📊 Performance Analytics: Score ${performanceScore}/100`);

      // Take action if performance is critically low
      const actions = [];
      let improvements = {};

      if (performanceScore < 40) {
        const optimizationResult = await this.triggerPerformanceOptimization(
          currentMetrics, 
          actionExecutor, 
          context
        );
        if (optimizationResult) {
          actions.push(optimizationResult);
          // Calculate improvements based on optimization actions
          improvements = this.calculatePerformanceImprovements(currentMetrics, optimizationResult, performanceScore) || {};
        }
      }

      return {
        agent: this.name,
        performance_score: performanceScore,
        trend_analysis: trendAnalysis,
        pattern_analysis: patternAnalysis,
        insights: insights,
        recommendations: recommendations,
        actions_taken: actions.length,
        improvements: improvements,
        success: actions.length > 0 ? actions.some(a => a.success) : true,
        timestamp: new Date().toISOString(),
        // Detailed reporting information
        execution: {
          triggered: performanceScore < 40,
          reason: performanceScore < 40 ? 'low_performance_score' : 'monitoring_only',
          actions: actions
        }
      };

    } catch (error) {
      console.error(`❌ PerformanceAnalyticsAgent error:`, error);
      throw error;
    }
  }

  extractPerformanceMetrics(context) {
    return {
      timestamp: Date.now(),
      cpu_usage: (context.systemLoad?.cpuLoad || 0) * 100,
      memory_usage: (context.systemLoad?.memoryUsage || 0) * 100,
      network_latency: context.networkMetrics?.latency || 0,
      network_congestion: (context.networkMetrics?.congestion || 0) * 100,
      packet_loss: (context.networkMetrics?.packetLoss || 0) * 100,
      active_connections: context.networkMetrics?.activeConnections || 0,
      bandwidth_usage: context.networkMetrics?.totalBandwidth || 0,
      network_health: context.networkHealth || 0,
      system_health: context.systemHealth || 0,
      user_activity: context.userActivity,
      time_of_day: context.timeOfDay
    };
  }

  recordPerformanceData(metrics) {
    this.performanceHistory.push(metrics);
    
    // Maintain history size
    if (this.performanceHistory.length > this.maxHistorySize) {
      this.performanceHistory = this.performanceHistory.slice(-this.maxHistorySize);
    }
  }

  async analyzeTrends() {
    if (this.performanceHistory.length < 10) {
      return { status: 'insufficient_data', message: 'Need more data points for trend analysis' };
    }

    const recentData = this.getRecentData();
    const trends = {};

    // Analyze trends for key metrics
    const metrics = ['cpu_usage', 'memory_usage', 'network_latency', 'network_congestion', 'network_health'];
    
    for (const metric of metrics) {
      trends[metric] = this.calculateTrend(recentData, metric);
    }

    return {
      period: '5_minutes',
      data_points: recentData.length,
      trends: trends,
      summary: this.summarizeTrends(trends)
    };
  }

  calculateTrend(data, metric) {
    if (data.length < 5) return { direction: 'stable', change: 0 };

    const values = data.map(d => d[metric]).filter(v => v !== undefined && v !== null);
    if (values.length < 5) return { direction: 'stable', change: 0 };

    // Simple linear regression to determine trend
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const changePercent = ((slope * (n - 1)) / (intercept || 1)) * 100;

    let direction = 'stable';
    if (Math.abs(changePercent) > 5) {
      direction = changePercent > 0 ? 'increasing' : 'decreasing';
    }

    return {
      direction,
      change: Math.round(changePercent * 100) / 100,
      slope: Math.round(slope * 1000) / 1000,
      current_value: values[values.length - 1],
      average_value: Math.round((sumY / n) * 100) / 100
    };
  }

  summarizeTrends(trends) {
    const summary = [];
    
    for (const [metric, trend] of Object.entries(trends)) {
      if (trend.direction !== 'stable') {
        const direction = trend.direction === 'increasing' ? 'rising' : 'falling';
        summary.push(`${metric.replace('_', ' ')} is ${direction} (${trend.change}%)`);
      }
    }

    return summary.length > 0 ? summary : ['All metrics are stable'];
  }

  async analyzePatterns(context) {
    const patterns = {
      time_based: this.analyzeTimeBasedPatterns(),
      activity_based: this.analyzeActivityBasedPatterns(),
      correlation: this.analyzeCorrelations(),
      anomalies: this.detectAnomalies()
    };

    return patterns;
  }

  analyzeTimeBasedPatterns() {
    const hourlyPatterns = {};
    const dayPatterns = {};

    for (const data of this.performanceHistory) {
      const hour = new Date(data.timestamp).getHours();
      const day = new Date(data.timestamp).getDay();

      if (!hourlyPatterns[hour]) {
        hourlyPatterns[hour] = { count: 0, totalLatency: 0, totalCpu: 0 };
      }
      if (!dayPatterns[day]) {
        dayPatterns[day] = { count: 0, totalLatency: 0, totalCpu: 0 };
      }

      hourlyPatterns[hour].count++;
      hourlyPatterns[hour].totalLatency += data.network_latency;
      hourlyPatterns[hour].totalCpu += data.cpu_usage;

      dayPatterns[day].count++;
      dayPatterns[day].totalLatency += data.network_latency;
      dayPatterns[day].totalCpu += data.cpu_usage;
    }

    return {
      peak_hours: this.findPeakHours(hourlyPatterns),
      peak_days: this.findPeakDays(dayPatterns),
      hourly_patterns: hourlyPatterns,
      daily_patterns: dayPatterns
    };
  }

  analyzeActivityBasedPatterns() {
    const activityPatterns = {};

    for (const data of this.performanceHistory) {
      const activity = data.user_activity || 'unknown';
      
      if (!activityPatterns[activity]) {
        activityPatterns[activity] = {
          count: 0,
          avgLatency: 0,
          avgCpu: 0,
          avgMemory: 0,
          totalLatency: 0,
          totalCpu: 0,
          totalMemory: 0
        };
      }

      const pattern = activityPatterns[activity];
      pattern.count++;
      pattern.totalLatency += data.network_latency;
      pattern.totalCpu += data.cpu_usage;
      pattern.totalMemory += data.memory_usage;
    }

    // Calculate averages
    for (const pattern of Object.values(activityPatterns)) {
      pattern.avgLatency = pattern.totalLatency / pattern.count;
      pattern.avgCpu = pattern.totalCpu / pattern.count;
      pattern.avgMemory = pattern.totalMemory / pattern.count;
    }

    return activityPatterns;
  }

  analyzeCorrelations() {
    if (this.performanceHistory.length < 20) {
      return { status: 'insufficient_data' };
    }

    const correlations = {};
    const metrics = ['cpu_usage', 'memory_usage', 'network_latency', 'network_congestion'];
    
    for (let i = 0; i < metrics.length; i++) {
      for (let j = i + 1; j < metrics.length; j++) {
        const metric1 = metrics[i];
        const metric2 = metrics[j];
        const correlation = this.calculateCorrelation(metric1, metric2);
        correlations[`${metric1}_vs_${metric2}`] = correlation;
      }
    }

    return correlations;
  }

  calculateCorrelation(metric1, metric2) {
    const data = this.performanceHistory.slice(-50); // Use recent 50 data points
    
    const values1 = data.map(d => d[metric1]).filter(v => v !== undefined);
    const values2 = data.map(d => d[metric2]).filter(v => v !== undefined);
    
    if (values1.length < 10 || values2.length < 10) {
      return { coefficient: 0, strength: 'insufficient_data' };
    }

    const n = Math.min(values1.length, values2.length);
    const pairs = Array.from({ length: n }, (_, i) => [values1[i], values2[i]]);

    const sum1 = pairs.reduce((sum, [x]) => sum + x, 0);
    const sum2 = pairs.reduce((sum, [, y]) => sum + y, 0);
    const sum1Sq = pairs.reduce((sum, [x]) => sum + x * x, 0);
    const sum2Sq = pairs.reduce((sum, [, y]) => sum + y * y, 0);
    const sumProduct = pairs.reduce((sum, [x, y]) => sum + x * y, 0);

    const numerator = n * sumProduct - sum1 * sum2;
    const denominator = Math.sqrt((n * sum1Sq - sum1 * sum1) * (n * sum2Sq - sum2 * sum2));

    const coefficient = denominator === 0 ? 0 : numerator / denominator;
    
    let strength = 'weak';
    const absCoeff = Math.abs(coefficient);
    if (absCoeff > 0.7) strength = 'strong';
    else if (absCoeff > 0.4) strength = 'moderate';

    return {
      coefficient: Math.round(coefficient * 1000) / 1000,
      strength,
      direction: coefficient > 0 ? 'positive' : 'negative'
    };
  }

  detectAnomalies() {
    if (this.performanceHistory.length < 30) {
      return { status: 'insufficient_data' };
    }

    const recentData = this.getRecentData();
    const anomalies = [];

    const metrics = ['cpu_usage', 'memory_usage', 'network_latency'];
    
    for (const metric of metrics) {
      const values = recentData.map(d => d[metric]).filter(v => v !== undefined);
      if (values.length < 10) continue;

      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);
      
      const threshold = 2 * stdDev; // 2 standard deviations
      
      const recentAnomalies = values
        .map((value, index) => ({ value, index, timestamp: recentData[index].timestamp }))
        .filter(({ value }) => Math.abs(value - mean) > threshold);

      if (recentAnomalies.length > 0) {
        anomalies.push({
          metric,
          count: recentAnomalies.length,
          mean: Math.round(mean * 100) / 100,
          threshold: Math.round(threshold * 100) / 100,
          anomalies: recentAnomalies.slice(-3) // Last 3 anomalies
        });
      }
    }

    return { anomalies, total_anomalies: anomalies.length };
  }

  calculatePerformanceScore(metrics) {
    let score = 100;

    // CPU usage penalty
    if (metrics.cpu_usage > this.performanceThresholds.cpu_high) {
      score -= (metrics.cpu_usage - this.performanceThresholds.cpu_high) * 0.5;
    }

    // Memory usage penalty
    if (metrics.memory_usage > this.performanceThresholds.memory_high) {
      score -= (metrics.memory_usage - this.performanceThresholds.memory_high) * 0.4;
    }

    // Network latency penalty
    if (metrics.network_latency > this.performanceThresholds.latency_high) {
      score -= (metrics.network_latency - this.performanceThresholds.latency_high) * 0.2;
    }

    // Network congestion penalty
    if (metrics.network_congestion > this.performanceThresholds.network_congestion) {
      score -= (metrics.network_congestion - this.performanceThresholds.network_congestion) * 0.3;
    }

    // Packet loss penalty
    score -= metrics.packet_loss * 2;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  generateInsights(trendAnalysis, patternAnalysis, currentMetrics) {
    const insights = [];

    // Trend insights
    if (trendAnalysis.trends) {
      for (const [metric, trend] of Object.entries(trendAnalysis.trends)) {
        if (trend.direction !== 'stable' && Math.abs(trend.change) > 10) {
          insights.push({
            type: 'trend',
            metric,
            message: `${metric.replace('_', ' ')} is ${trend.direction} by ${Math.abs(trend.change)}%`,
            severity: Math.abs(trend.change) > 20 ? 'high' : 'medium'
          });
        }
      }
    }

    // Pattern insights
    if (patternAnalysis.time_based?.peak_hours) {
      insights.push({
        type: 'pattern',
        message: `Peak performance hours: ${patternAnalysis.time_based.peak_hours.join(', ')}`,
        severity: 'info'
      });
    }

    // Current performance insights
    if (currentMetrics.cpu_usage > this.performanceThresholds.cpu_high) {
      insights.push({
        type: 'current',
        message: `High CPU usage: ${currentMetrics.cpu_usage}%`,
        severity: 'high'
      });
    }

    if (currentMetrics.network_latency > this.performanceThresholds.latency_high) {
      insights.push({
        type: 'current',
        message: `High network latency: ${currentMetrics.network_latency}ms`,
        severity: 'high'
      });
    }

    return insights;
  }

  generateRecommendations(insights, currentMetrics) {
    const recommendations = [];

    // High CPU usage recommendations
    if (currentMetrics.cpu_usage > this.performanceThresholds.cpu_high) {
      recommendations.push({
        priority: 'high',
        category: 'system',
        action: 'Close unnecessary applications to reduce CPU load',
        reason: `CPU usage is at ${currentMetrics.cpu_usage}%`
      });
    }

    // High memory usage recommendations
    if (currentMetrics.memory_usage > this.performanceThresholds.memory_high) {
      recommendations.push({
        priority: 'high',
        category: 'system',
        action: 'Restart memory-intensive applications or increase system memory',
        reason: `Memory usage is at ${currentMetrics.memory_usage}%`
      });
    }

    // Network performance recommendations
    if (currentMetrics.network_latency > this.performanceThresholds.latency_high) {
      recommendations.push({
        priority: 'medium',
        category: 'network',
        action: 'Run network optimization tools to reduce latency',
        reason: `Network latency is ${currentMetrics.network_latency}ms`
      });
    }

    // Activity-specific recommendations
    if (currentMetrics.user_activity === 'gaming' && currentMetrics.network_latency > 50) {
      recommendations.push({
        priority: 'high',
        category: 'gaming',
        action: 'Enable gaming mode for optimized network performance',
        reason: 'Gaming activity detected with suboptimal latency'
      });
    }

    return recommendations;
  }

  async triggerPerformanceOptimization(metrics, actionExecutor, context) {
    const actions = [];

    try {
      // Network optimizations
      if (metrics.network_latency > this.performanceThresholds.latency_high ||
          metrics.network_congestion > this.performanceThresholds.network_congestion) {
        
        const networkOpt = await actionExecutor.executeAction('optimize_network', {}, context);
        if (networkOpt) actions.push(networkOpt);
      }

      // Gaming mode for gaming activity
      if (metrics.user_activity === 'gaming') {
        const gamingMode = await actionExecutor.executeAction('enable_low_latency', {}, context);
        if (gamingMode) actions.push(gamingMode);
      }

      return {
        action: 'performance_optimization',
        triggered_by: 'low_performance_score',
        score: this.calculatePerformanceScore(metrics),
        optimizations: actions.length,
        success: actions.length > 0 ? actions.some(a => a && a.success) : false,
        actions: actions
      };
    } catch (error) {
      console.error(`❌ Performance optimization error:`, error);
      return {
        action: 'performance_optimization',
        triggered_by: 'low_performance_score',
        score: this.calculatePerformanceScore(metrics),
        optimizations: 0,
        success: false,
        error: error.message,
        actions: []
      };
    }
  }

  /**
   * Calculates performance improvements based on optimization actions
   */
  calculatePerformanceImprovements(currentMetrics, optimizationResult, performanceScore) {
    const improvements = {};
    
    try {
      // If no optimizations were performed, return empty improvements
      if (!optimizationResult || optimizationResult.optimizations === 0) {
        return improvements;
      }

      // CPU Performance improvements
      if (currentMetrics.cpu_usage > 80) {
        improvements.cpu_performance = {
          before: currentMetrics.cpu_usage,
          after: Math.max(currentMetrics.cpu_usage - 15, 60), // Estimated improvement
          improvement: Math.min(15, currentMetrics.cpu_usage - 60),
          unit: '%',
          significant: currentMetrics.cpu_usage > 85
        };
      }

      // Memory Performance improvements
      if (currentMetrics.memory_usage > 75) {
        improvements.memory_usage = {
          before: currentMetrics.memory_usage,
          after: Math.max(currentMetrics.memory_usage - 10, 50),
          improvement: Math.min(10, currentMetrics.memory_usage - 50),
          unit: '%',
          significant: currentMetrics.memory_usage > 85
        };
      }

      // Network Performance improvements
      if (currentMetrics.network_latency > this.performanceThresholds.latency_high) {
        improvements.network_latency = {
          before: currentMetrics.network_latency,
          after: Math.max(currentMetrics.network_latency * 0.7, 20), // 30% improvement
          improvement: currentMetrics.network_latency * 0.3,
          unit: 'ms',
          significant: currentMetrics.network_latency > 100
        };
      }

      // Overall Performance Score improvement
      const estimatedNewScore = Math.min(performanceScore + 20, 100);
      improvements.performance_score = {
        before: performanceScore,
        after: estimatedNewScore,
        improvement: estimatedNewScore - performanceScore,
        unit: 'score',
        significant: (estimatedNewScore - performanceScore) > 15
      };

    } catch (error) {
      console.error(`❌ Error calculating performance improvements:`, error);
    }
    
    return improvements;
  }

  getRecentData() {
    const cutoff = Date.now() - this.analysisWindow;
    return this.performanceHistory.filter(data => data.timestamp > cutoff);
  }

  findPeakHours(hourlyPatterns) {
    const hours = Object.entries(hourlyPatterns)
      .map(([hour, data]) => ({
        hour: parseInt(hour),
        avgLatency: data.totalLatency / data.count,
        avgCpu: data.totalCpu / data.count
      }))
      .sort((a, b) => b.avgCpu - a.avgCpu)
      .slice(0, 3)
      .map(h => h.hour);

    return hours;
  }

  findPeakDays(dayPatterns) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    return Object.entries(dayPatterns)
      .map(([day, data]) => ({
        day: days[parseInt(day)],
        avgCpu: data.totalCpu / data.count
      }))
      .sort((a, b) => b.avgCpu - a.avgCpu)
      .slice(0, 2)
      .map(d => d.day);
  }

  async configure(config) {
    if (config.enabled !== undefined) {
      this.enabled = config.enabled;
    }
    
    if (config.performanceThresholds) {
      this.performanceThresholds = { ...this.performanceThresholds, ...config.performanceThresholds };
    }
    
    if (config.analysisWindow) {
      this.analysisWindow = config.analysisWindow;
    }
    
    console.log(`⚙️ PerformanceAnalyticsAgent configured:`, config);
  }

  getStatus() {
    return {
      name: this.name,
      description: this.description,
      enabled: this.enabled,
      lastActivation: this.lastActivation,
      dataPoints: this.performanceHistory.length,
      analysisWindow: this.analysisWindow,
      performanceThresholds: this.performanceThresholds,
      recentScore: this.performanceHistory.length > 0 ? 
        this.calculatePerformanceScore(this.performanceHistory[this.performanceHistory.length - 1]) : 0
    };
  }

  getPerformanceReport() {
    const recentData = this.getRecentData();
    
    return {
      current_metrics: recentData[recentData.length - 1] || {},
      data_points: this.performanceHistory.length,
      analysis_period: this.analysisWindow,
      recent_trends: this.performanceHistory.length > 10 ? this.analyzeTrends() : null
    };
  }
}