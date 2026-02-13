'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  Box,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  CircularProgress,
  Chip,
  Divider,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';

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

  const hasSearch = search.trim().length > 0;
  const showNoResults = hasSearch && !loading && allItems.length === 0;

  let flatIndex = 0;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
          mt: '15vh',
        },
      }}
      onKeyDown={handleKeyDown}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: 1, borderColor: 'divider', px: 2, py: 1.5 }}>
        <SearchIcon sx={{ fontSize: 20, flexShrink: 0, color: 'primary.main' }} />
        <TextField
          inputRef={inputRef}
          type="text"
          placeholder="Search POs, vendors, projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
          variant="standard"
          InputProps={{
            disableUnderline: true,
            sx: { fontSize: '0.875rem' },
            endAdornment: (
              <InputAdornment position="end" sx={{ display: { xs: 'none', sm: 'flex' } }}>
                <Typography
                  component="kbd"
                  sx={{
                    fontSize: '0.625rem',
                    fontWeight: 500,
                    color: 'text.disabled',
                    bgcolor: 'grey.50',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 0.5,
                    px: 0.75,
                    py: 0.25,
                  }}
                >
                  ESC
                </Typography>
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <Box sx={{ maxHeight: 320, overflowY: 'auto' }}>
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={20} />
          </Box>
        )}

        {!hasSearch && !loading && (
          <List sx={{ p: 1 }}>
            <Box sx={{ px: 1.5, py: 1, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>
              Quick Actions
            </Box>
            {QUICK_ACTIONS.map((action, idx) => (
              <ListItem key={action.id} disablePadding>
                <ListItemButton
                  selected={selectedIndex === idx}
                  onClick={() => navigateTo(action.href)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  sx={{
                    borderRadius: 2,
                    gap: 1.5,
                    ...(selectedIndex === idx && {
                      bgcolor: 'primary.lighter',
                      border: 1,
                      borderColor: 'primary.light',
                    }),
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 32,
                      height: 32,
                      flexShrink: 0,
                      borderRadius: 2,
                      bgcolor: 'primary.lighter',
                      color: 'primary.main',
                    }}
                  >
                    {action.id === 'action-new-po' ? (
                      <AddIcon sx={{ fontSize: 16 }} />
                    ) : (
                      <CheckCircleIcon sx={{ fontSize: 16 }} />
                    )}
                  </Box>
                  <ListItemText
                    primary={action.label}
                    secondary={action.sublabel}
                    primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
                    secondaryTypographyProps={{ fontSize: '0.75rem' }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}

        {hasSearch && !loading && groups.map((group) => (
          <List key={group.title} sx={{ p: 1 }}>
            <Box sx={{ px: 1.5, py: 1, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>
              {group.title}
            </Box>
            {group.items.map((item) => {
              const currentIndex = flatIndex++;
              return (
                <ListItem key={item.id} disablePadding>
                  <ListItemButton
                    selected={selectedIndex === currentIndex}
                    onClick={() => navigateTo(item.href)}
                    onMouseEnter={() => setSelectedIndex(currentIndex)}
                    sx={{
                      borderRadius: 2,
                      gap: 1.5,
                      ...(selectedIndex === currentIndex && {
                        bgcolor: 'primary.lighter',
                        border: 1,
                        borderColor: 'primary.light',
                      }),
                    }}
                  >
                    <Chip
                      label={
                        item.type === 'po'
                          ? 'PO'
                          : item.type === 'vendor'
                          ? 'V'
                          : 'P'
                      }
                      size="small"
                      sx={{
                        width: 32,
                        height: 32,
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        flexShrink: 0,
                        bgcolor:
                          item.type === 'po'
                            ? 'primary.lighter'
                            : item.type === 'vendor'
                            ? 'info.lighter'
                            : 'success.lighter',
                        color:
                          item.type === 'po'
                            ? 'primary.main'
                            : item.type === 'vendor'
                            ? 'info.main'
                            : 'success.main',
                      }}
                    />
                    <ListItemText
                      primary={item.label}
                      secondary={item.sublabel}
                      primaryTypographyProps={{
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        noWrap: true,
                      }}
                      secondaryTypographyProps={{ fontSize: '0.75rem', noWrap: true }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        ))}

        {showNoResults && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 5,
              px: 2,
            }}
          >
            <SearchIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1.5 }} />
            <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary' }}>
              No results found
            </Typography>
            <Typography variant="caption" sx={{ mt: 0.5, color: 'text.disabled' }}>
              Try a different search term
            </Typography>
          </Box>
        )}
      </Box>

      <Divider />

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          bgcolor: 'grey.50',
          px: 2,
          py: 1.25,
        }}
      >
        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.6875rem' }}>
          <Typography
            component="kbd"
            sx={{
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              borderRadius: 0.5,
              px: 0.5,
              py: 0.25,
              fontFamily: 'monospace',
              fontSize: '0.625rem',
            }}
          >
            &uarr;
          </Typography>
          <Typography
            component="kbd"
            sx={{
              ml: 0.25,
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              borderRadius: 0.5,
              px: 0.5,
              py: 0.25,
              fontFamily: 'monospace',
              fontSize: '0.625rem',
            }}
          >
            &darr;
          </Typography>
          <Typography component="span" sx={{ ml: 0.5 }}>
            to navigate
          </Typography>
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.6875rem' }}>
          <Typography
            component="kbd"
            sx={{
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              borderRadius: 0.5,
              px: 0.75,
              py: 0.25,
              fontFamily: 'monospace',
              fontSize: '0.625rem',
            }}
          >
            Enter
          </Typography>
          <Typography component="span" sx={{ ml: 0.5 }}>
            to select
          </Typography>
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.6875rem' }}>
          <Typography
            component="kbd"
            sx={{
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              borderRadius: 0.5,
              px: 0.75,
              py: 0.25,
              fontFamily: 'monospace',
              fontSize: '0.625rem',
            }}
          >
            Esc
          </Typography>
          <Typography component="span" sx={{ ml: 0.5 }}>
            to close
          </Typography>
        </Typography>
      </Box>
    </Dialog>
  );
}
