'use client';

import { useState, useEffect } from 'react';
import { checkBackendHealth } from '@/lib/api-client';

interface ConnectionStatusProps {
  className?: string;
}

export function ConnectionStatus({ className = '' }: ConnectionStatusProps) {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());

  const checkConnection = async () => {
    try {
      const healthy = await checkBackendHealth();
      setIsConnected(healthy);
      setLastCheck(new Date());
    } catch (_error) {
      setIsConnected(false);
      setLastCheck(new Date());
    }
  };

  useEffect(() => {
    // Initial check
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkConnection();

    // Check every 30 seconds
    const interval = setInterval(checkConnection, 30000);

    return () => clearInterval(interval);
  }, []);

  if (isConnected === null) {
    return (
      <div className={`flex items-center text-gray-500 ${className}`}>
        <div className="w-2 h-2 rounded-full bg-gray-400 mr-2 animate-pulse" />
        <span className="text-sm">Checking backend...</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center ${className}`}>
      <div
        className={`w-2 h-2 rounded-full mr-2 ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        }`}
      />
      <span
        className={`text-sm ${
          isConnected ? 'text-green-600' : 'text-red-600'
        }`}
      >
        {isConnected ? 'Backend Connected' : 'Backend Offline'}
      </span>
      <span className="text-xs text-gray-400 ml-2">
        ({lastCheck.toLocaleTimeString()})
      </span>
    </div>
  );
}

export function DetailedConnectionStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [apiUrl, setApiUrl] = useState<string>('');
  const [lastCheck, setLastCheck] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  const checkConnection = async () => {
    try {
      const healthy = await checkBackendHealth();
      setIsConnected(healthy);
      setError(null);
    } catch (error) {
      setIsConnected(false);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLastCheck(new Date());
    }
  };

  useEffect(() => {
    // Get API URL from configuration
    const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    setApiUrl(url);

    // Initial check
    checkConnection();

    // Check every 30 seconds
    const interval = setInterval(checkConnection, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <h3 className="text-lg font-semibold mb-3">Backend Connection Status</h3>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status:</span>
          <div className="flex items-center">
            <div
              className={`w-3 h-3 rounded-full mr-2 ${
                isConnected === null
                  ? 'bg-gray-400 animate-pulse'
                  : isConnected
                  ? 'bg-green-500'
                  : 'bg-red-500'
              }`}
            />
            <span
              className={`text-sm font-medium ${
                isConnected === null
                  ? 'text-gray-500'
                  : isConnected
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {isConnected === null
                ? 'Checking...'
                : isConnected
                ? 'Connected'
                : 'Disconnected'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">API URL:</span>
          <span className="text-sm text-gray-600 font-mono">{apiUrl}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Last Check:</span>
          <span className="text-sm text-gray-600">
            {lastCheck.toLocaleString()}
          </span>
        </div>

        {error && (
          <div className="flex items-start justify-between">
            <span className="text-sm font-medium">Error:</span>
            <span className="text-sm text-red-600 text-right flex-1 ml-2">
              {error}
            </span>
          </div>
        )}

        <div className="pt-2">
          <button
            onClick={checkConnection}
            className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors"
            disabled={isConnected === null}
          >
            Refresh Status
          </button>
        </div>
      </div>
    </div>
  );
}