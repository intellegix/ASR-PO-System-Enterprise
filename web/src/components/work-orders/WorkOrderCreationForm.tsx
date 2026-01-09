'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiSave, FiX, FiCalendar, FiDollarSign, FiFileText } from 'react-icons/fi';

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

interface User {
  id: string;
  role: string;
  division_id?: string;
}

interface WorkOrderFormData {
  project_id: string;
  division_id: string;
  title: string;
  description: string;
  priority_level: 'Low' | 'Medium' | 'High' | 'Critical';
  work_order_type: string;
  primary_trade?: string;
  budget_estimate?: number;
  estimated_completion_date?: string;
  start_date_planned?: string;
  end_date_planned?: string;
}

interface WorkOrderCreationFormProps {
  projects: Project[];
  divisions: Division[];
  onSave: (data: WorkOrderFormData) => Promise<void>;
  saving: boolean;
  currentUser?: User;
}

const WORK_ORDER_TYPES = [
  'Emergency',
  'Planned Maintenance',
  'Preventive Maintenance',
  'Repair',
  'Installation',
  'Inspection',
  'Upgrade',
  'Other'
];

const PRIMARY_TRADES = [
  'Electrical',
  'Plumbing',
  'HVAC',
  'Mechanical',
  'Structural',
  'Painting',
  'Roofing',
  'Flooring',
  'Landscaping',
  'General',
  'Other'
];

