import React, { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"; // Import Badge for service status

// --- (Existing ProcessInfo interface is unchanged) ---
interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  mem: number;
  started: string;
  command: string;
  user: string;
}

// --- UPDATED HealthInfo interface to include all new data ---
interface HealthInfo {
  cpuLoad: string;
  usedMemMB: string;
  totalMemMB: string;
  uptimeDays: string;
  os: string;
  gpu: string;
  gpuUsagePercent: number | string;
  gpuTempC: number | string;
  disks: {
    name: string;
    usedPercent: number;
    readSpeedMBs: string;
    writeSpeedMBs: string;
  }[];
  keyServices: {
    name: string;
    status: 'Running' | 'Stopped';
  }[];
  healthScore: number;
}

// ChatBubble helper (paste after imports)
function ChatBubble({ text, role }: { text: string; role: "user" | "ai" }) {
  const [expanded, setExpanded] = useState(false);
  const PREVIEW_CHARS = 300; // adjust if you want shorter/longer preview
  const isLong = text.length > PREVIEW_CHARS;
  const preview = isLong && !expanded ? text.slice(0, PREVIEW_CHARS) + "…" : text;

  return (
    <div className={`flex flex-col ${role === "user" ? "items-end" : "items-start"} w-full`}>
      <div
        className={`p-2 rounded-lg max-w-[80%] break-words whitespace-pre-wrap
          ${role === "user" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-800"}`}
        // subtle transition for height changes
        style={{ transition: "max-height 180ms ease", position: "relative" }}
      >
        {/* message body */}
        <div>{preview}</div>

        {/* Fade gradient when truncated (visual cue) */}
        {isLong && !expanded && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 28,
              background:
                role === "user"
                  ? "linear-gradient(180deg, rgba(59,130,246,0) 0%, rgba(59,130,246,0.9) 100%)"
                  : "linear-gradient(180deg, rgba(229,231,235,0) 0%, rgba(229,231,235,0.95) 100%)",
              borderBottomLeftRadius: 8,
              borderBottomRightRadius: 8,
              pointerEvents: "none",
            }}
          />
        )}
      </div>

      {/* controls: Show more / Show less */}
      {isLong && (
        <div className={`mt-1 text-[12px] ${role === "user" ? "text-blue-600" : "text-gray-600"}`}>
          <button
            onClick={() => setExpanded((s) => !s)}
            className="underline hover:no-underline text-white"
            aria-label={expanded ? "Show less" : "Show more"}
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function SystemMonitor() {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const FETCH_INTERVAL_MS = 10000; // 10 seconds
  const [chatScrollPct, setChatScrollPct] = useState(100); // 0..100 (0 = top, 100 = bottom)
  const scrollbarRef = useRef<HTMLInputElement|null>(null);
  // --- (Existing fetchSystemData and useEffect are unchanged) ---
  const fetchSystemData = async () => {
    try {
      const [procRes, healthRes] = await Promise.all([
        fetch("/api/system/processes"),
        fetch("/api/system/health"),
      ]);

      if (!procRes.ok) throw new Error(`Processes fetch failed: ${procRes.statusText}`);
      if (!healthRes.ok) throw new Error(`Health fetch failed: ${healthRes.statusText}`);

      const procData = await procRes.json();
      const healthData = await healthRes.json();

      setProcesses(Array.isArray(procData) ? procData : []);
      setHealth(healthData);
      setError(null); // clear previous errors if successful
    } catch (err: any) {
      console.error("Error fetching system data:", err);
      setError(err.message || "Unknown error fetching system data");
    }
  };

  useEffect(() => {
    fetchSystemData(); // initial fetch
    const interval = setInterval(fetchSystemData, FETCH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // --- (Existing askAI function is unchanged) ---
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const askAI = async () => {
    if (!question.trim() || isAiThinking) return;

    setIsAiThinking(true); // --- SET loading state to true ---
    setChatHistory((h) => [...h, { role: "user", text: question }]);
    setQuestion(""); // Clear input immediately
    const recentHistory = chatHistory.slice(-3);
    try {
      const res = await fetch("/api/system/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, context: { health, processes },history: recentHistory }),
      });

      if (!res.ok) throw new Error(`AI fetch failed: ${res.statusText}`);

      const data = await res.json();
      setChatHistory((h) => [...h, { role: "ai", text: data.answer }]);
    } catch (err: any) {
      console.error("Error asking AI:", err);
      setChatHistory((h) => [...h, { role: "ai", text: "Sorry, I couldn't get an answer right now." }]);
    } finally {
      setIsAiThinking(false); // --- SET loading state to false ---
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault(); // Prevents adding a new line
      askAI();
    }
  };
  // --- UPDATED JSX with new health metrics display ---
  return (
    <div className="grid grid-cols-3 gap-4 p-4 h-screen">
      {/* Task Manager Side */}
      <Card className="col-span-2 overflow-hidden flex flex-col">
        <CardHeader>
          <CardTitle>PXMonitor – System Health & Processes</CardTitle>
        </CardHeader>
        <CardContent className="overflow-y-auto">
          {error && (
            <div className="text-red-600 mb-2 text-sm">
              Error fetching system data: {error}
            </div>
          )}

          {/* ----- NEW HEALTH METRICS SECTION ----- */}
          {health && (
            <div className="mb-4 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm p-4 bg-slate-50 rounded-lg text-black">
                <div><strong>Health Score:</strong> {health.healthScore}/100</div>
                <div><strong>CPU Load:</strong> {health.cpuLoad}%</div>
                <div><strong>Memory:</strong> {health.usedMemMB} / {health.totalMemMB} MB</div>
                <div><strong>Uptime:</strong> {health.uptimeDays} days</div>
                <div className="col-span-2"><strong>OS:</strong> {health.os}</div>
                <div className="col-span-2"><strong>GPU:</strong> {health.gpu} (Usage: {health.gpuUsagePercent}%, Temp: {health.gpuTempC}°C)</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                    <h3 className="font-bold mb-2">Disk I/O</h3>
                    {health.disks.map(disk => (
                        <div key={disk.name} className="flex justify-between items-center">
                            <span>{disk.name} (Used: {disk.usedPercent}%)</span>
                            <span className="text-xs">R: {disk.readSpeedMBs} MB/s | W: {disk.writeSpeedMBs} MB/s</span>
                        </div>
                    ))}
                </div>
                <div>
                    <h3 className="font-bold mb-2">Key Services</h3>
                    <div className="flex flex-wrap gap-2">
                        {health.keyServices.map(service => (
                            <Badge key={service.name} variant={service.status === 'Running' ? 'default' : 'destructive'}>
                                {service.name}
                            </Badge>
                        ))}
                    </div>
                </div>
              </div>
            </div>
          )}
          {/* ----- END OF NEW SECTION ----- */}


          <div className="overflow-y-auto max-h-[55vh] border rounded">
            <table className="w-full text-xs">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="p-2 text-left text-black">PID</th>
                  <th className="p-2 text-left text-black">Name</th>
                  <th className="p-2 text-left text-black">CPU%</th>
                  <th className="p-2 text-left text-black">Mem%</th>
                  <th className="p-2 text-left text-black">User</th>
                </tr>
              </thead>
              <tbody>
                {/* Process list rendering is unchanged */}
                {processes.slice(0, 50).map((p) => (
                  <tr key={p.pid} className="border-b">
                    <td className="p-2">{p.pid}</td>
                    <td className="p-2">{p.name}</td>
                     <td className="p-2">
                      {typeof p.cpu === 'number' ? p.cpu.toFixed(1) : "-"}
                    </td>
                    <td className="p-2">
                      {typeof p.mem === 'number' ? p.mem.toFixed(1) : "-"}
                    </td>
                    <td className="p-2">{p.user}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* --- (AI Q/A Side is unchanged) --- */}
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>AI Assistant</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col h-full">
          {/* --- ATTACH REF HERE for auto-scrolling --- */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto mb-2 space-y-4 p-2">
            {chatHistory.map((m, i) => (
                <div key={i} className="w-full">
                <ChatBubble key={i} text={m.text} role={m.role} />
                </div>
            ))}
          
            {/* --- ADD THIS to show a "thinking" message --- */}
            {isAiThinking && (
              <div className="flex items-start">
                <div className="p-2 rounded-lg max-w-xs bg-gray-200 text-gray-500">
                  Thinking...
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              // --- ATTACH KEYDOWN HANDLER HERE ---
              onKeyDown={handleKeyDown}
              placeholder="Ask why your PC is slow..."
              // --- ADD THIS to disable input while AI is thinking ---
              disabled={isAiThinking}
            />
            <Button onClick={askAI} disabled={isAiThinking}>
              Send
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}