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
import {
  Box,
  IconButton,
  Typography,
  Alert,
  CircularProgress,
  Backdrop,
  Paper,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

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

  const [clientSkipped, setClientSkipped] = useState(false);

  useEffect(() => {
    document.title = 'Quick PO | ASR PO System';
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

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
        const res = await fetch(`/api/projects?propertyId=${propertyId}`);
        const propProjects: Project[] = res.ok ? await res.json() : [];
        setProjects(propProjects);
      } else {
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

  const handleClientSkip = () => {
    setSelectedClient(null);
    setSelectedProperty(null);
    setClientSkipped(true);
    setStep(4);
    if (selectedDivision) fetchProjects(selectedDivision.id);
  };

  const handlePropertySelect = (property: Property) => {
    setSelectedProperty(property);
    setSelectedProject(null);
    setWorkOrders([]);
    setStep(4);
    if (selectedDivision) fetchProjects(selectedDivision.id, property.id);
  };

  const handlePropertySkip = () => {
    setSelectedProperty(null);
    setStep(4);
    if (selectedDivision) fetchProjects(selectedDivision.id);
  };

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

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    setWorkOrders([]);
    setStep(5);
    fetchWorkOrders(project.id);
  };

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

  const handleBack = () => {
    if (step === 1) {
      router.back();
    } else if (step === 4 && clientSkipped) {
      setClientSkipped(false);
      setStep(2);
    } else {
      setStep(step - 1);
    }
  };

  if (loading) {
    return (
      <AppLayout pageTitle="Quick PO">
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
          <CircularProgress color="primary" />
        </Box>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Quick PO">
      {/* Header with MUI Stepper */}
      {step <= TOTAL_STEPS && (
        <Paper
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 30,
            mx: { xs: -2, lg: -4 },
            mt: { xs: -2, lg: -4 },
            borderRadius: 0,
            borderBottom: 1,
            borderColor: 'divider',
            px: 2,
            pt: 1,
            pb: 2,
          }}
          elevation={0}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <IconButton onClick={handleBack} size="small">
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Quick PO</Typography>
            <Box sx={{ width: 40 }} />
          </Box>
          <Stepper activeStep={step - 1} alternativeLabel>
            {STEP_LABELS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>
      )}

      <Box sx={{ p: 2, pb: 16 }}>
        {/* Error banner */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Submitting overlay */}
        <Backdrop open={submitting} sx={{ zIndex: 50, color: '#fff' }}>
          <Paper sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, borderRadius: 3 }}>
            <CircularProgress color="primary" />
            <Typography sx={{ fontWeight: 500 }}>Generating PO...</Typography>
          </Paper>
        </Backdrop>

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
      </Box>
    </AppLayout>
  );
}
