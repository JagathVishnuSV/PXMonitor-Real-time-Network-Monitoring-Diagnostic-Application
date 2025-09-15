
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
  Network
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  
  const menuItems = [
    { name: "Home", path: "/", icon: <Home size={20} /> },
    { name: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={20} /> },
    { name: "Diagnosis", path: "/diagnosis", icon: <ScanSearch size={20} /> },
    { name: "System Mode", path: "/system-mode", icon: <Zap size={20} /> },
    { name: "System Monitor", path: "/system-monitor", icon: <Monitor size={20} /> },
    { name: "Connection Mapper", path: "/connection-mapper", icon: <Network size={20} /> },
    { name: "Settings", path: "/settings", icon: <Settings size={20} /> },
  ];

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
            className={cn(
              "flex items-center gap-2 w-full px-3 py-2 rounded-md border border-neonBlue/40 text-neonBlue transition-colors hover:bg-neonBlue/10",
              collapsed ? "justify-center px-2" : ""
            )}
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
