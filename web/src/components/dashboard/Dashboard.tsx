'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useState } from 'react';
import { getRoleDisplayName } from '@/lib/auth/permissions';

// Icons
const MenuIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const DocumentIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ClipboardIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);

const TruckIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
);

const ChartIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const ArchiveIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const LogoutIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const XIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

type UserRole = 'MAJORITY_OWNER' | 'DIVISION_LEADER' | 'OPERATIONS_MANAGER' | 'ACCOUNTING';

export default function Dashboard() {
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const user = session?.user;
  const role = (user?.role || 'DIVISION_LEADER') as UserRole;

  // Demo stats - in production these would come from the API
  const stats = {
    pendingApproval: 3,
    activePOs: 12,
    thisMonthSpend: 45230,
    openWorkOrders: 8,
  };

  // Demo recent POs
  const recentPOs = [
    { id: '1', poNumber: '01CP0234-1ab12', vendor: 'ABC Roofing Supply', amount: 2450, status: 'Draft', division: 'CAPEX' },
    { id: '2', poNumber: '02RF0187-2hd56', vendor: 'Home Depot Pro', amount: 890, status: 'Approved', division: 'Roofing' },
    { id: '3', poNumber: '01CP0235-1bb23', vendor: 'Beacon Building', amount: 5680, status: 'Pending', division: 'CAPEX' },
    { id: '4', poNumber: '03GC0122-1ls89', vendor: 'Local Sub LLC', amount: 12500, status: 'Issued', division: 'Gen Contracting' },
  ];

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      Draft: 'bg-gray-100 text-gray-700',
      Pending: 'bg-amber-100 text-amber-700',
      Approved: 'bg-green-100 text-green-700',
      Issued: 'bg-blue-100 text-blue-700',
      Received: 'bg-purple-100 text-purple-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                <DocumentIcon />
              </div>
              <div>
                <h1 className="font-bold text-white">ASR PO System</h1>
                <p className="text-xs text-slate-400">All Surface Roofing</p>
              </div>
            </div>
            <button className="lg:hidden text-slate-400" onClick={() => setSidebarOpen(false)}>
              <XIcon />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            <Link
              href="/"
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-800 text-white"
            >
              <ChartIcon />
              <span>Dashboard</span>
            </Link>
            <Link
              href="/po"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <DocumentIcon />
              <span>Purchase Orders</span>
            </Link>
            <Link
              href="/approvals"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <CheckCircleIcon />
              <span>Approvals</span>
              {stats.pendingApproval > 0 && (
                <span className="ml-auto bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {stats.pendingApproval}
                </span>
              )}
            </Link>
            <Link
              href="/work-orders"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <ClipboardIcon />
              <span>Work Orders</span>
            </Link>
            <Link
              href="/vendors"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <TruckIcon />
              <span>Vendors</span>
            </Link>
            <Link
              href="/invoice-archive"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <ArchiveIcon />
              <span>Invoice Archive</span>
            </Link>
            <Link
              href="/reports"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <ChartIcon />
              <span>Reports</span>
            </Link>
          </nav>

          {/* User section */}
          <div className="px-4 py-4 border-t border-slate-700">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
                <UserIcon />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-slate-400">{getRoleDisplayName(role)}</p>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <LogoutIcon />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 lg:hidden">
          <div className="flex items-center justify-between px-4 py-4">
            <button onClick={() => setSidebarOpen(true)} className="text-slate-600">
              <MenuIcon />
            </button>
            <h1 className="font-semibold text-slate-900">Dashboard</h1>
            <div className="w-6" /> {/* Spacer */}
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          {/* Welcome banner */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 lg:p-8 text-white mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold mb-1">Welcome back, {user?.name?.split(' ')[0] || 'User'}!</h2>
                <p className="text-orange-100">
                  {user?.divisionName || 'All Divisions'} &bull; {getRoleDisplayName(role)}
                </p>
              </div>
              <Link
                href="/po/create"
                className="inline-flex items-center justify-center gap-2 bg-white text-orange-600 font-semibold px-6 py-3 rounded-xl hover:bg-orange-50 transition"
              >
                <PlusIcon />
                <span>Create New PO</span>
              </Link>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Link href="/approvals" className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition cursor-pointer">
              <p className="text-sm text-slate-500 mb-1">Pending Approval</p>
              <p className="text-2xl font-bold text-slate-900">{stats.pendingApproval}</p>
              <p className="text-xs text-amber-600 mt-1">Needs action</p>
            </Link>
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <p className="text-sm text-slate-500 mb-1">Active POs</p>
              <p className="text-2xl font-bold text-slate-900">{stats.activePOs}</p>
              <p className="text-xs text-green-600 mt-1">In progress</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <p className="text-sm text-slate-500 mb-1">This Month</p>
              <p className="text-2xl font-bold text-slate-900">${stats.thisMonthSpend.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">Total spend</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <p className="text-sm text-slate-500 mb-1">Work Orders</p>
              <p className="text-2xl font-bold text-slate-900">{stats.openWorkOrders}</p>
              <p className="text-xs text-blue-600 mt-1">Open</p>
            </div>
          </div>

          {/* Recent POs */}
          <div className="bg-white rounded-xl shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Recent Purchase Orders</h3>
              <Link href="/po" className="text-sm text-orange-600 hover:text-orange-700">
                View all
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {recentPOs.map((po) => (
                <div key={po.id} className="px-6 py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 font-mono text-sm">{po.poNumber}</p>
                    <p className="text-sm text-slate-500 truncate">{po.vendor}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">${po.amount.toLocaleString()}</p>
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${getStatusColor(po.status)}`}>
                      {po.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
