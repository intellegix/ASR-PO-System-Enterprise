'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { FiPlus, FiSearch, FiFilter, FiCalendar, FiBriefcase } from 'react-icons/fi';
import WorkOrderDashboard from '../../components/work-orders/WorkOrderDashboard';

interface WorkOrder {
  id: string;
  work_order_number: string;
  title: string;
  description?: string;
  priority_level: 'Low' | 'Medium' | 'High' | 'Critical';
  work_order_type?: string;
  status: 'Pending' | 'InProgress' | 'Completed' | 'OnHold' | 'Cancelled';
  budget_estimate?: number;
  estimated_completion_date?: string;
  po_count: number;
  total_po_amount: number;
  projects: {
    id: string;
    project_name: string;
    project_code: string;
  };
  divisions: {
    id: string;
    division_name: string;
    division_code: string;
  };
  created_at: string;
}

interface DashboardStats {
  total: number;
  pending: number;
  inProgress: number;
  readyForPO: number;
  completed: number;
  totalBudget: number;
  totalActualPO: number;
}

export default function WorkOrdersPage() {
  const { data: session, status } = useSession();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [filteredWorkOrders, setFilteredWorkOrders] = useState<WorkOrder[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    pending: 0,
    inProgress: 0,
    readyForPO: 0,
    completed: 0,
    totalBudget: 0,
    totalActualPO: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [divisionFilter, setDivisionFilter] = useState<string>('all');

  // Authorization check
  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      redirect('/login');
    }

    // Check if user has permission to view work orders
    const userRole = session?.user?.role;
    const hasPermission = ['MAJORITY_OWNER', 'DIVISION_LEADER', 'OPERATIONS_MANAGER', 'ACCOUNTING'].includes(userRole || '');

    if (!hasPermission) {
      toast.error('You do not have permission to access work orders');
      redirect('/');
    }
  }, [session, status]);

  // Fetch work orders
  useEffect(() => {
    const fetchWorkOrders = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/work-orders');

        if (!response.ok) {
          throw new Error('Failed to fetch work orders');
        }

        const data = await response.json();
        setWorkOrders(data.workOrders || []);
        calculateStats(data.workOrders || []);
      } catch (error) {
        console.error('Error fetching work orders:', error);
        toast.error('Failed to load work orders');
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchWorkOrders();
    }
  }, [session]);

  // Apply filters
  useEffect(() => {
    let filtered = [...workOrders];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(wo =>
        wo.work_order_number.toLowerCase().includes(search) ||
        wo.title.toLowerCase().includes(search) ||
        wo.description?.toLowerCase().includes(search) ||
        wo.projects.project_name.toLowerCase().includes(search) ||
        wo.projects.project_code.toLowerCase().includes(search)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(wo => wo.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(wo => wo.priority_level === priorityFilter);
    }

    // Division filter
    if (divisionFilter !== 'all') {
      filtered = filtered.filter(wo => wo.divisions.id === divisionFilter);
    }

    setFilteredWorkOrders(filtered);
  }, [workOrders, searchTerm, statusFilter, priorityFilter, divisionFilter]);

  const calculateStats = (data: WorkOrder[]) => {
    const stats = data.reduce((acc, wo) => {
      acc.total++;

      switch (wo.status) {
        case 'Pending':
          acc.pending++;
          break;
        case 'InProgress':
          acc.inProgress++;
          break;
        case 'Completed':
          acc.completed++;
          break;
        default:
          break;
      }

      acc.totalBudget += wo.budget_estimate || 0;
      acc.totalActualPO += wo.total_po_amount || 0;

      return acc;
    }, {
      total: 0,
      pending: 0,
      inProgress: 0,
      readyForPO: 0,
      completed: 0,
      totalBudget: 0,
      totalActualPO: 0,
    });

    setStats(stats);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'text-red-600 bg-red-100';
      case 'High': return 'text-orange-600 bg-orange-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'Low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'text-green-600 bg-green-100';
      case 'InProgress': return 'text-blue-600 bg-blue-100';
      case 'Pending': return 'text-yellow-600 bg-yellow-100';
      case 'OnHold': return 'text-red-600 bg-red-100';
      case 'Cancelled': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading work orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="md:flex md:items-center md:justify-between">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                  Work Order Management
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Centralized work order creation and job-based PO generation
                </p>
              </div>
              <div className="mt-4 flex md:mt-0 md:ml-4">
                <button
                  onClick={() => window.location.href = '/work-orders/create'}
                  className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <FiPlus className="-ml-1 mr-2 h-4 w-4" />
                  New Work Order
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FiBriefcase className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Work Orders
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.total}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-6 w-6 rounded-full bg-yellow-100 flex items-center justify-center">
                    <div className="h-2 w-2 bg-yellow-600 rounded-full"></div>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Pending
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.pending}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                    <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      In Progress
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.inProgress}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                    <div className="h-2 w-2 bg-green-600 rounded-full"></div>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Completed
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.completed}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiSearch className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search work orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="all">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="InProgress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="OnHold">On Hold</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="all">All Priorities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              {/* Clear Filters */}
              <div>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setPriorityFilter('all');
                    setDivisionFilter('all');
                  }}
                  className="w-full inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <FiFilter className="-ml-1 mr-2 h-4 w-4" />
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Work Orders List */}
        <WorkOrderDashboard
          workOrders={filteredWorkOrders}
          onWorkOrderSelect={(workOrderId) => {
            window.location.href = `/work-orders/${workOrderId}`;
          }}
          onCreatePO={(workOrderId) => {
            window.location.href = `/po/create?workOrderId=${workOrderId}`;
          }}
        />
      </div>
    </div>
  );
}