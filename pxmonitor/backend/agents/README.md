# PXMonitor AI Agent System

## Overview

The PXMonitor AI Agent System is a lightweight, context-aware network management solution that automatically optimizes network performance based on real-time conditions. The system uses specialized AI agents that work together to monitor, analyze, and improve network connectivity.

## Architecture

### Core Components

#### 1. AgentManager (Core Orchestrator)
- **Purpose**: Central coordinator for all AI agents
- **Features**:
  - Agent registration and lifecycle management
  - Context-aware agent activation
  - Action logging and history tracking
  - Configuration management integration
- **Monitoring**: 30-second intervals with configurable thresholds

#### 2. ContextEngine (Situational Awareness)
- **Purpose**: Gathers comprehensive network and system context
- **Data Sources**:
  - Network metrics (latency, bandwidth, packet loss)
  - System resources (CPU, memory, disk usage)
  - User activity patterns
  - Time-based patterns
  - Connection mapping data
- **Intelligence**: Calculates network health scores and detects patterns

#### 3. ActionExecutor (Action Implementation)
- **Purpose**: Executes network optimization actions
- **Capabilities**:
  - PowerShell script execution
  - Windows QoS policy management
  - Network interface configuration
  - Bandwidth allocation control
- **Safety**: Built-in validation and rollback mechanisms

#### 4. ConfigManager (Configuration Management)
- **Purpose**: Manages system and agent configurations
- **Features**:
  - Runtime configuration updates
  - Configuration validation
  - Backup and restore functionality
  - Import/export capabilities
  - User vs default configuration merging

### Specialized Agents

#### 1. TrafficPrioritizationAgent
- **Focus**: Intelligent traffic management and QoS optimization
- **Triggers**:
  - High bandwidth usage (>80%)
  - Multiple active connections
  - Gaming or streaming activity detected
- **Actions**:
  - Set QoS policies for critical applications
  - Prioritize real-time traffic
  - Throttle background applications
- **Cooldown**: 60 seconds

#### 2. NetworkOptimizationAgent
- **Focus**: Overall network performance enhancement
- **Triggers**:
  - High latency (>100ms)
  - Packet loss detected (>1%)
  - DNS resolution issues
- **Actions**:
  - DNS cache flush
  - Network adapter reset
  - MTU optimization
  - Connection stability scripts
- **Cooldown**: 120 seconds

#### 3. SecurityMonitoringAgent
- **Focus**: Network security and threat detection
- **Triggers**:
  - Suspicious connection patterns
  - High connection volumes
  - Unusual traffic spikes
- **Actions**:
  - Block suspicious IPs
  - Log security events
  - Alert on potential threats
  - Monitor for malicious activity
- **Cooldown**: 60 seconds

#### 4. PerformanceAnalyticsAgent
- **Focus**: Performance monitoring and trend analysis
- **Triggers**:
  - Performance degradation patterns
  - Threshold violations
  - Resource usage anomalies
- **Actions**:
  - Generate performance reports
  - Identify bottlenecks
  - Recommend optimizations
  - Track improvement metrics
- **Cooldown**: 300 seconds (5 minutes)

#### 5. MLPredictiveAgent (Optional)
- **Focus**: Machine learning-based predictive analysis
- **Features**:
  - ONNX model integration
  - Anomaly detection
  - Performance prediction
  - Pattern recognition
- **Models**:
  - `anomaly_model.onnx` - Detects network anomalies
  - `network_bottleneck.onnx` - Predicts bottlenecks
  - `gradient_boosting.onnx` - Performance optimization
- **Cooldown**: 180 seconds

## Configuration System

### Default Configuration Location
```
backend/agents/config/default.json
```

### User Configuration Location
```
backend/agents/config/user.json
```

### Configuration Structure
```json
{
  "agentManager": {
    "monitoring_interval": 30000,
    "max_concurrent_actions": 3,
    "enable_predictive": true,
    "log_actions": true
  },
  "agents": {
    "trafficPrioritization": {
      "enabled": true,
      "cooldownPeriod": 60000,
      "thresholds": {
        "highBandwidthUsage": 80,
        "criticalLatency": 150
      }
    }
  }
}
```

### Configuration Management API

#### Get Current Configuration
```
GET /api/agents/config
```

#### Update Configuration
```
PUT /api/agents/config
Content-Type: application/json

{
  "agentManager": { ... },
  "agents": { ... }
}
```

#### Reset to Defaults
```
POST /api/agents/config/reset
```

#### Export Configuration
```
GET /api/agents/config/export
```

#### Import Configuration
```
POST /api/agents/config/import
Content-Type: application/json

{
  "configPath": "/path/to/config.json"
}
```

