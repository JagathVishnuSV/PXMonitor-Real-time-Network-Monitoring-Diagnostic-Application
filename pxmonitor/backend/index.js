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
    const { args } = req.body; // Extract args from the request body
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
    serverTime: new Date().toISOString()
  });
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

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
  console.log(`Status check available at http://localhost:${PORT}/status`);
  console.log(`Debug info available at http://localhost:${PORT}/debug`);
  startProcessMonitor();
  // Initialize capture after a short delay to let server fully start
  setTimeout(initializeCapture, 1000);
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


app.listen()
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  if (captureController) {
    captureController.stop();
  }
  server.close(() => {
    console.log('Server shut down');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
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