'use client';

import { useState } from 'react';

interface Project {
  id: string;
  project_code: string;
  project_name: string;
  district_name: string | null;
  primary_division_id: string | null;
}

interface ProjectPickerProps {
  projects: Project[];
  loading: boolean;
  onSelect: (project: Project) => void;
}

export default function ProjectPicker({ projects, loading, onSelect }: ProjectPickerProps) {
  const [search, setSearch] = useState('');

  const filtered = projects.filter((p) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      p.project_name.toLowerCase().includes(term) ||
      p.project_code.toLowerCase().includes(term) ||
      (p.district_name || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Pick Project</h2>
        <p className="text-sm text-slate-500">Which project is this purchase for?</p>
      </div>

      <input
        type="text"
        placeholder="Search projects..."
        aria-label="Search projects"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
      />

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200">
          <svg className="mx-auto h-10 w-10 text-slate-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-slate-600 font-medium">No projects found</p>
          <p className="text-sm text-slate-500 mt-1">
            {search ? 'Try a different search term' : 'No projects for this division'}
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {filtered.map((project) => (
            <button
              key={project.id}
              onClick={() => onSelect(project)}
              className="w-full text-left p-4 rounded-xl border border-slate-200 bg-white hover:border-orange-300 hover:bg-orange-50/50 transition"
            >
              <p className="font-medium text-slate-900">{project.project_name}</p>
              <p className="text-sm text-slate-500">
                {project.project_code}
                {project.district_name ? ` \u2022 ${project.district_name}` : ''}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
