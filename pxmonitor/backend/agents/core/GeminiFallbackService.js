export class GeminiFallbackService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    this.enabled = !!this.apiKey;
    this.tokenThreshold = 100; // Use fallback when tokens are low
    this.requestCount = 0;
    this.maxRequestsPerHour = 50; // Conservative limit
    this.lastHourReset = Date.now();
  }

  /**
   * Check if fallback should be used
   */
  shouldUseFallback(context = {}) {
    if (!this.enabled) return false;
    
    // Reset hourly counter
    if (Date.now() - this.lastHourReset > 3600000) {
      this.requestCount = 0;
      this.lastHourReset = Date.now();
    }
    
    // Check request limits
    if (this.requestCount >= this.maxRequestsPerHour) {
      console.log('🚫 Gemini fallback disabled: hourly limit reached');
      return false;
    }
    
    // Use fallback for low-resource situations
    const systemLoad = context.systemLoad || 0;
    const networkHealth = context.networkHealth || 100;
    
    return systemLoad > 80 || networkHealth < 50;
  }

  /**
   * Generate lightweight explanation using Gemini
   */
  async generateLightweightExplanation(optimizationResult, context = {}) {
    if (!this.shouldUseFallback(context)) {
      return this.generateFallbackExplanation(optimizationResult);
    }

    try {
      this.requestCount++;
      
      const prompt = this.buildExplanationPrompt(optimizationResult, context);
      const response = await this.callGemini(prompt);
      
      return {
        source: 'gemini',
        explanation: response.explanation,
        summary: response.summary,
        recommendations: response.recommendations || [],
        confidence: response.confidence || 0.8
      };
      
    } catch (error) {
      console.warn('Gemini fallback failed, using basic explanation:', error.message);
      return this.generateFallbackExplanation(optimizationResult);
    }
  }

  /**
   * Build optimized prompt for Gemini
   */
  buildExplanationPrompt(optimizationResult, context) {
    const actionsExecuted = optimizationResult.actions?.executed || 0;
    const improvements = optimizationResult.improvements || {};
    const networkHealth = context.networkHealth || 100;
    
    return `Explain network optimization briefly:
- ${actionsExecuted} actions executed
- Network health: ${networkHealth}%
- Improvements: ${JSON.stringify(improvements)}

Provide a concise 2-sentence explanation of what was done and why, plus one practical recommendation. Keep response under 100 words.

Format as JSON:
{
  "explanation": "Brief explanation of actions taken",
  "summary": "One-line summary",
  "recommendations": ["One practical recommendation"],
  "confidence": 0.8
}`;
  }

  /**
   * Call Gemini API with error handling
   */
  async callGemini(prompt) {
    const payload = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.3,
        topK: 20,
        topP: 0.8,
        maxOutputTokens: 150,
        stopSequences: []
      }
    };

    const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      timeout: 5000 // 5 second timeout
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error('No response from Gemini');
    }

    try {
      return JSON.parse(text);
    } catch (parseError) {
      // If JSON parsing fails, return structured response
      return {
        explanation: text.substring(0, 200),
        summary: 'Network optimization completed',
        recommendations: ['Monitor performance for improvements'],
        confidence: 0.6
      };
    }
  }

  /**
   * Generate basic fallback explanation when Gemini is unavailable
   */
  generateFallbackExplanation(optimizationResult) {
    const actionsExecuted = optimizationResult.actions?.executed || 0;
    const actionsFailed = optimizationResult.actions?.failed || 0;
    const improvements = optimizationResult.improvements || {};
    
    let explanation = '';
    let summary = '';
    
    if (actionsExecuted > 0) {
      explanation = `I executed ${actionsExecuted} network optimization${actionsExecuted > 1 ? 's' : ''} to improve your connection. `;
      
      const improvementList = Object.entries(improvements)
        .filter(([_, data]) => data.improvement_percent > 0)
        .map(([metric, data]) => `${this.humanizeMetric(metric)} improved by ${data.improvement_percent}%`);
      
      if (improvementList.length > 0) {
        explanation += `Key improvements: ${improvementList.join(', ')}.`;
        summary = `Network optimized: ${improvementList[0]}`;
      } else {
        explanation += 'Network performance has been stabilized.';
        summary = 'Network optimization completed';
      }
    } else {
      explanation = 'Network optimization was attempted but no actions could be completed at this time.';
      summary = 'Optimization attempted';
    }
    
    const recommendations = this.generateBasicRecommendations(optimizationResult);
    
    return {
      source: 'fallback',
      explanation,
      summary,
      recommendations,
      confidence: 0.7
    };
  }

  /**
   * Generate basic recommendations
   */
  generateBasicRecommendations(optimizationResult) {
    const recommendations = [];
    const actionsFailed = optimizationResult.actions?.failed || 0;
    const hasImprovements = Object.values(optimizationResult.improvements || {})
      .some(imp => imp.improvement_percent > 5);
    
    if (actionsFailed > 0) {
      recommendations.push('Check system permissions and try again if issues persist');
    } else if (hasImprovements) {
      recommendations.push('Monitor network performance over the next few minutes');
    } else {
      recommendations.push('Consider manual network diagnostics if problems continue');
    }
    
    return recommendations;
  }

  /**
   * Humanize metric names
   */
  humanizeMetric(metric) {
    const humanNames = {
      latency: 'response time',
      packet_loss: 'connection stability',
      bandwidth: 'bandwidth efficiency',
      networkHealth: 'overall network health'
    };
    
    return humanNames[metric] || metric.replace('_', ' ');
  }

  /**
   * Generate status explanation for dashboard
   */
  async generateStatusExplanation(agentName, agentState, context = {}) {
    if (!this.shouldUseFallback(context)) {
      return this.generateBasicStatusExplanation(agentName, agentState);
    }

    try {
      this.requestCount++;
      
      const prompt = `Explain ${agentName} agent status:
- Status: ${agentState.status}
- Success rate: ${agentState.successRate}%
- Recent optimizations: ${agentState.totalOptimizations}

Provide a brief status explanation in 1-2 sentences. Keep under 50 words.

Format as JSON: {"status": "Brief status explanation", "assessment": "good/fair/poor"}`;

      const response = await this.callGemini(prompt);
      
      return {
        source: 'gemini',
        status: response.status || this.generateBasicStatusExplanation(agentName, agentState).status,
        assessment: response.assessment || 'fair'
      };
      
    } catch (error) {
      console.warn('Gemini status explanation failed:', error.message);
      return this.generateBasicStatusExplanation(agentName, agentState);
    }
  }

  /**
   * Generate basic status explanation
   */
  generateBasicStatusExplanation(agentName, agentState) {
    let status = '';
    let assessment = 'fair';
    
    if (agentState.successRate >= 80) {
      status = `${agentName} is performing excellently with ${agentState.successRate}% success rate.`;
      assessment = 'good';
    } else if (agentState.successRate >= 60) {
      status = `${agentName} is performing adequately with room for improvement.`;
      assessment = 'fair';
    } else {
      status = `${agentName} is experiencing issues and may need attention.`;
      assessment = 'poor';
    }
    
    return {
      source: 'fallback',
      status,
      assessment
    };
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      enabled: this.enabled,
      requestCount: this.requestCount,
      maxRequests: this.maxRequestsPerHour,
      remainingRequests: Math.max(0, this.maxRequestsPerHour - this.requestCount),
      nextReset: new Date(this.lastHourReset + 3600000).toISOString()
    };
  }
}