import { useState, useEffect } from "react";
import { CheckCircle, AlertTriangle, Loader2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import ComponentExplanation from "@/components/ui/component-explanation";

interface NetworkMetric {
  label: string;
  before: number;
  unit: string;
  after?: number;
}

interface ScriptResult {
  status: "idle" | "running" | "completed";
  metrics?: NetworkMetric[];
}

interface NetworkScript {
  id: string;
  name: string;
  fileName: string;
  description: string;
  metrics: NetworkMetric[];
}

const Diagnosis = () => {
  const { toast } = useToast();
  // Local state for metrics, instead of using the live context
  const [networkMetrics, setNetworkMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [scriptResults, setScriptResults] = useState<Record<string, ScriptResult>>({
    "dns-cache": { status: "idle" },
    "network-ip": { status: "idle" },
    "bandwidth": { status: "idle" },
    "dns-server": { status: "idle" },
    "wifi": { status: "idle" },
    "congestion": { status: "idle" },
    "powerful": { status: "idle" },
  });

  // Fetch metrics only once on component mount
  useEffect(() => {
    const fetchInitialMetrics = async () => {
      try {
        const response = await fetch('/metrics');
        if (!response.ok) {
          throw new Error(`API call failed: ${response.status}`);
        }
        const data = await response.json();
        setNetworkMetrics(data);
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Network Analysis Inactive",
          description: `Could not retrieve initial network data. Error: ${error.message}`
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialMetrics();
  }, [toast]);
  
  // This function now uses the local, static networkMetrics
  const getNetworkScripts = (): NetworkScript[] => {
    if (!networkMetrics) return [];
    
    return [
      {
        id: "dns-cache",
        name: "DNS Cache Flush",
        fileName: "Flush-DnsCache.ps1",
        description: "Clears the DNS resolver cache to resolve connectivity issues and refresh DNS records.",
        metrics: [
          { label: "DNS Delay", before: networkMetrics.dnsDelay || 0, unit: "ms" },
          { label: "Health Score", before: networkMetrics.healthScore || 0, unit: "%" }
        ]
      },
      {
        id: "network-ip",
        name: "Network IP Reset",
        fileName: "Reset-NetworkIP.ps1",
        description: "Resets IP configuration to resolve address conflicts and connectivity problems.",
        metrics: [
          { label: "Health Score", before: networkMetrics.healthScore || 0, unit: "%" }
        ]
      },
      {
        id: "bandwidth",
        name: "Bandwidth Optimization",
        fileName: "Optimize-Bandwidth.ps1",
        description: "Adjusts TCP parameters for improved bandwidth utilization and faster data transfers.",
        metrics: [
          { label: "Bandwidth", before: networkMetrics.bandwidth || 0, unit: "Mbps" },
          { label: "Health Score", before: networkMetrics.healthScore || 0, unit: "%" }
        ]
      },
      {
        id: "dns-server",
        name: "DNS Server Switch",
        fileName: "Switch-DnsServer.ps1",
        description: "Changes DNS server settings to improve speed and reliability of internet connections.",
        metrics: [
          { label: "DNS Delay", before: networkMetrics.dnsDelay || 0, unit: "ms" },
          { label: "Health Score", before: networkMetrics.healthScore || 0, unit: "%" }
        ]
      },
      {
        id: "wifi",
        name: "WiFi Reconnection",
        fileName: "Reconnect-WiFi.ps1",
        description: "Disconnects and reconnects WiFi to resolve signal or authentication issues.",
        metrics: [
          { label: "Packet Loss", before: networkMetrics.packetLoss || 0, unit: "%" },
          { label: "Jitter", before: networkMetrics.jitter || 0, unit: "ms" }
        ]
      },
      {
        id: "congestion",
        name: "Network Congestion Relief",
        fileName: "Clear-NetworkCongestion.ps1",
        description: "Alleviates network congestion by resetting adapters and clearing network cache.",
        metrics: [
          { label: "Latency", before: networkMetrics.latency || 0, unit: "ms" },
          
        ]
      },
    ];
  };

  // This function now fetches fresh data for the "after" comparison
  const runScript = async (script: NetworkScript) => {
    setScriptResults(prev => ({ ...prev, [script.id]: { ...prev[script.id], status: "running" } }));

    toast({
      title: "Running Script",
      description: `Executing ${script.fileName}...`,
    });

    try {
      // 1. Execute the script
      const scriptResponse = await fetch(`/api/run-script/${script.fileName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}), // Send an empty JSON object as the body
      });
      if (!scriptResponse.ok) {
        // Handle non-JSON error responses gracefully
        const errorText = await scriptResponse.text();
        try {
          const errorResult = JSON.parse(errorText);
          throw new Error(errorResult.message || 'Script execution failed on the server.');
        } catch (e) {
          // If parsing fails, it's likely HTML or plain text, so use that as the error.
          throw new Error(errorText || 'Script execution failed with a non-JSON response.');
        }
      }
      
      // 2. Fetch fresh metrics to get the "after" state
      const metricsResponse = await fetch('/metrics');
      if (!metricsResponse.ok) {
        throw new Error('Failed to fetch updated metrics after script execution.');
      }
      const updatedMetrics = await metricsResponse.json();

      // 3. Create the "after" metrics for the specific script that ran
      const updatedScriptMetrics = script.metrics.map(metric => {
        // Find the corresponding new value from the fresh metrics
        let afterValue;
        switch (metric.label) {
          case "DNS Delay": afterValue = updatedMetrics.dnsDelay; break;
          case "Health Score": afterValue = updatedMetrics.healthScore; break;
          case "Bandwidth": afterValue = updatedMetrics.bandwidth; break;
          case "Packet Loss": afterValue = updatedMetrics.packetLoss; break;
          case "Jitter": afterValue = updatedMetrics.jitter; break;
          case "Latency": afterValue = updatedMetrics.latency; break;
          default: afterValue = metric.before; // Default to 'before' if no mapping exists
        }
        
        return {
          ...metric,
          after: afterValue,
        };
      });

      // 4. Update the state for the specific card
      setScriptResults(prev => ({
        ...prev,
        [script.id]: {
          status: "completed",
          metrics: updatedScriptMetrics,
        }
      }));

      toast({
        title: "Script Executed Successfully",
        description: `${script.fileName} completed. Comparison is now visible.`,
      });

    } catch (error: unknown) {
      console.error(`Error executing script ${script.fileName}:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({
        variant: "destructive",
        title: "Script Execution Failed",
        description: errorMessage || `Failed to execute ${script.fileName}.`,
      });
      setScriptResults(prev => ({ ...prev, [script.id]: { ...prev[script.id], status: "idle" } }));
    }
  };

  const networkScripts = getNetworkScripts();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Connecting to backend and waiting for first metrics...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Network Diagnosis & Repair</h1>
        <ComponentExplanation 
          componentName="Network Diagnosis" 
          data={{ 
            scriptCount: networkScripts.length,
            completedCount: Object.values(scriptResults).filter(r => r.status === "completed").length,
          }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {networkScripts.map((script) => {
          const result = scriptResults[script.id] || { status: "idle" };
          
          return (
            <Card key={script.id} className="network-card overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">{script.name}</CardTitle>
                </div>
                <CardDescription className="mt-1.5">{script.description}</CardDescription>
              </CardHeader>

              <CardContent>
                <div className="space-y-6">
                  {script.metrics.map((metric, idx) => {
                    const updatedMetric = result.metrics?.[idx];
                    
                    return (
                      <div key={idx} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{metric.label}</span>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "font-semibold font-mono",
                              updatedMetric?.after !== undefined ? "text-coralRed" : ""
                            )}>
                              {metric.before.toFixed(3)}{metric.unit}
                            </span>
                            
                            {updatedMetric?.after !== undefined && (
                              <>
                                <span className="text-muted-foreground">→</span>
                                <span className="font-semibold font-mono text-limeGreen">
                                  {updatedMetric.after.toFixed(3)}{metric.unit}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <Progress 
                          value={updatedMetric?.after !== undefined 
                            ? (metric.label.includes("Time") || metric.label.includes("Latency") || metric.label.includes("Loss") || metric.label.includes("Conflicts")
                              ? (100 - (updatedMetric.after / metric.before * 100))
                              : (updatedMetric.after / 100 * 100))
                            : 0
                          } 
                          className={cn(
                            "h-2", 
                            updatedMetric?.after !== undefined ? "bg-muted/30" : "bg-muted/10"
                          )}
                        />
                      </div>
                    );
                  })}
                  
                  <Button 
                    onClick={() => runScript(script)}
                    disabled={result.status === "running"}
                    className={cn(
                      "w-full mt-4",
                      result.status === "completed" ? "bg-limeGreen hover:bg-limeGreen/90 text-white" : ""
                    )}
                  >
                    {result.status === "running" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Running...
                      </>
                    ) : result.status === "completed" ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Fixed
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-4 w-4" />
                        Run Diagnosis
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Diagnosis;