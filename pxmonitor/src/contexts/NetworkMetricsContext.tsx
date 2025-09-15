import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// This interface EXACTLY matches the 'latestMetrics' object in backend/index.js
interface MetricsData {
  latency: number;
  jitter: number;
  packetLoss: number;
  bandwidth: number;
  dnsDelay: number;
  healthScore: number;
  stability: string;
  congestion: string;
  protocolData: { name: string; value: number }[];
  topAppsData: { name: string; value: number }[];
  timestamp: string;
  packetsReceived: number;
}

interface NetworkMetricsContextType {
  metrics: MetricsData | null;
  isLoading: boolean;
  error: string | null;
}

const NetworkMetricsContext = createContext<NetworkMetricsContextType | undefined>(undefined);

export const NetworkMetricsProvider = ({ children }: { children: ReactNode }) => {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetching from the correct '/metrics' endpoint as defined in index.js
        const response = await fetch('/metrics');
        if (!response.ok) {
          // The backend sends 503 if data is not ready, which is expected.
          if (response.status === 503) {
            throw new Error('Metrics not available yet. Waiting for server...');
          }
          throw new Error(`API call failed: ${response.status}`);
        }
        const data = await response.json();
        setMetrics(data);
        setError(null);
      } catch (e: any) {
        console.error("Failed to fetch network metrics:", e.message);
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData(); // Initial fetch
    const intervalId = setInterval(fetchData, 5000); // Fetch every 5 seconds

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, []);

  return (
    <NetworkMetricsContext.Provider value={{ metrics, isLoading, error }}>
      {children}
    </NetworkMetricsContext.Provider>
  );
};

export const useNetworkMetrics = () => {
  const context = useContext(NetworkMetricsContext);
  if (context === undefined) {
    throw new Error('useNetworkMetrics must be used within a NetworkMetricsProvider');
  }
  return context;
};
