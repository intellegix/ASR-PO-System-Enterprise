'use client';

import { createTheme } from '@mui/material/styles';

// ASR PO System theme — orange-500 primary, slate surface, Geist font
const theme = createTheme({
  palette: {
    primary: {
      main: '#f97316',     // orange-500
      light: '#fb923c',    // orange-400
      dark: '#ea580c',     // orange-600
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#475569',     // slate-600
      light: '#64748b',    // slate-500
      dark: '#334155',     // slate-700
    },
    background: {
      default: '#f8fafc',  // slate-50
      paper: '#ffffff',
    },
    error: {
      main: '#ef4444',     // red-500
    },
    warning: {
      main: '#f59e0b',     // amber-500
    },
    success: {
      main: '#22c55e',     // green-500
    },
    info: {
      main: '#3b82f6',     // blue-500
    },
    text: {
      primary: '#0f172a',  // slate-900
      secondary: '#64748b', // slate-500
    },
    divider: '#e2e8f0',    // slate-200
  },
  typography: {
    fontFamily: 'var(--font-geist-sans), "Inter", "Helvetica Neue", Arial, sans-serif',
    h1: { fontWeight: 700, fontSize: '2rem', lineHeight: 1.2 },
    h2: { fontWeight: 700, fontSize: '1.5rem', lineHeight: 1.3 },
    h3: { fontWeight: 600, fontSize: '1.25rem', lineHeight: 1.4 },
    h4: { fontWeight: 600, fontSize: '1.125rem', lineHeight: 1.4 },
    h5: { fontWeight: 600, fontSize: '1rem', lineHeight: 1.5 },
    h6: { fontWeight: 600, fontSize: '0.875rem', lineHeight: 1.5 },
    body1: { fontSize: '0.875rem', lineHeight: 1.5 },
    body2: { fontSize: '0.8125rem', lineHeight: 1.5 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 640,     // matches Tailwind sm
      md: 768,     // matches Tailwind md
      lg: 1024,    // matches Tailwind lg
      xl: 1280,    // matches Tailwind xl
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
        },
        containedPrimary: {
          '&:hover': {
            backgroundColor: '#ea580c', // orange-600
          },
        },
      },
      defaultProps: {
        disableElevation: true,
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
      defaultProps: {
        elevation: 0,
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: '0.75rem',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: 'small',
        variant: 'outlined',
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          color: '#475569',     // slate-600
          backgroundColor: '#f8fafc', // slate-50
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRadius: 0,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          borderRadius: 0,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
        },
      },
    },
  },
});

export default theme;
