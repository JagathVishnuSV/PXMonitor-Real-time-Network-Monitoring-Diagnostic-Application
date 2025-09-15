import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const SystemMode = () => {
  const [powerMode, setPowerMode] = useState(false);

  const runScript = async (enable: boolean) => {
    const scriptName = "Maintain-PowerfulConnection.ps1";
    const args = enable ? ["-Enable"] : [];
    
    try {
      const response = await fetch(`/api/run-script/${scriptName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // The backend expects an object with an 'args' property
        body: JSON.stringify({ args }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to parse error response" }));
        throw new Error(`HTTP error! status: ${response.status}, details: ${errorData.error}`);
      }

      const result = await response.json();
      console.log(`Script ${scriptName} executed with args: ${args.join(' ')}`, result);
    } catch (error) {
      console.error(`Failed to execute script ${scriptName}:`, error);
    }
  };

  const handleTogglePowerMode = () => {
    const newMode = !powerMode;
    setPowerMode(newMode);
    runScript(newMode);
  };
  
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">System Mode</h1>
        <p className="text-muted-foreground">Optimize your network for specific tasks</p>
      </div>
      
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-8">
        {/* Thunder Power Button */}
        <div className="relative flex items-center justify-center">
          {/* Main power button */}
          <div 
            className={cn(
              "relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer shadow-lg z-10",
              powerMode 
                ? "shadow-2xl animate-pulse" 
                : "bg-muted/30 text-muted-foreground hover:bg-muted/40"
            )}
            style={powerMode ? {backgroundColor: '#00BBFF', boxShadow: `0 25px 50px -12px ${('#5b246fff')}80`, animation: 'heartbeat 1.5s ease-in-out infinite'} : {}}
            onClick={handleTogglePowerMode}
          >
            {/* Thunder icon */}
            <svg 
              className={cn(
                "w-12 h-12 transition-all duration-300",
                powerMode ? "text-yellow-400 drop-shadow-lg" : "text-muted-foreground"
              )} 
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              <path d="M11 21h-1l1-7H7.5c-.88 0-.33-.75-.31-.78C8.48 10.94 10.42 7.54 13.01 3h1l-1 7h3.51c.4 0 .62.19.4.66C15.39 14.25 13.99 17.27 11 21z"/>
            </svg>
          </div>
        </div>

        {/* Status Text */}
        <div className="text-center">
          <h2 className={cn(
            "text-xl font-bold mb-2 transition-colors",
            powerMode ? "" : "text-muted-foreground"
          )}
          style={powerMode ? {color: '#5b246fff'} : {}}>
            {powerMode ? "ULTIMATE POWER MODE" : "Standard Mode"}
          </h2>
          <p className={cn(
            "text-sm transition-colors",
            powerMode ? "" : "text-muted-foreground"
          )}
          style={powerMode ? {color: '#5b246fff'} : {}}>
            {powerMode ? "System running at maximum performance" : "Click the thunder to unleash full power"}
          </p>
        </div>

        {/* Enable/Disable Button */}
        <button 
          className={cn(
            "px-8 py-3 rounded-md transition-all duration-300 font-medium text-lg min-w-[200px]",
            powerMode 
              ? "text-white shadow-lg" 
              : "bg-muted/20 text-white hover:bg-muted/30 border border-muted"
          )}
          style={powerMode ? {backgroundColor: '#00BBFF', boxShadow: `0 10px 15px -3px ${('#5b246fff')}30`} : {}}
          onClick={handleTogglePowerMode}
        >
          {powerMode ? "Disable Power Mode" : "Enable Power Mode"}
        </button>

        {/* Description */}
        <div className="max-w-2xl text-center space-y-4 mt-8">
          <p className="text-lg font-medium">
            {powerMode ? " ULTIMATE POWER ACTIVATED" : "⚡ Ready to Unleash Power"}
          </p>
          
          <p className="text-muted-foreground">
            {powerMode 
              ? "Your system is now running at full power mode, prioritizing all your important tasks for uninterrupted performance. Meetings, gaming, and critical work will receive maximum system resources."
              : "Upon activating System Full Power Mode, it prioritizes your tasks giving you an undisturbed connection for meetings, gaming, and other important work efficiently."
            }
          </p>
          
          <p className="text-sm text-muted-foreground font-medium">
            This mode provides Super Power to your system, forcing it to work at full extent.
            <br />
            <span className={cn("transition-colors", powerMode ? "" : "")}
            style={powerMode ? {color: '#00BBFF'} : {}}>
              KEEP THIS APPLICATION RUNNING SIDE BY SIDE
            </span>
          </p>
        </div>

        {/* Power Indicators */}
        {powerMode && (
          <div className="flex space-x-4 mt-6">
            <div className="flex items-center space-x-2 text-sm">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{backgroundColor: '#7F3A98'}}></div>
              <span style={{color: '#7F3A98'}}>High Priority Mode</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-green-500">System Optimized</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></div>
              <span className="text-yellow-400">Resources Allocated</span>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .animation-delay-150 {
          animation-delay: 150ms;
        }
        .animation-delay-300 {
          animation-delay: 300ms;
        }
        @keyframes heartbeat {
          0% {
            transform: scale(1);
          }
          25% {
            transform: scale(1.05);
          }
          50% {
            transform: scale(1.1);
          }
          75% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default SystemMode;