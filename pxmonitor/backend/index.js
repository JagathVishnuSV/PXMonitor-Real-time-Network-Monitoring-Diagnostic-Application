import { createServer } from 'http';
import express from 'express';
import cors from 'cors'; // Add CORS support
import bodyParser from "body-parser";
import { exec } from 'child_process';
import path from 'path';
import { startContinuousCapture, setNetworkInterface, getCurrentInterface } from './scripts/tshark-interface.js';
import * as geminiService from './services/gemini-service.js';
import { askSystemQuestion } from './services/gemini-service.js';
import {  getMappedConnections } from './connection_mapper.js';
import { getProcesses,getBattery,detectSuspicious,getSystemHealth} from './systemServices.js';
import { startProcessMonitor } from './process_monitor.js';
import { analyzeConnectionsForSecurity, explainHostname } from './services/gemini-service.js';
import { runAnomalyDetection, runQualityPrediction, runBottleneckDetection } from './Seraphims/seraphims-service.js';
import { AgentManager } from './agents/core/AgentManager.js';

const app = express();
const server = createServer(app);

// Add CORS middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:8080'], // Common React dev ports
  credentials: true
}));

// Correctly configure body-parser with a higher limit
app.use(bodyParser.json({ limit: '20mb' }));
app.use(bodyParser.urlencoded({ limit: '20mb', extended: true }));

// --- SCRIPT EXECUTION ENGINE ---
const __dirname = path.dirname(new URL(import.meta.url).pathname.substring(1));
const SCRIPTS_DIR = path.resolve(__dirname, 'scripts');
const VALID_SCRIPTS = [
    'Clear-NetworkCongestion.ps1',
    'Flush-DnsCache.ps1',
    'Maintain-PowerfulConnection.ps1',
    'Optimize-Bandwidth.ps1',
    'Reconnect-WiFi.ps1',
    'Reset-NetworkIP.ps1',
    'Switch-DnsServer.ps1'
];

