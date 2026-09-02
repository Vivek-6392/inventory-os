import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Button,
  Avatar,
  Divider,
  Badge,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Inventory2 as InventoryIcon,
  SwapHoriz as MovementsIcon,
  LocationOn as LocationIcon,
  People as PeopleIcon,
  FileUpload as ImportIcon,
  Warning as AlertIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useColorMode } from '../contexts/ThemeContext';
import api from '../services/api';

const DRAWER_WIDTH = 260;

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactElement;
  managerOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: <DashboardIcon /> },
  { label: 'Items', path: '/items', icon: <InventoryIcon /> },
  { label: 'Movements', path: '/movements', icon: <MovementsIcon /> },
  { label: 'Locations', path: '/locations', icon: <LocationIcon /> },
  { label: 'Users', path: '/users', icon: <PeopleIcon />, managerOnly: true },
  { label: 'Import / Export', path: '/import-export', icon: <ImportIcon /> },
];

const Layout: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isManager } = useAuth();
  const { mode, toggleColorMode } = useColorMode();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    const fetchAlertCount = async () => {
      try {
        const res = await api.get('/alerts/count');
        setAlertCount(res.data.count);
      } catch {
        // Silently fail if alerts endpoint not ready yet
      }
    };
    fetchAlertCount();
    const interval = setInterval(fetchAlertCount, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredNavItems = navItems.filter(
    (item) => !item.managerOnly || isManager
  );

  const drawer = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${theme.palette.background.paper} 100%)`,
      }}
    >
      {/* Logo */}
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: 16,
            color: '#fff',
          }}
        >
          IS
        </Box>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            InvStock
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
            Inventory Control
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ mx: 2 }} />

      {/* Nav Items */}
      <List sx={{ flex: 1, px: 1.5, pt: 1 }}>
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => {
                  navigate(item.path);
                  setMobileOpen(false);
                }}
                sx={{
                  borderRadius: 2,
                  py: 1.2,
                  px: 2,
                  ...(isActive && {
                    backgroundColor: alpha(theme.palette.primary.main, 0.15),
                    '& .MuiListItemIcon-root': {
                      color: theme.palette.primary.main,
                    },
                    '& .MuiListItemText-primary': {
                      color: theme.palette.primary.light,
                      fontWeight: 600,
                    },
                  }),
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontSize: '0.9rem' }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}

        {/* Alerts nav item with badge */}
        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <ListItemButton
            onClick={() => {
              navigate('/alerts');
              setMobileOpen(false);
            }}
            sx={{
              borderRadius: 2,
              py: 1.2,
              px: 2,
              ...(location.pathname === '/alerts' && {
                backgroundColor: alpha(theme.palette.warning.main, 0.15),
                '& .MuiListItemIcon-root': {
                  color: theme.palette.warning.main,
                },
                '& .MuiListItemText-primary': {
                  color: theme.palette.warning.light,
                  fontWeight: 600,
                },
              }),
              '&:hover': {
                backgroundColor: alpha(theme.palette.warning.main, 0.08),
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
              <Badge
                badgeContent={alertCount}
                color="warning"
                max={99}
                sx={{
                  '& .MuiBadge-badge': {
                    fontSize: '0.7rem',
                    fontWeight: 700,
                  },
                }}
              >
                <AlertIcon />
              </Badge>
            </ListItemIcon>
            <ListItemText
              primary="Low Stock Alerts"
              primaryTypographyProps={{ fontSize: '0.9rem' }}
            />
          </ListItemButton>
        </ListItem>
      </List>

      {/* User info, Mode Toggle & Logout at bottom left */}
      <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1.2,
            p: 1.5,
            borderRadius: 2.5,
            backgroundColor: alpha(theme.palette.primary.main, mode === 'dark' ? 0.08 : 0.04),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
          }}
        >
          {/* User Profile Info */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
            <Avatar
              sx={{
                width: 38,
                height: 38,
                bgcolor: theme.palette.primary.main,
                fontSize: '0.9rem',
                fontWeight: 700,
              }}
            >
              {user?.name?.charAt(0)?.toUpperCase() || '?'}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.2 }} noWrap>
                {user?.name}
              </Typography>
              <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700, fontSize: '0.68rem', display: 'block', textTransform: 'uppercase' }}>
                {user?.role}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.68rem', display: 'block' }} noWrap title={user?.email}>
                {user?.email}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 0.2, opacity: 0.6 }} />

          {/* Both Mode Option and Logout placed directly below Username */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            {/* Theme Mode Toggle */}
            <Button
              fullWidth
              size="small"
              onClick={toggleColorMode}
              startIcon={
                mode === 'dark' ? (
                  <LightModeIcon sx={{ color: '#FFB74D', fontSize: 17 }} />
                ) : (
                  <DarkModeIcon sx={{ color: theme.palette.primary.main, fontSize: 17 }} />
                )
              }
              sx={{
                py: 0.6,
                px: 1,
                borderRadius: 2,
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'none',
                color: 'text.primary',
                backgroundColor: alpha(theme.palette.primary.main, mode === 'dark' ? 0.1 : 0.06),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, mode === 'dark' ? 0.18 : 0.12),
                },
              }}
            >
              {mode === 'dark' ? 'Light' : 'Dark'}
            </Button>

            {/* Logout Button */}
            <Button
              fullWidth
              size="small"
              onClick={handleLogout}
              startIcon={<LogoutIcon sx={{ fontSize: 16 }} />}
              sx={{
                py: 0.6,
                px: 1,
                borderRadius: 2,
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'none',
                color: theme.palette.error.main,
                backgroundColor: alpha(theme.palette.error.main, 0.06),
                border: `1px solid ${alpha(theme.palette.error.main, 0.15)}`,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.error.main, 0.14),
                },
              }}
            >
              Logout
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Sidebar */}
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
          }}
        >
          {drawer}
        </Drawer>
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Top bar (only displayed on mobile for drawer toggle) */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            display: { xs: 'block', md: 'none' },
            bgcolor: alpha(theme.palette.background.default, 0.85),
            color: 'text.primary',
            backdropFilter: 'blur(20px)',
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Toolbar sx={{ minHeight: 56 }}>
            <IconButton
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, color: 'text.primary' }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              InvStock
            </Typography>
          </Toolbar>
        </AppBar>

        {/* Page content */}
        <Box sx={{ flex: 1, p: { xs: 2, sm: 3 }, overflow: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
