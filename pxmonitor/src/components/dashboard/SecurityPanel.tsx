import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, Eye, Ban, Globe, Wifi } from 'lucide-react';

interface SecurityEvent {
  timestamp: string;
  risk_score: number;
  threats_detected: number;
  critical_threats: number;
  suspicious_connections: number;
}

interface SecurityReport {
  recent_events: SecurityEvent[];
  blocked_connections: string[];
  threat_patterns: Record<string, any>;
  alert_thresholds: Record<string, number>;
}

const SecurityPanel = () => {
  const [securityReport, setSecurityReport] = useState<SecurityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSecurityData = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/agents/security/report');
        if (!response.ok) {
          throw new Error('Failed to fetch security report');
        }
        
        const data = await response.json();
        setSecurityReport(data);
      } catch (error) {
        console.error('Error fetching security data:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchSecurityData();
    const interval = setInterval(fetchSecurityData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getRiskLevelColor = (riskScore: number) => {
    if (riskScore >= 70) return 'bg-red-100 text-red-800 border-red-200';
    if (riskScore >= 40) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (riskScore >= 20) return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  const getRiskLevel = (riskScore: number) => {
    if (riskScore >= 70) return 'CRITICAL';
    if (riskScore >= 40) return 'HIGH';
    if (riskScore >= 20) return 'MEDIUM';
    return 'LOW';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>Security Monitoring</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <span className="ml-2">Loading security data...</span>
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
            <Shield className="w-5 h-5" />
            <span>Security Monitoring</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Security monitoring unavailable: {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const latestEvent = securityReport?.recent_events?.[0];
  const currentRiskScore = latestEvent?.risk_score || 0;

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>Security Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {currentRiskScore.toFixed(0)}
              </div>
              <div className="text-sm font-medium">Risk Score</div>
              <Badge className={getRiskLevelColor(currentRiskScore)}>
                {getRiskLevel(currentRiskScore)}
              </Badge>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {latestEvent?.critical_threats || 0}
              </div>
              <div className="text-sm font-medium">Critical Threats</div>
              <div className="text-xs text-gray-500">Detected</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {latestEvent?.suspicious_connections || 0}
              </div>
              <div className="text-sm font-medium">Suspicious</div>
              <div className="text-xs text-gray-500">Connections</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {securityReport?.blocked_connections?.length || 0}
              </div>
              <div className="text-sm font-medium">Blocked</div>
              <div className="text-xs text-gray-500">IP Addresses</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Security Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Eye className="w-5 h-5" />
            <span>Recent Security Events</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {securityReport?.recent_events && securityReport.recent_events.length > 0 ? (
            <div className="space-y-3">
              {securityReport.recent_events.slice(0, 5).map((event, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {event.critical_threats > 0 ? (
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                      ) : event.suspicious_connections > 0 ? (
                        <Eye className="w-5 h-5 text-yellow-500" />
                      ) : (
                        <Shield className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">
                        {event.critical_threats > 0 
                          ? `${event.critical_threats} Critical Threat${event.critical_threats > 1 ? 's' : ''}`
                          : event.suspicious_connections > 0
                          ? `${event.suspicious_connections} Suspicious Connection${event.suspicious_connections > 1 ? 's' : ''}`
                          : 'Normal Activity'
                        }
                      </div>
                      <div className="text-sm text-gray-600">
                        Risk Score: {event.risk_score.toFixed(0)}/100
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={getRiskLevelColor(event.risk_score)}>
                      {getRiskLevel(event.risk_score)}
                    </Badge>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <div>No recent security events</div>
              <div className="text-sm">Your network appears to be secure</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Blocked Connections */}
      {securityReport?.blocked_connections && securityReport.blocked_connections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Ban className="w-5 h-5" />
              <span>Blocked IP Addresses</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {securityReport.blocked_connections.slice(0, 9).map((ip, index) => (
                <div key={index} className="flex items-center space-x-2 p-2 bg-red-50 rounded border border-red-200">
                  <Globe className="w-4 h-4 text-red-500" />
                  <span className="font-mono text-sm">{ip}</span>
                  <Badge variant="destructive" className="ml-auto">
                    Blocked
                  </Badge>
                </div>
              ))}
            </div>
            {securityReport.blocked_connections.length > 9 && (
              <div className="text-center mt-4">
                <Button variant="outline" size="sm">
                  View All ({securityReport.blocked_connections.length})
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Threat Patterns */}
      {securityReport?.threat_patterns && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Wifi className="w-5 h-5" />
              <span>Threat Patterns</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Suspicious Ports */}
              {securityReport.threat_patterns.ports && (
                <div>
                  <h4 className="font-medium mb-3">Monitored Ports</h4>
                  <div className="space-y-2">
                    {securityReport.threat_patterns.ports.slice(0, 5).map((port: number, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="font-mono">{port}</span>
                        <Badge variant="outline">Monitored</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Alert Thresholds */}
              {securityReport.alert_thresholds && (
                <div>
                  <h4 className="font-medium mb-3">Alert Thresholds</h4>
                  <div className="space-y-2">
                    {Object.entries(securityReport.alert_thresholds).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span className="font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SecurityPanel;