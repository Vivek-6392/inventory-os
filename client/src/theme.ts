import { createTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';

export const getAppTheme = (mode: 'dark' | 'light'): Theme => {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isDark ? '#6C63FF' : '#4F46E5',
        light: isDark ? '#8B83FF' : '#6366F1',
        dark: isDark ? '#4A42CC' : '#3730A3',
      },
      secondary: {
        main: isDark ? '#00D9A6' : '#059669',
        light: isDark ? '#33E0B8' : '#10B981',
        dark: isDark ? '#00AD85' : '#047857',
      },
      background: {
        default: isDark ? '#0A0E1A' : '#F8FAFC',
        paper: isDark ? '#121829' : '#FFFFFF',
      },
      error: {
        main: isDark ? '#FF5252' : '#DC2626',
      },
      warning: {
        main: isDark ? '#FFB74D' : '#D97706',
      },
      success: {
        main: isDark ? '#00D9A6' : '#16A34A',
      },
      text: {
        primary: isDark ? '#E8EAED' : '#0F172A',
        secondary: isDark ? '#9AA0B2' : '#64748B',
      },
      divider: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h4: {
        fontWeight: 800,
        letterSpacing: '-0.02em',
      },
      h5: {
        fontWeight: 700,
        letterSpacing: '-0.01em',
      },
      h6: {
        fontWeight: 700,
      },
      subtitle1: {
        fontWeight: 600,
      },
      body2: {
        color: isDark ? '#9AA0B2' : '#64748B',
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 10,
            padding: '8px 20px',
          },
          contained: {
            boxShadow: isDark
              ? '0 4px 14px 0 rgba(108, 99, 255, 0.39)'
              : '0 4px 14px 0 rgba(79, 70, 229, 0.25)',
            '&:hover': {
              boxShadow: isDark
                ? '0 6px 20px 0 rgba(108, 99, 255, 0.5)'
                : '0 6px 20px 0 rgba(79, 70, 229, 0.35)',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.06)',
            boxShadow: isDark ? 'none' : '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.06)',
            boxShadow: isDark ? 'none' : '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: isDark ? '0 8px 25px rgba(0, 0, 0, 0.3)' : '0 10px 25px rgba(0, 0, 0, 0.08)',
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 10,
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 500,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 700,
            color: isDark ? '#9AA0B2' : '#64748B',
            borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
          },
          body: {
            borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.04)' : '1px solid rgba(0, 0, 0, 0.04)',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            border: 'none',
            borderRight: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.06)',
            backgroundColor: isDark ? '#121829' : '#FFFFFF',
          },
        },
      },
    },
  });
};

export default getAppTheme('dark');
