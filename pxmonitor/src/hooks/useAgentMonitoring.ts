import React from 'react';
import { useNotifications } from '@/contexts/NotificationContext';

export const useAgentMonitoring = () => {
  const { addNotification } = useNotifications();
  
  // Use useCallback to prevent infinite re-renders
  const stableAddNotification = React.useCallback(addNotification, [addNotification]);

  const formatAgentAction = (action: any) => {
    const agentName = action.agent || 'Unknown Agent';
    const actionDetails = action.action || {};
    
    let title = '';
    let message = '';
    let type: 'success' | 'info' | 'warning' | 'error' = 'info';

    // Parse different agent types
    switch (agentName) {
      case 'NetworkOptimization':
        title = '🔧 Network Optimization Active';
        if (actionDetails.optimizations_applied) {
          message = `Applied: ${actionDetails.optimizations_applied.join(', ')}`;
          type = 'success';
        } else {
          message = 'Optimizing network performance based on current conditions';
          type = 'info';
        }
        break;

      case 'TrafficPrioritization':
        title = '🚀 Traffic Prioritization Active';
        if (actionDetails.qos_policies_set) {
          message = `Set QoS policies: ${actionDetails.qos_policies_set.join(', ')}`;
          type = 'success';
        } else {
          message = 'Prioritizing network traffic for better performance';
          type = 'info';
        }
        break;

      case 'SecurityMonitoring':
        title = '🛡️ Security Alert';
        if (actionDetails.threats_detected) {
          message = `Blocked ${actionDetails.threats_detected} suspicious connections`;
          type = 'warning';
        } else {
          message = 'Monitoring network for security threats';
          type = 'info';
        }
        break;

      case 'PerformanceAnalytics':
        title = '📊 Performance Analysis';
        if (actionDetails.bottlenecks_identified) {
          message = `Identified ${actionDetails.bottlenecks_identified.length} performance bottlenecks`;
          type = 'warning';
        } else {
          message = 'Analyzing network performance patterns';
          type = 'info';
        }
        break;

      case 'MLPredictive':
        title = '🧠 AI Prediction';
        if (actionDetails.predictions) {
          message = `Predicted: ${actionDetails.predictions}`;
          type = 'info';
        } else {
          message = 'Running machine learning analysis';
          type = 'info';
        }
        break;

      default:
        title = `🤖 ${agentName} Active`;
        message = actionDetails.description || 'Agent executed successfully';
        type = 'info';
    }

    // Add context information
    if (action.context) {
      const reasons = [];
      if (action.context.networkHealth < 50) reasons.push('Low network health');
      if (action.context.userActivity === 'gaming') reasons.push('Gaming detected');
      if (action.context.userActivity === 'work') reasons.push('Work activity detected');
      
      if (reasons.length > 0) {
        message += ` • Reason: ${reasons.join(', ')}`;
      }
    }

    return { title, message, type, agentName };
  };

  const startMonitoring = () => {
    let lastActionCount = 0;
    let isFirstCheck = true;

    const checkForNewActions = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/agents/actions?limit=10');
        if (!response.ok) {
          console.log('Backend server not available');
          return;
        }

        const actions = await response.json();
        
        // Skip notifications on first check to avoid showing old actions
        if (isFirstCheck) {
          lastActionCount = actions.length;
          isFirstCheck = false;
          return;
        }
        
        // Check for new actions
        if (actions.length > lastActionCount) {
          const newActions = actions.slice(0, actions.length - lastActionCount);
          
          newActions.forEach((action: any) => {
            const notification = formatAgentAction(action);
            addNotification({
              ...notification,
              duration: 8000 // Show for 8 seconds
            });
          });
        }
        
        lastActionCount = actions.length;
      } catch (error) {
        // Silently handle network errors to prevent spam
        console.log('Backend connection unavailable');
      }
    };

    // Check every 15 seconds for new actions (reduced frequency)
    const interval = setInterval(checkForNewActions, 15000);
    
    // Initial check after a delay
    setTimeout(checkForNewActions, 2000);

    return () => clearInterval(interval);
  };

  const showManualExecutionResult = (agentName: string, result: any) => {
    let title = '';
    let message = '';
    let type: 'success' | 'error' | 'warning' = 'success';

    if (result.success || result.executed) {
      title = `✅ ${agentName} Executed Successfully`;
      
      if (result.result?.optimizations_applied) {
        message = `Applied: ${result.result.optimizations_applied.join(', ')}`;
      } else if (result.result?.actions_taken) {
        message = `Actions: ${result.result.actions_taken.join(', ')}`;
      } else {
        message = 'Agent executed and completed its tasks';
      }
      
      type = 'success';
    } else {
      title = `❌ ${agentName} Execution Failed`;
      message = result.error || 'Agent failed to execute properly';
      type = 'error';
    }

    addNotification({
      title,
      message,
      type,
      agentName,
      duration: 6000
    });
  };

  return {
    startMonitoring,
    showManualExecutionResult,
    addNotification
  };
};