const executePowerShellScript = (scriptName, args = []) => {
    return new Promise((resolve, reject) => {
        if (!VALID_SCRIPTS.includes(scriptName)) {
            return reject(new Error(`Invalid or unauthorized script: ${scriptName}`));
        }

        const scriptPath = path.join(SCRIPTS_DIR, scriptName);
        // ExecutionPolicy Bypass is needed to run local scripts
        const command = `powershell.exe -ExecutionPolicy Bypass -File "${scriptPath}" ${args.join(' ')}`;

        console.log(`Executing command: ${command}`);

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Execution error for ${scriptName}: ${error.message}`);
                return reject({ error: error.message, stderr });
            }
            if (stderr) {
                // stderr can sometimes contain progress or non-fatal warnings, so we log it but don't reject
                console.warn(`Execution stderr for ${scriptName}: ${stderr}`);
            }
            resolve(stdout.trim());
        });
    });
};
// -- SYSTEM ENDPOINTS - TASKMANAGER -- 
// all processes
app.get("/api/system/processes", async (req, res) => {
  console.log("[API] GET /api/system/processes called");
  try {
    const procs = await getProcesses();
    console.log(`[API] Returning ${procs.length} processes`);
    res.json(procs);
  } catch (err) {
    console.error("[API] Error in /api/system/processes:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// battery impact
app.get("/api/system/battery", async (req, res) => {
  try {
    const bat = await getBattery();
    res.json(bat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// suspicious activity
app.get("/api/system/suspicious", async (req, res) => {
  try {
    const bad = await detectSuspicious();
    res.json(bad);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// system health summary
app.get("/api/system/health", async (req, res) => {
  console.log("[API] GET /api/system/health called");
  try {
    const health = await getSystemHealth();
    console.log("[API] Health data:", JSON.stringify(health, null, 2));
    res.json(health);
  } catch (err) {
    console.error("[API] Error in /api/system/health:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- DIAGNOSTIC TEST ENDPOINTS ---

app.get('/api/diagnostics/ping-test', async (req, res) => {
    try {
        const command = `powershell.exe -Command "Test-Connection -ComputerName 8.8.8.8 -Count 1 | Select-Object -Property ResponseTime"`;
        exec(command, (error, stdout, stderr) => {
            if (error || stderr) {
                throw new Error(error?.message || stderr);
            }
            const latency = parseInt(stdout.match(/\d+/)?.[0] || '-1', 10);
            res.json({ latency });
        });
    } catch (err) {
        console.error('Ping test failed:', err);
        res.status(500).json({ error: 'Ping test failed', details: err.message });
    }
});

app.get('/api/diagnostics/dns-test', async (req, res) => {
    try {
        const command = `powershell.exe -Command "Measure-Command { Resolve-DnsName -Name google.com -QuickTimeout } | Select-Object -ExpandProperty TotalMilliseconds"`;
        exec(command, (error, stdout, stderr) => {
             if (error || stderr) {
                throw new Error(error?.message || stderr);
            }
            const responseTime = Math.round(parseFloat(stdout.trim()));
            res.json({ responseTime });
        });
    } catch (err) {
        console.error('DNS test failed:', err);
        res.status(500).json({ error: 'DNS test failed', details: err.message });
    }
});


// --- SCRIPT EXECUTION ENDPOINTS ---

app.post('/api/run-script/:scriptName', async (req, res) => {
    const { scriptName } = req.params;
    // Make destructuring safer by providing a fallback for req.body
    const { args = [] } = req.body || {}; 
    try {
        const output = await executePowerShellScript(scriptName, args);
        console.log(`Script ${scriptName} executed successfully. Output: ${output}`);
        res.json({ success: true, message: output });
    } catch (err) {
        console.error(`Error executing script ${scriptName}:`, err);
        res.status(500).json({ success: false, error: `Failed to execute ${scriptName}`, details: err });
    }
});

// connection security mapper scan endpoint
app.post("/api/connections/security-scan", async (req, res) => {
  try {
    const { connections } = req.body;
    if (!connections) {
      return res.status(400).json({ error: "Connection data is required." });
    }
    const analysis = await analyzeConnectionsForSecurity(connections);
    res.json({ analysis });
  } catch (err) {
    res.status(500).json({ error: "Failed to perform security scan." });
  }
});

// Explain hostname endpoint
app.post("/api/connections/explain", async (req, res) => {
  try {
    const { hostname } = req.body;
    if (!hostname || hostname === 'N/A') {
      return res.status(400).json({ error: "A valid hostname is required." });
    }
    const explanation = await explainHostname(hostname);
    res.json({ explanation });
  } catch (err) {
    res.status(500).json({ error: "Failed to get explanation." });
  }
});

let captureController = null;
let latestMetrics = null;
let captureAttempts = 0;
const MAX_CAPTURE_ATTEMPTS = 3;

// Initialize AI Agent Manager
let agentManager = null;

const initializeCapture = () => {
  console.log('Initializing capture for interface:', getCurrentInterface());
  
  captureController = startContinuousCapture(
    getCurrentInterface(),
    (packets, metrics) => {
      //console.log(`Received packets: ${packets?.length || 0} at ${new Date().toISOString()}`);
      //console.log('Raw metrics received:', metrics);
      
      if (!metrics || (!metrics.packet_sizes && !metrics.latency)) {
        console.warn('Skipping invalid metrics - no packet data or latency');
        return;
      }
      
      // Create properly structured metrics object for frontend
      latestMetrics = {
        latency: Number(metrics.latency) || 0,
        jitter: Number(metrics.jitter) || 0,
        packetLoss: Number(metrics.packet_loss || metrics.packetLoss) || 0,
        bandwidth: Number(metrics.bandwidth) || 0,
        dnsDelay: Number(metrics.dns_delay || metrics.dnsDelay) || 0,
        healthScore: Number(metrics.health_score || metrics.healthScore) || calculateHealthScore(metrics),
        stability: String(metrics.stability || 'stable').toLowerCase(),
        congestion: String(metrics.congestion_level || metrics.congestion || 'stable').toLowerCase(),
        
        // Ensure protocol data is properly formatted
        protocolData: Array.isArray(metrics.protocol_counts) 
          ? metrics.protocol_counts.map(item => ({
              name: String(item.name || item.protocol || 'Unknown'),
              value: Number(item.value || item.count || 0)
            }))
          : metrics.protocol_counts && typeof metrics.protocol_counts === 'object'
          ? Object.entries(metrics.protocol_counts).map(([name, value]) => ({
              name: String(name),
              value: Number(value) || 0
            }))
          : [{ name: 'TCP', value: 80 }, { name: 'UDP', value: 15 }, { name: 'HTTP', value: 5 }], // Default data
        
        // Ensure top apps data is properly formatted
        topAppsData: Array.isArray(metrics.top_apps) 
          ? metrics.top_apps.map(app => ({
              name: String(app.application || app.name || 'Unknown'),
              value: Number(app['frame.len'] || app.value || app.bytes || 0)
            }))
          : [{ name: 'Browser', value: 1024 }, { name: 'System', value: 512 }], // Default data
        
        // Add timestamp for debugging
        timestamp: new Date().toISOString(),
        packetsReceived: packets?.length || 0
      };
      // -------------------------------------------------------------------------
      // console.log('Formatted metrics for frontend:', {
      //   latency: latestMetrics.latency,
      //   jitter: latestMetrics.jitter,
      //   healthScore: latestMetrics.healthScore,
      //   protocolCount: latestMetrics.protocolData.length,
      //   topAppsCount: latestMetrics.topAppsData.length,
      //   timestamp: latestMetrics.timestamp
      // });
      
      // Reset capture attempts on successful data
      captureAttempts = 0;
    },
    (error) => {
      console.error('Capture error details:', error.message);
      
      // Don't immediately restart on informational messages
      if (error.message.includes('Capturing on') || 
          error.message.includes('File:') ||
          error.message.includes('Packets:')) {
        console.log('Ignoring informational message:', error.message);
        return;
      }
      
      captureAttempts++;
      
      if (captureAttempts < MAX_CAPTURE_ATTEMPTS) {
        console.log(`Attempting to restart capture (attempt ${captureAttempts}/${MAX_CAPTURE_ATTEMPTS})...`);
        setTimeout(() => {
          if (captureController) {
            captureController.stop();
          }
          setTimeout(initializeCapture, 2000);
        }, 1000);
      } else {
        console.error('Max capture attempts reached. Manual intervention required.');
      }
    }
  );
  
  console.log('Starting capture controller...');
  const started = captureController.start();
  
  if (!started) {
    console.error('Failed to start capture controller');
  }
};

app.get('/interface', (req, res) => {
  res.json({ interface: getCurrentInterface() });
});

app.post('/interface', (req, res) => {
  const { interfaceName } = req.body;
  if (!interfaceName) {
    return res.status(400).json({ error: 'Interface name required' });
  }
  
  console.log(`Switching interface to: ${interfaceName}`);
  setNetworkInterface(interfaceName);
  
  if (captureController) {
    captureController.stop();
    setTimeout(() => {
      captureAttempts = 0; // Reset attempts for new interface
      initializeCapture();
    }, 1000);
  }
  
  res.json({ interface: getCurrentInterface() });
});

app.get('/metrics', (req, res) => {
  //console.log('Frontend requesting metrics...');
  
  if (latestMetrics) {
    // console.log('Sending metrics to frontend:', {
    //   latency: latestMetrics.latency,
    //   healthScore: latestMetrics.healthScore,
    //   hasProtocolData: !!latestMetrics.protocolData,
    //   protocolCount: latestMetrics.protocolData?.length
    // });
    res.json(latestMetrics);
  } else {
    console.log('No metrics available for frontend');
    res.status(503).json({ 
      error: 'No metrics available',
      message: 'Waiting for network data collection to initialize',
      captureRunning: captureController ? captureController.isRunning() : false,
      interface: getCurrentInterface()
    });
  }
});

app.get('/status', (req, res) => {
  const status = {
    captureRunning: captureController ? captureController.isRunning() : false,
    interface: getCurrentInterface(),
    hasMetrics: !!latestMetrics,
    captureAttempts: captureAttempts,
    lastUpdate: latestMetrics?.timestamp || null,
    metricsAge: latestMetrics ? Date.now() - new Date(latestMetrics.timestamp).getTime() : null
  };
  
  console.log('Status check:', status);
  res.json(status);
});

app.get('/explain/:component', async (req, res) => {
  try {
    const explanation = await geminiService.explainNetworkComponent(req.params.component);
    res.json({ explanation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/analyze', async (req, res) => {
  try {
    const analysis = await geminiService.analyzeNetworkMetrics(req.body);
    res.json({ analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    captureStatus: captureController ? captureController.isRunning() : false,
    hasMetrics: !!latestMetrics
  });
});

// Add debugging endpoint
app.get('/debug', (req, res) => {
  res.json({
    latestMetrics,
    captureRunning: captureController ? captureController.isRunning() : false,
    interface: getCurrentInterface(),
    captureAttempts,
    serverTime: new Date().toISOString(),
    agentManager: agentManager ? agentManager.getStatus() : null
  });
});

// === AI AGENT ENDPOINTS ===

// Get agent status and overview
app.get('/api/agents/status', (req, res) => {
  if (!agentManager) {
    return res.status(503).json({ error: 'Agent Manager not initialized' });
  }
  
  try {
    const status = agentManager.getStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting agent status:', error);
    res.status(500).json({ error: 'Failed to get agent status' });
  }
});

// Configure specific agent
app.post('/api/agents/:agentName/configure', async (req, res) => {
  if (!agentManager) {
    return res.status(503).json({ error: 'Agent Manager not initialized' });
  }
  
  try {
    const { agentName } = req.params;
    const config = req.body;
    
    const success = await agentManager.configureAgent(agentName, config);
    
    if (success) {
      res.json({ success: true, message: `Agent ${agentName} configured successfully` });
    } else {
      res.status(404).json({ error: `Agent ${agentName} not found` });
    }
  } catch (error) {
    console.error(`Error configuring agent ${req.params.agentName}:`, error);
    res.status(500).json({ error: 'Failed to configure agent' });
  }
});

// Update Agent Manager configuration
app.post('/api/agents/config', (req, res) => {
  if (!agentManager) {
    return res.status(503).json({ error: 'Agent Manager not initialized' });
  }
  
  try {
    const config = req.body;
    agentManager.updateConfig(config);
    res.json({ success: true, message: 'Agent Manager configuration updated' });
  } catch (error) {
    console.error('Error updating agent config:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

// Get recent agent actions
app.get('/api/agents/actions', (req, res) => {
  if (!agentManager) {
    return res.status(503).json({ error: 'Agent Manager not initialized' });
  }
  
  try {
    const limit = parseInt(req.query.limit) || 20;
    const actions = agentManager.getRecentActions(limit);
    res.json(actions);
  } catch (error) {
    console.error('Error getting agent actions:', error);
    res.status(500).json({ error: 'Failed to get agent actions' });
  }
});

// Get specific agent details
app.get('/api/agents/:agentName', (req, res) => {
  if (!agentManager) {
    return res.status(503).json({ error: 'Agent Manager not initialized' });
  }
  
  try {
    const { agentName } = req.params;
    const agent = agentManager.agents.get(agentName);
    
    if (!agent) {
      return res.status(404).json({ error: `Agent ${agentName} not found` });
    }
    
    const status = agent.getStatus ? agent.getStatus() : { name: agentName, enabled: true };
    res.json(status);
  } catch (error) {
    console.error(`Error getting agent ${req.params.agentName}:`, error);
    res.status(500).json({ error: 'Failed to get agent details' });
  }
});

// Manually trigger agent execution (for testing)
app.post('/api/agents/:agentName/execute', async (req, res) => {
  if (!agentManager) {
    return res.status(503).json({ error: 'Agent Manager not initialized' });
  }
  
  try {
    const { agentName } = req.params;
    const { manual = false } = req.body; // Get manual flag from request body
    const agent = agentManager.agents.get(agentName);
    
    if (!agent) {
      return res.status(404).json({ error: `Agent ${agentName} not found` });
    }
    
    // Get current context
    const context = await agentManager.contextEngine.gatherContext();
    
    // For manual execution, skip activation check
    let shouldActivate = true;
    if (!manual) {
      shouldActivate = await agent.shouldActivate(context);
      
      if (!shouldActivate) {
        return res.json({ 
          executed: false, 
          message: `Agent ${agentName} conditions not met for activation`,
          context_summary: {
            network_health: context.networkHealth,
            user_activity: context.userActivity,
            time_of_day: context.timeOfDay
          }
        });
      }
    }
    
    console.log(`🚀 Executing ${agentName} agent ${manual ? '(MANUAL)' : '(AUTO)'}`);
    
    // Reset consecutive optimizations for manual execution
    if (manual && agent.consecutiveOptimizations !== undefined) {
      agent.consecutiveOptimizations = 0;
    }
    
    // Execute agent
    const result = await agent.execute(context, agentManager.actionExecutor);
    
    // Log the action
    if (agentManager.config.log_actions && result) {
      agentManager.logAction(agentName, result, context);
    }
    
    res.json({ 
      executed: true, 
      result: result,
      message: `Agent ${agentName} executed successfully ${manual ? '(manual)' : '(automatic)'}`,
      manual: manual
    });
    
  } catch (error) {
    console.error(`❌ Error executing agent ${req.params.agentName}:`, error);
    res.status(500).json({ error: 'Failed to execute agent', details: error.message });
  }
});

// Agent analysis endpoint
app.get('/api/agents/:agentName/analysis', async (req, res) => {
  try {
    const { agentName } = req.params;
    
    if (!agentManager) {
      return res.status(503).json({ error: 'Agent Manager not initialized' });
    }
    
    const analysis = await agentManager.getAgentAnalysis(agentName);
    if (!analysis) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    res.json(analysis);
  } catch (error) {
    console.error('Agent analysis error:', error);
    res.status(500).json({ error: 'Failed to get agent analysis' });
  }
});

// System report endpoint
app.get('/api/system/report', async (req, res) => {
  try {
    if (!agentManager) {
      return res.status(503).json({ error: 'Agent Manager not initialized' });
    }
    
    const report = agentManager.getSystemReport();
    res.json(report);
  } catch (error) {
    console.error('System report error:', error);
    res.status(500).json({ error: 'Failed to get system report' });
  }
});

// Get ML model predictions (if MLPredictiveAgent is available)
app.get('/api/agents/ml/predictions', (req, res) => {
  if (!agentManager) {
    return res.status(503).json({ error: 'Agent Manager not initialized' });
  }
  
  try {
    const mlAgent = agentManager.agents.get('MLPredictive');
    
    if (!mlAgent) {
      return res.status(404).json({ error: 'ML Predictive Agent not available' });
    }
    
    const predictions = mlAgent.getPredictionHistory ? mlAgent.getPredictionHistory(10) : [];
    const modelInfo = mlAgent.getModelInfo ? mlAgent.getModelInfo() : [];
    
    res.json({
      predictions: predictions,
      models: modelInfo,
      status: mlAgent.getStatus()
    });
  } catch (error) {
    console.error('Error getting ML predictions:', error);
    res.status(500).json({ error: 'Failed to get ML predictions' });
  }
});

// Get performance analytics
app.get('/api/agents/performance/report', (req, res) => {
  if (!agentManager) {
    return res.status(503).json({ error: 'Agent Manager not initialized' });
  }
  
  try {
    const perfAgent = agentManager.agents.get('PerformanceAnalytics');
    
    if (!perfAgent) {
      return res.status(404).json({ error: 'Performance Analytics Agent not available' });
    }
    
    const report = perfAgent.getPerformanceReport ? perfAgent.getPerformanceReport() : {};
    
    res.json(report);
  } catch (error) {
    console.error('Error getting performance report:', error);
    res.status(500).json({ error: 'Failed to get performance report' });
  }
});

// Get security monitoring report
app.get('/api/agents/security/report', (req, res) => {
  if (!agentManager) {
    return res.status(503).json({ error: 'Agent Manager not initialized' });
  }
  
  try {
    const secAgent = agentManager.agents.get('SecurityMonitoring');
    
    if (!secAgent) {
      return res.status(404).json({ error: 'Security Monitoring Agent not available' });
    }
    
    const report = secAgent.getSecurityReport ? secAgent.getSecurityReport() : {};
    
    res.json(report);
  } catch (error) {
    console.error('Error getting security report:', error);
    res.status(500).json({ error: 'Failed to get security report' });
  }
});

// Configuration Management APIs
app.get('/api/agents/config', (req, res) => {
  try {
    const config = agentManager ? agentManager.getConfiguration() : null;
    if (!config) {
      return res.status(503).json({ error: 'Agent system not initialized' });
    }
    res.json(config);
  } catch (error) {
    console.error('❌ Error getting configuration:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/agents/config', async (req, res) => {
  try {
    if (!agentManager) {
      return res.status(503).json({ error: 'Agent system not initialized' });
    }
    
    const result = await agentManager.updateConfiguration(req.body);
    res.json({ success: result });
  } catch (error) {
    console.error('❌ Error updating configuration:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/agents/config/reset', async (req, res) => {
  try {
    if (!agentManager) {
      return res.status(503).json({ error: 'Agent system not initialized' });
    }
    
    const config = await agentManager.resetConfiguration();
    res.json(config);
  } catch (error) {
    console.error('❌ Error resetting configuration:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/agents/config/export', async (req, res) => {
  try {
    if (!agentManager) {
      return res.status(503).json({ error: 'Agent system not initialized' });
    }
    
    const exportPath = await agentManager.exportConfiguration();
    res.json({ exportPath });
  } catch (error) {
    console.error('❌ Error exporting configuration:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/agents/config/import', async (req, res) => {
  try {
    if (!agentManager) {
      return res.status(503).json({ error: 'Agent system not initialized' });
    }
    
    const { configPath } = req.body;
    if (!configPath) {
      return res.status(400).json({ error: 'Configuration path required' });
    }
    
    const config = await agentManager.importConfiguration(configPath);
    res.json(config);
  } catch (error) {
    console.error('❌ Error importing configuration:', error);
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/active-processes', async (req, res) => {
  try {
    const procs = await listActiveProcesses();
    res.json(procs);
  } catch (e) {
    console.error('active-processes error', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/connections/', async (req, res) => {
  
  try {
    const data = await getMappedConnections();
    res.json(data || []); // frontend expects an array
  } catch (e) {
    console.error('connections error', e);
    res.status(500).json({ error: "Failed to get connections" });
    res.status(500).json({ error: e.message });
  }
});

// Initialize AI Agent Manager
const initializeAgentManager = async () => {
  try {
    console.log('Initializing AI Network Assistant Agents...');
    agentManager = new AgentManager();
    const success = await agentManager.initialize();
    
    if (success) {
      console.log('AI Agent Manager initialized successfully');
    } else {
      console.error('Failed to initialize AI Agent Manager');
    }
  } catch (error) {
    console.error('Error initializing AI Agent Manager:', error);
  }
};

const PORT = process.env.PORT || 3001;
server.listen(PORT, async () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
  console.log(`Status check available at http://localhost:${PORT}/status`);
  console.log(`Debug info available at http://localhost:${PORT}/debug`);
  console.log(`Agent status available at http://localhost:${PORT}/api/agents/status`);
  
  startProcessMonitor();
  
  // Initialize capture after a short delay to let server fully start
  setTimeout(initializeCapture, 1000);
  
  // Initialize AI Agent Manager after server is running
  setTimeout(initializeAgentManager, 2000);
});

// === GEMINI Q/A === for system monitoring
app.post("/api/system/analyze", async (req, res) => {
  console.log("[API] POST /api/system/analyze called");
  console.log("[API] Request body:", JSON.stringify(req.body, null, 2));
  
  try {
    const { question, context, history } = req.body;
    
    console.log("[API] Question:", question);
    console.log("[API] Context health:", context.health ? "Present" : "Missing");
    console.log("[API] Context processes count:", context.processes ? context.processes.length : "Missing");

    const topProcessesString = (context.processes || [])
      .sort((a, b) => b.cpu - a.cpu)
      .slice(0, 15) // Reduced from 20 to 15 for safety
      .map(p => `${p.name} (CPU: ${p.cpu.toFixed(1)}%, Mem: ${p.mem.toFixed(1)}MB)`)
      .join(', ');

    // 2. Create a cleaner summary object to send to Gemini
    const summarizedContext = {
      topProcesses: topProcessesString, // Use the new compact string
      health: context.health || {}, 
      suspicious: (context.suspicious || []).slice(0, 5).map(p => p.name).join(', ') || 'None',
    };

    console.log("[API] Calling askSystemQuestion...");
    const answer = await askSystemQuestion(question, summarizedContext, history);
    console.log("[API] Got answer from askSystemQuestion:", answer.substring(0, 100) + "...");
    
    res.json({ answer });
  } catch (err) {
    console.error("[API] Error in /api/system/analyze:", err);
    res.status(500).json({ error: err.message });
  }
});


// --- SERAPHIMS ML MODEL ENDPOINTS ---

/**
 * Run anomaly detection model
 * POST /api/seraphims/anomaly
 * Body: { latency, jitter, bandwidth, packet_loss, dns_delay }
 * Returns: { prediction: -1 or 1, isAnomaly: boolean, interpretation: string }
 */
app.post('/api/seraphims/anomaly', async (req, res) => {
  try {
    console.log('[API] POST /api/seraphims/anomaly called with data:', req.body);
    const metrics = req.body;
    
    // Validate required fields
    const requiredFields = ['latency', 'jitter', 'bandwidth', 'packet_loss', 'dns_delay'];
    for (const field of requiredFields) {
      if (metrics[field] === undefined || metrics[field] === null) {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }
    
    const result = await runAnomalyDetection(metrics);
    res.json(result);
  } catch (err) {
    console.error('[API] Error in /api/seraphims/anomaly:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Run quality prediction model (gradient boosting)
 * POST /api/seraphims/quality
 * Body: { latency, jitter, packet_loss, bandwidth }
 * Returns: { prediction: 0|1|2, quality: '1080p'|'480p'|'720p' }
 */
app.post('/api/seraphims/quality', async (req, res) => {
  try {
    console.log('[API] POST /api/seraphims/quality called with data:', req.body);
    const metrics = req.body;
    
    // Validate required fields
    const requiredFields = ['latency', 'jitter', 'packet_loss', 'bandwidth'];
    for (const field of requiredFields) {
      if (metrics[field] === undefined || metrics[field] === null) {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }
    
    const result = await runQualityPrediction(metrics);
    res.json(result);
  } catch (err) {
    console.error('[API] Error in /api/seraphims/quality:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Run network bottleneck detection model
 * POST /api/seraphims/bottleneck
 * Body: { latency, jitter, bandwidth, packet_loss, dns_delay }
 * Returns: { prediction: 'High'|'Moderate'|'Low', congestionLevel: string }
 */
app.post('/api/seraphims/bottleneck', async (req, res) => {
  try {
    console.log('[API] POST /api/seraphims/bottleneck called with data:', req.body);
    const metrics = req.body;
    
    // Validate required fields
    const requiredFields = ['latency', 'jitter', 'bandwidth', 'packet_loss', 'dns_delay'];
    for (const field of requiredFields) {
      if (metrics[field] === undefined || metrics[field] === null) {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }
    
    const result = await runBottleneckDetection(metrics);
    res.json(result);
  } catch (err) {
    console.error('[API] Error in /api/seraphims/bottleneck:', err);
    res.status(500).json({ error: err.message });
  }
});


app.listen()
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  
  if (agentManager) {
    await agentManager.stop();
    // Cleanup any QoS policies created by agents
    if (agentManager.actionExecutor.cleanup) {
      await agentManager.actionExecutor.cleanup();
    }
  }
  
  if (captureController) {
    captureController.stop();
  }
  
  server.close(() => {
    console.log('Server shut down');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  
  if (agentManager) {
    await agentManager.stop();
    // Cleanup any QoS policies created by agents
    if (agentManager.actionExecutor.cleanup) {
      await agentManager.actionExecutor.cleanup();
    }
  }
  
  if (captureController) {
    captureController.stop();
  }
  
  server.close(() => {
    console.log('Server shut down');
    process.exit(0);
  });
});

export const calculateHealthScore = (metrics) => {
  if (!metrics) return 50;
  
  const latencyScore = Math.max(0, 100 - (Number(metrics.latency || 0) / 2)) * 0.3;
  const jitterScore = Math.max(0, 100 - (Number(metrics.jitter || 0) * 2)) * 0.2;
  const packetLossScore = Math.max(0, 100 - (Number(metrics.packet_loss || metrics.packetLoss || 0) * 10)) * 0.25;
  const bandwidthScore = Math.min(100, Number(metrics.bandwidth || 0) * 10) * 0.15;
  const dnsScore = Math.max(0, 100 - (Number(metrics.dns_delay || metrics.dnsDelay || 0) * 2)) * 0.1;
  
  return Math.max(1, Math.min(100, Math.round(latencyScore + jitterScore + packetLossScore + bandwidthScore + dnsScore)));
};

export const getComponentExplanation = async (componentName) => {
  return await geminiService.explainNetworkComponent(componentName);
};

export const getNetworkAnalysis = async (metrics) => {
  return await geminiService.analyzeNetworkMetrics(metrics);
};