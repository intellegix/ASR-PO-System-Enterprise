'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import DivisionPicker from '@/components/po/DivisionPicker';
import ClientPicker from '@/components/po/ClientPicker';
import PropertyPicker from '@/components/po/PropertyPicker';
import ProjectPicker from '@/components/po/ProjectPicker';
import WorkOrderPicker from '@/components/po/WorkOrderPicker';
import POGeneratedConfirmation from '@/components/po/POGeneratedConfirmation';

interface Division {
  id: string;
  division_code: string;
  division_name: string;
  cost_center_prefix: string;
}

interface Client {
  id: string;
  client_name: string;
  client_code: string;
  category: string | null;
  parent_entity: string | null;
  aliases: string | null;
}

interface Property {
  id: string;
  property_name: string;
  property_address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}

interface Project {
  id: string;
  project_code: string;
  project_name: string;
  district_name: string | null;
  primary_division_id: string | null;
}

interface WorkOrder {
  id: string;
  work_order_number: string;
  title: string;
  primary_trade: string | null;
}

interface QuickPOResult {
  id: string;
  poNumber: string;
  divisionName: string;
  projectName: string;
  workOrderNumber: string;
}

const STEP_LABELS = ['Division', 'Client', 'Property', 'Project', 'Work Order'];
const TOTAL_STEPS = 5;