## Integration with Existing Services

### PowerShell Scripts
The system leverages existing PowerShell optimization scripts:
- `Clear-NetworkCongestion.ps1`
- `Flush-DnsCache.ps1`
- `Maintain-PowerfulConnection.ps1`
- `Optimize-Bandwidth.ps1`
- `Reconnect-WiFi.ps1`
- `Reset-NetworkIP.ps1`
- `StableConnection.ps1`
- `Switch-DnsServer.ps1`

### ONNX ML Models
Machine learning integration through Seraphims models:
- Pre-trained anomaly detection
- Network bottleneck prediction
- Performance optimization suggestions

### Connection Mapping
Integration with existing connection mapper for:
- Active connection monitoring
- Process-to-connection mapping
- Traffic analysis and classification

## API Endpoints

### Agent Status and Management
```
GET /api/agents/status          - Get overall system status
GET /api/agents/actions         - Get recent actions
GET /api/agents/:agentName      - Get specific agent status
POST /api/agents/:agentName/configure - Configure specific agent
POST /api/agents/start          - Start agent system
POST /api/agents/stop           - Stop agent system
```

### Specialized Agent Reports
```
GET /api/agents/ml/predictions       - ML predictions and insights
GET /api/agents/performance/report   - Performance analytics
GET /api/agents/security/report      - Security monitoring data
```

## Frontend Dashboard Components

### AgentDashboard
- Real-time agent status monitoring
- Action history visualization
- Performance metrics display
- Agent control and configuration

### MLInsightsPanel
- Machine learning predictions
- Anomaly detection alerts
- Performance forecasting
- Model confidence indicators

### AgentConfigPanel
- Runtime configuration management
- Agent enable/disable controls
- Threshold adjustments
- Configuration import/export

### SecurityPanel
- Security event monitoring
- Threat detection alerts
- Blocked IP management
- Security metrics dashboard

## Getting Started

### 1. System Requirements
- Windows 10/11
- Node.js 18+
- PowerShell 5.1+
- Administrative privileges (for network operations)

### 2. Installation
The agent system is automatically initialized when the backend starts:

```bash
cd pxmonitor/backend
npm install
node index.js
```

### 3. Configuration
1. The system starts with default configuration
2. Access the dashboard at `http://localhost:3001`
3. Navigate to Agent Dashboard for monitoring
4. Use Agent Config Panel for customization

### 4. Monitoring
- Watch console logs for agent activities
- Use the web dashboard for real-time monitoring
- Check `/api/agents/status` for system health

## Features

### ✅ Lightweight Design
- 30-second monitoring intervals
- Minimal resource usage
- Efficient action execution
- Smart cooldown periods

### ✅ Context-Aware Intelligence
- Time-based pattern recognition
- User activity detection
- Network condition analysis
- Predictive capabilities

### ✅ Extensible Architecture
- Modular agent design
- Plugin-style agent registration
- Configurable thresholds
- Easy to add new agents

### ✅ User-Friendly Interface
- Real-time dashboard monitoring
- Intuitive configuration panels
- Visual performance metrics
- One-click optimizations

### ✅ Production Ready
- Comprehensive error handling
- Configuration validation
- Backup and restore
- Audit logging

## Advanced Features

### Machine Learning Integration
- ONNX runtime for model execution
- Real-time inference capabilities
- Anomaly detection algorithms
- Performance prediction models

### Security Monitoring
- Real-time threat detection
- Suspicious activity alerts
- Automated IP blocking
- Security event logging

### Performance Analytics
- Trend analysis and reporting
- Bottleneck identification
- Optimization recommendations
- Historical performance tracking

## Troubleshooting

### Common Issues

1. **Agents Not Starting**
   - Check administrative privileges
   - Verify PowerShell execution policy
   - Review console logs for errors

2. **Configuration Not Saving**
   - Ensure write permissions to config directory
   - Validate JSON configuration format
   - Check for configuration conflicts

3. **Actions Not Executing**
   - Verify PowerShell script permissions
   - Check Windows QoS policy support
   - Review ActionExecutor logs

### Debug Mode
Enable detailed logging by setting:
```json
{
  "agentManager": {
    "log_actions": true,
    "debug_mode": true
  }
}
```

## Contributing

The agent system is designed for extensibility. To add new agents:

1. Create agent class extending base functionality
2. Implement `shouldActivate()` and `execute()` methods
3. Register agent in AgentManager
4. Add configuration schema
5. Create frontend components if needed

## License

This AI Agent System is part of the PXMonitor project and follows the same licensing terms.