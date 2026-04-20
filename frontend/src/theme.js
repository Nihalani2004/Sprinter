import { createTheme } from '@mui/material/styles';

const sharedTypography = {
  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  h1: { fontWeight: 800, letterSpacing: '-0.02em' },
  h2: { fontWeight: 700, letterSpacing: '-0.01em' },
  h3: { fontWeight: 700 },
  h4: { fontWeight: 600 },
  h5: { fontWeight: 600 },
  h6: { fontWeight: 600 },
  button: { fontWeight: 600, textTransform: 'none' },
};

const sharedShape = { borderRadius: 12 };

const darkPalette = {
  mode: 'dark',
  primary: {
    main: '#6C63FF',
    light: '#8B83FF',
    dark: '#4A42CC',
  },
  secondary: {
    main: '#00D9FF',
    light: '#33E1FF',
    dark: '#00A3BF',
  },
  success: {
    main: '#00E676',
    light: '#66FF99',
    dark: '#00C853',
  },
  warning: {
    main: '#FFB74D',
    light: '#FFD180',
    dark: '#FF9800',
  },
  error: {
    main: '#FF5252',
    light: '#FF8A80',
    dark: '#D32F2F',
  },
  background: {
    default: '#0A0E1A',
    paper: '#111827',
  },
  text: {
    primary: '#F1F5F9',
    secondary: '#94A3B8',
  },
  divider: 'rgba(148, 163, 184, 0.12)',
};

const lightPalette = {
  mode: 'light',
  primary: {
    main: '#5B52E0',
    light: '#7C73FF',
    dark: '#3D35B0',
  },
  secondary: {
    main: '#0097B2',
    light: '#00BCD4',
    dark: '#007A8A',
  },
  success: {
    main: '#2E7D32',
    light: '#4CAF50',
    dark: '#1B5E20',
  },
  warning: {
    main: '#ED6C02',
    light: '#FF9800',
    dark: '#E65100',
  },
  error: {
    main: '#D32F2F',
    light: '#EF5350',
    dark: '#C62828',
  },
  background: {
    default: '#F5F7FA',
    paper: '#FFFFFF',
  },
  text: {
    primary: '#1E293B',
    secondary: '#64748B',
  },
  divider: 'rgba(0, 0, 0, 0.08)',
};

function getComponents(mode) {
  const isDark = mode === 'dark';

  return {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '10px 24px',
          fontSize: '0.9rem',
          boxShadow: 'none',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: isDark
              ? '0 4px 20px rgba(108, 99, 255, 0.3)'
              : '0 4px 20px rgba(91, 82, 224, 0.2)',
          },
        },
        containedPrimary: {
          background: isDark
            ? 'linear-gradient(135deg, #6C63FF 0%, #8B83FF 100%)'
            : 'linear-gradient(135deg, #5B52E0 0%, #7C73FF 100%)',
          color: '#FFFFFF',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: isDark
            ? 'rgba(17, 24, 39, 0.8)'
            : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(20px)',
          border: isDark
            ? '1px solid rgba(148, 163, 184, 0.1)'
            : '1px solid rgba(0, 0, 0, 0.06)',
          boxShadow: isDark
            ? '0 8px 32px rgba(0, 0, 0, 0.3)'
            : '0 4px 24px rgba(0, 0, 0, 0.06)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          transition: 'background-color 0.3s ease, box-shadow 0.3s ease',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            transition: 'all 0.2s ease',
            '& fieldset': {
              borderColor: isDark
                ? 'rgba(148, 163, 184, 0.2)'
                : 'rgba(0, 0, 0, 0.15)',
              transition: 'border-color 0.2s ease',
            },
            '&:hover fieldset': {
              borderColor: isDark ? '#6C63FF' : '#5B52E0',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 8,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: isDark ? '#0D1117' : '#FFFFFF',
          borderRight: isDark
            ? '1px solid rgba(148, 163, 184, 0.08)'
            : '1px solid rgba(0, 0, 0, 0.06)',
          transition: 'background-color 0.3s ease',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: isDark ? '#111827' : '#FFFFFF',
          backgroundImage: 'none',
          borderRadius: 16,
          border: isDark
            ? '1px solid rgba(148, 163, 184, 0.1)'
            : '1px solid rgba(0, 0, 0, 0.06)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: isDark
            ? '1px solid rgba(148, 163, 184, 0.08)'
            : '1px solid rgba(0, 0, 0, 0.06)',
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
          borderRadius: 12,
          border: isDark
            ? '1px solid rgba(148, 163, 184, 0.12)'
            : '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: isDark
            ? '0 16px 48px rgba(0, 0, 0, 0.4)'
            : '0 8px 32px rgba(0, 0, 0, 0.12)',
        },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: {
          backgroundColor: isDark
            ? 'rgba(148, 163, 184, 0.08)'
            : 'rgba(0, 0, 0, 0.06)',
        },
      },
    },
  };
}

export function getTheme(mode = 'light') {
  const palette = mode === 'dark' ? darkPalette : lightPalette;
  const isDark = mode === 'dark';

  return createTheme({
    palette,
    typography: {
      ...sharedTypography,
      subtitle1: { fontWeight: 500, color: palette.text.secondary },
      subtitle2: { fontWeight: 500, color: palette.text.secondary },
    },
    shape: sharedShape,
    components: getComponents(mode),
  });
}

// Default export for backward compatibility
const theme = getTheme('light');
export default theme;
