import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings, Save, RotateCcw, AlertTriangle, CheckCircle } from 'lucide-react';

interface AgentConfig {
  enabled: boolean;
  cooldownPeriod?: number;
  thresholds?: Record<string, number>;
  [key: string]: any;
}

interface AgentConfigPanelProps {
  agentName: string;
  currentConfig?: AgentConfig;
  onConfigChange?: (agentName: string, config: AgentConfig) => void;
}

const AgentConfigPanel: React.FC<AgentConfigPanelProps> = ({ 
  agentName, 
  currentConfig = { enabled: true },
  onConfigChange 
}) => {
  const [config, setConfig] = useState<AgentConfig>(currentConfig);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleConfigUpdate = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
  };

  const handleThresholdUpdate = (thresholdKey: string, value: number) => {
    const newThresholds = { ...config.thresholds, [thresholdKey]: value };
    const newConfig = { ...config, thresholds: newThresholds };
    setConfig(newConfig);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus('idle');

    try {
      const response = await fetch(`http://localhost:3001/api/agents/${agentName}/configure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }

      setSaveStatus('success');
      if (onConfigChange) {
        onConfigChange(agentName, config);
      }
    } catch (error) {
      console.error(`Error saving config for ${agentName}:`, error);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(currentConfig);
    setSaveStatus('idle');
  };

  const renderAgentSpecificConfig = () => {
    switch (agentName) {
      case 'NetworkOptimization':
        return (
          <div className="space-y-4">
            <div>
              <Label>Latency Threshold (ms)</Label>
              <Slider
                value={[config.thresholds?.latency || 100]}
                onValueChange={([value]) => handleThresholdUpdate('latency', value)}
                max={500}
                min={10}
                step={10}
                className="mt-2"
              />
              <div className="text-sm text-gray-500 mt-1">
                Current: {config.thresholds?.latency || 100}ms
              </div>
            </div>
            <div>
              <Label>Packet Loss Threshold (%)</Label>
              <Slider
                value={[(config.thresholds?.packet_loss || 0.05) * 100]}
                onValueChange={([value]) => handleThresholdUpdate('packet_loss', value / 100)}
                max={10}
                min={0.1}
                step={0.1}
                className="mt-2"
              />
              <div className="text-sm text-gray-500 mt-1">
                Current: {((config.thresholds?.packet_loss || 0.05) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        );

      case 'TrafficPrioritization':
        return (
          <div className="space-y-4">
            <div>
              <Label>Gaming Mode Priority</Label>
              <Switch
                checked={config.enableGamingMode || false}
                onCheckedChange={(checked) => handleConfigUpdate('enableGamingMode', checked)}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Work Hours Start</Label>
              <Input
                type="time"
                value={config.workHoursStart || '09:00'}
                onChange={(e) => handleConfigUpdate('workHoursStart', e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Work Hours End</Label>
              <Input
                type="time"
                value={config.workHoursEnd || '17:00'}
                onChange={(e) => handleConfigUpdate('workHoursEnd', e.target.value)}
                className="mt-2"
              />
            </div>
          </div>
        );

      case 'SecurityMonitoring':
        return (
          <div className="space-y-4">
            <div>
              <Label>Suspicious Connection Threshold</Label>
              <Slider
                value={[config.thresholds?.suspiciousConnections || 5]}
                onValueChange={([value]) => handleThresholdUpdate('suspiciousConnections', value)}
                max={20}
                min={1}
                step={1}
                className="mt-2"
              />
              <div className="text-sm text-gray-500 mt-1">
                Current: {config.thresholds?.suspiciousConnections || 5} connections
              </div>
            </div>
            <div>
              <Label>Auto-block Threats</Label>
              <Switch
                checked={config.autoBlockThreats || false}
                onCheckedChange={(checked) => handleConfigUpdate('autoBlockThreats', checked)}
                className="mt-2"
              />
            </div>
          </div>
        );

      case 'MLPredictive':
        return (
          <div className="space-y-4">
            <div>
              <Label>Anomaly Detection Threshold</Label>
              <Slider
                value={[(config.thresholds?.anomaly_score || 0.7) * 100]}
                onValueChange={([value]) => handleThresholdUpdate('anomaly_score', value / 100)}
                max={100}
                min={10}
                step={5}
                className="mt-2"
              />
              <div className="text-sm text-gray-500 mt-1">
                Current: {((config.thresholds?.anomaly_score || 0.7) * 100).toFixed(0)}%
              </div>
            </div>
            <div>
              <Label>Prediction Confidence Threshold</Label>
              <Slider
                value={[(config.thresholds?.prediction_confidence || 0.5) * 100]}
                onValueChange={([value]) => handleThresholdUpdate('prediction_confidence', value / 100)}
                max={100}
                min={10}
                step={5}
                className="mt-2"
              />
              <div className="text-sm text-gray-500 mt-1">
                Current: {((config.thresholds?.prediction_confidence || 0.5) * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-4 text-gray-500">
            No specific configuration options available for this agent
          </div>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="w-5 h-5" />
          <span>{agentName.replace(/([A-Z])/g, ' $1').trim()} Configuration</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Configuration */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Enable Agent</Label>
              <div className="text-sm text-gray-500">
                Turn this agent on or off
              </div>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(checked) => handleConfigUpdate('enabled', checked)}
            />
          </div>

          <div>
            <Label>Cooldown Period (seconds)</Label>
            <Input
              type="number"
              value={Math.floor((config.cooldownPeriod || 60000) / 1000)}
              onChange={(e) => handleConfigUpdate('cooldownPeriod', parseInt(e.target.value) * 1000)}
              min={10}
              max={300}
              className="mt-2"
            />
            <div className="text-sm text-gray-500 mt-1">
              Minimum time between agent activations
            </div>
          </div>
        </div>

        {/* Agent-specific Configuration */}
        <div>
          <h4 className="font-medium mb-3">Agent-Specific Settings</h4>
          {renderAgentSpecificConfig()}
        </div>

        {/* Save Status */}
        {saveStatus === 'success' && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Configuration saved successfully
            </AlertDescription>
          </Alert>
        )}

        {saveStatus === 'error' && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Failed to save configuration. Please try again.
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4 border-t">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={handleReset}
            className="flex items-center space-x-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AgentConfigPanel;