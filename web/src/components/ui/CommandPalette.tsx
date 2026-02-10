'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface POResult {
  id: string;
  po_number: string;
  vendors: { vendor_name: string; vendor_code: string } | null;
  projects: { project_code: string; project_name: string } | null;
}

interface VendorResult {
  id: string;
  vendor_code: string;
  vendor_name: string;
}

interface ProjectResult {
  id: string;
  project_code: string;
  project_name: string;
}

interface ResultItem {
  id: string;
  type: 'po' | 'vendor' | 'project' | 'action';
  label: string;
  sublabel: string;
  href: string;
}

interface ResultGroup {
  title: string;
  items: ResultItem[];
}

const QUICK_ACTIONS: ResultItem[] = [
  {
    id: 'action-new-po',
    type: 'action',
    label: 'Create New PO',
    sublabel: 'Start a new purchase order',
    href: '/po/create',
  },
  {
    id: 'action-approvals',
    type: 'action',
    label: 'View Approvals',
    sublabel: 'Review pending approvals',
    href: '/approvals',
  },
];

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [groups, setGroups] = useState<ResultGroup[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allItems = groups.flatMap((g) => g.items);

  const resetState = useCallback(() => {
    setSearch('');
    setGroups([]);
    setSelectedIndex(0);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      resetState();
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, resetState]);

  useEffect(() => {
    if (!isOpen) return;

    const term = search.trim().toLowerCase();
    if (!term) {
      setGroups([]);
      setSelectedIndex(0);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const [posRes, vendorsRes, projectsRes] = await Promise.all([
          fetch(`/api/po?limit=20`).then((r) => (r.ok ? r.json() : [])),
          fetch('/api/vendors').then((r) => (r.ok ? r.json() : [])),
          fetch('/api/projects').then((r) => (r.ok ? r.json() : [])),
        ]);

        const resultGroups: ResultGroup[] = [];

        const poArray: POResult[] = Array.isArray(posRes) ? posRes : [];
        const filteredPOs = poArray
          .filter(
            (po) =>
              po.po_number?.toLowerCase().includes(term) ||
              po.vendors?.vendor_name?.toLowerCase().includes(term)
          )
          .slice(0, 5);

        if (filteredPOs.length > 0) {
          resultGroups.push({
            title: 'Purchase Orders',
            items: filteredPOs.map((po) => ({
              id: `po-${po.id}`,
              type: 'po' as const,
              label: po.po_number,
              sublabel: po.vendors?.vendor_name || 'No vendor',
              href: `/po/view?id=${po.id}`,
            })),
          });
        }

        const vendorArray: VendorResult[] = Array.isArray(vendorsRes) ? vendorsRes : [];
        const filteredVendors = vendorArray
          .filter(
            (v) =>
              v.vendor_name?.toLowerCase().includes(term) ||
              v.vendor_code?.toLowerCase().includes(term)
          )
          .slice(0, 5);

        if (filteredVendors.length > 0) {
          resultGroups.push({
            title: 'Vendors',
            items: filteredVendors.map((v) => ({
              id: `vendor-${v.id}`,
              type: 'vendor' as const,
              label: v.vendor_name,
              sublabel: v.vendor_code,
              href: `/vendors/${v.id}`,
            })),
          });
        }

        const projectArray: ProjectResult[] = Array.isArray(projectsRes) ? projectsRes : [];
        const filteredProjects = projectArray
          .filter(
            (p) =>
              p.project_code?.toLowerCase().includes(term) ||
              p.project_name?.toLowerCase().includes(term)
          )
          .slice(0, 5);

        if (filteredProjects.length > 0) {
          resultGroups.push({
            title: 'Projects',
            items: filteredProjects.map((p) => ({
              id: `project-${p.id}`,
              type: 'project' as const,
              label: p.project_code,
              sublabel: p.project_name,
              href: `/projects/${p.id}`,
            })),
          });
        }

        setGroups(resultGroups);
        setSelectedIndex(0);
      } catch {
        setGroups([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, isOpen]);

  const navigateTo = useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [onClose, router]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const items = search.trim() ? allItems : QUICK_ACTIONS;
      const count = items.length;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(count, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + Math.max(count, 1)) % Math.max(count, 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = items[selectedIndex];
        if (item) navigateTo(item.href);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [allItems, search, selectedIndex, navigateTo, onClose]
  );

  if (!isOpen) return null;

  const hasSearch = search.trim().length > 0;
  const showNoResults = hasSearch && !loading && allItems.length === 0;

  let flatIndex = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className="relative z-10 w-full max-w-lg rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
          <svg
            className="h-5 w-5 shrink-0 text-orange-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none"
            placeholder="Search POs, vendors, projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <kbd className="hidden sm:inline-flex items-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
            </div>
          )}

          {!hasSearch && !loading && (
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Quick Actions
              </div>
              {QUICK_ACTIONS.map((action, idx) => (
                <button
                  key={action.id}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                    selectedIndex === idx
                      ? 'bg-orange-50 border border-orange-200'
                      : 'border border-transparent hover:bg-slate-50'
                  }`}
                  onClick={() => navigateTo(action.href)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                    {action.id === 'action-new-po' ? (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-900">{action.label}</div>
                    <div className="text-xs text-slate-500">{action.sublabel}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {hasSearch && !loading && groups.map((group) => (
            <div key={group.title} className="p-2">
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {group.title}
              </div>
              {group.items.map((item) => {
                const currentIndex = flatIndex++;
                return (
                  <button
                    key={item.id}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                      selectedIndex === currentIndex
                        ? 'bg-orange-50 border border-orange-200'
                        : 'border border-transparent hover:bg-slate-50'
                    }`}
                    onClick={() => navigateTo(item.href)}
                    onMouseEnter={() => setSelectedIndex(currentIndex)}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                        item.type === 'po'
                          ? 'bg-orange-100 text-orange-600'
                          : item.type === 'vendor'
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-emerald-100 text-emerald-600'
                      }`}
                    >
                      {item.type === 'po' ? 'PO' : item.type === 'vendor' ? 'V' : 'P'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-900">{item.label}</div>
                      <div className="truncate text-xs text-slate-500">{item.sublabel}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}

          {showNoResults && (
            <div className="flex flex-col items-center justify-center py-10 px-4">
              <svg
                className="mb-3 h-10 w-10 text-slate-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <p className="text-sm font-medium text-slate-600">No results found</p>
              <p className="mt-1 text-xs text-slate-400">
                Try a different search term
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-4 border-t border-slate-200 bg-slate-50 px-4 py-2.5">
          <span className="text-[11px] text-slate-400">
            <kbd className="rounded border border-slate-300 bg-white px-1 py-0.5 font-mono text-[10px]">&uarr;</kbd>
            <kbd className="ml-0.5 rounded border border-slate-300 bg-white px-1 py-0.5 font-mono text-[10px]">&darr;</kbd>
            <span className="ml-1">to navigate</span>
          </span>
          <span className="text-[11px] text-slate-400">
            <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd>
            <span className="ml-1">to select</span>
          </span>
          <span className="text-[11px] text-slate-400">
            <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd>
            <span className="ml-1">to close</span>
          </span>
        </div>
      </div>
    </div>
  );
}
