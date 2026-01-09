'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { FiArrowLeft, FiSave, FiFileText, FiCalendar } from 'react-icons/fi';
import WorkOrderCreationForm from '../../../components/work-orders/WorkOrderCreationForm';

interface Project {
  id: string;
  project_name: string;
  project_code: string;
  customer_id?: string;
  budget_total?: number;
  primary_division_id?: string;
}

interface Division {
  id: string;
  division_name: string;
  division_code: string;
}

export default function CreateWorkOrderPage() {
  const { data: session, status } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Authorization check
  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      redirect('/login');
    }

    // Check if user has permission to create work orders
    const userRole = session?.user?.role;
    const canCreateWorkOrders = ['MAJORITY_OWNER', 'DIVISION_LEADER', 'OPERATIONS_MANAGER'].includes(userRole || '');

    if (!canCreateWorkOrders) {
      toast.error('You do not have permission to create work orders');
      redirect('/work-orders');
    }
  }, [session, status]);

  // Fetch projects and divisions
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch projects and divisions in parallel
        const [projectsResponse, divisionsResponse] = await Promise.all([
          fetch('/api/projects'),
          fetch('/api/divisions'),
        ]);

        if (!projectsResponse.ok) {
          throw new Error('Failed to fetch projects');
        }

        if (!divisionsResponse.ok) {
          throw new Error('Failed to fetch divisions');
        }

        const projectsData = await projectsResponse.json();
        const divisionsData = await divisionsResponse.json();

        setProjects(projectsData.projects || []);
        setDivisions(divisionsData.divisions || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load form data');
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchData();
    }
  }, [session]);

  const handleSave = async (workOrderData: any) => {
    try {
      setSaving(true);

      const response = await fetch('/api/work-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workOrderData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create work order');
      }

      const result = await response.json();

      toast.success('Work order created successfully!');

      // Redirect to the new work order detail page
      window.location.href = `/work-orders/${result.workOrder.id}`;

    } catch (error) {
      console.error('Error creating work order:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create work order');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading form...</p>
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
                <div className="flex items-center">
                  <button
                    onClick={() => window.location.href = '/work-orders'}
                    className="mr-4 inline-flex items-center p-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <FiArrowLeft className="h-4 w-4" />
                  </button>
                  <div>
                    <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                      Create New Work Order
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                      Create a centralized work order for job-based PO generation
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex md:mt-0 md:ml-4">
                <div className="flex items-center space-x-3 text-sm text-gray-500">
                  <FiFileText className="h-4 w-4" />
                  <span>All fields marked with * are required</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Container */}
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          {/* Form Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-medium text-gray-900">Work Order Details</h2>
            <p className="mt-1 text-sm text-gray-500">
              Fill out all the required information to create a new work order.
            </p>
          </div>

          {/* Form Content */}
          <div className="p-6">
            <WorkOrderCreationForm
              projects={projects}
              divisions={divisions}
              onSave={handleSave}
              saving={saving}
              currentUser={session?.user}
            />
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <FiFileText className="mt-0.5 mr-3 h-5 w-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-medium text-blue-900">Work Order Benefits</h3>
              <ul className="mt-2 text-sm text-blue-800 space-y-1">
                <li>• Centralized job management with priority tracking</li>
                <li>• Streamlined PO creation with pre-populated work order context</li>
                <li>• Budget tracking and variance analysis</li>
                <li>• Automatic PO count and amount tracking</li>
                <li>• Enhanced project oversight and timeline management</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">After Creating Work Order</h3>
              <p className="mt-1 text-sm text-gray-500">
                You'll be able to generate purchase orders directly from the work order dashboard
              </p>
            </div>
            <button
              onClick={() => window.location.href = '/work-orders'}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              View All Work Orders
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}