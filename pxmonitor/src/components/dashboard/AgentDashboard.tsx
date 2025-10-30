import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Bot, Activity, Shield, Brain, TrendingUp, Settings, RefreshCw, Eye } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAgentMonitoring } from '@/hooks/useAgentMonitoring';
import AgentAnalysisPage from './AgentAnalysisPage';

const AgentDashboard = () => {
  const [agentStatus, setAgentStatus] = useState(null);
  const [recentActions, setRecentActions] = useState([]);
  const [viewingAnalysis, setViewingAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const { startMonitoring, showManualExecutionResult } = useAgentMonitoring();

  const fetchAgentData = async () => {
    try {
      setError(null);
      
      // Check if backend is available first
      const healthResponse = await fetch('http://localhost:3001/health');
      if (!healthResponse.ok) {
        throw new Error('Backend server is not running. Please start the backend server.');
      }

      const [statusResponse, actionsResponse] = await Promise.all([
        fetch('http://localhost:3001/api/agents/status'),
        fetch('http://localhost:3001/api/agents/actions?limit=10')
      ]);

      if (!statusResponse.ok) {
        throw new Error('Agent system is not initialized yet. Please wait...');
      }

      const statusData = await statusResponse.json();
      setAgentStatus(statusData);

      if (actionsResponse.ok) {
        const actionsData = await actionsResponse.json();
        setRecentActions(actionsData);
      }
    } catch (error) {
      console.log('Backend connection issue:', error.message);
      if (error.message.includes('fetch')) {
        setError('Backend server is not running. Please start the backend with start-admin.bat');
      } else {
        setError(error.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAgentData();
  };

  const executeAgent = async (agentName) => {
    try {
      const response = await fetch(`http://localhost:3001/api/agents/${agentName}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manual: true }) // Send manual flag
      });

      const result = await response.json();
      
      // Show notification for manual execution
      showManualExecutionResult(agentName, result);
      
      if (result.executed) {
        await fetchAgentData(); // Refresh data after execution
      }

      return result;
    } catch (error) {
      console.error(`Error executing agent ${agentName}:`, error);
      showManualExecutionResult(agentName, { success: false, error: error.message });
      throw error;
    }
  };

  useEffect(() => {
    fetchAgentData();
    const interval = setInterval(fetchAgentData, 30000); // Refresh every 30 seconds (reduced frequency)
    
    // Start monitoring for automatic agent actions
    const stopMonitoring = startMonitoring();
    
    return () => {
      clearInterval(interval);
      stopMonitoring();
    };
  }, []); // Empty dependency array to prevent infinite loops

  const getAgentIcon = (agentName) => {
    switch (agentName) {
      case 'TrafficPrioritization': return <TrendingUp className="w-5 h-5" />;
      case 'NetworkOptimization': return <Activity className="w-5 h-5" />;
      case 'SecurityMonitoring': return <Shield className="w-5 h-5" />;
      case 'PerformanceAnalytics': return <TrendingUp className="w-5 h-5" />;
      case 'MLPredictive': return <Brain className="w-5 h-5" />;
      default: return <Bot className="w-5 h-5" />;
    }
  };

  const getStatusColor = (isRunning) => {
    return isRunning ? 'bg-green-500' : 'bg-gray-400';
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getActionSeverityColor = (action) => {
    if (action.agent === 'SecurityMonitoring') return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    if (action.agent === 'MLPredictive') return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
    if (action.agent === 'NetworkOptimization') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  if (viewingAnalysis) {
    return (
      <AgentAnalysisPage
        agentName={viewingAnalysis}
        onBack={() => setViewingAnalysis(null)}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>Loading AI Agent Dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Error loading agent dashboard: {error}
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm" 
            className="ml-2"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Bot className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">AI Network Assistant</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Context-aware intelligent network management system
            </p>
          </div>
        </div>
        <Button 
          onClick={handleRefresh} 
          variant="outline" 
          disabled={refreshing}
          className="flex items-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>System Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`w-4 h-4 rounded-full mx-auto mb-2 ${getStatusColor(agentStatus?.isRunning)}`}></div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Agent Manager</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {agentStatus?.isRunning ? 'Running' : 'Stopped'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{agentStatus?.activeAgents?.length || 0}</div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Active Agents</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Available</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-600 dark:text-green-400">{agentStatus?.lastActions?.length || 0}</div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Recent Actions</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Last 24h</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                {agentStatus?.currentContext?.networkHealth || 0}
              </div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Network Health</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Score</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Agents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bot className="w-5 h-5" />
            <span>Active Agents</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agentStatus?.activeAgents?.map(agentName => (
              <div key={agentName} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow bg-white dark:bg-gray-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="text-blue-600 dark:text-blue-400">
                      {getAgentIcon(agentName)}
                    </div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {agentName.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-green-600 dark:text-green-400 border-green-600 dark:border-green-400">
                    Active
                  </Badge>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {getAgentDescription(agentName)}
                </div>
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => executeAgent(agentName)}
                    className="flex-1 border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/20"
                  >
                    Execute Now
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => setViewingAnalysis(agentName)}
                    className="px-2 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Context */}
      {agentStatus?.currentContext && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>Current Context</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Time Context</div>
                <div className="text-lg capitalize text-gray-900 dark:text-gray-100">
                  {agentStatus.currentContext.timeOfDay?.replace('_', ' ') || 'Unknown'}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">User Activity</div>
                <div className="text-lg capitalize text-gray-900 dark:text-gray-100">
                  {agentStatus.currentContext.userActivity || 'Idle'}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Network Health</div>
                <div className="text-lg text-gray-900 dark:text-gray-100">
                  {agentStatus.currentContext.networkHealth || 0}/100
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">System Health</div>
                <div className="text-lg text-gray-900 dark:text-gray-100">
                  {agentStatus.currentContext.systemHealth || 0}/100
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Recent Agent Actions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActions.length > 0 ? (
            <div className="space-y-3">
              {recentActions.map((action, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-3">
                    <div className="text-blue-600 dark:text-blue-400">
                      {getAgentIcon(action.agent)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">{action.agent}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {action.action?.agent || action.action?.description || 'Action completed'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={getActionSeverityColor(action)}>
                      {action.action?.actions_taken || 'Completed'}
                    </Badge>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formatTimestamp(action.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No recent actions recorded
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const getAgentDescription = (agentName) => {
  switch (agentName) {
    case 'TrafficPrioritization':
      return 'Automatically prioritizes network traffic based on user activity and time context';
    case 'NetworkOptimization':
      return 'Monitors and optimizes network performance using real-time metrics';
    case 'SecurityMonitoring':
      return 'Detects and responds to network security threats and suspicious activities';
    case 'PerformanceAnalytics':
      return 'Analyzes performance patterns and provides predictive insights';
    case 'MLPredictive':
      return 'Uses machine learning models to predict network issues and optimize performance';
    default:
      return 'Intelligent network management agent';
  }
};

export default AgentDashboard;