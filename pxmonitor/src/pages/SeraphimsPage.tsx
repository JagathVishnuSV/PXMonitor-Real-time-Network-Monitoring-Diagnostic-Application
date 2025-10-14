import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lightbulb, AlertTriangle, Film, TrafficCone, Loader2, CheckCircle, XCircle } from 'lucide-react';
import ComponentExplanation from '@/components/ui/component-explanation';
import { useToast } from '@/hooks/use-toast';

interface ModelResult {
  loading: boolean;
  error: string | null;
  data: any | null;
}

const SeraphimsPage: React.FC = () => {
  const { toast } = useToast();
  const [currentMetrics, setCurrentMetrics] = useState<any>(null);
  
  const [anomalyResult, setAnomalyResult] = useState<ModelResult>({
    loading: false,
    error: null,
    data: null
  });
  
  const [qualityResult, setQualityResult] = useState<ModelResult>({
    loading: false,
    error: null,
    data: null
  });
  
  const [bottleneckResult, setBottleneckResult] = useState<ModelResult>({
    loading: false,
    error: null,
    data: null
  });

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
        console.error('Error fetching metrics:', error);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  const runAnomalyModel = async () => {
    if (!currentMetrics) {
      toast({
        title: "No metrics available",
        description: "Please wait for network metrics to load.",
        variant: "destructive"
      });
      return;
    }

    setAnomalyResult({ loading: true, error: null, data: null });

    try {
      const response = await fetch('http://localhost:3001/api/seraphims/anomaly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latency: currentMetrics.latency || 0,
          jitter: currentMetrics.jitter || 0,
          bandwidth: currentMetrics.bandwidth || 0,
          packet_loss: currentMetrics.packet_loss || currentMetrics.packetLoss || 0,
          dns_delay: currentMetrics.dns_delay || currentMetrics.dnsDelay || 0
        })
      });

      if (!response.ok) throw new Error('Failed to run model');
      
      const result = await response.json();
      setAnomalyResult({ loading: false, error: null, data: result });
      
      toast({
        title: "Anomaly Detection Complete",
        description: result.isAnomaly ? "⚠️ Anomaly detected!" : "✅ Network behavior is normal",
        variant: result.isAnomaly ? "destructive" : "default"
      });
    } catch (error: any) {
      setAnomalyResult({ loading: false, error: error.message, data: null });
      toast({
        title: "Error",
        description: "Failed to run anomaly detection model",
        variant: "destructive"
      });
    }
  };

  const runQualityModel = async () => {
    if (!currentMetrics) {
      toast({
        title: "No metrics available",
        description: "Please wait for network metrics to load.",
        variant: "destructive"
      });
      return;
    }

    setQualityResult({ loading: true, error: null, data: null });

    try {
      const response = await fetch('http://localhost:3001/api/seraphims/quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latency: currentMetrics.latency || 0,
          jitter: currentMetrics.jitter || 0,
          packet_loss: currentMetrics.packet_loss || currentMetrics.packetLoss || 0,
          bandwidth: currentMetrics.bandwidth || 0
        })
      });

      if (!response.ok) throw new Error('Failed to run model');
      
      const result = await response.json();
      setQualityResult({ loading: false, error: null, data: result });
      
      toast({
        title: "Quality Prediction Complete",
        description: `Predicted streaming quality: ${result.quality}`,
      });
    } catch (error: any) {
      setQualityResult({ loading: false, error: error.message, data: null });
      toast({
        title: "Error",
        description: "Failed to run quality prediction model",
        variant: "destructive"
      });
    }
  };

  const runBottleneckModel = async () => {
    if (!currentMetrics) {
      toast({
        title: "No metrics available",
        description: "Please wait for network metrics to load.",
        variant: "destructive"
      });
      return;
    }

    setBottleneckResult({ loading: true, error: null, data: null });

    try {
      const response = await fetch('http://localhost:3001/api/seraphims/bottleneck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latency: currentMetrics.latency || 0,
          jitter: currentMetrics.jitter || 0,
          bandwidth: currentMetrics.bandwidth || 0,
          packet_loss: currentMetrics.packet_loss || currentMetrics.packetLoss || 0,
          dns_delay: currentMetrics.dns_delay || currentMetrics.dnsDelay || 0
        })
      });

      if (!response.ok) throw new Error('Failed to run model');
      
      const result = await response.json();
      setBottleneckResult({ loading: false, error: null, data: result });
      
      toast({
        title: "Bottleneck Detection Complete",
        description: `Congestion level: ${result.prediction}`,
        variant: result.prediction === 'High' ? "destructive" : "default"
      });
    } catch (error: any) {
      setBottleneckResult({ loading: false, error: error.message, data: null });
      toast({
        title: "Error",
        description: "Failed to run bottleneck detection model",
        variant: "destructive"
      });
    }
  };
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Seraphims - Machine Learning Models for Network Analysis</h1>
        <ComponentExplanation 
          componentName="AI Models" 
          data={{ 
            modelCount: 3,
            features: ['Anomaly Detection', 'Quality Prediction', 'Congestion Analysis']
          }}
        />
      </div>

      <div className="space-y-12">
        {/* Anomaly Detection Model Section */}
        <Card className="bg-white dark:bg-[#221D2E] border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <AlertTriangle className="w-10 h-10 text-yellow-500" />
                <div>
                  <CardTitle className="text-2xl font-semibold">Anomaly Detection Model</CardTitle>
                  <CardDescription className="text-gray-500 dark:text-gray-400">Identifies unusual network behavior.</CardDescription>
                </div>
              </div>
              <Button 
                onClick={runAnomalyModel}
                disabled={anomalyResult.loading || !currentMetrics}
                className="bg-yellow-500 hover:bg-yellow-600 text-white"
              >
                {anomalyResult.loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  'Run Model'
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {anomalyResult.data && (
              <Alert className={anomalyResult.data.isAnomaly ? "border-red-500 bg-red-50 dark:bg-red-950" : "border-green-500 bg-green-50 dark:bg-green-950"}>
                <div className="flex items-center space-x-2">
                  {anomalyResult.data.isAnomaly ? (
                    <XCircle className="h-5 w-5 text-red-500" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                  <AlertDescription className="font-semibold">
                    Result: {anomalyResult.data.isAnomaly ? 'Anomaly Detected (-1)' : 'Normal Behavior (1)'}
                  </AlertDescription>
                </div>
                <AlertDescription className="mt-2">
                  {anomalyResult.data.interpretation}
                </AlertDescription>
              </Alert>
            )}
            
            {anomalyResult.error && (
              <Alert className="border-red-500 bg-red-50 dark:bg-red-950">
                <AlertDescription className="text-red-600 dark:text-red-400">
                  Error: {anomalyResult.error}
                </AlertDescription>
              </Alert>
            )}
            
            <Separator />
            <div>
              <h3 className="text-xl font-semibold flex items-center"><Lightbulb className="w-5 h-5 mr-2 text-blue-500" />Description</h3>
              <p className="mt-2 text-gray-700 dark:text-gray-300">
                This model uses an Isolation Forest algorithm to detect outliers in your network traffic. It is trained to recognize patterns that deviate from normal activity, helping to flag potential issues before they escalate.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quality Prediction Model Section */}
        <Card className="bg-white dark:bg-[#221D2E] border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Film className="w-10 h-10 text-purple-500" />
                <div>
                  <CardTitle className="text-2xl font-semibold">Quality Prediction Model (Gradient Boosting)</CardTitle>
                  <CardDescription className="text-gray-500 dark:text-gray-400">Estimates achievable video streaming quality.</CardDescription>
                </div>
              </div>
              <Button 
                onClick={runQualityModel}
                disabled={qualityResult.loading || !currentMetrics}
                className="bg-purple-500 hover:bg-purple-600 text-white"
              >
                {qualityResult.loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  'Run Model'
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {qualityResult.data && (
              <Alert className="border-purple-500 bg-purple-50 dark:bg-purple-950">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-purple-500" />
                  <AlertDescription className="font-semibold">
                    Predicted Streaming Quality: {qualityResult.data.quality}
                  </AlertDescription>
                </div>
                <AlertDescription className="mt-2 text-sm">
                  Raw prediction value: {qualityResult.data.prediction}
                </AlertDescription>
              </Alert>
            )}
            
            {qualityResult.error && (
              <Alert className="border-red-500 bg-red-50 dark:bg-red-950">
                <AlertDescription className="text-red-600 dark:text-red-400">
                  Error: {qualityResult.error}
                </AlertDescription>
              </Alert>
            )}
            
            <Separator />
            <div>
              <h3 className="text-xl font-semibold flex items-center"><Lightbulb className="w-5 h-5 mr-2 text-blue-500" />Description</h3>
              <p className="mt-2 text-gray-700 dark:text-gray-300">
                This model, built with Gradient Boosting, predicts the likely video streaming quality your network can currently support. It helps set realistic expectations for media consumption based on real-time conditions.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Congestion Level Model Section */}
        <Card className="bg-white dark:bg-[#221D2E] border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <TrafficCone className="w-10 h-10 text-orange-500" />
                <div>
                  <CardTitle className="text-2xl font-semibold">Congestion Level Model (Bottleneck)</CardTitle>
                  <CardDescription className="text-gray-500 dark:text-gray-400">Identifies the current level of network congestion.</CardDescription>
                </div>
              </div>
              <Button 
                onClick={runBottleneckModel}
                disabled={bottleneckResult.loading || !currentMetrics}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                {bottleneckResult.loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  'Run Model'
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {bottleneckResult.data && (
              <Alert className={
                bottleneckResult.data.prediction === 'High' ? "border-red-500 bg-red-50 dark:bg-red-950" :
                bottleneckResult.data.prediction === 'Moderate' ? "border-orange-500 bg-orange-50 dark:bg-orange-950" :
                "border-green-500 bg-green-50 dark:bg-green-950"
              }>
                <div className="flex items-center space-x-2">
                  <CheckCircle className={
                    bottleneckResult.data.prediction === 'High' ? "h-5 w-5 text-red-500" :
                    bottleneckResult.data.prediction === 'Moderate' ? "h-5 w-5 text-orange-500" :
                    "h-5 w-5 text-green-500"
                  } />
                  <AlertDescription className="font-semibold">
                    Congestion Level: {bottleneckResult.data.prediction}
                  </AlertDescription>
                </div>
                <AlertDescription className="mt-2 text-sm">
                  Current network congestion detected: {bottleneckResult.data.congestionLevel}
                </AlertDescription>
              </Alert>
            )}
            
            {bottleneckResult.error && (
              <Alert className="border-red-500 bg-red-50 dark:bg-red-950">
                <AlertDescription className="text-red-600 dark:text-red-400">
                  Error: {bottleneckResult.error}
                </AlertDescription>
              </Alert>
            )}
            
            <Separator />
            <div>
              <h3 className="text-xl font-semibold flex items-center"><Lightbulb className="w-5 h-5 mr-2 text-blue-500" />Description</h3>
              <p className="mt-2 text-gray-700 dark:text-gray-300">
                This model analyzes key metrics to determine if your network is experiencing a bottleneck. It helps differentiate between a slow connection and a completely congested one.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SeraphimsPage;