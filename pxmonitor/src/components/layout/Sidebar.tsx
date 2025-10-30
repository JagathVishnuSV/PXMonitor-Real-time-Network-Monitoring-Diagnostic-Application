
import { Link, useLocation } from "react-router-dom";
import { 
  Home,
  LayoutDashboard, 
  ScanSearch, 
  Zap, 
  Settings, 
  FileDown,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Network,
  BrainCircuit,
  Bot
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [currentMetrics, setCurrentMetrics] = useState<any>(null);
  const location = useLocation();
  
  const menuItems = [
    { name: "Home", path: "/", icon: <Home size={20} /> },
    { name: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={20} /> },
    { name: "AI Agents", path: "/agents", icon: <Bot size={20} /> },
    { name: "Diagnosis", path: "/diagnosis", icon: <ScanSearch size={20} /> },
    { name: "System Mode", path: "/system-mode", icon: <Zap size={20} /> },
    { name: "System Monitor", path: "/system-monitor", icon: <Monitor size={20} /> },
    { name: "Connection Mapper", path: "/connection-mapper", icon: <Network size={20} /> },
    { name: "Seraphims", path: "/seraphims", icon: <BrainCircuit size={20} /> },
    { name: "Settings", path: "/settings", icon: <Settings size={20} /> },
  ];

  // Fetch current network metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('http://localhost:3001/metrics');
        if (response.ok) {
          const data = await response.json();
          setCurrentMetrics(data);
        }
      } catch (error) {
        // Silently handle network errors to prevent console spam
        console.log('Metrics endpoint unavailable');
      }
    };

    // Initial fetch with delay
    setTimeout(fetchMetrics, 3000);
    const interval = setInterval(fetchMetrics, 30000); // Update every 30 seconds (reduced frequency)
    
    return () => clearInterval(interval);
  }, []);

  // Export metrics to CSV
  const handleExportData = () => {
    if (!currentMetrics) {
      alert('No data available to export. Please wait for metrics to load.');
      return;
    }

    // Create CSV header
    const headers = [
      'Timestamp',
      'Latency (ms)',
      'Jitter (ms)',
      'Bandwidth (Mbps)',
      'Packet Loss (%)',
      'DNS Delay (ms)',
      'Health Score',
      'Stability',
      'Congestion',
      'Packets Received'
    ];

    // Create CSV row with current metrics
    const timestamp = new Date().toISOString();
    const row = [
      timestamp,
      currentMetrics.latency || 0,
      currentMetrics.jitter || 0,
      currentMetrics.bandwidth || 0,
      currentMetrics.packet_loss || currentMetrics.packetLoss || 0,
      currentMetrics.dns_delay || currentMetrics.dnsDelay || 0,
      currentMetrics.health_score || currentMetrics.healthScore || 0,
      currentMetrics.stability || 'unknown',
      currentMetrics.congestion || currentMetrics.congestion_level || 'unknown',
      currentMetrics.packetsReceived || currentMetrics.packet_count || 0
    ];

    // Combine headers and row
    const csvContent = [
      headers.join(','),
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Set link attributes with timestamp in filename
    const filename = `pxmonitor-metrics-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.display = 'none';
    
    // Add to document, trigger download, and clean up
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <aside 
      className={cn(
        "h-screen bg-card/80 backdrop-blur-md border-r border-border transition-all duration-300 z-20",
        collapsed ? "w-16" : "w-[250px]"
      )}
    >
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="p-4 border-b border-indigo-900/30 flex justify-between items-center">
          {!collapsed && (
            <span className="gradient-text font-bold text-xl">PXMonitor</span>
          )}
          <button 
            className="p-1 rounded-md hover:bg-indigo-500/20 transition-colors"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="text-accent" /> : <ChevronLeft className="text-accent" />}
          </button>
        </div>
        
        {/* Navigation Links */}
        <nav className="flex-1 py-6">
          <ul className="space-y-3 px-3">
            {menuItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    "sidebar-link",
                    location.pathname === item.path ? "active" : "",
                    collapsed ? "justify-center px-2" : ""
                  )}
                >
                  <span className={cn("text-current", location.pathname === item.path ? "text-accent" : "text-muted-foreground")}>{item.icon}</span>
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        {/* Export Button */}
        <div className="p-4 border-t border-indigo-900/30">
          <button 
            onClick={handleExportData}
            className={cn(
              "flex items-center gap-2 w-full px-3 py-2 rounded-md border border-neonBlue/40 text-neonBlue transition-colors hover:bg-neonBlue/10",
              collapsed ? "justify-center px-2" : ""
            )}
            title="Export current network metrics to CSV"
          >
            <FileDown size={20} />
            {!collapsed && <span>Export Data</span>}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
