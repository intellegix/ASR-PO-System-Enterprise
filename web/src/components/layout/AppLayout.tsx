'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleDisplayName, isAdmin, type UserRole } from '@/lib/auth/permissions';
import { CommandPalette } from '@/components/ui/CommandPalette';
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SettingsIcon from '@mui/icons-material/Settings';

const SIDEBAR_WIDTH = 288;

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface AppLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
}

export default function AppLayout({ children, pageTitle }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        router.push('/po/create');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  const role = (user?.role || 'DIVISION_LEADER') as UserRole;
  const userIsAdmin = isAdmin(role);

  const { data: pendingData } = useQuery({
    queryKey: ['pending-count'],
    queryFn: async () => {
      const response = await fetch('/api/dashboards/pending-approvals?limit=1');
      if (!response.ok) return { summary: { total: 0 } };
      return response.json();
    },
    refetchInterval: 30 * 1000,
    staleTime: 15 * 1000,
  });

  const pendingCount = pendingData?.summary?.total || 0;

  const navItems: NavItem[] = [
    { href: '/', label: 'Dashboard', icon: <BarChartOutlinedIcon /> },
    { href: '/po', label: 'Purchase Orders', icon: <DescriptionOutlinedIcon /> },
    { href: '/approvals', label: 'Approvals', icon: <CheckCircleOutlineIcon />, badge: pendingCount },
    { href: '/work-orders', label: 'Work Orders', icon: <AssignmentOutlinedIcon /> },
    { href: '/vendors', label: 'Vendors', icon: <SwapHorizIcon /> },
    { href: '/clients', label: 'Clients', icon: <PeopleOutlineIcon /> },
    { href: '/invoices', label: 'Invoices', icon: <DescriptionOutlinedIcon /> },
    { href: '/invoice-archive', label: 'Invoice Archive', icon: <ArchiveOutlinedIcon /> },
    { href: '/reports', label: 'Reports', icon: <BarChartOutlinedIcon /> },
    { href: '/audit', label: 'Audit Trail', icon: <SecurityOutlinedIcon /> },
  ];

  const isActive = (href: string): boolean => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  const sidebarContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#0f172a' }}>
      {/* Logo header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2.5, borderBottom: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 40, height: 40, bgcolor: 'primary.main', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DescriptionOutlinedIcon sx={{ color: 'white' }} />
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'white', lineHeight: 1.3 }}>ASR PO System</Typography>
            <Typography variant="caption" sx={{ color: 'rgba(148,163,184,1)' }}>All Surface Roofing</Typography>
          </Box>
        </Box>
        <IconButton
          onClick={() => setSidebarOpen(false)}
          sx={{ display: { lg: 'none' }, color: 'rgba(148,163,184,1)' }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Navigation */}
      <Box component="nav" aria-label="Main navigation" data-testid="sidebar-nav" sx={{ flex: 1, px: 2, py: 3, overflowY: 'auto' }}>
        <List disablePadding data-testid="nav-main-list">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <ListItem key={item.href} disablePadding sx={{ mb: 0.25 }}>
                <ListItemButton
                  component={Link}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  sx={{
                    borderRadius: 2,
                    py: 1.25,
                    px: 2,
                    color: active ? 'white' : 'rgba(148,163,184,1)',
                    bgcolor: active ? 'rgba(30,41,59,1)' : 'transparent',
                    '&:hover': {
                      bgcolor: 'rgba(30,41,59,1)',
                      color: 'white',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ variant: 'body2', fontWeight: active ? 500 : 400 }}
                  />
                  {item.badge !== undefined && item.badge > 0 && (
                    <Badge
                      badgeContent={item.badge}
                      sx={{
                        '& .MuiBadge-badge': {
                          bgcolor: '#f59e0b',
                          color: 'white',
                          fontWeight: 700,
                          fontSize: '0.7rem',
                          position: 'static',
                          transform: 'none',
                        },
                      }}
                    />
                  )}
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>

        {userIsAdmin && (
          <Box data-testid="admin-nav-section">
            <Box sx={{ mt: 3, mb: 1, px: 2 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'rgba(100,116,139,1)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Admin
              </Typography>
            </Box>
            <List disablePadding data-testid="nav-admin-list">
              {[
                { href: '/projects', label: 'Projects', icon: <BusinessOutlinedIcon /> },
                { href: '/admin/users', label: 'Users', icon: <AdminPanelSettingsIcon /> },
                { href: '/admin/divisions', label: 'Divisions', icon: <BusinessOutlinedIcon /> },
                { href: '/admin/settings', label: 'Settings', icon: <SettingsIcon /> },
              ].map((item) => {
                const active = isActive(item.href);
                return (
                  <ListItem key={item.href} disablePadding sx={{ mb: 0.25 }}>
                    <ListItemButton
                      component={Link}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      aria-current={active ? 'page' : undefined}
                      sx={{
                        borderRadius: 2,
                        py: 1.25,
                        px: 2,
                        color: active ? 'white' : 'rgba(148,163,184,1)',
                        bgcolor: active ? 'rgba(30,41,59,1)' : 'transparent',
                        '&:hover': {
                          bgcolor: 'rgba(30,41,59,1)',
                          color: 'white',
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: active ? 500 : 400 }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Box>
        )}
      </Box>

      {/* User footer */}
      <Box sx={{ px: 2, py: 2, borderTop: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5 }}>
          <Avatar sx={{ width: 40, height: 40, bgcolor: 'rgba(51,65,85,1)' }}>
            <PersonOutlineIcon />
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 500, color: 'white' }} noWrap>
              {user?.name || 'User'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(148,163,184,1)' }}>
              {getRoleDisplayName(role)}
            </Typography>
          </Box>
        </Box>
        <ListItemButton
          onClick={() => {
            logout();
            router.push('/login');
          }}
          sx={{
            borderRadius: 2,
            py: 1.25,
            px: 2,
            color: 'rgba(148,163,184,1)',
            '&:hover': {
              bgcolor: 'rgba(30,41,59,1)',
              color: 'white',
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Sign Out" primaryTypographyProps={{ variant: 'body2' }} />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.100' }}>
      {/* Mobile sidebar (Drawer) */}
      <Drawer
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        sx={{
          display: { lg: 'none' },
          '& .MuiDrawer-paper': {
            width: SIDEBAR_WIDTH,
            border: 'none',
          },
        }}
      >
        {sidebarContent}
      </Drawer>

      {/* Desktop sidebar (permanent) */}
      <Box
        component="aside"
        sx={{
          display: { xs: 'none', lg: 'block' },
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: SIDEBAR_WIDTH,
          zIndex: 50,
        }}
      >
        {sidebarContent}
      </Box>

      {/* Main content area */}
      <Box sx={{ pl: { xs: 0, lg: `${SIDEBAR_WIDTH}px` } }}>
        {/* Mobile header */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            display: { lg: 'none' },
            bgcolor: 'white',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <IconButton onClick={() => setSidebarOpen(true)} sx={{ color: 'text.secondary' }}>
              <MenuIcon />
            </IconButton>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {pageTitle || 'ASR PO System'}
            </Typography>
            <Box sx={{ width: 40 }} />
          </Toolbar>
        </AppBar>

        <Box component="main" id="main-content" sx={{ p: { xs: 2, lg: 4 } }}>
          {children}
        </Box>
      </Box>

      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
    </Box>
  );
}
