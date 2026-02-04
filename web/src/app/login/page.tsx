'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, backendAvailable, isLoading: authLoading } = useAuth();
  const [identifier, setIdentifier] = useState(''); // Can be username or email
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Use the unified auth context which handles both demo and backend auth
      const result = await login(identifier, password, backendAvailable);

      if (result.success) {
        console.log('✅ Login successful, redirecting to dashboard...');
        router.push(callbackUrl);
        router.refresh();
      } else {
        setError(result.error || 'Invalid username/email or password');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500 rounded-xl mb-4">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">ASR PO System</h1>
          <p className="text-slate-400 mt-1">All Surface Roofing & Waterproofing</p>
          <div className="mt-2 flex items-center justify-center space-x-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${backendAvailable ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className={backendAvailable ? 'text-green-400' : 'text-yellow-400'}>
              {backendAvailable ? 'Backend Connected' : 'Demo Mode Available'}
            </span>
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">Sign In</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-slate-700 mb-1">
                Username or Email
              </label>
              <input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition text-slate-800 placeholder-slate-400"
                placeholder="owner1 or owner1@allsurfaceroofing.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition text-slate-800 placeholder-slate-400"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading || authLoading}
              className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading || authLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>

            {/* Admin Quick Login */}
            <button
              type="button"
              onClick={() => {
                setIdentifier('intellegix');
                setPassword('Devops$@2026');
              }}
              className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition"
            >
              🔧 Admin Login (Austin Kidwell)
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-sm text-slate-500 text-center mb-3">Demo Accounts (password: demo123) - Click or type username only</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setIdentifier('owner1@allsurfaceroofing.com');
                  setPassword('demo123');
                }}
                className="p-2 bg-orange-50 hover:bg-orange-100 rounded text-slate-700 transition border border-orange-200"
              >
                O1: CAPEX
              </button>
              <button
                type="button"
                onClick={() => {
                  setIdentifier('owner2@allsurfaceroofing.com');
                  setPassword('demo123');
                }}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 transition"
              >
                O2: Repairs
              </button>
              <button
                type="button"
                onClick={() => {
                  setIdentifier('owner3@allsurfaceroofing.com');
                  setPassword('demo123');
                }}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 transition"
              >
                O3: Roofing
              </button>
              <button
                type="button"
                onClick={() => {
                  setIdentifier('owner4@allsurfaceroofing.com');
                  setPassword('demo123');
                }}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 transition"
              >
                O4: Gen Contract
              </button>
              <button
                type="button"
                onClick={() => {
                  setIdentifier('owner5@allsurfaceroofing.com');
                  setPassword('demo123');
                }}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 transition"
              >
                O5: Sub Mgmt
              </button>
              <button
                type="button"
                onClick={() => {
                  setIdentifier('owner6@allsurfaceroofing.com');
                  setPassword('demo123');
                }}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 transition"
              >
                O6: Specialty
              </button>
              <button
                type="button"
                onClick={() => {
                  setIdentifier('opsmgr@allsurfaceroofing.com');
                  setPassword('demo123');
                }}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 transition"
              >
                Ops Manager
              </button>
              <button
                type="button"
                onClick={() => {
                  setIdentifier('accounting@allsurfaceroofing.com');
                  setPassword('demo123');
                }}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 transition"
              >
                Accounting
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
