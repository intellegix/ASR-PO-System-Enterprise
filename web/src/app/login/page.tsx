'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError('An error occurred. Please try again.');
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
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition text-slate-800 placeholder-slate-400"
                placeholder="you@allsurfaceroofing.com"
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
              disabled={loading}
              className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
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
          </form>

          {/* Demo credentials */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-sm text-slate-500 text-center mb-3">Demo Accounts (password: demo123)</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setEmail('owner1@allsurfaceroofing.com');
                  setPassword('demo123');
                }}
                className="p-2 bg-orange-50 hover:bg-orange-100 rounded text-slate-700 transition border border-orange-200"
              >
                O1: CAPEX
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('owner2@allsurfaceroofing.com');
                  setPassword('demo123');
                }}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 transition"
              >
                O2: Repairs
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('owner3@allsurfaceroofing.com');
                  setPassword('demo123');
                }}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 transition"
              >
                O3: Roofing
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('owner4@allsurfaceroofing.com');
                  setPassword('demo123');
                }}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 transition"
              >
                O4: Gen Contract
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('owner5@allsurfaceroofing.com');
                  setPassword('demo123');
                }}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 transition"
              >
                O5: Sub Mgmt
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('owner6@allsurfaceroofing.com');
                  setPassword('demo123');
                }}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 transition"
              >
                O6: Specialty
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('opsmgr@allsurfaceroofing.com');
                  setPassword('demo123');
                }}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 transition"
              >
                Ops Manager
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('accounting@allsurfaceroofing.com');
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
