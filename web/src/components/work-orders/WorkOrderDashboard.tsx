'use client';

import { useState } from 'react';
import { FiCalendar, FiDollarSign, FiUser, FiFileText, FiTool, FiPlay, FiPackage } from 'react-icons/fi';
import WorkOrderCard from './WorkOrderCard';

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

interface WorkOrderDashboardProps {
  workOrders: WorkOrder[];
  onWorkOrderSelect: (workOrderId: string) => void;
  onCreatePO: (workOrderId: string) => void;
}

export default function WorkOrderDashboard({
  workOrders,
  onWorkOrderSelect,
  onCreatePO,
}: WorkOrderDashboardProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'created_at' | 'priority' | 'status' | 'budget'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Sort work orders
  const sortedWorkOrders = [...workOrders].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (sortBy) {
      case 'priority':
        const priorityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
        aValue = priorityOrder[a.priority_level] || 0;
        bValue = priorityOrder[b.priority_level] || 0;
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      case 'budget':
        aValue = a.budget_estimate || 0;
        bValue = b.budget_estimate || 0;
        break;
      default:
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
    }

    if (sortOrder === 'desc') {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    } else {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    }
  });

  const handleSort = (newSortBy: typeof sortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  if (workOrders.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="text-center py-12">
          <FiFileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No work orders</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new work order for your project.
          </p>
          <div className="mt-6">
            <button
              onClick={() => window.location.href = '/work-orders/create'}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FiFileText className="-ml-1 mr-2 h-4 w-4" />
              New Work Order
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Controls */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              {workOrders.length} work order{workOrders.length !== 1 ? 's' : ''}
            </span>

            {/* Sort Controls */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => handleSort(e.target.value as typeof sortBy)}
                className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="created_at">Date Created</option>
                <option value="priority">Priority</option>
                <option value="status">Status</option>
                <option value="budget">Budget</option>
              </select>

              <button
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {sortOrder === 'desc' ? '↓' : '↑'}
              </button>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded text-sm font-medium ${
                viewMode === 'grid'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded text-sm font-medium ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Work Orders Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
          {sortedWorkOrders.map((workOrder) => (
            <WorkOrderCard
              key={workOrder.id}
              workOrder={workOrder}
              onSelect={() => onWorkOrderSelect(workOrder.id)}
              onCreatePO={() => onCreatePO(workOrder.id)}
            />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {sortedWorkOrders.map((workOrder) => (
            <WorkOrderListItem
              key={workOrder.id}
              workOrder={workOrder}
              onSelect={() => onWorkOrderSelect(workOrder.id)}
              onCreatePO={() => onCreatePO(workOrder.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// List view component
interface WorkOrderListItemProps {
  workOrder: WorkOrder;
  onSelect: () => void;
  onCreatePO: () => void;
}

function WorkOrderListItem({ workOrder, onSelect, onCreatePO }: WorkOrderListItemProps) {
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

  return (
    <div className="p-6 hover:bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-4">
            {/* Work Order Info */}
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-medium text-gray-900 truncate">
                  {workOrder.work_order_number}
                </h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(workOrder.priority_level)}`}>
                  {workOrder.priority_level}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(workOrder.status)}`}>
                  {workOrder.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-600 truncate">
                {workOrder.title}
              </p>
              <div className="mt-2 flex items-center space-x-6 text-xs text-gray-500">
                <div className="flex items-center">
                  <FiUser className="mr-1 h-3 w-3" />
                  {workOrder.projects.project_code}
                </div>
                <div className="flex items-center">
                  <FiDollarSign className="mr-1 h-3 w-3" />
                  {workOrder.budget_estimate ? `$${workOrder.budget_estimate.toLocaleString()}` : 'No budget'}
                </div>
                {workOrder.po_count > 0 && (
                  <div className="flex items-center">
                    <FiPackage className="mr-1 h-3 w-3" />
                    {workOrder.po_count} PO{workOrder.po_count !== 1 ? 's' : ''} (${workOrder.total_po_amount.toLocaleString()})
                  </div>
                )}
                {workOrder.estimated_completion_date && (
                  <div className="flex items-center">
                    <FiCalendar className="mr-1 h-3 w-3" />
                    {new Date(workOrder.estimated_completion_date).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onSelect}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View Details
          </button>
          <button
            onClick={onCreatePO}
            className="inline-flex items-center px-3 py-1.5 border border-blue-300 text-xs font-medium rounded text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <FiPlay className="mr-1 h-3 w-3" />
            Create PO
          </button>
        </div>
      </div>
    </div>
  );
}