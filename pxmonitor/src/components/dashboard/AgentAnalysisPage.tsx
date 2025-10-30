import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle, AlertTriangle, Clock, TrendingUp, Info } from 'lucide-react';

const AgentAnalysisPage = ({ agentName, onBack }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAnalysis();
    const interval = setInterval(fetchAnalysis, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [agentName]);

  const fetchAnalysis = async () => {
    try {
      setRefreshing(true);
      const response = await fetch(`http://localhost:3001/api/agents/${agentName}/analysis`);
      const data = await response.json();
      setAnalysis(data);
    } catch (error) {
      console.error('Failed to fetch analysis:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'optimal': return 'text-green-400';
      case 'good': return 'text-blue-400';
      case 'degraded': return 'text-yellow-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'text-red-400 bg-red-900/20';
      case 'high': return 'text-orange-400 bg-orange-900/20';
      case 'medium': return 'text-yellow-400 bg-yellow-900/20';
      case 'low': return 'text-green-400 bg-green-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading analysis...</div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-400">Failed to load analysis</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            ← Back to Dashboard
          </button>
          <h2 className="text-2xl font-bold text-white">
            {agentName} Analysis
          </h2>
        </div>
        <button
          onClick={fetchAnalysis}
          disabled={refreshing}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Current Status */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <CheckCircle className="w-5 h-5 mr-2" />
          Current Status
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className={`text-2xl font-bold ${getStatusColor(analysis.currentAnalysis?.currentStatus)}`}>
              {analysis.currentAnalysis?.currentStatus || 'Unknown'}
            </div>
            <div className="text-gray-400 text-sm">Network Status</div>
          </div>
          
          <div className="text-center">
            <div className={`text-2xl font-bold ${analysis.agentState?.successRate >= 80 ? 'text-green-400' : analysis.agentState?.successRate >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
              {analysis.agentState?.successRate || 0}%
            </div>
            <div className="text-gray-400 text-sm">Success Rate</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              {analysis.agentState?.recentHistory?.length || 0}
            </div>
            <div className="text-gray-400 text-sm">Recent Actions</div>
          </div>
        </div>
      </div>

      {/* Current Analysis */}
      {analysis.currentAnalysis && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Analysis Results
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Should Optimize:</span>
              <span className={analysis.currentAnalysis.shouldOptimize ? 'text-green-400' : 'text-gray-400'}>
                {analysis.currentAnalysis.shouldOptimize ? 'Yes' : 'No'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Priority:</span>
              <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(analysis.currentAnalysis.priority)}`}>
                {analysis.currentAnalysis.priority || 'None'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Risk Level:</span>
              <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(analysis.currentAnalysis.riskLevel)}`}>
                {analysis.currentAnalysis.riskLevel || 'Low'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Targeted Actions:</span>
              <span className="text-white">{analysis.currentAnalysis.targetedActions || 0}</span>
            </div>
          </div>
          
          {/* Reasoning */}
          {analysis.currentAnalysis.reasoning?.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Analysis Reasoning:</h4>
              <div className="space-y-1">
                {analysis.currentAnalysis.reasoning.map((reason, index) => (
                  <div key={index} className="text-sm text-gray-400 flex items-start">
                    <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                    {reason}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Agent State */}
      {analysis.agentState && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Agent State
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-300">Status:</span>
                <span className="text-white">{analysis.agentState.status}</span>
              </div>
              
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-300">Consecutive Optimizations:</span>
                <span className="text-white">{analysis.agentState.consecutiveOptimizations}</span>
              </div>
              
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-300">Total Optimizations:</span>
                <span className="text-white">{analysis.agentState.totalOptimizations}</span>
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-300">Reliability:</span>
                <span className="text-white">{analysis.agentState.effectiveness?.reliability || 0}%</span>
              </div>
              
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-300">Avg Improvement:</span>
                <span className="text-white">{analysis.agentState.effectiveness?.averageImprovement || 0}%</span>
              </div>
              
              {analysis.agentState.cooldownRemaining > 0 && (
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300">Cooldown:</span>
                  <span className="text-yellow-400">{Math.ceil(analysis.agentState.cooldownRemaining / 1000)}s</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {analysis.recommendations?.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Info className="w-5 h-5 mr-2" />
            Recommendations
          </h3>
          
          <div className="space-y-3">
            {analysis.recommendations.map((rec, index) => (
              <div key={index} className={`p-3 rounded-lg border-l-4 ${
                rec.priority === 'high' ? 'border-red-400 bg-red-900/20' :
                rec.priority === 'medium' ? 'border-yellow-400 bg-yellow-900/20' :
                'border-blue-400 bg-blue-900/20'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-white">{rec.message}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(rec.priority)}`}>
                    {rec.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {analysis.recentActivity?.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Recent Activity
          </h3>
          
          <div className="space-y-3">
            {analysis.recentActivity.slice(0, 5).map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                <div className="flex-1">
                  <div className="text-white text-sm">
                    {activity.summaries?.executive?.text || 'Optimization executed'}
                  </div>
                  <div className="text-gray-400 text-xs">
                    {new Date(activity.timestamp).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {activity.execution?.overallSuccess ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-xs text-gray-400">
                    {activity.execution?.executionTime || 0}ms
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentAnalysisPage;