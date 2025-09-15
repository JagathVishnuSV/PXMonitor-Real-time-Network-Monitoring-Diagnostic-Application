// In backend/process-monitor.js

import si from 'systeminformation';

let cachedProcesses = []; // This will hold our continuously updated list

const MONITOR_INTERVAL_MS = 5000; // Check processes every 5 seconds

/**
 * This is the core function that runs continuously.
 * It fetches the process list and updates our cache.
 */
async function updateProcessList() {
  try {
    console.log("[Process Monitor] Updating process list...");
    const processesObject = await si.processes();
    const processList = processesObject?.list || [];

    // Clean and format the data, ensuring CPU/Mem are numbers
    cachedProcesses = processList.map(p => ({
      pid: p.pid,
      name: p.name,
      cpu: Number(p.cpu) || 0,
      mem: Number(p.mem) || 0,
      user: p.user || 'SYSTEM',
      started: p.started,
      command: p.command,
    }));
    cachedProcesses.sort((a, b) => b.cpu - a.cpu);
    
    // Log successful update
    console.log(`[Process Monitor] Updated ${cachedProcesses.length} processes`);
    const activeProcess = cachedProcesses.find(p => p.cpu > 0);
    if (activeProcess) {
      console.log(`[Process Monitor] Top active process: ${activeProcess.name} at ${activeProcess.cpu.toFixed(1)}% CPU`);
    }

  } catch (e) {
    console.error("[Process Monitor] Error updating process list:", e.message);
  }
}

/**
 * Starts the continuous monitoring.
 */
export function startProcessMonitor() {
  console.log('[Process Monitor] Starting...');
  // Run it once immediately to get initial data
  updateProcessList();
  // Then run it on a set interval
  setInterval(updateProcessList, MONITOR_INTERVAL_MS);
}

/**
 * Returns the latest list of processes from our cache.
 */
export function getLatestProcesses() {
  return cachedProcesses;
}