'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import DivisionPicker from '@/components/po/DivisionPicker';
import ProjectPicker from '@/components/po/ProjectPicker';
import WorkOrderPicker from '@/components/po/WorkOrderPicker';
import POGeneratedConfirmation from '@/components/po/POGeneratedConfirmation';

interface Division {
  id: string;
  division_code: string;
  division_name: string;
  cost_center_prefix: string;
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

export default function CreatePOPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);

  const [selectedDivision, setSelectedDivision] = useState<Division | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const [loading, setLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [woLoading, setWoLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [result, setResult] = useState<QuickPOResult | null>(null);

  useEffect(() => {
    document.title = 'Quick PO | ASR PO System';
  }, []);

  // Scroll to top on step change
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
    if (user?.divisionId && divisions.length > 0 && !selectedDivision) {
      const userDiv = divisions.find((d) => d.id === user.divisionId);
      if (userDiv) {
        setSelectedDivision(userDiv);
        setStep(2);
        fetchProjects(userDiv.id);
      }
    }
  }, [user, divisions]);

  const fetchProjects = async (divisionId: string) => {
    setProjectsLoading(true);
    try {
      // Fetch projects for this division, plus unassigned
      const [divRes, allRes] = await Promise.all([
        fetch(`/api/projects?divisionId=${divisionId}`),
        fetch('/api/projects'),
      ]);
      const divProjects: Project[] = divRes.ok ? await divRes.json() : [];
      const allProjects: Project[] = allRes.ok ? await allRes.json() : [];

      // Combine: division-specific first, then unassigned (no primary_division_id)
      const divIds = new Set(divProjects.map((p) => p.id));
      const unassigned = allProjects.filter((p) => !p.primary_division_id && !divIds.has(p.id));
      setProjects([...divProjects, ...unassigned]);
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

  // Handle division selection
  const handleDivisionSelect = (div: Division) => {
    setSelectedDivision(div);
    setSelectedProject(null);
    setProjects([]);
    setWorkOrders([]);
    setStep(2);
    fetchProjects(div.id);
  };

  // Handle project selection
  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    setWorkOrders([]);
    setStep(3);
    fetchWorkOrders(project.id);
  };

  // Handle work order selection / creation → generate PO
  const handleWorkOrderSelect = async (workOrderId: string | null, createTitle?: string) => {
    if (!selectedDivision || !selectedProject) return;
    setSubmitting(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        divisionId: selectedDivision.id,
        projectId: selectedProject.id,
      };

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
        setStep(4);
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
      {step < 4 && (
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 -mx-4 lg:-mx-8 -mt-4 lg:-mt-8">
          <div className="flex items-center justify-between px-4 py-4">
            <button
              onClick={() => {
                if (step > 1) setStep(step - 1);
                else router.back();
              }}
              className="text-slate-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="font-semibold text-slate-900">Quick PO</h1>
            <div className="w-5" />
          </div>
          <div className="flex px-4 pb-3 gap-1">
            {['Division', 'Project', 'Work Order'].map((label, i) => (
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
            userDivisionId={user?.divisionId}
            onSelect={handleDivisionSelect}
          />
        )}

        {/* Step 2: Project */}
        {step === 2 && (
          <ProjectPicker
            projects={projects}
            loading={projectsLoading}
            onSelect={handleProjectSelect}
          />
        )}

        {/* Step 3: Work Order */}
        {step === 3 && (
          <WorkOrderPicker
            workOrders={workOrders}
            loading={woLoading}
            onSelect={handleWorkOrderSelect}
          />
        )}

        {/* Step 4: PO Generated */}
        {step === 4 && result && (
          <POGeneratedConfirmation
            poId={result.id}
            poNumber={result.poNumber}
            divisionName={result.divisionName}
            projectName={result.projectName}
            workOrderNumber={result.workOrderNumber}
          />
        )}
      </main>
    </AppLayout>
  );
}
