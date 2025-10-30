import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const AgentStatusDebug = () => {
  const [backendStatus, setBackendStatus] = useState(null);
  const [agentStatus, setAgentStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);

  const checkBackendStatus = async () => {
    const checks = [];
    
    // Check if backend is running
    try {
      const healthResponse = await fetch('http://localhost:3001/health');
      if (healthResponse.ok) {
        checks.push({ name: 'Backend Health', status: 'success', message: 'Backend is running' });
      } else {
        checks.push({ name: 'Backend Health', status: 'error', message: 'Backend unhealthy' });
      }
    } catch (error) {
      checks.push({ name: 'Backend Health', status: 'error', message: 'Backend not accessible' });
    }

    // Check if agent endpoints exist
    try {
      const agentResponse = await fetch('http://localhost:3001/api/agents/status');
      if (agentResponse.ok) {
        const data = await agentResponse.json();
        setAgentStatus(data);
        checks.push({ name: 'Agent API', status: 'success', message: 'Agent endpoints working' });
      } else {
        const errorText = await agentResponse.text();
        checks.push({ name: 'Agent API', status: 'error', message: `Agent API error: ${agentResponse.status}` });
      }
    } catch (error) {
      checks.push({ name: 'Agent API', status: 'error', message: `Agent API not accessible: ${error.message}` });
    }

    // Check individual endpoints
    const endpoints = [
      { name: 'Actions', url: '/api/agents/actions' },
      { name: 'ML Predictions', url: '/api/agents/ml/predictions' },
      { name: 'Security Report', url: '/api/agents/security/report' },
      { name: 'Config', url: '/api/agents/config' }
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`http://localhost:3001${endpoint.url}`);
        if (response.ok) {
          checks.push({ name: endpoint.name, status: 'success', message: `${endpoint.name} endpoint working` });
        } else {
          checks.push({ name: endpoint.name, status: 'warning', message: `${endpoint.name} returned ${response.status}` });
        }
      } catch (error) {
        checks.push({ name: endpoint.name, status: 'error', message: `${endpoint.name} error: ${error.message}` });
      }
    }

    setBackendStatus(checks);
    setLoading(false);
  };

  useEffect(() => {
    checkBackendStatus();
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <RefreshCw className="w-4 h-4 animate-spin" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800 border-green-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Checking AI Agent system status...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">AI Agent System Debug</h2>
        <Button onClick={checkBackendStatus} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Backend Status Checks */}
      <Card>
        <CardHeader>
          <CardTitle>System Status Checks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {backendStatus?.map((check, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(check.status)}
                  <span className="font-medium">{check.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={getStatusColor(check.status)}>
                    {check.status}
                  </Badge>
                  <span className="text-sm text-gray-600">{check.message}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Agent Status Details */}
      {agentStatus && (
        <Card>
          <CardHeader>
            <CardTitle>Agent Manager Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className={`w-4 h-4 rounded-full mx-auto mb-2 ${agentStatus.isRunning ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <div className="text-sm font-medium">Agent Manager</div>
                <div className="text-xs text-gray-500">
                  {agentStatus.isRunning ? 'Running' : 'Stopped'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-blue-600">{agentStatus.activeAgents?.length || 0}</div>
                <div className="text-sm font-medium">Active Agents</div>
                <div className="text-xs text-gray-500">Registered</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-green-600">{agentStatus.lastActions?.length || 0}</div>
                <div className="text-sm font-medium">Recent Actions</div>
                <div className="text-xs text-gray-500">Logged</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-purple-600">
                  {agentStatus.currentContext?.networkHealth || 'N/A'}
                </div>
                <div className="text-sm font-medium">Network Health</div>
                <div className="text-xs text-gray-500">Current</div>
              </div>
            </div>

            {agentStatus.activeAgents && agentStatus.activeAgents.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium mb-3">Registered Agents:</h4>
                <div className="flex flex-wrap gap-2">
                  {agentStatus.activeAgents.map(agentName => (
                    <Badge key={agentName} variant="outline" className="text-green-600 border-green-600">
                      {agentName}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {agentStatus.currentContext && (
              <div className="mt-6">
                <h4 className="font-medium mb-3">Current Context:</h4>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <pre className="text-sm">
                    {JSON.stringify(agentStatus.currentContext, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Troubleshooting Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-red-600">If Backend Health fails:</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 ml-4">
                <li>Check if the backend server is running on port 3001</li>
                <li>Run: <code className="bg-gray-100 px-1 rounded">node index.js</code> in the backend directory</li>
                <li>Check for any error messages in the console</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-yellow-600">If Agent API fails:</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 ml-4">
                <li>The AI Agent system may not be initialized</li>
                <li>Check backend console for agent initialization messages</li>
                <li>Verify all agent files exist in the backend/agents directory</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-600">If agents show as inactive:</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 ml-4">
                <li>Agents may need specific conditions to activate</li>
                <li>Check network conditions and user activity</li>
                <li>Use the manual execute buttons to test agents</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentStatusDebug;