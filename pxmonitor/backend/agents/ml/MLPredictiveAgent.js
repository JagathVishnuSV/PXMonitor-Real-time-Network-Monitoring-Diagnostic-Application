import onnx from 'onnxruntime-node';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class MLPredictiveAgent {
  constructor() {
    this.name = 'MLPredictive';
    this.description = 'Uses machine learning models to predict network issues and optimize performance';
    this.enabled = true;
    this.lastActivation = 0;
    this.cooldownPeriod = 120000; // 2 minutes
    
    this.models = {
      anomaly: {
        path: path.join(__dirname, '../../Seraphims/anomaly_model.onnx'),
        session: null,
        loaded: false
      },
      bottleneck: {
        path: path.join(__dirname, '../../Seraphims/network_bottleneck.onnx'),
        session: null,
        loaded: false
      },
      gradient: {
        path: path.join(__dirname, '../../Seraphims/gradient_boosting.onnx'),
        session: null,
        loaded: false
      }
    };

    this.predictionHistory = [];
    this.maxPredictionHistory = 100;
    this.featureBuffer = [];
    this.bufferSize = 10;
    
    this.thresholds = {
      anomaly_score: 0.7,
      bottleneck_probability: 0.6,
      prediction_confidence: 0.5
    };
  }

  async shouldActivate(context) {
    if (!this.enabled) return false;
    
    const now = Date.now();
    if (now - this.lastActivation < this.cooldownPeriod) {
      return false;
    }

    // Always activate for ML analysis when we have sufficient data
    return this.featureBuffer.length >= 5;
  }

  async execute(context, actionExecutor) {
    this.lastActivation = Date.now();
    
    try {
      // Ensure models are loaded
      await this.ensureModelsLoaded();
      
      // Extract features from context
      const features = this.extractFeatures(context);
      this.featureBuffer.push(features);
      
      // Maintain buffer size
      if (this.featureBuffer.length > this.bufferSize) {
        this.featureBuffer = this.featureBuffer.slice(-this.bufferSize);
      }

      const predictions = {};
      const actions = [];

      console.log(`ML Predictions: Analyzing ${this.featureBuffer.length} data points`);

      // Run anomaly detection
      if (this.models.anomaly.loaded) {
        predictions.anomaly = await this.predictAnomalies(features);
        
        if (predictions.anomaly.score > this.thresholds.anomaly_score) {
          const anomalyAction = await this.handleAnomalyPrediction(
            predictions.anomaly, 
            actionExecutor, 
            context
          );
          actions.push(anomalyAction);
        }
      }

      // Run bottleneck prediction
      if (this.models.bottleneck.loaded) {
        predictions.bottleneck = await this.predictBottlenecks(features);
        
        if (predictions.bottleneck.probability > this.thresholds.bottleneck_probability) {
          const bottleneckAction = await this.handleBottleneckPrediction(
            predictions.bottleneck,
            actionExecutor,
            context
          );
          actions.push(bottleneckAction);
        }
      }

      // Run performance prediction
      if (this.models.gradient.loaded) {
        predictions.performance = await this.predictPerformance(features);
        
        if (predictions.performance.confidence > this.thresholds.prediction_confidence) {
          const performanceAction = await this.handlePerformancePrediction(
            predictions.performance,
            actionExecutor,
            context
          );
          actions.push(performanceAction);
        }
      }

      // Generate insights and recommendations
      const insights = this.generateMLInsights(predictions, context);
      const recommendations = this.generateMLRecommendations(predictions, insights);

      // Record predictions
      this.recordPrediction(predictions, context);

      return {
        agent: this.name,
        models_loaded: Object.values(this.models).filter(m => m.loaded).length,
        predictions: predictions,
        insights: insights,
        recommendations: recommendations,
        actions_taken: actions.filter(a => a.success).length,
        confidence_score: this.calculateOverallConfidence(predictions),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`MLPredictiveAgent error:`, error);
      throw error;
    }
  }

  async ensureModelsLoaded() {
    for (const [modelName, model] of Object.entries(this.models)) {
      if (!model.loaded) {
        try {
          console.log(`ML model: ${modelName}`);
          model.session = await onnx.InferenceSession.create(model.path);
          model.loaded = true;
          console.log(`Model loaded: ${modelName}`);
        } catch (error) {
          console.warn(`Failed to load model ${modelName}:`, error.message);
          model.loaded = false;
        }
      }
    }
  }

  extractFeatures(context) {
    // Extract and normalize features for ML models
    const metrics = context.networkMetrics || {};
    const systemLoad = context.systemLoad || {};
    
    return {
      // Network features
      latency: this.normalize(metrics.latency || 0, 0, 500),
      packet_loss: this.normalize(metrics.packetLoss || 0, 0, 0.1),
      bandwidth_usage: this.normalize(metrics.totalBandwidth || 0, 0, 100000000),
      congestion: this.normalize(metrics.congestion || 0, 0, 1),
      active_connections: this.normalize(metrics.activeConnections || 0, 0, 1000),
      
      // System features
      cpu_usage: this.normalize(systemLoad.cpuLoad || 0, 0, 4),
      memory_usage: this.normalize(systemLoad.memoryUsage || 0, 0, 1),
      
      // Time features
      hour_of_day: this.normalize(new Date().getHours(), 0, 24),
      day_of_week: this.normalize(new Date().getDay(), 0, 7),
      
      // Activity features
      user_activity_encoded: this.encodeUserActivity(context.userActivity),
      
      // Health scores
      network_health: this.normalize(context.networkHealth || 0, 0, 100),
      system_health: this.normalize(context.systemHealth || 0, 0, 100),
      
      // Derived features
      latency_to_bandwidth_ratio: this.normalize(
        (metrics.latency || 0) / Math.max(metrics.totalBandwidth || 1, 1), 
        0, 0.001
      ),
      connections_per_bandwidth: this.normalize(
        (metrics.activeConnections || 0) / Math.max(metrics.totalBandwidth || 1, 1),
        0, 0.01
      )
    };
  }

  normalize(value, min, max) {
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  }

  encodeUserActivity(activity) {
    const encoding = {
      'idle': 0.1,
      'work': 0.3,
      'entertainment': 0.5,
      'gaming': 0.7,
      'development': 0.9
    };
    return encoding[activity] || 0.1;
  }

  async predictAnomalies(features) {
    try {
      const inputTensor = new onnx.Tensor('float32', Object.values(features), [1, Object.keys(features).length]);
      const feeds = { input: inputTensor };
      
      const results = await this.models.anomaly.session.run(feeds);
      const score = results.output.data[0];
      
      return {
        score: score,
        is_anomaly: score > this.thresholds.anomaly_score,
        confidence: Math.abs(score - 0.5) * 2, // Distance from decision boundary
        type: score > 0.8 ? 'critical' : score > 0.6 ? 'warning' : 'normal',
        features_contributing: this.identifyContributingFeatures(features, 'anomaly')
      };
    } catch (error) {
      console.error('Anomaly prediction error:', error);
      return { score: 0, is_anomaly: false, confidence: 0, error: error.message };
    }
  }

  async predictBottlenecks(features) {
    try {
      const inputTensor = new onnx.Tensor('float32', Object.values(features), [1, Object.keys(features).length]);
      const feeds = { input: inputTensor };
      
      const results = await this.models.bottleneck.session.run(feeds);
      const probability = results.output.data[0];
      
      return {
        probability: probability,
        will_occur: probability > this.thresholds.bottleneck_probability,
        confidence: probability,
        estimated_time: this.estimateBottleneckTime(probability),
        likely_cause: this.identifyBottleneckCause(features),
        severity: probability > 0.8 ? 'high' : probability > 0.6 ? 'medium' : 'low'
      };
    } catch (error) {
      console.error('Bottleneck prediction error:', error);
      return { probability: 0, will_occur: false, confidence: 0, error: error.message };
    }
  }

  async predictPerformance(features) {
    try {
      const inputTensor = new onnx.Tensor('float32', Object.values(features), [1, Object.keys(features).length]);
      const feeds = { input: inputTensor };
      
      const results = await this.models.gradient.session.run(feeds);
      const performanceScore = results.output.data[0];
      
      return {
        predicted_score: performanceScore * 100, // Convert to 0-100 scale
        confidence: Math.min(1, Math.abs(performanceScore - 0.5) * 2),
        trend: performanceScore > 0.6 ? 'improving' : performanceScore < 0.4 ? 'degrading' : 'stable',
        time_horizon: '5-10 minutes',
        factors: this.identifyPerformanceFactors(features)
      };
    } catch (error) {
      console.error('Performance prediction error:', error);
      return { predicted_score: 50, confidence: 0, trend: 'unknown', error: error.message };
    }
  }

  identifyContributingFeatures(features, modelType) {
    // Simplified feature importance analysis
    const importance = {};
    
    switch (modelType) {
      case 'anomaly':
        importance.latency = features.latency * 0.3;
        importance.packet_loss = features.packet_loss * 0.3;
        importance.cpu_usage = features.cpu_usage * 0.2;
        importance.memory_usage = features.memory_usage * 0.2;
        break;
      default:
        // Generic importance
        for (const [key, value] of Object.entries(features)) {
          importance[key] = value * Math.random(); // Simplified
        }
    }
    
    return Object.entries(importance)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([feature, score]) => ({ feature, importance: score }));
  }

  estimateBottleneckTime(probability) {
    if (probability > 0.9) return '< 1 minute';
    if (probability > 0.8) return '1-5 minutes';
    if (probability > 0.6) return '5-15 minutes';
    return '> 15 minutes';
  }

  identifyBottleneckCause(features) {
    const causes = [];
    
    if (features.bandwidth_usage > 0.8) causes.push('High bandwidth usage');
    if (features.active_connections > 0.7) causes.push('Too many connections');
    if (features.cpu_usage > 0.8) causes.push('High CPU usage');
    if (features.memory_usage > 0.8) causes.push('High memory usage');
    
    return causes.length > 0 ? causes[0] : 'Network congestion';
  }

  identifyPerformanceFactors(features) {
    const factors = [];
    
    if (features.latency > 0.6) factors.push({ factor: 'High latency', impact: 'negative' });
    if (features.packet_loss > 0.5) factors.push({ factor: 'Packet loss', impact: 'negative' });
    if (features.cpu_usage < 0.5) factors.push({ factor: 'Low CPU usage', impact: 'positive' });
    if (features.network_health > 0.7) factors.push({ factor: 'Good network health', impact: 'positive' });
    
    return factors;
  }

  async handleAnomalyPrediction(prediction, actionExecutor, context) {
    console.log(`Anomaly detected: Score ${prediction.score.toFixed(3)}`);
    
    if (prediction.score > 0.8) {
      // Critical anomaly - immediate action
      return await actionExecutor.executeAction('optimize_network', {
        reason: 'Critical anomaly detected by ML model'
      }, context);
    } else {
      // Warning anomaly - enhanced monitoring
      return {
        action: 'enhance_monitoring',
        success: true,
        reason: 'Anomaly detected, enhanced monitoring enabled',
        score: prediction.score
      };
    }
  }

  async handleBottleneckPrediction(prediction, actionExecutor, context) {
    console.log(`Bottleneck predicted: ${(prediction.probability * 100).toFixed(1)}% probability`);
    
    const actions = [];
    
    if (prediction.probability > 0.8) {
      // High probability - preemptive optimization
      const result = await actionExecutor.executeAction('optimize_network', {
        reason: 'High bottleneck probability predicted'
      }, context);
      actions.push(result);
    }
    
    if (prediction.likely_cause.includes('bandwidth')) {
      const throttleResult = await actionExecutor.executeAction('prioritize_traffic', {
        processes: ['chrome.exe', 'teams.exe'],
        priority: 'high'
      }, context);
      actions.push(throttleResult);
    }
    
    return {
      action: 'bottleneck_prevention',
      success: actions.some(a => a.success),
      probability: prediction.probability,
      actions_taken: actions.length,
      estimated_time: prediction.estimated_time
    };
  }

  async handlePerformancePrediction(prediction, actionExecutor, context) {
    console.log(`Performance prediction: ${prediction.predicted_score.toFixed(1)} (${prediction.trend})`);
    
    if (prediction.predicted_score < 40 && prediction.confidence > 0.7) {
      // Predicted poor performance - proactive optimization
      return await actionExecutor.executeAction('optimize_network', {
        reason: `Poor performance predicted: ${prediction.predicted_score.toFixed(1)}`
      }, context);
    }
    
    return {
      action: 'performance_monitoring',
      success: true,
      predicted_score: prediction.predicted_score,
      trend: prediction.trend,
      confidence: prediction.confidence
    };
  }

  generateMLInsights(predictions, context) {
    const insights = [];
    
    // Anomaly insights
    if (predictions.anomaly?.is_anomaly) {
      insights.push({
        type: 'anomaly',
        severity: predictions.anomaly.type,
        message: `Network anomaly detected (score: ${predictions.anomaly.score.toFixed(3)})`,
        contributing_factors: predictions.anomaly.features_contributing
      });
    }
    
    // Bottleneck insights
    if (predictions.bottleneck?.will_occur) {
      insights.push({
        type: 'bottleneck',
        severity: predictions.bottleneck.severity,
        message: `Network bottleneck predicted in ${predictions.bottleneck.estimated_time}`,
        likely_cause: predictions.bottleneck.likely_cause
      });
    }
    
    // Performance insights
    if (predictions.performance?.trend === 'degrading') {
      insights.push({
        type: 'performance',
        severity: 'medium',
        message: `Performance degradation predicted: ${predictions.performance.predicted_score.toFixed(1)}`,
        factors: predictions.performance.factors
      });
    }
    
    return insights;
  }

  generateMLRecommendations(predictions, insights) {
    const recommendations = [];
    
    // Based on anomaly predictions
    if (predictions.anomaly?.score > 0.6) {
      recommendations.push({
        priority: 'high',
        category: 'security',
        action: 'Investigate network anomaly - potential security threat',
        reason: `ML model detected anomaly with ${(predictions.anomaly.score * 100).toFixed(1)}% confidence`
      });
    }
    
    // Based on bottleneck predictions
    if (predictions.bottleneck?.probability > 0.5) {
      recommendations.push({
        priority: 'medium',
        category: 'performance',
        action: 'Prepare for network bottleneck - optimize traffic priority',
        reason: `${(predictions.bottleneck.probability * 100).toFixed(1)}% chance of bottleneck in ${predictions.bottleneck.estimated_time}`
      });
    }
    
    // Based on performance predictions
    if (predictions.performance?.predicted_score < 60) {
      recommendations.push({
        priority: 'medium',
        category: 'optimization',
        action: 'Proactive performance optimization recommended',
        reason: `Predicted performance score: ${predictions.performance.predicted_score.toFixed(1)}`
      });
    }
    
    return recommendations;
  }

  calculateOverallConfidence(predictions) {
    const confidences = [];
    
    if (predictions.anomaly?.confidence) confidences.push(predictions.anomaly.confidence);
    if (predictions.bottleneck?.confidence) confidences.push(predictions.bottleneck.confidence);
    if (predictions.performance?.confidence) confidences.push(predictions.performance.confidence);
    
    return confidences.length > 0 ? 
      confidences.reduce((sum, c) => sum + c, 0) / confidences.length : 0;
  }

  recordPrediction(predictions, context) {
    const record = {
      timestamp: new Date().toISOString(),
      predictions: predictions,
      context_summary: {
        network_health: context.networkHealth,
        user_activity: context.userActivity,
        time_of_day: context.timeOfDay
      },
      overall_confidence: this.calculateOverallConfidence(predictions)
    };
    
    this.predictionHistory.push(record);
    
    // Maintain history size
    if (this.predictionHistory.length > this.maxPredictionHistory) {
      this.predictionHistory = this.predictionHistory.slice(-this.maxPredictionHistory);
    }
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
    
    console.log(`MLPredictiveAgent configured:`, config);
  }

  getStatus() {
    const loadedModels = Object.entries(this.models)
      .filter(([, model]) => model.loaded)
      .map(([name]) => name);
    
    return {
      name: this.name,
      description: this.description,
      enabled: this.enabled,
      lastActivation: this.lastActivation,
      models_loaded: loadedModels,
      total_models: Object.keys(this.models).length,
      predictions_made: this.predictionHistory.length,
      feature_buffer_size: this.featureBuffer.length,
      thresholds: this.thresholds
    };
  }

  getPredictionHistory(limit = 10) {
    return this.predictionHistory.slice(-limit);
  }

  getModelInfo() {
    return Object.entries(this.models).map(([name, model]) => ({
      name,
      loaded: model.loaded,
      path: model.path
    }));
  }
}