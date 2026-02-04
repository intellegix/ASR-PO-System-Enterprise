'use client';

import { useAuth } from '@/contexts/AuthContext';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { RecentPurchaseOrders } from '@/components/dashboard/RecentPurchaseOrders';
import { ConnectionStatus, DetailedConnectionStatus } from '@/components/common/ConnectionStatus';
import { useDashboardStats } from '@/hooks/api/useReports';

function DemoModeNotice() {
  const { switchToBackend } = useAuth();

  const handleTryBackend = async () => {
    const result = await switchToBackend('intellegix', 'Devops$@2026');
    if (!result.success) {
      alert('Backend connection failed: ' + result.error);
    }
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
      <div className="flex items-start space-x-3">
        <svg className="w-6 h-6 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 18.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800 mb-1">Demo Mode Active</h3>
          <p className="text-sm text-yellow-700 mb-3">
            You're currently using demo data. Connect to the backend for full functionality.
          </p>
          <div className="flex space-x-2">
            <button
              onClick={handleTryBackend}
              className="text-sm bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 transition-colors"
            >
              Connect to Backend
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveDashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name}
        </h1>
        <ConnectionStatus className="hidden md:flex" />
      </div>

      {/* Dashboard Statistics */}
      <DashboardStats />

      {/* Two-column layout for recent data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentPurchaseOrders limit={8} />
        <DetailedConnectionStatus />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, authMode, isAuthenticated, backendAvailable } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">Please log in to access the dashboard.</p>
          <a
            href="/login"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  const isBackendConnected = authMode === 'backend' && backendAvailable;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Mobile connection status */}
        <div className="md:hidden mb-4">
          <ConnectionStatus />
        </div>

        {/* Demo mode notice */}
        {!isBackendConnected && <DemoModeNotice />}

        {/* Main dashboard content */}
        {isBackendConnected ? <LiveDashboard /> : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">
                ASR Purchase Order System
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Demo Mode
              </span>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <div className="text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">System Ready for Backend Connection</h2>
                <p className="text-gray-600 mb-4">
                  The frontend is deployed and ready. Connect to your local backend via ngrok for full functionality.
                </p>
                <div className="max-w-md mx-auto text-left bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Current Configuration:</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• User: {user?.name} ({user?.role})</li>
                    <li>• Auth Mode: {authMode || 'None'}</li>
                    <li>• Backend: {backendAvailable ? 'Available' : 'Offline'}</li>
                    <li>• API URL: {process.env.NEXT_PUBLIC_API_URL}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}