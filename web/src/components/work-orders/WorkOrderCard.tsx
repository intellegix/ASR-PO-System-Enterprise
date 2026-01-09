'use client';

import { FiCalendar, FiDollarSign, FiUser, FiTool, FiPlay, FiPackage, FiEdit } from 'react-icons/fi';

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

interface WorkOrderCardProps {
  workOrder: WorkOrder;
  onSelect: () => void;
  onCreatePO: () => void;
}

export default function WorkOrderCard({ workOrder, onSelect, onCreatePO }: WorkOrderCardProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'text-red-600 bg-red-100 border-red-200';
      case 'High': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'Medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'Low': return 'text-green-600 bg-green-100 border-green-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const budgetVariance = workOrder.budget_estimate && workOrder.total_po_amount
    ? ((workOrder.total_po_amount / workOrder.budget_estimate) * 100) - 100
    : null;

  return (
    <div className={`bg-white rounded-lg shadow-md border-2 hover:shadow-lg transition-all duration-200 cursor-pointer ${getPriorityColor(workOrder.priority_level).includes('border') ? getPriorityColor(workOrder.priority_level) : 'border-gray-200'}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100" onClick={onSelect}>
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {workOrder.work_order_number}
            </h3>
            <p className="text-sm text-gray-600 line-clamp-2">
              {workOrder.title}
            </p>
          </div>
          <div className="flex flex-col items-end space-y-1">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(workOrder.priority_level)}`}>
              {workOrder.priority_level}
            </span>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(workOrder.status)}`}>
              {workOrder.status}
            </span>
          </div>
        </div>

        {/* Project Info */}
        <div className="flex items-center text-sm text-gray-500 mb-2">
          <FiUser className="mr-1 h-4 w-4" />
          <span className="font-medium">{workOrder.projects.project_code}</span>
          <span className="mx-2">•</span>
          <span className="truncate">{workOrder.projects.project_name}</span>
        </div>

        {/* Work Order Type */}
        {workOrder.work_order_type && (
          <div className="flex items-center text-sm text-gray-500 mb-2">
            <FiTool className="mr-1 h-4 w-4" />
            <span>{workOrder.work_order_type}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4" onClick={onSelect}>
        {/* Description */}
        {workOrder.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-3">
            {workOrder.description}
          </p>
        )}

        {/* Budget Information */}
        {workOrder.budget_estimate && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-500">Budget Estimate:</span>
              <span className="font-semibold text-gray-900">
                ${workOrder.budget_estimate.toLocaleString()}
              </span>
            </div>

            {workOrder.po_count > 0 && (
              <>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-500">PO Amount:</span>
                  <span className="font-semibold text-gray-900">
                    ${workOrder.total_po_amount.toLocaleString()}
                  </span>
                </div>

                {budgetVariance !== null && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Budget Variance:</span>
                    <span className={`font-semibold ${
                      budgetVariance > 10 ? 'text-red-600' :
                      budgetVariance > 0 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {budgetVariance > 0 ? '+' : ''}{budgetVariance.toFixed(1)}%
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* PO Count */}
        {workOrder.po_count > 0 && (
          <div className="flex items-center text-sm text-gray-500 mb-3">
            <FiPackage className="mr-1 h-4 w-4" />
            <span>
              {workOrder.po_count} Purchase Order{workOrder.po_count !== 1 ? 's' : ''} Created
            </span>
          </div>
        )}

        {/* Timeline */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-500">
            <FiCalendar className="mr-1 h-4 w-4" />
            <span>Created: {formatDate(workOrder.created_at)}</span>
          </div>

          {workOrder.estimated_completion_date && (
            <div className="flex items-center text-sm text-gray-500">
              <FiCalendar className="mr-1 h-4 w-4" />
              <span>
                Target: {formatDate(workOrder.estimated_completion_date)}
                {new Date(workOrder.estimated_completion_date) < new Date() &&
                 workOrder.status !== 'Completed' && (
                  <span className="ml-2 text-red-600 font-medium">(Overdue)</span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Division */}
        <div className="text-xs text-gray-400 mb-4">
          Division: {workOrder.divisions.division_code} - {workOrder.divisions.division_name}
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 space-y-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCreatePO();
          }}
          disabled={workOrder.status === 'Completed' || workOrder.status === 'Cancelled'}
          className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          <FiPlay className="mr-2 h-4 w-4" />
          Create Purchase Order
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <FiEdit className="mr-2 h-4 w-4" />
          View Details
        </button>
      </div>
    </div>
  );
}