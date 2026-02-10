'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';

interface Project {
  id: string;
  project_code: string;
  project_name: string;
  district_name: string | null;
  property_address: string | null;
  clark_rep: string | null;
  raken_uuid: string | null;
  last_synced_at: string | null;
}

interface SyncResult {
  synced: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export default function ProjectsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isAdmin = ['DIRECTOR_OF_SYSTEMS_INTEGRATIONS', 'MAJORITY_OWNER'].includes(user?.role || '');

  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Failed to fetch projects');
      return response.json();
    },
    enabled: isAuthenticated,
  });

  const syncMutation = useMutation<SyncResult>({
    mutationFn: async () => {
      const response = await fetch('/api/raken/sync', { method: 'POST' });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Sync failed');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setSyncMessage({
        type: 'success',
        text: `Raken sync complete: ${data.created} created, ${data.updated} updated out of ${data.synced} projects.`,
      });
    },
    onError: (error: Error) => {
      setSyncMessage({
        type: 'error',
        text: error.message || 'Failed to sync projects from Raken.',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  const filteredProjects = projects.filter((p) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      (p.project_code || '').toLowerCase().includes(term) ||
      (p.project_name || '').toLowerCase().includes(term) ||
      (p.clark_rep || '').toLowerCase().includes(term)
    );
  });

  const formatSyncDate = (dateStr: string | null): string => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <AppLayout pageTitle="Projects">
      <div className="max-w-7xl mx-auto">
        {syncMessage && (
          <div
            className={`mb-6 rounded-lg border p-4 flex items-start gap-3 ${
              syncMessage.type === 'success'
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <svg
              className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                syncMessage.type === 'success' ? 'text-green-500' : 'text-red-500'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {syncMessage.type === 'success' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              )}
            </svg>
            <div className="flex-1">
              <p className={syncMessage.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                {syncMessage.text}
              </p>
            </div>
            <button
              onClick={() => setSyncMessage(null)}
              className={syncMessage.type === 'success' ? 'text-green-500 hover:text-green-700' : 'text-red-500 hover:text-red-700'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Projects</h1>
            <p className="text-sm text-slate-500">
              {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="inline-flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {syncMutation.isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              {syncMutation.isPending ? 'Syncing...' : 'Sync from Raken'}
            </button>
          )}
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-slate-700 mb-1">Search</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Project code, name, or Clark rep..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            {search && (
              <div className="flex items-end">
                <button
                  onClick={() => setSearch('')}
                  className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear filter
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          {projectsLoading ? (
            <div className="p-8 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="w-12 h-12 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <p className="text-slate-500 mb-2">No projects found</p>
              {search && (
                <p className="text-sm text-slate-400">Try adjusting your search terms.</p>
              )}
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Project Code</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Project Name</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">District</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Clark Rep</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-slate-700">Raken Status</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredProjects.map((project) => (
                      <tr key={project.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 text-sm font-mono font-medium text-slate-900">
                          {project.project_code}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {project.project_name || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {project.district_name || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {project.clark_rep || '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {project.raken_uuid ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Synced
                              {project.last_synced_at && (
                                <span className="ml-1 text-green-600 font-normal">
                                  {formatSyncDate(project.last_synced_at)}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-500">
                              Local Only
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 max-w-[200px] truncate">
                          {project.property_address || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y divide-slate-200">
                {filteredProjects.map((project) => (
                  <div key={project.id} className="p-4 hover:bg-slate-50 transition">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-mono font-medium text-slate-900">{project.project_code}</p>
                        <p className="text-sm text-slate-600">{project.project_name || '-'}</p>
                      </div>
                      {project.raken_uuid ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Synced
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-500">
                          Local Only
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-slate-400 text-xs">District</p>
                        <p className="text-slate-600">{project.district_name || '-'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs">Clark Rep</p>
                        <p className="text-slate-600">{project.clark_rep || '-'}</p>
                      </div>
                    </div>
                    {project.property_address && (
                      <p className="text-xs text-slate-400 mt-2 truncate">{project.property_address}</p>
                    )}
                    {project.raken_uuid && project.last_synced_at && (
                      <p className="text-xs text-green-600 mt-1">
                        Last synced: {formatSyncDate(project.last_synced_at)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