export default function WorkOrderCreationForm({
  projects,
  divisions,
  onSave,
  saving,
  currentUser
}: WorkOrderCreationFormProps) {
  const [formData, setFormData] = useState<WorkOrderFormData>({
    project_id: '',
    division_id: currentUser?.division_id || '',
    title: '',
    description: '',
    priority_level: 'Medium',
    work_order_type: '',
    primary_trade: '',
    budget_estimate: undefined,
    estimated_completion_date: '',
    start_date_planned: '',
    end_date_planned: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Update selected project when project_id changes
  useEffect(() => {
    if (formData.project_id) {
      const project = projects.find(p => p.id === formData.project_id);
      setSelectedProject(project || null);

      // Auto-select division if project has a primary division
      if (project?.primary_division_id && !formData.division_id) {
        setFormData(prev => ({
          ...prev,
          division_id: project.primary_division_id!
        }));
      }
    } else {
      setSelectedProject(null);
    }
  }, [formData.project_id, projects]);

  // Filter divisions based on user role
  const availableDivisions = currentUser?.role === 'DIVISION_LEADER'
    ? divisions.filter(d => d.id === currentUser.division_id)
    : divisions;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.project_id) newErrors.project_id = 'Project is required';
    if (!formData.division_id) newErrors.division_id = 'Division is required';
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.work_order_type) newErrors.work_order_type = 'Work order type is required';

    // Title length validation
    if (formData.title.trim().length > 200) {
      newErrors.title = 'Title must be 200 characters or less';
    }

    // Budget validation
    if (formData.budget_estimate !== undefined) {
      if (formData.budget_estimate < 0) {
        newErrors.budget_estimate = 'Budget estimate cannot be negative';
      }
      if (formData.budget_estimate > 10000000) {
        newErrors.budget_estimate = 'Budget estimate cannot exceed $10,000,000';
      }
    }

    // Date validations
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (formData.start_date_planned) {
      const startDate = new Date(formData.start_date_planned);
      if (startDate < today) {
        newErrors.start_date_planned = 'Start date cannot be in the past';
      }
    }

    if (formData.end_date_planned) {
      const endDate = new Date(formData.end_date_planned);
      if (endDate < today) {
        newErrors.end_date_planned = 'End date cannot be in the past';
      }
    }

    if (formData.start_date_planned && formData.end_date_planned) {
      const startDate = new Date(formData.start_date_planned);
      const endDate = new Date(formData.end_date_planned);
      if (endDate <= startDate) {
        newErrors.end_date_planned = 'End date must be after start date';
      }
    }

    if (formData.estimated_completion_date) {
      const completionDate = new Date(formData.estimated_completion_date);
      if (completionDate < today) {
        newErrors.estimated_completion_date = 'Completion date cannot be in the past';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    try {
      await onSave(formData);
    } catch (error) {
      // Error handling is done in the parent component
    }
  };

  const handleInputChange = (field: keyof WorkOrderFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const formatCurrency = (value: string) => {
    const numValue = parseFloat(value.replace(/[^0-9.]/g, ''));
    return isNaN(numValue) ? '' : numValue.toString();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Project and Division Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="project_id" className="block text-sm font-medium text-gray-700 mb-1">
            Project *
          </label>
          <select
            id="project_id"
            value={formData.project_id}
            onChange={(e) => handleInputChange('project_id', e.target.value)}
            className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
              errors.project_id ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">Select a project...</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.project_code} - {project.project_name}
              </option>
            ))}
          </select>
          {errors.project_id && (
            <p className="mt-1 text-sm text-red-600">{errors.project_id}</p>
          )}
          {selectedProject && selectedProject.budget_total && (
            <p className="mt-1 text-sm text-gray-500">
              Project Budget: ${selectedProject.budget_total.toLocaleString()}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="division_id" className="block text-sm font-medium text-gray-700 mb-1">
            Division *
          </label>
          <select
            id="division_id"
            value={formData.division_id}
            onChange={(e) => handleInputChange('division_id', e.target.value)}
            disabled={currentUser?.role === 'DIVISION_LEADER'}
            className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
              errors.division_id ? 'border-red-300' : 'border-gray-300'
            } ${currentUser?.role === 'DIVISION_LEADER' ? 'bg-gray-100' : ''}`}
          >
            <option value="">Select a division...</option>
            {availableDivisions.map((division) => (
              <option key={division.id} value={division.id}>
                {division.division_code} - {division.division_name}
              </option>
            ))}
          </select>
          {errors.division_id && (
            <p className="mt-1 text-sm text-red-600">{errors.division_id}</p>
          )}
        </div>
      </div>

      {/* Title and Priority */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Work Order Title *
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="Enter a descriptive title for the work order..."
            maxLength={200}
            className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
              errors.title ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            {formData.title.length}/200 characters
          </p>
        </div>

        <div>
          <label htmlFor="priority_level" className="block text-sm font-medium text-gray-700 mb-1">
            Priority Level *
          </label>
          <select
            id="priority_level"
            value={formData.priority_level}
            onChange={(e) => handleInputChange('priority_level', e.target.value as any)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Work Order Type and Primary Trade */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="work_order_type" className="block text-sm font-medium text-gray-700 mb-1">
            Work Order Type *
          </label>
          <select
            id="work_order_type"
            value={formData.work_order_type}
            onChange={(e) => handleInputChange('work_order_type', e.target.value)}
            className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
              errors.work_order_type ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">Select type...</option>
            {WORK_ORDER_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {errors.work_order_type && (
            <p className="mt-1 text-sm text-red-600">{errors.work_order_type}</p>
          )}
        </div>

        <div>
          <label htmlFor="primary_trade" className="block text-sm font-medium text-gray-700 mb-1">
            Primary Trade
          </label>
          <select
            id="primary_trade"
            value={formData.primary_trade || ''}
            onChange={(e) => handleInputChange('primary_trade', e.target.value || undefined)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select trade (optional)...</option>
            {PRIMARY_TRADES.map((trade) => (
              <option key={trade} value={trade}>
                {trade}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description *
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Provide a detailed description of the work to be performed..."
          rows={4}
          className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
            errors.description ? 'border-red-300' : 'border-gray-300'
          }`}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description}</p>
        )}
      </div>

      {/* Budget Estimate */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label htmlFor="budget_estimate" className="block text-sm font-medium text-gray-700 mb-1">
            Budget Estimate
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiDollarSign className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="number"
              id="budget_estimate"
              value={formData.budget_estimate || ''}
              onChange={(e) => handleInputChange('budget_estimate', e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="0.00"
              min="0"
              max="10000000"
              step="0.01"
              className={`block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                errors.budget_estimate ? 'border-red-300' : 'border-gray-300'
              }`}
            />
          </div>
          {errors.budget_estimate && (
            <p className="mt-1 text-sm text-red-600">{errors.budget_estimate}</p>
          )}
        </div>

        <div>
          <label htmlFor="estimated_completion_date" className="block text-sm font-medium text-gray-700 mb-1">
            Target Completion
          </label>
          <input
            type="date"
            id="estimated_completion_date"
            value={formData.estimated_completion_date}
            onChange={(e) => handleInputChange('estimated_completion_date', e.target.value)}
            className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
              errors.estimated_completion_date ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.estimated_completion_date && (
            <p className="mt-1 text-sm text-red-600">{errors.estimated_completion_date}</p>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="start_date_planned" className="block text-sm font-medium text-gray-700 mb-1">
            Planned Start Date
          </label>
          <input
            type="date"
            id="start_date_planned"
            value={formData.start_date_planned}
            onChange={(e) => handleInputChange('start_date_planned', e.target.value)}
            className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
              errors.start_date_planned ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.start_date_planned && (
            <p className="mt-1 text-sm text-red-600">{errors.start_date_planned}</p>
          )}
        </div>

        <div>
          <label htmlFor="end_date_planned" className="block text-sm font-medium text-gray-700 mb-1">
            Planned End Date
          </label>
          <input
            type="date"
            id="end_date_planned"
            value={formData.end_date_planned}
            onChange={(e) => handleInputChange('end_date_planned', e.target.value)}
            className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
              errors.end_date_planned ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.end_date_planned && (
            <p className="mt-1 text-sm text-red-600">{errors.end_date_planned}</p>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={() => window.location.href = '/work-orders'}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <FiX className="mr-2 h-4 w-4" />
          Cancel
        </button>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Creating...
            </>
          ) : (
            <>
              <FiSave className="mr-2 h-4 w-4" />
              Create Work Order
            </>
          )}
        </button>
      </div>
    </form>
  );
}