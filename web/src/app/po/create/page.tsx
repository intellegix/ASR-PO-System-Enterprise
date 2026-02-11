'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';

// Types
interface Client {
  id: string;
  client_name: string;
  client_code: string;
  category: string | null;
  parent_entity: string | null;
  aliases: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
}

interface Project {
  id: string;
  project_code: string;
  project_name: string;
  district_name: string | null;
}

interface WorkOrder {
  id: string;
  work_order_number: string;
  sequence_number: number;
  title: string;
  description: string | null;
  primary_trade: string | null;
  division_id: string;
  project_id: string;
}

interface Vendor {
  id: string;
  vendor_code: string;
  vendor_name: string;
  vendor_type: string;
  contact_name: string | null;
  payment_terms_default: string | null;
}

interface Division {
  id: string;
  division_code: string;
  division_name: string;
  cost_center_prefix: string;
}

interface GLAccount {
  id: string;
  gl_code_short: string;
  gl_account_number: string;
  gl_account_name: string;
  gl_account_category: string;
  is_taxable_default: boolean;
}

interface LineItem {
  id: string;
  itemDescription: string;
  quantity: number;
  unitOfMeasure: string;
  unitPrice: number;
  glAccountId: string;
  glAccountName?: string;
  isTaxable: boolean;
}

// Icons
interface IconProps {
  className?: string;
}

const ArrowLeftIcon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const PlusIcon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const TrashIcon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const CheckIcon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