export default function CreatePOPage() {
  const { user: _user } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);

  const [selectedDivision, setSelectedDivision] = useState<Division | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const [loading, setLoading] = useState(true);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [woLoading, setWoLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [result, setResult] = useState<QuickPOResult | null>(null);

  // Track whether client/property steps were skipped
  const [clientSkipped, setClientSkipped] = useState(false);

  useEffect(() => {
    document.title = 'Quick PO | ASR PO System';
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // Fetch divisions on mount
  useEffect(() => {
    const fetchDivisions = async () => {
      try {
        const res = await fetch('/api/divisions');
        if (res.ok) setDivisions(await res.json());
      } catch (err) {
        console.error('Error fetching divisions:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDivisions();
  }, []);

  // Auto-select user's division
  useEffect(() => {
    if (_user?.divisionId && divisions.length > 0 && !selectedDivision) {
      const userDiv = divisions.find((d) => d.id === _user.divisionId);
      if (userDiv) {
        setSelectedDivision(userDiv);
        setStep(2);
        fetchClients();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_user, divisions]);

  const fetchClients = async () => {
    setClientsLoading(true);
    try {
      const res = await fetch('/api/clients');
      if (res.ok) setClients(await res.json());
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      setClientsLoading(false);
    }
  };

  const fetchProperties = async (clientId: string) => {
    setPropertiesLoading(true);
    try {
      const res = await fetch(`/api/properties?clientId=${clientId}`);
      if (res.ok) setProperties(await res.json());
    } catch (err) {
      console.error('Error fetching properties:', err);
    } finally {
      setPropertiesLoading(false);
    }
  };

  const fetchProjects = async (divisionId: string, propertyId?: string) => {
    setProjectsLoading(true);
    try {
      if (propertyId) {
        // Fetch projects for this property
        const res = await fetch(`/api/projects?propertyId=${propertyId}`);
        const propProjects: Project[] = res.ok ? await res.json() : [];
        setProjects(propProjects);
      } else {
        // Old behavior: fetch by division + unassigned
        const [divRes, allRes] = await Promise.all([
          fetch(`/api/projects?divisionId=${divisionId}`),
          fetch('/api/projects'),
        ]);
        const divProjects: Project[] = divRes.ok ? await divRes.json() : [];
        const allProjects: Project[] = allRes.ok ? await allRes.json() : [];
        const divIds = new Set(divProjects.map((p) => p.id));
        const unassigned = allProjects.filter((p) => !p.primary_division_id && !divIds.has(p.id));
        setProjects([...divProjects, ...unassigned]);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setProjectsLoading(false);
    }
  };

  const fetchWorkOrders = async (projectId: string) => {
    setWoLoading(true);
    try {
      const res = await fetch(`/api/work-orders?projectId=${projectId}`);
      if (res.ok) setWorkOrders(await res.json());
    } catch (err) {
      console.error('Error fetching work orders:', err);
    } finally {
      setWoLoading(false);
    }
  };

  // Step 1: Division selected
  const handleDivisionSelect = (div: Division) => {
    setSelectedDivision(div);
    setSelectedClient(null);
    setSelectedProperty(null);
    setSelectedProject(null);
    setClientSkipped(false);
    setClients([]);
    setProperties([]);
    setProjects([]);
    setWorkOrders([]);
    setStep(2);
    fetchClients();
  };

  // Step 2: Client selected
  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setSelectedProperty(null);
    setSelectedProject(null);
    setClientSkipped(false);
    setProperties([]);
    setProjects([]);
    setWorkOrders([]);
    setStep(3);
    fetchProperties(client.id);
  };

  // Step 2: Client skipped → jump to Project step
  const handleClientSkip = () => {
    setSelectedClient(null);
    setSelectedProperty(null);
    setClientSkipped(true);
    setStep(4);
    if (selectedDivision) fetchProjects(selectedDivision.id);
  };

  // Step 3: Property selected
  const handlePropertySelect = (property: Property) => {
    setSelectedProperty(property);
    setSelectedProject(null);
    setWorkOrders([]);
    setStep(4);
    if (selectedDivision) fetchProjects(selectedDivision.id, property.id);
  };

  // Step 3: Property skipped → go to project with client but no property filter
  const handlePropertySkip = () => {
    setSelectedProperty(null);
    setStep(4);
    if (selectedDivision) fetchProjects(selectedDivision.id);
  };

  // Step 3: Add new property inline
  const handleAddProperty = async (name: string, address: string) => {
    if (!selectedClient) return;
    const res = await fetch('/api/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: selectedClient.id,
        propertyName: name,
        propertyAddress: address || undefined,
      }),
    });
    if (res.ok) {
      const newProp = await res.json();
      // Auto-select the new property
      handlePropertySelect({
        id: newProp.id,
        property_name: newProp.property_name,
        property_address: newProp.property_address,
        city: newProp.city,
        state: newProp.state,
        zip: newProp.zip,
      });
    }
  };

  // Step 4: Project selected
  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    setWorkOrders([]);
    setStep(5);
    fetchWorkOrders(project.id);
  };

  // Step 5: Work order selection → generate PO
  const handleWorkOrderSelect = async (workOrderId: string | null, createTitle?: string) => {
    if (!selectedDivision || !selectedProject) return;
    setSubmitting(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        divisionId: selectedDivision.id,
        projectId: selectedProject.id,
      };

      if (selectedClient) payload.clientId = selectedClient.id;
      if (selectedProperty) payload.propertyId = selectedProperty.id;

      if (workOrderId) {
        payload.workOrderId = workOrderId;
      } else if (createTitle) {
        payload.createWorkOrder = { title: createTitle };
      }

      const res = await fetch('/api/po/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data);
        setStep(6);
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to create PO');
      }
    } catch (err) {
      console.error('Error creating quick PO:', err);
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle back navigation with skip awareness
  const handleBack = () => {
    if (step === 1) {
      router.back();
    } else if (step === 4 && clientSkipped) {
      // Skipped client → go back to client step
      setClientSkipped(false);
      setStep(2);
    } else {
      setStep(step - 1);
    }
  };

  if (loading) {
    return (
      <AppLayout pageTitle="Quick PO">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      </AppLayout>
    );
  }


  return (
    <AppLayout pageTitle="Quick PO">
      {/* Header with progress */}
      {step <= TOTAL_STEPS && (
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 -mx-4 lg:-mx-8 -mt-4 lg:-mt-8">
          <div className="flex items-center justify-between px-4 py-4">
            <button onClick={handleBack} className="text-slate-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="font-semibold text-slate-900">Quick PO</h1>
            <div className="w-5" />
          </div>
          <div className="flex px-4 pb-3 gap-1">
            {STEP_LABELS.map((label, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className={`h-1.5 w-full rounded-full ${i + 1 <= step ? 'bg-orange-500' : 'bg-slate-200'}`} />
                <span className={`text-[10px] leading-tight ${i + 1 <= step ? 'text-orange-600 font-medium' : 'text-slate-400'}`}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </header>
      )}

      <main className="p-4 pb-32">
        {/* Error banner */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* Submitting overlay */}
        {submitting && (
          <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
            <div className="bg-white rounded-xl p-6 flex flex-col items-center gap-3 shadow-xl">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              <p className="text-slate-700 font-medium">Generating PO...</p>
            </div>
          </div>
        )}

        {/* Step 1: Division */}
        {step === 1 && (
          <DivisionPicker
            divisions={divisions}
            selectedId={selectedDivision?.id || null}
            userDivisionId={_user?.divisionId}
            onSelect={handleDivisionSelect}
          />
        )}

        {/* Step 2: Client */}
        {step === 2 && (
          <ClientPicker
            clients={clients}
            loading={clientsLoading}
            onSelect={handleClientSelect}
            onSkip={handleClientSkip}
          />
        )}

        {/* Step 3: Property */}
        {step === 3 && selectedClient && (
          <PropertyPicker
            properties={properties}
            loading={propertiesLoading}
            clientName={selectedClient.client_name}
            onSelect={handlePropertySelect}
            onSkip={handlePropertySkip}
            onAddProperty={handleAddProperty}
          />
        )}

        {/* Step 4: Project */}
        {step === 4 && (
          <ProjectPicker
            projects={projects}
            loading={projectsLoading}
            onSelect={handleProjectSelect}
          />
        )}

        {/* Step 5: Work Order */}
        {step === 5 && (
          <WorkOrderPicker
            workOrders={workOrders}
            loading={woLoading}
            onSelect={handleWorkOrderSelect}
          />
        )}

        {/* Step 6: PO Generated */}
        {step === 6 && result && (
          <POGeneratedConfirmation
            poId={result.id}
            poNumber={result.poNumber}
            divisionName={result.divisionName}
            projectName={result.projectName}
            workOrderNumber={result.workOrderNumber}
            clientName={selectedClient?.client_name}
            propertyName={selectedProperty?.property_name}
          />
        )}
      </main>
    </AppLayout>
  );
}
