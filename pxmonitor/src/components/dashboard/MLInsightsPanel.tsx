import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, TrendingUp, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

const MLInsightsPanel = () => {
  const [predictions, setPredictions] = useState([]);
  const [modelStatus, setModelStatus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMLData = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/agents/ml/predictions');
        if (!response.ok) {
          throw new Error('Failed to fetch ML predictions');
        }
        
        const data = await response.json();
        setPredictions(data.predictions || []);
        setModelStatus(data.models || []);
      } catch (error) {
        console.error('Error fetching ML data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMLData();
    const interval = setInterval(fetchMLData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getPredictionSeverity = (prediction) => {
    if (prediction.predictions?.anomaly?.is_anomaly) return 'high';
    if (prediction.predictions?.bottleneck?.will_occur) return 'medium';
    if (prediction.predictions?.performance?.trend === 'degrading') return 'medium';
    return 'low';
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <TrendingUp className="w-4 h-4" />;
      case 'low': return <CheckCircle className="w-4 h-4" />;
      default: return <Brain className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="w-5 h-5" />
            <span>ML Insights</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <span className="ml-2">Loading ML predictions...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="w-5 h-5" />
            <span>ML Insights</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              ML predictions unavailable: {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Model Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="w-5 h-5" />
            <span>ML Model Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {modelStatus.map((model, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium capitalize">{model.name.replace('_', ' ')}</div>
                  <div className="text-sm text-gray-500">ML Model</div>
                </div>
                <div className="flex items-center space-x-2">
                  {model.loaded ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <Badge variant={model.loaded ? 'default' : 'destructive'}>
                    {model.loaded ? 'Loaded' : 'Error'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Predictions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>Recent Predictions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {predictions.length > 0 ? (
            <div className="space-y-4">
              {predictions.slice(0, 5).map((prediction, index) => {
                const severity = getPredictionSeverity(prediction);
                const severityColor = getSeverityColor(severity);
                const severityIcon = getSeverityIcon(severity);
                
                return (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        {severityIcon}
                        <span className="font-medium">ML Prediction</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={severityColor}>
                          {severity.toUpperCase()}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {new Date(prediction.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Anomaly Detection */}
                      {prediction.predictions?.anomaly && (
                        <div className="p-3 bg-gray-50 rounded">
                          <div className="text-sm font-medium text-gray-700">Anomaly Detection</div>
                          <div className="text-lg font-semibold">
                            {prediction.predictions.anomaly.is_anomaly ? 'Detected' : 'Normal'}
                          </div>
                          <div className="text-sm text-gray-600">
                            Score: {(prediction.predictions.anomaly.score * 100).toFixed(1)}%
                          </div>
                        </div>
                      )}

                      {/* Bottleneck Prediction */}
                      {prediction.predictions?.bottleneck && (
                        <div className="p-3 bg-gray-50 rounded">
                          <div className="text-sm font-medium text-gray-700">Bottleneck Risk</div>
                          <div className="text-lg font-semibold">
                            {(prediction.predictions.bottleneck.probability * 100).toFixed(1)}%
                          </div>
                          <div className="text-sm text-gray-600">
                            {prediction.predictions.bottleneck.estimated_time || 'Unknown ETA'}
                          </div>
                        </div>
                      )}

                      {/* Performance Prediction */}
                      {prediction.predictions?.performance && (
                        <div className="p-3 bg-gray-50 rounded">
                          <div className="text-sm font-medium text-gray-700">Performance</div>
                          <div className="text-lg font-semibold">
                            {prediction.predictions.performance.predicted_score?.toFixed(1) || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-600 capitalize">
                            {prediction.predictions.performance.trend || 'stable'}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Confidence Score */}
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Overall Confidence</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                              style={{
                                width: `${Math.min(100, Math.max(0, Math.round(prediction.overall_confidence * 100)))}%`
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">
                            {(prediction.overall_confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Brain className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <div>No ML predictions available</div>
              <div className="text-sm">Predictions will appear once the system gathers sufficient data</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MLInsightsPanel;