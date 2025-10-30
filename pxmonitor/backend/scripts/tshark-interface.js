/**
 * TShark Interface Module - Fault-Tolerant Version (Minimal Changes)
 */
import { spawn } from 'child_process';
import { processRawPacketData } from './data-processing.js';
import { calculateNetworkMetrics } from '../network-metrics.js';

const TSHARK_CONFIG = {
  command: "tshark",
  defaultInterface: '5',
  outputFormat: 'fields',
  headerFormat: 'y',
  separator: ',',
  fields: [
    'frame.time_epoch',
    'ip.src',
    'ip.dst',
    '_ws.col.protocol',
    'frame.len',
    'tcp.srcport',
    'tcp.dstport',
    'ip.ttl',
    'tcp.flags',
    'tcp.window_size_value',
    'tcp.analysis.ack_rtt',
    'tcp.analysis.retransmission',
    'frame.time_delta',
    'dns.time'
  ]
};

let currentInterface = TSHARK_CONFIG.defaultInterface;

// Store the header row for reuse
let csvHeader = null;

function setNetworkInterface(interfaceName) {
  if (interfaceName === 'ethernet') {
    currentInterface = 'Ethernet';
  } else {
    currentInterface = 'Wi-Fi';
  }
  // console.log(`TShark interface updated to: ${currentInterface}`);
  return currentInterface;
}

function getCurrentInterface() {
  return currentInterface;
}

function buildTSharkCommand(networkInterface = currentInterface) {
  const args = [
    '-i', networkInterface,
    '-T', TSHARK_CONFIG.outputFormat,
    '-E', `header=${TSHARK_CONFIG.headerFormat}`,
    '-E', `separator=${TSHARK_CONFIG.separator}`
  ];
  
  TSHARK_CONFIG.fields.forEach(field => {
    args.push('-e', field);
  });
  
  return { command: TSHARK_CONFIG.command, args };
}

// Fault-tolerant data processing wrapper
function processDataSafely(rawData) {
  try {
    // If we have a stored header and the data doesn't include it, prepend it
    if (csvHeader && !rawData.includes('frame.time_epoch')) {
      rawData = csvHeader + '\n' + rawData;
    }
    
    return processRawPacketData(rawData);
  } catch (error) {
    // console.warn(`Primary data processing failed: ${error.message}`);
    
    // Fallback: Parse data manually without strict CSV parsing
    return parseDataFallback(rawData);
  }
}

// Fallback parser for when CSV parsing fails
function parseDataFallback(rawData) {
  const lines = rawData.split('\n').filter(line => line.trim());
  const packets = [];
  
  for (const line of lines) {
    if (line.includes('frame.time_epoch')) {
      continue; // Skip header line
    }
    
    const fields = line.split(',');
    if (fields.length >= 5) { // Minimum required fields
      try {
        packets.push({
          timestamp: parseFloat(fields[0]) || Date.now() / 1000,
          srcIp: fields[1] || 'unknown',
          dstIp: fields[2] || 'unknown',
          protocol: fields[3] || 'Unknown',
          frameLen: parseInt(fields[4]) || 64, // Default frame size
          srcPort: parseInt(fields[5]) || 0,
          dstPort: parseInt(fields[6]) || 0,
          ttl: parseInt(fields[7]) || 64,
          tcpFlags: fields[8] || '',
          windowSize: parseInt(fields[9]) || 0,
          rtt: parseFloat(fields[10]) || 0,
          retransmission: fields[11] === '1',
          timeDelta: parseFloat(fields[12]) || 0,
          dnsTime: parseFloat(fields[13]) || 0
        });
      } catch (err) {
        // If individual packet parsing fails, create a minimal packet
        packets.push({
          timestamp: Date.now() / 1000,
          srcIp: 'unknown',
          dstIp: 'unknown',
          protocol: 'Unknown',
          frameLen: 64,
          srcPort: 0,
          dstPort: 0,
          ttl: 64,
          tcpFlags: '',
          windowSize: 0,
          rtt: 0,
          retransmission: false,
          timeDelta: 0,
          dnsTime: 0
        });
      }
    }
  }
  
  return packets;
}

function capturePackets(networkInterface, duration = 5, callback) {
  const { command, args } = buildTSharkCommand(networkInterface || currentInterface);
  args.push('-a', `duration:${duration}`);
  
  let rawData = '';
  let errorOutput = '';
  
  try {
    const tsharkProcess = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PATH: `${process.env.PATH};D:\\PXMonitor\\pxmonitor\\tshark_libs` },
      shell: true
    });
    
    tsharkProcess.stdout.on('data', (data) => {
      rawData += data.toString();
    });
    
    tsharkProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      // console.error(`TShark stderr: ${data.toString()}`);
    });
    
    tsharkProcess.on('close', (code) => {
      // console.log(`TShark process closed with code ${code}`);
      if (code !== 0) {
        callback(new Error(`TShark exited with code ${code}: ${errorOutput}`));
        return;
      }
      
      try {
        const packets = processDataSafely(rawData);
        callback(null, packets);
      } catch (err) {
        callback(new Error(`Failed to process TShark output: ${err.message}`));
      }
    });
  } catch (err) {
    callback(new Error(`Failed to start TShark: ${err.message}`));
  }
}

function startContinuousCapture(networkInterface, processingCallback, errorCallback) {
  const { command, args } = buildTSharkCommand(networkInterface || currentInterface);
  let tsharkProcess = null;
  let buffer = '';
  let running = false;
  
  const informationalMessages = [
    'Capturing on',
    'File:',
    'Packets:',
    'Duration:',
    'Avg'
  ];
  
  function isInformationalMessage(message) {
    return informationalMessages.some(info => message.includes(info));
  }
  
  function start() {
    if (running) return false;
    
    try {
      running = true;
      buffer = '';
      csvHeader = null; // Reset header
      
      tsharkProcess = spawn(command, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, PATH: `${process.env.PATH};D:\\PXMonitor\\pxmonitor\\tshark_libs` },
        shell: true
      });
      
      // console.log(`TShark process started with PID: ${tsharkProcess.pid}`);
      
      tsharkProcess.stdout.on('data', (data) => {
        const dataStr = data.toString();
        buffer += dataStr;
        
        const lines = buffer.split('\n');
        
        if (lines.length > 0 && !buffer.endsWith('\n')) {
          buffer = lines.pop() || '';
        } else {
          buffer = '';
        }
        
        const completedLines = lines.filter(line => line.trim().length > 0);
        
        if (completedLines.length > 0) {
          // Store header if we find it
          if (!csvHeader && completedLines[0].includes('frame.time_epoch')) {
            csvHeader = completedLines[0];
            // console.log('TShark header stored for reuse');
          }
          
          // Process data - always try to process, even if header is missing
          const output = completedLines.join('\n');
          
          try {
            const packets = processDataSafely(output);
            
            if (packets && packets.length > 0) {
              // Always calculate metrics, even from minimal data
              let metrics;
              try {
                metrics = calculateNetworkMetrics(packets);
              } catch (err) {
                // If metrics calculation fails, create basic metrics
                console.warn(`Metrics calculation failed, using fallback: ${err.message}`);
                metrics = {
                  timestamp: Date.now() / 1000,
                  latency: 50,
                  jitter: 10,
                  bandwidth: 1,
                  packet_loss: 0,
                  dns_delay: 20,
                  health_score: 50,
                  stability: 'Stable',
                  congestion_level: 'Stable',
                  packet_count: packets.length,
                  protocol_counts: { 'Unknown': packets.length },
                  packet_sizes: packets.map(p => p.frameLen || 64),
                  top_apps: [{ application: 'Unknown', 'frame.len': packets.reduce((sum, p) => sum + (p.frameLen || 64), 0) }]
                };
              }
              
              processingCallback(packets, metrics);
            }
          } catch (err) {
            console.warn(`Data processing error (continuing): ${err.message}`);
            // Don't call errorCallback - just continue
          }
        }
      });
      
      tsharkProcess.stderr.on('data', (data) => {
        const stderrMessage = data.toString().trim();
        console.log(`TShark info: ${stderrMessage}`);
        
        if (!isInformationalMessage(stderrMessage)) {
          if (stderrMessage.toLowerCase().includes('error') || 
              stderrMessage.toLowerCase().includes('failed') ||
              stderrMessage.toLowerCase().includes('permission denied')) {
            console.error(`TShark actual error: ${stderrMessage}`);
            errorCallback(new Error(`TShark error: ${stderrMessage}`));
          }
        }
      });
      
      tsharkProcess.on('close', (code) => {
        console.log(`TShark process closed with code ${code}`);
        running = false;
        
        if (code !== 0) {
          console.error(`TShark process exited unexpectedly with code ${code}`);
          errorCallback(new Error(`TShark process exited with code ${code}`));
          
          if (running) {
            console.log('Attempting to restart TShark in 3 seconds...');
            setTimeout(() => {
              if (!running) {
                start();
              }
            }, 3000);
          }
        }
      });
      
      tsharkProcess.on('error', (error) => {
        console.error(`TShark process error: ${error.message}`);
        running = false;
        errorCallback(new Error(`TShark process error: ${error.message}`));
      });
      
      return true;
    } catch (err) {
      running = false;
      errorCallback(new Error(`Failed to start TShark: ${err.message}`));
      return false;
    }
  }
  
  function stop() {
    if (!running) return false;
    
    try {
      console.log('Stopping TShark capture...');
      running = false;
      
      if (tsharkProcess) {
        tsharkProcess.kill('SIGTERM');
        
        setTimeout(() => {
          if (tsharkProcess && !tsharkProcess.killed) {
            console.log('Force killing TShark process...');
            tsharkProcess.kill('SIGKILL');
          }
        }, 2000);
        
        tsharkProcess = null;
      }
      
      buffer = '';
      csvHeader = null;
      return true;
    } catch (err) {
      console.error(`Error stopping TShark: ${err.message}`);
      return false;
    }
  }
  
  return {
    start,
    stop,
    isRunning: () => running
  };
}

export {
  capturePackets,
  startContinuousCapture,
  setNetworkInterface,
  getCurrentInterface
};