import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Info, Shield, Wifi, RefreshCw } from "lucide-react";
import { Popover, PopoverContent,PopoverTrigger,} from "@/components/ui/popover";

interface ConnectionInfo {
  pid: number;
  name: string;
  remoteAddress: string;
  remotePort: number;
  hostname: string;
  country: string;
}

interface GroupedConnection {
  pid: number;
  name: string;
  count: number;
  connections: Omit<ConnectionInfo, 'pid' | 'name'>[];
}

export default function ConnectionMapperPage() {
  const [connections, setConnections] = useState<ConnectionInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>("Ready to analyze.");
  const [isScanning, setIsScanning] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [explainingHostname, setExplainingHostname] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string>("");
  
  const groupedConnections = useMemo(() => {
    const groups: Record<string, GroupedConnection> = {};
    connections.forEach(conn => {
      const key = `${conn.name}-${conn.pid}`;
      if (!groups[key]) {
        groups[key] = {
          pid: conn.pid,
          name: conn.name,
          count: 0,
          connections: [],
        };
      }
      groups[key].count++;
      groups[key].connections.push({
        remoteAddress: conn.remoteAddress,
        remotePort: conn.remotePort,
        hostname: conn.hostname,
        country: conn.country,
      });
    });
    return Object.values(groups).sort((a, b) => b.count - a.count);
  }, [connections]);


  useEffect(() => {
    const fetchConnections = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const res = await fetch("/api/connections");
        if (!res.ok) {
          throw new Error(`Failed to fetch: ${res.statusText}`);
        }
        const data: ConnectionInfo[] = await res.json();
        setConnections(data);
      } catch (err: any) {
        setError(err.message || "An unknown error occurred.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchConnections(); 
    const interval = setInterval(() => {
      fetchConnections();
    }, 600000); 
    
    return () => clearInterval(interval); // Cleanup on component unmount
  }, [refreshTrigger]); // Refresh every 15 seconds
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1); // Increment the trigger to re-run useEffect
  };

  const handleExplainConnection = async (hostname: string) => {
    if (!hostname || hostname === 'N/A') {
      return;
    }
    // Set the current hostname to show the popover with a loading message
    setExplainingHostname(hostname);
    setExplanation("AI is analyzing this connection...");

    try {
      const res = await fetch("/api/connections/explain", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostname }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get explanation.');
      
      // Update the state with the AI's response
      setExplanation(data.explanation);

    } catch (e: any) {
      setExplanation(`Sorry, an error occurred: ${e.message}`);
    }
  };

  const handleSecurityScan = async () => {
    if (connections.length === 0) {
      setAiSummary("No connections to analyze.");
      return;
    }
    setIsScanning(true);
    setAiSummary("AI is scanning your connections for security risks...");
    try {
      const res = await fetch("/api/connections/security-scan", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connections }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get analysis.');
      setAiSummary(data.analysis);
    } catch (e: any) {
      setAiSummary(`An error occurred during the scan: ${e.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Live Network Footprints</CardTitle>
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Interactive map of active connections with built-in security insights.
            </p>
            <Button onClick={handleRefresh} variant="outline" size="sm" disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Refreshing...' : 'Refresh Now'}
            </Button>
            <Button onClick={handleSecurityScan} size="sm" disabled={isScanning}>
              <Shield className="h-4 w-4 mr-2" />
              {isScanning ? 'Scanning...' : 'Analyze Security'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <Shield className="h-4 w-4" />
            <AlertTitle>AI Security Analysis</AlertTitle>
            <AlertDescription>{aiSummary}</AlertDescription>
          </Alert>
          
          {isLoading && <p>Loading active connections...</p>}
          {error && <p className="text-red-500">Error: {error}</p>}
          
          {!isLoading && !error && (
            <Accordion type="single" collapsible className="w-full">
              {groupedConnections.map(({ name, pid, count, connections: connList }) => (
                <AccordionItem value={`item-${pid}`} key={pid}>
                  <AccordionTrigger>
                    <div className="flex justify-between w-full pr-4">
                      <span>{name} ({pid})</span>
                      <span className="text-sm text-muted-foreground">{count} connections</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Remote Address</TableHead>
                          <TableHead>Hostname</TableHead>
                          <TableHead>Country</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {connList.map((conn, index) => (
                          <TableRow key={index}>
                            <TableCell>{conn.remoteAddress}:{conn.remotePort}</TableCell>
                            <TableCell className="font-mono text-xs">{conn.hostname}</TableCell>
                            <TableCell>{conn.country}</TableCell>
                            <TableCell className="text-right space-x-2">
                              {/* --- THIS IS THE UPDATED POPOVER UI --- */}
                            <Popover onOpenChange={(isOpen) => !isOpen && setExplainingHostname(null)}>
                              <PopoverTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handleExplainConnection(conn.hostname)}
                                  disabled={!conn.hostname || conn.hostname === 'N/A'}
                                >
                                  <Info className="h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                              {/* Show the popover only for the hostname we are currently explaining */}
                              {explainingHostname === conn.hostname && (
                                <PopoverContent className="w-80">
                                  <div className="grid gap-4">
                                    <div className="space-y-2">
                                      <h4 className="font-medium leading-none">AI Explanation</h4>
                                      <p className="text-sm text-muted-foreground">
                                        {explanation}
                                      </p>
                                    </div>
                                  </div>
                                </PopoverContent>
                              )}
                            </Popover>

                              <Button variant="ghost" size="icon" disabled>
                                <Wifi className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}