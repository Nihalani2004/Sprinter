import { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  Avatar,
  Divider,
  useMediaQuery,
  useTheme,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  ViewKanban as KanbanIcon,
  Task as TaskIcon,
  BugReport as BugIcon,
  Notifications as NotificationsPageIcon,
  Logout as LogoutIcon,
  RocketLaunch as RocketIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeContext';
import NotificationBell from './NotificationBell';
import Logo from './Logo';

const DRAWER_WIDTH = 260;

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
  { label: 'Sprint Board', path: '/board', icon: <KanbanIcon /> },
  { label: 'Tasks', path: '/tasks', icon: <TaskIcon /> },
  { label: 'Bugs', path: '/bugs', icon: <BugIcon /> },
  { label: 'Notifications', path: '/notifications', icon: <NotificationsPageIcon /> },
];

const roleColors = {
  Manager: '#6C63FF',
  Developer: '#00D9FF',
  Tester: '#00E676',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const isDark = mode === 'dark';

  const handleNav = (path) => {
    navigate(path);
    if (isMobile) setMobileOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Logo size={40} />
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.1rem', lineHeight: 1.2 }}>
            Sprint Tracker
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
            Agile Management
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ mx: 2, opacity: 0.15 }} />

      {/* Navigation */}
      <List sx={{ flex: 1, px: 1.5, py: 2 }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => handleNav(item.path)}
                sx={{
                  borderRadius: 2.5,
                  py: 1.2,
                  px: 2,
                  background: isActive
                    ? isDark
                      ? 'linear-gradient(135deg, rgba(108,99,255,0.15), rgba(0,217,255,0.08))'
                      : 'linear-gradient(135deg, rgba(91,82,224,0.1), rgba(0,151,178,0.06))'
                    : 'transparent',
                  border: isActive
                    ? isDark
                      ? '1px solid rgba(108,99,255,0.2)'
                      : '1px solid rgba(91,82,224,0.15)'
                    : '1px solid transparent',
                  '&:hover': {
                    background: isActive
                      ? isDark
                        ? 'linear-gradient(135deg, rgba(108,99,255,0.2), rgba(0,217,255,0.12))'
                        : 'linear-gradient(135deg, rgba(91,82,224,0.14), rgba(0,151,178,0.08))'
                      : isDark
                        ? 'rgba(148, 163, 184, 0.06)'
                        : 'rgba(0, 0, 0, 0.04)',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 38,
                    color: isActive ? 'primary.main' : 'text.secondary',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: isActive ? 600 : 400,
                    fontSize: '0.9rem',
                    color: isActive ? 'text.primary' : 'text.secondary',
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ mx: 2, opacity: 0.15 }} />

      {/* Theme toggle */}
      <Box sx={{ px: 2, py: 1.5 }}>
        <ListItemButton
          onClick={toggleTheme}
          sx={{
            borderRadius: 2.5,
            py: 1,
            px: 2,
            transition: 'all 0.2s ease',
            '&:hover': {
              background: isDark ? 'rgba(148, 163, 184, 0.06)' : 'rgba(0, 0, 0, 0.04)',
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 38, color: 'text.secondary' }}>
            {isDark ? <LightModeIcon /> : <DarkModeIcon />}
          </ListItemIcon>
          <ListItemText
            primary={isDark ? 'Light Mode' : 'Dark Mode'}
            primaryTypographyProps={{
              fontSize: '0.85rem',
              color: 'text.secondary',
              fontWeight: 500,
            }}
          />
        </ListItemButton>
      </Box>

      {/* User section */}
      <Box sx={{ p: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 1.5,
            borderRadius: 2.5,
            background: isDark ? 'rgba(148, 163, 184, 0.05)' : 'rgba(0, 0, 0, 0.03)',
          }}
        >
          <Avatar
            sx={{
              width: 36,
              height: 36,
              background: `linear-gradient(135deg, ${roleColors[user?.role] || '#6C63FF'}, ${roleColors[user?.role] || '#6C63FF'}88)`,
              fontSize: '0.85rem',
              fontWeight: 700,
            }}
          >
            {user?.username?.[0]?.toUpperCase() || '?'}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }} noWrap>
              {user?.username}
            </Typography>
            <Chip
              label={user?.role}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.65rem',
                mt: 0.3,
                background: `${roleColors[user?.role] || '#6C63FF'}20`,
                color: roleColors[user?.role] || '#6C63FF',
                border: `1px solid ${roleColors[user?.role] || '#6C63FF'}30`,
              }}
            />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <NotificationBell />
            <Tooltip title="Logout">
              <IconButton size="small" onClick={handleLogout} sx={{ color: 'text.secondary' }}>
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        background: (t) => t.palette.background.default,
        transition: 'background-color 0.35s ease',
      }}
    >
      {/* Mobile AppBar */}
      {isMobile && (
        <AppBar
          position="fixed"
          sx={{
            background: isDark
              ? 'rgba(13, 17, 23, 0.9)'
              : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px)',
            borderBottom: (t) => `1px solid ${t.palette.divider}`,
            boxShadow: 'none',
          }}
        >
          <Toolbar>
            <IconButton
              edge="start"
              onClick={() => setMobileOpen(!mobileOpen)}
              sx={{ color: 'text.primary' }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ fontWeight: 700, ml: 1, flex: 1 }}>
              Sprint Tracker
            </Typography>
            <Tooltip title={isDark ? 'Light Mode' : 'Dark Mode'}>
              <IconButton onClick={toggleTheme} sx={{ color: 'text.secondary', mr: 0.5 }}>
                {isDark ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            <NotificationBell />
          </Toolbar>
        </AppBar>
      )}

      {/* Sidebar Drawer */}
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? mobileOpen : true}
        onClose={() => setMobileOpen(false)}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3, md: 4 },
          mt: isMobile ? 8 : 0,
          minHeight: '100vh',
          overflow: 'auto',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