export default function CreatePOPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  // Data states
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [glAccounts, setGLAccounts] = useState<GLAccount[]>([]);

  // Form states
  const [step, setStep] = useState(1);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<Division | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [notesInternal, setNotesInternal] = useState('');
  const [notesVendor, setNotesVendor] = useState('');
  const [requiredByDate, setRequiredByDate] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    document.title = 'Create PO | ASR PO System';
  }, []);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const markDirty = useCallback(() => { if (!isDirty) setIsDirty(true); }, [isDirty]);

  // Create new client
  const handleCreateClient = async () => {
    if (!newClientName || !newClientCode) return;

    setCreatingClient(true);
    setClientError(null);

    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: newClientName,
          client_code: newClientCode,
          category: newClientCategory || null,
          parent_entity: newClientParentEntity || null,
          contact_name: newClientContactName || null,
          contact_email: newClientContactEmail || null,
          contact_phone: newClientContactPhone || null,
        }),
      });

      if (res.ok) {
        const newClient = await res.json();
        setClients([newClient, ...clients]);
        setSelectedClient(newClient);
        setShowNewClientForm(false);
        setNewClientName('');
        setNewClientCode('');
        setNewClientCategory('');
        setNewClientParentEntity('');
        setNewClientContactName('');
        setNewClientContactEmail('');
        setNewClientContactPhone('');
        markDirty();
        setStep(2);
      } else {
        const errorData = await res.json();
        setClientError(errorData.error || 'Failed to create client');
      }
    } catch (error) {
      console.error('Error creating client:', error);
      setClientError('Network error. Please try again.');
    } finally {
      setCreatingClient(false);
    }
  };

  // Create new project
  const handleCreateProject = async () => {
    if (!newProjectCode || !newProjectName) return;

    setCreatingProject(true);
    setProjectError(null);

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_code: newProjectCode,
          project_name: newProjectName,
          customer_id: selectedClient?.id || null,
          district_name: newProjectDistrict || null,
          property_address: newProjectAddress || null,
        }),
      });

      if (res.ok) {
        const newProject = await res.json();
        setProjects([newProject, ...projects]);
        setSelectedProject(newProject);
        setShowNewProjectForm(false);
        setNewProjectCode('');
        setNewProjectName('');
        setNewProjectDistrict('');
        setNewProjectAddress('');
        markDirty();
        setStep(3);
      } else {
        const errorData = await res.json();
        setProjectError(errorData.error || 'Failed to create project');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      setProjectError('Network error. Please try again.');
    } finally {
      setCreatingProject(false);
    }
  };

  // New client form
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientCode, setNewClientCode] = useState('');
  const [newClientCategory, setNewClientCategory] = useState('');
  const [newClientParentEntity, setNewClientParentEntity] = useState('');
  const [newClientContactName, setNewClientContactName] = useState('');
  const [newClientContactEmail, setNewClientContactEmail] = useState('');
  const [newClientContactPhone, setNewClientContactPhone] = useState('');
  const [creatingClient, setCreatingClient] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  // New project form
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [newProjectCode, setNewProjectCode] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDistrict, setNewProjectDistrict] = useState('');
  const [newProjectAddress, setNewProjectAddress] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);

  // New work order form
  const [showNewWOForm, setShowNewWOForm] = useState(false);
  const [newWOTitle, setNewWOTitle] = useState('');
  const [newWODescription, setNewWODescription] = useState('');
  const [newWOTrade, setNewWOTrade] = useState('');
  const [creatingWO, setCreatingWO] = useState(false);
  const [woError, setWoError] = useState<string | null>(null);

  // New line item form
  const [showLineItemForm, setShowLineItemForm] = useState(false);
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemUOM, setNewItemUOM] = useState('EA');
  const [newItemPrice, setNewItemPrice] = useState(0);
  const [newItemGLId, setNewItemGLId] = useState('');
  const [newItemTaxable, setNewItemTaxable] = useState(true);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Search states
  const [clientSearch, setClientSearch] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [vendorSearch, setVendorSearch] = useState('');

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [clientsRes, projectsRes, vendorsRes, divisionsRes, glRes] = await Promise.all([
          fetch('/api/clients'),
          fetch('/api/projects'),
          fetch('/api/vendors'),
          fetch('/api/divisions'),
          fetch('/api/gl-accounts'),
        ]);

        if (clientsRes.ok) setClients(await clientsRes.json());
        if (projectsRes.ok) setProjects(await projectsRes.json());
        if (vendorsRes.ok) setVendors(await vendorsRes.json());
        if (divisionsRes.ok) setDivisions(await divisionsRes.json());
        if (glRes.ok) setGLAccounts(await glRes.json());
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch work orders when project changes
  useEffect(() => {
    const fetchWorkOrders = async () => {
      if (!selectedProject) {
        setWorkOrders([]);
        return;
      }

      try {
        const res = await fetch(`/api/work-orders?projectId=${selectedProject.id}`);
        if (res.ok) {
          setWorkOrders(await res.json());
        }
      } catch (error) {
        console.error('Error fetching work orders:', error);
      }
    };

    fetchWorkOrders();
  }, [selectedProject]);

  // Set default division from user session
  useEffect(() => {
    if (user?.divisionId && divisions.length > 0) {
      const userDivision = divisions.find(d => d.id === user.divisionId);
      if (userDivision) {
        setSelectedDivision(userDivision);
      }
    }
  }, [user, divisions]);

  // Create new work order
  const handleCreateWorkOrder = async () => {
    if (!selectedProject || !selectedDivision || !newWOTitle) return;

    setCreatingWO(true);
    setWoError(null);

    try {
      const res = await fetch('/api/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject.id,
          divisionId: selectedDivision.id,
          title: newWOTitle,
          description: newWODescription,
          primaryTrade: newWOTrade,
        }),
      });

      if (res.ok) {
        const newWO = await res.json();
        setWorkOrders([newWO, ...workOrders]);
        setSelectedWorkOrder(newWO);
        setShowNewWOForm(false);
        setNewWOTitle('');
        setNewWODescription('');
        setNewWOTrade('');
        setStep(4); // Move to vendor selection
      } else {
        const errorData = await res.json();
        setWoError(errorData.error || 'Failed to create work order');
      }
    } catch (error) {
      console.error('Error creating work order:', error);
      setWoError('Network error. Please try again.');
    } finally {
      setCreatingWO(false);
    }
  };

  // Add line item
  const handleAddLineItem = () => {
    if (!newItemDescription || !newItemGLId || newItemPrice <= 0) return;

    const glAccount = glAccounts.find(g => g.id === newItemGLId);
    const newItem: LineItem = {
      id: Date.now().toString(),
      itemDescription: newItemDescription,
      quantity: newItemQty,
      unitOfMeasure: newItemUOM,
      unitPrice: newItemPrice,
      glAccountId: newItemGLId,
      glAccountName: glAccount?.gl_account_name,
      isTaxable: newItemTaxable,
    };

    setLineItems([...lineItems, newItem]);
    setShowLineItemForm(false);
    setNewItemDescription('');
    setNewItemQty(1);
    setNewItemUOM('EA');
    setNewItemPrice(0);
    setNewItemGLId('');
    setNewItemTaxable(true);
  };

  // Remove line item
  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const taxableAmount = lineItems
    .filter(item => item.isTaxable)
    .reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const taxAmount = taxableAmount * 0.0775;
  const total = subtotal + taxAmount;

  // Submit PO
  const handleSubmit = async (status: 'Draft' | 'Submitted') => {
    if (!selectedProject || !selectedVendor || !selectedDivision || lineItems.length === 0) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/po', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient?.id || null,
          projectId: selectedProject.id,
          workOrderId: selectedWorkOrder?.id || null,
          vendorId: selectedVendor.id,
          divisionId: selectedDivision.id,
          lineItems: lineItems.map(item => ({
            itemDescription: item.itemDescription,
            quantity: item.quantity,
            unitOfMeasure: item.unitOfMeasure,
            unitPrice: item.unitPrice,
            glAccountId: item.glAccountId,
            isTaxable: item.isTaxable,
          })),
          notesInternal,
          notesVendor,
          requiredByDate: requiredByDate || null,
          status,
        }),
      });

      if (res.ok) {
        const po = await res.json();
        setIsDirty(false);
        router.push(`/po/view?id=${po.id}`);
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to create PO');
      }
    } catch (error) {
      console.error('Error creating PO:', error);
      alert('Failed to create PO');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter functions
  const filteredClients = clients.filter(c => {
    const search = clientSearch.toLowerCase();
    return c.client_name.toLowerCase().includes(search) ||
      c.client_code.toLowerCase().includes(search) ||
      (c.category || '').toLowerCase().includes(search) ||
      (c.aliases || '').toLowerCase().includes(search) ||
      (c.parent_entity || '').toLowerCase().includes(search);
  });

  const filteredProjects = projects.filter(p =>
    p.project_name.toLowerCase().includes(projectSearch.toLowerCase()) ||
    p.project_code.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const filteredVendors = vendors.filter(v =>
    v.vendor_name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
    v.vendor_code.toLowerCase().includes(vendorSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <AppLayout pageTitle="Create PO">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 -mx-4 lg:-mx-8 -mt-4 lg:-mt-8">
        <div className="flex items-center justify-between px-4 py-4">
          <button onClick={() => step > 1 ? setStep(step - 1) : router.back()} className="text-slate-600">
            <ArrowLeftIcon />
          </button>
          <h1 className="font-semibold text-slate-900">Create PO</h1>
          <div className="w-5" />
        </div>
        {/* Progress bar */}
        <div className="flex px-4 pb-3 gap-1">
          {['Client', 'Project', 'Work Order', 'Vendor', 'Line Items', 'Review'].map((label, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`h-1 w-full rounded ${i + 1 <= step ? 'bg-orange-500' : 'bg-slate-200'}`}
              />
              <span className={`text-[8px] sm:text-[10px] leading-tight hidden sm:block ${i + 1 <= step ? 'text-orange-600 font-medium' : 'text-slate-400'}`}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </header>

      <main className="p-4 pb-32">
        {/* Step 1: Select Client */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-800 mb-1">Select Client</h2>
              <p className="text-sm text-slate-500">Choose the client for this purchase order</p>
            </div>

            <input
              type="text"
              placeholder="Search clients by name, code, category, or parent entity..."
              aria-label="Search clients"
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />

            {/* Add New Client Button */}
            <button
              onClick={() => setShowNewClientForm(true)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-orange-300 rounded-xl text-orange-600 hover:bg-orange-50 transition"
            >
              <PlusIcon />
              <span>Add New Client</span>
            </button>

            {/* New Client Form */}
            {showNewClientForm && (
              <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-3">
                <h3 className="font-medium text-slate-800">New Client</h3>
                {clientError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {clientError}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Client Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="e.g., Acme Corp"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500"
                      disabled={creatingClient}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Client Code <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="e.g., ACME"
                      value={newClientCode}
                      onChange={(e) => setNewClientCode(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500"
                      disabled={creatingClient}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                    <input
                      type="text"
                      placeholder="e.g., School District"
                      value={newClientCategory}
                      onChange={(e) => setNewClientCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500"
                      disabled={creatingClient}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Parent Entity</label>
                    <input
                      type="text"
                      placeholder="e.g., Liberty Military Housing"
                      value={newClientParentEntity}
                      onChange={(e) => setNewClientParentEntity(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500"
                      disabled={creatingClient}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Contact Name</label>
                    <input
                      type="text"
                      placeholder="Name"
                      value={newClientContactName}
                      onChange={(e) => setNewClientContactName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500"
                      disabled={creatingClient}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Contact Email</label>
                    <input
                      type="email"
                      placeholder="Email"
                      value={newClientContactEmail}
                      onChange={(e) => setNewClientContactEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500"
                      disabled={creatingClient}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Contact Phone</label>
                    <input
                      type="tel"
                      placeholder="Phone"
                      value={newClientContactPhone}
                      onChange={(e) => setNewClientContactPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500"
                      disabled={creatingClient}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowNewClientForm(false);
                      setClientError(null);
                    }}
                    disabled={creatingClient}
                    className="flex-1 py-2 px-4 border border-slate-300 rounded-lg text-slate-600 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateClient}
                    disabled={!newClientName || !newClientCode || creatingClient}
                    className="flex-1 py-2 px-4 bg-orange-500 text-white rounded-lg disabled:opacity-50"
                  >
                    {creatingClient ? 'Creating...' : 'Create Client'}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {filteredClients.map(client => (
                <button
                  key={client.id}
                  onClick={() => {
                    setSelectedClient(client);
                    markDirty();
                    setStep(2);
                  }}
                  className={`w-full text-left p-4 rounded-xl border transition ${
                    selectedClient?.id === client.id
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-slate-900">{client.client_name}</p>
                      <p className="text-sm text-slate-500">{client.client_code} {client.category ? `• ${client.category}` : ''}</p>
                    </div>
                    {client.parent_entity && (
                      <p className="text-xs text-slate-400">{client.parent_entity}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Skip Client Option */}
            <div className="pt-4 border-t border-slate-200">
              <button
                onClick={() => {
                  setSelectedClient(null);
                  setStep(2);
                }}
                className="w-full py-3 px-4 text-slate-500 hover:text-slate-700 text-sm transition"
              >
                Skip - Continue without Client
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Select Project */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-800 mb-1">Select Project</h2>
              <p className="text-sm text-slate-500">Choose the project for this purchase order</p>
            </div>

            <input
              type="text"
              placeholder="Search projects..."
              aria-label="Search projects"
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />

            {/* Add New Project Button */}
            <button
              onClick={() => setShowNewProjectForm(true)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-orange-300 rounded-xl text-orange-600 hover:bg-orange-50 transition"
            >
              <PlusIcon />
              <span>Add New Project</span>
            </button>

            {/* New Project Form */}
            {showNewProjectForm && (
              <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-3">
                <h3 className="font-medium text-slate-800">New Project</h3>
                {projectError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {projectError}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Project Code <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="e.g., PRJ-001"
                      value={newProjectCode}
                      onChange={(e) => setNewProjectCode(e.target.value.toUpperCase())}
                      maxLength={15}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500"
                      disabled={creatingProject}
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Max 15 characters, uppercase</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Project Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="e.g., Main St Roof Replacement"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      maxLength={200}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500"
                      disabled={creatingProject}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">District Name</label>
                    <input
                      type="text"
                      placeholder="e.g., San Diego Unified"
                      value={newProjectDistrict}
                      onChange={(e) => setNewProjectDistrict(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500"
                      disabled={creatingProject}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Property Address</label>
                    <input
                      type="text"
                      placeholder="e.g., 123 Main St, San Diego, CA"
                      value={newProjectAddress}
                      onChange={(e) => setNewProjectAddress(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500"
                      disabled={creatingProject}
                    />
                  </div>
                </div>
                {selectedClient && (
                  <p className="text-xs text-slate-500">This project will be linked to client: <span className="font-medium">{selectedClient.client_name}</span></p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowNewProjectForm(false);
                      setProjectError(null);
                    }}
                    disabled={creatingProject}
                    className="flex-1 py-2 px-4 border border-slate-300 rounded-lg text-slate-600 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateProject}
                    disabled={!newProjectCode || !newProjectName || creatingProject}
                    className="flex-1 py-2 px-4 bg-orange-500 text-white rounded-lg disabled:opacity-50"
                  >
                    {creatingProject ? 'Creating...' : 'Create Project'}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {filteredProjects.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200">
                  <svg className="mx-auto h-10 w-10 text-slate-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-slate-600 font-medium">No projects found</p>
                  <p className="text-sm text-slate-500 mt-1">
                    {projectSearch ? 'Try a different search term' : 'No projects available'}
                  </p>
                </div>
              ) : (
                filteredProjects.map(project => (
                  <button
                    key={project.id}
                    onClick={() => {
                      setSelectedProject(project);
                      markDirty();
                      setStep(3);
                    }}
                    className={`w-full text-left p-4 rounded-xl border transition ${
                      selectedProject?.id === project.id
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <p className="font-medium text-slate-900">{project.project_name}</p>
                    <p className="text-sm text-slate-500">{project.project_code} • {project.district_name}</p>
                  </button>
                ))
              )}
            </div>

            {/* Skip Project Option */}
            <div className="pt-4 border-t border-slate-200">
              <button
                onClick={() => {
                  setSelectedProject(null);
                  setStep(3);
                }}
                className="w-full py-3 px-4 text-slate-500 hover:text-slate-700 text-sm transition"
              >
                Skip - Continue without Project
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Select Work Order */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-800 mb-1">Select Work Order</h2>
              <p className="text-sm text-slate-500">Choose or create a work order for {selectedProject?.project_name}</p>
            </div>

            {/* Division selector */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Division</label>
              <select
                value={selectedDivision?.id || ''}
                onChange={(e) => {
                  const div = divisions.find(d => d.id === e.target.value);
                  setSelectedDivision(div || null);
                }}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Select Division</option>
                {divisions.map(div => (
                  <option key={div.id} value={div.id}>
                    {div.division_name} ({div.cost_center_prefix})
                  </option>
                ))}
              </select>
            </div>

            {/* New WO Button */}
            <button
              onClick={() => setShowNewWOForm(true)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-orange-300 rounded-xl text-orange-600 hover:bg-orange-50 transition"
            >
              <PlusIcon />
              <span>Create New Work Order</span>
            </button>

            {/* New WO Form */}
            {showNewWOForm && (
              <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-3">
                <h3 className="font-medium text-slate-800">New Work Order</h3>
                {woError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {woError}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Title <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="Work Order Title"
                    value={newWOTitle}
                    onChange={(e) => setNewWOTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500"
                    disabled={creatingWO}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                  <input
                    type="text"
                    placeholder="Description"
                    value={newWODescription}
                    onChange={(e) => setNewWODescription(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500"
                    disabled={creatingWO}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Primary Trade</label>
                  <input
                    type="text"
                    placeholder="e.g., Roofing, Plumbing"
                    value={newWOTrade}
                    onChange={(e) => setNewWOTrade(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500"
                    disabled={creatingWO}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowNewWOForm(false);
                      setWoError(null);
                    }}
                    disabled={creatingWO}
                    className="flex-1 py-2 px-4 border border-slate-300 rounded-lg text-slate-600 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateWorkOrder}
                    disabled={!newWOTitle || !selectedDivision || creatingWO}
                    className="flex-1 py-2 px-4 bg-orange-500 text-white rounded-lg disabled:opacity-50"
                  >
                    {creatingWO ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </div>
            )}

            {/* Existing Work Orders */}
            {workOrders.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-600">Existing Work Orders</p>
                {workOrders.map(wo => (
                  <button
                    key={wo.id}
                    onClick={() => {
                      setSelectedWorkOrder(wo);
                      setStep(4);
                    }}
                    className={`w-full text-left p-4 rounded-xl border transition ${
                      selectedWorkOrder?.id === wo.id
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <p className="font-mono text-sm text-slate-500">{wo.work_order_number}</p>
                    <p className="font-medium text-slate-900">{wo.title}</p>
                    {wo.primary_trade && (
                      <p className="text-sm text-slate-500">{wo.primary_trade}</p>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Skip Work Order Option */}
            <div className="pt-4 border-t border-slate-200">
              <button
                onClick={() => {
                  setSelectedWorkOrder(null);
                  setStep(4);
                }}
                className="w-full py-3 px-4 text-slate-500 hover:text-slate-700 text-sm transition"
              >
                Skip - Continue without Work Order
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Select Vendor */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-800 mb-1">Select Vendor</h2>
              <p className="text-sm text-slate-500">Choose the vendor for this purchase</p>
            </div>

            <input
              type="text"
              placeholder="Search vendors..."
              aria-label="Search vendors"
              value={vendorSearch}
              onChange={(e) => setVendorSearch(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />

            <div className="space-y-2">
              {filteredVendors.map(vendor => (
                <button
                  key={vendor.id}
                  onClick={() => {
                    setSelectedVendor(vendor);
                    setStep(5);
                  }}
                  className={`w-full text-left p-4 rounded-xl border transition ${
                    selectedVendor?.id === vendor.id
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-slate-900">{vendor.vendor_name}</p>
                      <p className="text-sm text-slate-500">{vendor.vendor_code} • {vendor.vendor_type}</p>
                    </div>
                    {vendor.contact_name && (
                      <p className="text-xs text-slate-400">{vendor.contact_name}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Line Items */}
        {step === 5 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-800 mb-1">Add Line Items</h2>
              <p className="text-sm text-slate-500">Add items to this purchase order</p>
            </div>

            {/* Add Item Button */}
            <button
              onClick={() => setShowLineItemForm(true)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-orange-300 rounded-xl text-orange-600 hover:bg-orange-50 transition"
            >
              <PlusIcon />
              <span>Add Line Item</span>
            </button>

            {/* Line Item Form */}
            {showLineItemForm && (
              <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-3">
                <h3 className="font-medium text-slate-800">New Line Item</h3>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Description <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="Item description"
                    value={newItemDescription}
                    onChange={(e) => setNewItemDescription(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={newItemQty}
                      onChange={(e) => setNewItemQty(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Unit</label>
                    <select
                      value={newItemUOM}
                      onChange={(e) => setNewItemUOM(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="EA">Each</option>
                      <option value="SF">Sq Ft</option>
                      <option value="LF">Lin Ft</option>
                      <option value="Roll">Roll</option>
                      <option value="Box">Box</option>
                      <option value="Kit">Kit</option>
                      <option value="Hour">Hour</option>
                      <option value="Day">Day</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Unit Price</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">GL Account *</label>
                  <select
                    value={newItemGLId}
                    onChange={(e) => {
                      setNewItemGLId(e.target.value);
                      const gl = glAccounts.find(g => g.id === e.target.value);
                      if (gl) setNewItemTaxable(gl.is_taxable_default);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select GL Account</option>
                    {glAccounts.map(gl => (
                      <option key={gl.id} value={gl.id}>
                        {gl.gl_code_short} - {gl.gl_account_name}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newItemTaxable}
                    onChange={(e) => setNewItemTaxable(e.target.checked)}
                    className="rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-sm text-slate-600">Taxable</span>
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowLineItemForm(false)}
                    className="flex-1 py-2 px-4 border border-slate-300 rounded-lg text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddLineItem}
                    disabled={!newItemDescription || !newItemGLId || newItemPrice <= 0}
                    className="flex-1 py-2 px-4 bg-orange-500 text-white rounded-lg disabled:opacity-50"
                  >
                    Add Item
                  </button>
                </div>
              </div>
            )}

            {/* Line Items List */}
            {lineItems.length > 0 && (
              <div className="space-y-2">
                {lineItems.map(item => (
                  <div key={item.id} className="bg-white rounded-xl p-4 border border-slate-200">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{item.itemDescription}</p>
                        <p className="text-sm text-slate-500">
                          {item.quantity} {item.unitOfMeasure} × ${item.unitPrice.toFixed(2)}
                        </p>
                        <p className="text-xs text-slate-400">{item.glAccountName}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-semibold text-slate-900">
                          ${(item.quantity * item.unitPrice).toFixed(2)}
                        </p>
                        <button
                          onClick={() => removeLineItem(item.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Totals */}
                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="text-slate-900">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Tax (7.75%)</span>
                    <span className="text-slate-900">${taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t border-slate-200 pt-2">
                    <span className="text-slate-800">Total</span>
                    <span className="text-slate-900">${total.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={() => setStep(6)}
                  className="w-full py-3 px-4 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition"
                >
                  Continue to Review
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 6: Review & Submit */}
        {step === 6 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-800 mb-1">Review PO</h2>
              <p className="text-sm text-slate-500">Review and submit your purchase order</p>
            </div>

            {/* Summary Card */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <span className="text-slate-500">Client</span>
                <span className={`font-medium ${selectedClient ? 'text-slate-900' : 'text-slate-400 italic'}`}>
                  {selectedClient?.client_name || 'Not selected'}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <span className="text-slate-500">Project</span>
                <span className="font-medium text-slate-900">{selectedProject?.project_name}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <span className="text-slate-500">Work Order</span>
                <span className={`font-medium ${selectedWorkOrder ? 'text-slate-900' : 'text-slate-400 italic'}`}>
                  {selectedWorkOrder?.work_order_number || 'Not selected'}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <span className="text-slate-500">Vendor</span>
                <span className="font-medium text-slate-900">{selectedVendor?.vendor_name}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <span className="text-slate-500">Division</span>
                <span className="font-medium text-slate-900">{selectedDivision?.division_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Total</span>
                <span className="text-xl font-bold text-orange-600">${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Line Items Summary */}
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <h3 className="font-medium text-slate-800 mb-3">{lineItems.length} Line Items</h3>
              <div className="space-y-2">
                {lineItems.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-slate-600">{item.itemDescription}</span>
                    <span className="text-slate-900">${(item.quantity * item.unitPrice).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Internal Notes</label>
                <textarea
                  value={notesInternal}
                  onChange={(e) => setNotesInternal(e.target.value)}
                  placeholder="Notes for internal reference..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vendor Notes</label>
                <textarea
                  value={notesVendor}
                  onChange={(e) => setNotesVendor(e.target.value)}
                  placeholder="Notes to include on PO for vendor..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Required By Date</label>
                <input
                  type="date"
                  value={requiredByDate}
                  onChange={(e) => setRequiredByDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Actions */}
      {step === 6 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 space-y-2">
          <button
            onClick={() => handleSubmit('Submitted')}
            disabled={submitting}
            className="w-full py-3 px-4 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <CheckIcon />
            {submitting ? 'Creating...' : 'Submit for Approval'}
          </button>
          <button
            onClick={() => handleSubmit('Draft')}
            disabled={submitting}
            className="w-full py-3 px-4 border border-slate-300 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition disabled:opacity-50"
          >
            Save as Draft
          </button>
        </div>
      )}
    </AppLayout>
  );
}
