import si from 'systeminformation';
import { getLatestProcesses } from './process_monitor.js';

// --- Individual Data Fetchers with Error Handling ---
async function getDiskInfo() {
  try {
    // Fetch disk size and I/O data concurrently
    const [fsData, ioData] = await Promise.all([
      si.fsSize(),
      si.disksIO(),
    ]);

    return fsData.map(disk => {
      // --- FIX IS HERE ---
      // Find the corresponding I/O data, but only if ioData is a valid array
      const diskIO = (ioData && Array.isArray(ioData))
        ? ioData.find(d => d.disk === disk.fs)
        : null; // If ioData is null, diskIO will be null

      return {
        name: disk.fs,
        sizeGB: (disk.size / 1e9).toFixed(1),
        usedGB: (disk.used / 1e9).toFixed(1),
        usedPercent: disk.use,
        // Safely access I/O properties, defaulting to 0 if diskIO is null
        readSpeedMBs: ((diskIO?.rIO_sec || 0) / 1e6).toFixed(2),
        writeSpeedMBs: ((diskIO?.wIO_sec || 0) / 1e6).toFixed(2),
      };
    });
  } catch (error) {
    console.error("Could not fetch Disk Info:", error.message);
    return []; // Return a default empty array on any other error
  }
}

async function getServicesInfo() {
  try {
    const KEY_SERVICES = 'wuauserv,BITS,Spooler,WinDefend,RpcSs';
    const services = await si.services(KEY_SERVICES);
    return services.map(s => ({
      name: s.name,
      status: s.running ? 'Running' : 'Stopped',
    }));
  } catch (error) {
    console.error("Could not fetch Services Info:", error.message);
    return [];
  }
}

async function getSystemAndGpuInfo() {
  try {
    const [os, time, graphics] = await Promise.all([si.osInfo(), si.time(), si.graphics()]);
    const gpu = graphics.controllers?.[0];
    return {
      os: `${os.distro} ${os.release}`,
      arch: os.arch,
      uptimeDays: (time.uptime / 86400).toFixed(1),
      gpu: gpu ? `${gpu.vendor} ${gpu.model}` : 'N/A',
      gpuUsagePercent: gpu?.utilizationGpu ?? 'N/A',
      gpuTempC: gpu?.temperatureGpu ?? 'N/A',
    };
  } catch (error) {
    console.error("Could not fetch System/GPU Info:", error.message);
    return { os: 'N/A', arch: 'N/A', uptimeDays: 'N/A', gpu: 'N/A', gpuUsagePercent: 'N/A', gpuTempC: 'N/A' };
  }
}

function calculateHealthScore(cpu, mem, disks) {
  if (!cpu || !mem || !disks || disks.length === 0) return 50;
  const cpuLoad = cpu.currentLoad;
  const memUsage = (mem.used / mem.total) * 100;
  const lowestDiskFree = Math.min(...disks.map(d => 100 - d.usedPercent));
  const cpuScore = (100 - cpuLoad) * 0.5;
  const memScore = (100 - memUsage) * 0.3;
  const diskScore = lowestDiskFree * 0.2;
  return Math.max(1, Math.min(100, Math.round(cpuScore + memScore + diskScore)));
}

// --- Exported Functions ---

export async function getSystemHealth() {
  const cpu = await si.currentLoad().catch(e => { console.error(e); return null; });
  const mem = await si.mem().catch(e => { console.error(e); return null; });
  const diskInfo = await getDiskInfo();
  const servicesInfo = await getServicesInfo();
  const systemGpuInfo = await getSystemAndGpuInfo();

  const healthData = {
    cpuLoad: cpu?.currentLoad.toFixed(1) ?? 'N/A',
    usedMemMB: mem ? (mem.used / 1e6).toFixed(0) : 'N/A',
    totalMemMB: mem ? (mem.total / 1e6).toFixed(0) : 'N/A',
    uptimeDays: systemGpuInfo.uptimeDays,
    os: systemGpuInfo.os,
    gpu: systemGpuInfo.gpu,
    gpuUsagePercent: systemGpuInfo.gpuUsagePercent,
    gpuTempC: systemGpuInfo.gpuTempC,
    disks: diskInfo,
    keyServices: servicesInfo,
    healthScore: calculateHealthScore(cpu, mem, diskInfo),
  };
  return healthData;
}

// In backend/systemServices.js

export async function getProcesses() {
  try {
    // First try to get data from the process monitor cache
    const cachedProcesses = getLatestProcesses();
    
    // If cache is empty or not working, fallback to direct systeminformation call
    if (!cachedProcesses || cachedProcesses.length === 0) {
      console.log("[getProcesses] Cache empty, fetching directly...");
      const processesObject = await si.processes();
      const processList = processesObject?.list || [];
      
      const cleanedProcessList = processList.map(p => ({
        pid: p.pid,
        name: p.name,
        cpu: Number(p.pcpu) || 0,
        mem: Number(p.pmem) || 0,
        user: p.user || 'SYSTEM',
        started: p.started,
        command: p.command,
      })).slice(0, 50); // Limit to top 50 processes
      
      return cleanedProcessList;
    }
    
    return cachedProcesses;
  } catch (e) {
    console.error("Could not fetch processes:", e.message);
    return []; // Return an empty array on any failure
  }
}

export async function getBattery() {
  try {
    return await si.battery();
  } catch (e) {
    console.error("Could not fetch battery info:", e.message);
    return {};
  }
}

export async function detectSuspicious() {
  // This is a placeholder for your actual suspicion detection logic
  return [];
}