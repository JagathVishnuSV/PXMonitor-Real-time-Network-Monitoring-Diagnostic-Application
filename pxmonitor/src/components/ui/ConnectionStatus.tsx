import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Wifi, WifiOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const ConnectionStatus = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;

    const checkConnection = async () => {
      try {
        const response = await fetch('http://localhost:3001/health', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          setIsConnected(true);
          setShowAlert(false);
          retryCount = 0; // Reset retry count on success
        } else {
          throw new Error('Server returned error');
        }
      } catch (error) {
        retryCount++;
        setIsConnected(false);
        
        // Only show alert after multiple failed attempts
        if (retryCount >= maxRetries) {
          setShowAlert(true);
        }
      } finally {
        setLastChecked(new Date());
      }
    };

    // Initial check
    checkConnection();
    
    // Check every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (!showAlert && isConnected) {
    return null; // Don't show anything when connected
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-sm">
      {showAlert && !isConnected && (
        <Alert className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
          <WifiOff className="h-4 w-4 text-red-600 dark:text-red-400" />
          <AlertDescription className="text-red-800 dark:text-red-200">
            <strong>Backend Disconnected</strong>
            <br />
            Please start the backend server using <code className="bg-red-100 dark:bg-red-800/30 px-1 rounded">start-admin.bat</code>
            {lastChecked && (
              <div className="text-xs mt-1 text-red-600 dark:text-red-400">
                Last checked: {lastChecked.toLocaleTimeString()}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
      
      {isConnected && (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">
          <CheckCircle className="h-4 w-4" />
          <span>Backend Connected</span>
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;