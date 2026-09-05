import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Box,
  Card,
  Typography,
  Button,
  IconButton,
  Chip,
  Stack,
  Divider,
  Alert,
  Tooltip,
  Paper,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  ToggleButtonGroup,
  ToggleButton,
  Avatar,
  AvatarGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  Drawer,
  Menu,
  ListItemIcon,
  ListItemText,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  LocationOn as LocationIcon,
  People as PeopleIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  SwapHoriz as MovementsIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  GridView as GridViewIcon,
  ViewList as TableViewIcon,
  Map as MapViewIcon,
  Refresh as RefreshIcon,
  Inventory2 as InventoryIcon,
  Warehouse as WarehouseIcon,
  Visibility as VisibilityIcon,
  MoreVert as MoreVertIcon,
  PersonAdd as PersonAddIcon,
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
  Storefront as StoreIcon,
  LocalShipping as ShippingIcon,
  AcUnit as ColdIcon,
  AssignmentReturn as ReturnsIcon,
  TrendingUp as TrendingUpIcon,
  ZoomIn as ZoomInIcon,
  Explore as ExploreIcon,
  CheckCircle as CheckCircleIcon,
  PauseCircle as PauseCircleIcon,
} from '@mui/icons-material';
import type { Location, StaffBrief } from '../types';
import { getLocations, deleteLocation, updateLocation } from '../services/locations';
import { useAuth } from '../contexts/AuthContext';
import { LocationDialog } from '../components/LocationDialog';
import { formatDateIST } from '../utils/date';
import { AssignStaffDialog } from '../components/AssignStaffDialog';

// Avatar color hash helper
const stringToColor = (string: string) => {
  let hash = 0;
  for (let i = 0; i < string.length; i += 1) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    '#4F46E5', '#059669', '#D97706', '#DC2626', '#7C3AED',
    '#2563EB', '#0891B2', '#0D9488', '#EA580C', '#475569',
  ];
  return colors[Math.abs(hash) % colors.length];
};

const getInitials = (name: string) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Curated high-res imagery matching facility types with robust SVG fallback
const DEFAULT_FACILITY_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='00 200 200'%3E%3Crect width='200' height='200' fill='%23EEF2FF'/%3E%3Cpath d='M40 160V80l60-40 60 40v80H40zm20-20h20v-30H60v30zm60 0h20v-30h-20v30z' fill='%234F46E5' fill-opacity='0.6'/%3E%3C/svg%3E";

interface FacilityMeta {
  type: string;
  city: string;
  image: string;
  lat: number;
  lng: number;
}

const LOCATION_METADATA: Record<string, FacilityMeta> = {
  'Cold Storage Facility': {
    type: 'Warehouse',
    city: 'Gurugram, Haryana',
    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&q=80',
    lat: 28.4595,
    lng: 77.0266,
  },
  'Main Warehouse': {
    type: 'Warehouse',
    city: 'Delhi, NCR',
    image: 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=400&q=80',
    lat: 28.6139,
    lng: 77.2090,
  },
  'North Distribution Center': {
    type: 'Distribution',
    city: 'Delhi, NCR',
    image: 'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=400&q=80',
    lat: 28.7972,
    lng: 77.1332,
  },
  'Quarantine & Returns Depot': {
    type: 'Processing',
    city: 'Noida, Uttar Pradesh',
    image: 'https://images.unsplash.com/photo-1566576912321-d58ddd74b0e8?auto=format&fit=crop&w=400&q=80',
    lat: 28.6270,
    lng: 77.3725,
  },
  'Retail Floor A': {
    type: 'Retail',
    city: 'Connaught Place, Delhi',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=400&q=80',
    lat: 28.6315,
    lng: 77.2167,
  },
  'Retail Floor B': {
    type: 'Retail',
    city: 'Noida, Uttar Pradesh',
    image: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&w=400&q=80',
    lat: 28.5677,
    lng: 77.3211,
  },
  'South Fulfillment Hub': {
    type: 'Fulfillment',
    city: 'Bengaluru, Karnataka',
    image: 'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&w=400&q=80',
    lat: 12.9716,
    lng: 77.5946,
  },
  'West Logistics Depot': {
    type: 'Logistics',
    city: 'Mumbai, Maharashtra',
    image: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=400&q=80',
    lat: 18.9438,
    lng: 72.9515,
  },
};

const getFacilityMeta = (loc: Location): FacilityMeta => {
  const defaultCatalog = LOCATION_METADATA[loc.name];

  const nameLower = loc.name.toLowerCase();
  const descLower = `${loc.description || ''} ${loc.address || ''}`.toLowerCase();

  // 1. Type
  let type = loc.type || defaultCatalog?.type || 'Warehouse';
  if (!loc.type && !defaultCatalog) {
    if (nameLower.includes('retail') || nameLower.includes('store') || nameLower.includes('floor')) {
      type = 'Retail';
    } else if (nameLower.includes('distribution') || nameLower.includes('dispatch')) {
      type = 'Distribution';
    } else if (nameLower.includes('processing') || nameLower.includes('return') || nameLower.includes('depot') || nameLower.includes('quarantine')) {
      type = 'Processing';
    } else if (nameLower.includes('hub') || nameLower.includes('fulfillment')) {
      type = 'Fulfillment';
    } else if (nameLower.includes('cold')) {
      type = 'Warehouse';
    }
  }

  // 2. Coordinates (resolve first, then derive canonical city from coords)
  let lat = loc.latitude ?? defaultCatalog?.lat ?? 28.6139;
  let lng = loc.longitude ?? defaultCatalog?.lng ?? 77.2090;

  if (loc.latitude === undefined || loc.latitude === null) {
    if (descLower.includes('gurugram') || descLower.includes('gurgaon')) {
      lat = 28.4595; lng = 77.0266;
    } else if (descLower.includes('noida')) {
      lat = 28.5677; lng = 77.3211;
    } else if (descLower.includes('bengaluru') || descLower.includes('bangalore')) {
      lat = 12.9716; lng = 77.5946;
    } else if (descLower.includes('mumbai')) {
      lat = 18.9438; lng = 72.9515;
    } else if (descLower.includes('connaught')) {
      lat = 28.6315; lng = 77.2167;
    }
  }

  // 3. Canonical city — always derived from lat/lng so filter dropdown has no duplicates
  let city: string;
  if (lat > 27.5 && lat < 29.5 && lng > 76.5 && lng < 78.0) {
    city = 'Delhi NCR';
  } else if (lat > 12.0 && lat < 14.0 && lng > 77.0 && lng < 78.0) {
    city = 'Bengaluru';
  } else if (lat > 18.0 && lat < 20.0 && lng > 72.0 && lng < 73.5) {
    city = 'Mumbai';
  } else if (lat > 21.0 && lat < 23.5 && lng > 72.0 && lng < 73.5) {
    city = 'Ahmedabad';
  } else if (lat > 17.0 && lat < 18.5 && lng > 78.0 && lng < 79.0) {
    city = 'Hyderabad';
  } else if (lat > 12.5 && lat < 14.0 && lng > 79.5 && lng < 81.0) {
    city = 'Chennai';
  } else if (lat > 22.0 && lat < 23.0 && lng > 87.0 && lng < 89.0) {
    city = 'Kolkata';
  } else {
    // Fallback: use raw address if set, else generic
    city = loc.address || defaultCatalog?.city || 'India';
  }

  // 4. Image
  let image = loc.image_url || defaultCatalog?.image || DEFAULT_FACILITY_IMG;
  if (!loc.image_url && !defaultCatalog) {
    if (type.toLowerCase().includes('retail')) {
      image = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=400&q=80';
    } else if (type.toLowerCase().includes('distribution')) {
      image = 'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=400&q=80';
    } else if (type.toLowerCase().includes('processing') || type.toLowerCase().includes('quarantine')) {
      image = 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=400&q=80';
    }
  }

  return { type, city, image, lat, lng };
};

export const LocationsPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { isManager } = useAuth();
  const isDark = theme.palette.mode === 'dark';

  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // Search, Filter & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'map' | 'table'>('grid');

  // Dialogs & Drawers
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [selectedLocationForEdit, setSelectedLocationForEdit] = useState<Location | null>(null);
  const [assignStaffDialogOpen, setAssignStaffDialogOpen] = useState(false);
  const [selectedLocationForStaff, setSelectedLocationForStaff] = useState<Location | null>(null);
  const [inspectDrawerOpen, setInspectDrawerOpen] = useState(false);
  const [inspectLocation, setInspectLocation] = useState<Location | null>(null);

  // Menu State
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuLocation, setMenuLocation] = useState<Location | null>(null);

  const fetchLocations = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await getLocations();
      setLocations(data);
      if (inspectLocation) {
        const updated = data.find((l) => l.id === inspectLocation.id);
        if (updated) setInspectLocation(updated);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load locations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [inspectLocation]);

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleOpenCreate = () => {
    setSelectedLocationForEdit(null);
    setLocationDialogOpen(true);
  };

  const handleOpenEdit = (loc: Location) => {
    setSelectedLocationForEdit(loc);
    setLocationDialogOpen(true);
    handleCloseMenu();
  };

  const handleOpenAssignStaff = (loc: Location) => {
    setSelectedLocationForStaff(loc);
    setAssignStaffDialogOpen(true);
    handleCloseMenu();
  };

  const handleOpenInspect = (loc: Location) => {
    setInspectLocation(loc);
    setInspectDrawerOpen(true);
    handleCloseMenu();
  };

  const handleDeleteLocation = async (loc: Location) => {
    handleCloseMenu();
    if (!window.confirm(`Are you sure you want to delete facility "${loc.name}"? This action cannot be undone.`)) return;
    setError(null);
    try {
      await deleteLocation(loc.id);
      if (inspectLocation?.id === loc.id) {
        setInspectDrawerOpen(false);
      }
      fetchLocations();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete location');
    }
  };

  const handleCopyId = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopySuccess(id);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, loc: Location) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setMenuLocation(loc);
  };

  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
    setMenuLocation(null);
  };

  const handleToggleActiveStatus = async (loc: Location) => {
    const newStatus = loc.is_active === false ? true : false;
    try {
      await updateLocation(loc.id, { is_active: newStatus });
      // Immediately sync inspectLocation if toggling from within the drawer
      if (inspectLocation?.id === loc.id) {
        setInspectLocation((prev) => prev ? { ...prev, is_active: newStatus } : prev);
      }
      await fetchLocations();
      handleCloseMenu();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update facility status');
    }
  };

  // Executive Metric Calculations
  const stats = useMemo(() => {
    const totalLocations = locations.length;

    // Count UNIQUE staff members across all locations (same person in multiple locations = 1)
    const uniqueStaffIds = new Set<string>();
    locations.forEach((loc) => {
      if (loc.assigned_staff) {
        loc.assigned_staff.forEach((s) => uniqueStaffIds.add(s.id));
      }
    });
    const totalStaffAssigned = uniqueStaffIds.size;

    const totalMovements = locations.reduce((sum, loc) => sum + (loc.movement_count ?? 0), 0);
    // Count truly active locations (is_active not explicitly false)
    const activeLocations = locations.filter((loc) => loc.is_active !== false).length;

    return {
      totalLocations,
      totalStaffAssigned,
      totalMovements,
      activeWarehouses: activeLocations,
    };
  }, [locations]);

  // Unique Cities and Types extracted dynamically
  const { allTypes, allCities } = useMemo(() => {
    const types = new Set<string>();
    const cities = new Set<string>();
    locations.forEach((loc) => {
      const meta = getFacilityMeta(loc);
      types.add(meta.type);
      cities.add(meta.city);
    });
    return {
      allTypes: Array.from(types).sort(),
      allCities: Array.from(cities).sort(),
    };
  }, [locations]);

  // Filter Logic
  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      const meta = getFacilityMeta(loc);

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = loc.name.toLowerCase().includes(q);
        const matchesDesc = (loc.description || '').toLowerCase().includes(q);
        const matchesCity = meta.city.toLowerCase().includes(q);
        const matchesType = meta.type.toLowerCase().includes(q);
        const matchesStaff = loc.assigned_staff?.some(
          (s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
        );
        if (!matchesName && !matchesDesc && !matchesCity && !matchesType && !matchesStaff) {
          return false;
        }
      }

      // Type Filter
      if (typeFilter !== 'all' && meta.type !== typeFilter) {
        return false;
      }

      // City Filter
      if (cityFilter !== 'all' && meta.city !== cityFilter) {
        return false;
      }

      // Status Filter
      if (statusFilter === 'active' && loc.is_active === false) {
        return false;
      } else if (statusFilter === 'inactive' && loc.is_active !== false) {
        return false;
      } else if (statusFilter === 'stocked' && (loc.total_stock ?? 0) <= 0) {
        return false;
      } else if (statusFilter === 'empty' && (loc.total_stock ?? 0) > 0) {
        return false;
      } else if (statusFilter === 'has_staff' && (loc.staff_count ?? 0) <= 0) {
        return false;
      } else if (statusFilter === 'no_staff' && (loc.staff_count ?? 0) > 0) {
        return false;
      }

      return true;
    });
  }, [locations, searchQuery, typeFilter, cityFilter, statusFilter]);

  return (
    <Box sx={{ width: '100%', pb: 6 }}>
      {/* 1. Top Header Banner */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2,
          mb: 3,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#EEF2FF',
              color: isDark ? '#818CF8' : '#4F46E5',
              flexShrink: 0,
            }}
          >
            <LocationIcon sx={{ fontSize: 30 }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Locations & Warehouses
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.4 }}>
              Manage warehouse facilities, retail floors, and assign authorized staff members.
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Tooltip title="Refresh Data">
            <IconButton
              onClick={() => fetchLocations(true)}
              disabled={refreshing || loading}
              sx={{
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2.5,
                p: 1.2,
                bgcolor: isDark ? 'background.paper' : '#FFFFFF',
              }}
            >
              <RefreshIcon
                sx={{
                  fontSize: 20,
                  animation: refreshing ? 'spin 1s linear infinite' : 'none',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                  },
                }}
              />
            </IconButton>
          </Tooltip>

          {isManager && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreate}
              sx={{
                bgcolor: '#4F46E5',
                '&:hover': { bgcolor: '#4338CA' },
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.9rem',
                textTransform: 'none',
                px: 2.8,
                py: 1.1,
                borderRadius: 2.5,
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
              }}
            >
               New Location
            </Button>
          )}
        </Stack>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 2. Top KPI Cards (4 Cards across 100% width) */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(4, 1fr)',
          },
          gap: 2.5,
          width: '100%',
          mb: 3,
        }}
      >
        {/* KPI 1: Total Locations */}
        <Card
          sx={{
            p: 2.5,
            borderRadius: 3,
            bgcolor: isDark ? 'background.paper' : '#FFFFFF',
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#E5E7EB'}`,
            boxShadow: isDark ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: isDark ? 'rgba(99, 102, 241, 0.18)' : '#EEF2FF',
                color: isDark ? '#A5B4FC' : '#4F46E5',
              }}
            >
              <WarehouseIcon sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.1, color: 'text.primary' }}>
                {loading ? <Skeleton width={30} /> : stats.totalLocations}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.78rem' }}>
                Total Locations
              </Typography>
            </Box>
          </Stack>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" sx={{ color: '#10B981', fontWeight: 700, display: 'block' }}>
              ↑ +2
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
              vs last month
            </Typography>
          </Box>
        </Card>

        {/* KPI 2: Total Staff Assigned */}
        <Card
          sx={{
            p: 2.5,
            borderRadius: 3,
            bgcolor: isDark ? 'background.paper' : '#FFFFFF',
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#E5E7EB'}`,
            boxShadow: isDark ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: isDark ? 'rgba(99, 102, 241, 0.18)' : '#EEF2FF',
                color: isDark ? '#A5B4FC' : '#4F46E5',
              }}
            >
              <PeopleIcon sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.1, color: 'text.primary' }}>
                {loading ? <Skeleton width={30} /> : stats.totalStaffAssigned}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.78rem' }}>
                Total Staff Assigned
              </Typography>
            </Box>
          </Stack>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" sx={{ color: '#10B981', fontWeight: 700, display: 'block' }}>
              ↑ +3
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
              vs last month
            </Typography>
          </Box>
        </Card>

        {/* KPI 3: Total Movements */}
        <Card
          sx={{
            p: 2.5,
            borderRadius: 3,
            bgcolor: isDark ? 'background.paper' : '#FFFFFF',
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#E5E7EB'}`,
            boxShadow: isDark ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: isDark ? 'rgba(99, 102, 241, 0.18)' : '#EEF2FF',
                color: isDark ? '#A5B4FC' : '#4F46E5',
              }}
            >
              <MovementsIcon sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.1, color: 'text.primary' }}>
                {loading ? <Skeleton width={30} /> : stats.totalMovements}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.78rem' }}>
                Total Movements
              </Typography>
            </Box>
          </Stack>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" sx={{ color: '#10B981', fontWeight: 700, display: 'block' }}>
              ↑ +12
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
              vs last month
            </Typography>
          </Box>
        </Card>

        {/* KPI 4: Active Locations (real-time synced) */}
        <Card
          sx={{
            p: 2.5,
            borderRadius: 3,
            bgcolor: isDark ? 'background.paper' : '#FFFFFF',
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#E5E7EB'}`,
            boxShadow: isDark ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: isDark ? 'rgba(16, 185, 129, 0.18)' : '#ECFDF5',
                color: isDark ? '#34D399' : '#10B981',
              }}
            >
              <CheckCircleIcon sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.1, color: 'text.primary' }}>
                {loading ? <Skeleton width={30} /> : stats.activeWarehouses}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.78rem' }}>
                Active Locations
              </Typography>
            </Box>
          </Stack>
          <Box
            sx={{
              bgcolor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#DCFCE7',
              color: isDark ? '#34D399' : '#16A34A',
              px: 1.4,
              py: 0.4,
              borderRadius: 2,
              textAlign: 'center',
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.74rem', display: 'block' }}>
              {loading ? '–' : `${stats.totalLocations > 0 ? Math.round((stats.activeWarehouses / stats.totalLocations) * 100) : 0}%`}
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.65rem' }}>
              Operational
            </Typography>
          </Box>
        </Card>
      </Box>

      {/* 3. Search & Filter Bar */}
      <Paper
        elevation={0}
        sx={{
          p: 1.75,
          mb: 3,
          borderRadius: 3,
          bgcolor: isDark ? 'background.paper' : '#FFFFFF',
          border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#E5E7EB'}`,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          width: '100%',
        }}
      >
        {/* Left: Search + 3 Dropdowns */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems="center" sx={{ flex: 1, minWidth: 260 }}>
          {/* Search Input */}
          <TextField
            size="small"
            placeholder="Search by name, city, or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{
              minWidth: { xs: '100%', md: 280 },
              '& .MuiOutlinedInput-root': {
                borderRadius: 2.5,
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F9FAFB',
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary', fontSize: 19 }} />
                </InputAdornment>
              ),
              endAdornment: searchQuery ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchQuery('')}>
                    <ClearIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />

          {/* All Types Dropdown */}
          <FormControl size="small" sx={{ minWidth: 140, width: { xs: '100%', md: 'auto' } }}>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              sx={{
                borderRadius: 2.5,
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F9FAFB',
                fontSize: '0.85rem',
              }}
            >
              <MenuItem value="all">All Types</MenuItem>
              {allTypes.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* All Cities Dropdown */}
          <FormControl size="small" sx={{ minWidth: 150, width: { xs: '100%', md: 'auto' } }}>
            <Select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              sx={{
                borderRadius: 2.5,
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F9FAFB',
                fontSize: '0.85rem',
              }}
            >
              <MenuItem value="all">All Cities</MenuItem>
              {allCities.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* All Status Dropdown */}
          <FormControl size="small" sx={{ minWidth: 130, width: { xs: '100%', md: 'auto' } }}>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{
                borderRadius: 2.5,
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F9FAFB',
                fontSize: '0.85rem',
              }}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Not Active</MenuItem>
              <MenuItem value="stocked">Stocked (&gt; 0)</MenuItem>
              <MenuItem value="empty">Empty (0)</MenuItem>
              <MenuItem value="has_staff">Staff Assigned</MenuItem>
              <MenuItem value="no_staff">No Staff</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        {/* Right: View Toggle (Grid / Map / Table) */}
        <ToggleButtonGroup
          size="small"
          value={viewMode}
          exclusive
          onChange={(_, next) => next && setViewMode(next)}
          sx={{
            bgcolor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F3F4F6',
            borderRadius: 2.5,
            p: 0.4,
            '& .MuiToggleButton-root': {
              border: 'none',
              borderRadius: 2,
              px: 1.8,
              py: 0.6,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.82rem',
              gap: 0.8,
              color: 'text.secondary',
              '&.Mui-selected': {
                bgcolor: '#4F46E5',
                color: '#FFFFFF',
                boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
                '&:hover': {
                  bgcolor: '#4338CA',
                },
              },
            },
          }}
        >
          <ToggleButton value="grid">
            <GridViewIcon sx={{ fontSize: 18 }} />
            Grid
          </ToggleButton>
          <ToggleButton value="map">
            <MapViewIcon sx={{ fontSize: 18 }} />
            Map
          </ToggleButton>
          <ToggleButton value="table">
            <TableViewIcon sx={{ fontSize: 18 }} />
            Table
          </ToggleButton>
        </ToggleButtonGroup>
      </Paper>

      {/* 4. Content Body */}
      {loading ? (
        /* Loading Skeletons: 3 in row */
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
            },
            gap: 3,
            width: '100%',
          }}
        >
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <Card key={idx} sx={{ p: 2.5, borderRadius: 3.5 }}>
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <Skeleton variant="rounded" width={92} height={92} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton width="40%" height={20} sx={{ mb: 1 }} />
                  <Skeleton width="80%" height={24} sx={{ mb: 1 }} />
                  <Skeleton width="60%" height={16} />
                </Box>
              </Stack>
              <Skeleton variant="rectangular" height={36} sx={{ borderRadius: 2 }} />
            </Card>
          ))}
        </Box>
      ) : filteredLocations.length === 0 ? (
        <Card
          sx={{
            p: 6,
            textAlign: 'center',
            borderRadius: 3.5,
            border: `1px dashed ${theme.palette.divider}`,
            bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#FAFAFA',
          }}
        >
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2,
              color: 'primary.main',
            }}
          >
            <LocationIcon sx={{ fontSize: 32 }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            No Facilities Found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 440, mx: 'auto', mb: 3 }}>
            No facilities match your current search terms or filters. Try adjusting your query or resetting filters.
          </Typography>
          <Button
            variant="outlined"
            onClick={() => {
              setSearchQuery('');
              setTypeFilter('all');
              setCityFilter('all');
              setStatusFilter('all');
            }}
            sx={{ borderRadius: 2 }}
          >
            Clear Filters
          </Button>
        </Card>
      ) : viewMode === 'grid' ? (
        /* EXACT THREE CARDS IN ONE ROW OCCUPYING FULL CONTAINER WIDTH */
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
            },
            gap: 3,
            width: '100%',
          }}
        >
          {filteredLocations.map((loc) => {
            const meta = getFacilityMeta(loc);
            const staffList = loc.assigned_staff ?? [];
            const movementsCount = loc.movement_count ?? 0;
            const staffCount = loc.staff_count ?? staffList.length;

            return (
              <Card
                key={loc.id}
                sx={{
                  width: '100%',
                  p: 2.5,
                  borderRadius: 3.5,
                  bgcolor: isDark ? 'background.paper' : '#FFFFFF',
                  border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#E5E7EB'}`,
                  boxShadow: isDark
                    ? '0 4px 20px rgba(0, 0, 0, 0.3)'
                    : '0 2px 10px rgba(0, 0, 0, 0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.22s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: isDark
                      ? '0 10px 30px rgba(0, 0, 0, 0.45)'
                      : '0 10px 25px rgba(79, 70, 229, 0.09)',
                    borderColor: isDark ? 'rgba(99, 102, 241, 0.35)' : '#C7D2FE',
                  },
                }}
              >
                {/* Top Section: Image + Info */}
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  {/* Left: Thumbnail Image */}
                  <Box
                    component="img"
                    src={meta.image}
                    alt={loc.name}
                    onError={(e: any) => {
                      e.currentTarget.src = DEFAULT_FACILITY_IMG;
                    }}
                    sx={{
                      width: 96,
                      height: 96,
                      minWidth: 96,
                      borderRadius: 2.5,
                      objectFit: 'cover',
                      bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F3F4F6',
                      border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#E5E7EB'}`,
                    }}
                  />

                  {/* Right: Badges, Title, Location & Description */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    {/* Badge Row & Kebab */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.8 }}>
                      <Stack direction="row" spacing={0.8} alignItems="center">
                        <Chip
                          label={meta.type}
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            bgcolor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#EEF2FF',
                            color: isDark ? '#A5B4FC' : '#4F46E5',
                            borderRadius: 1.5,
                          }}
                        />
                        <Chip
                          label={loc.is_active === false ? 'Not Active' : 'Active'}
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            bgcolor: loc.is_active === false
                              ? (isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2')
                              : (isDark ? 'rgba(16, 185, 129, 0.2)' : '#ECFDF5'),
                            color: loc.is_active === false
                              ? (isDark ? '#F87171' : '#EF4444')
                              : (isDark ? '#34D399' : '#10B981'),
                            borderRadius: 1.5,
                          }}
                        />
                      </Stack>
                      <IconButton
                        size="small"
                        onClick={(e) => handleOpenMenu(e, loc)}
                        sx={{ color: 'text.secondary', p: 0.4 }}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Box>

                    {/* Facility Name */}
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 700,
                        color: 'text.primary',
                        lineHeight: 1.25,
                        mb: 0.4,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        cursor: 'pointer',
                        '&:hover': { color: '#4F46E5' },
                      }}
                      onClick={() => handleOpenInspect(loc)}
                    >
                      {loc.name}
                    </Typography>

                    {/* Location Pin + City */}
                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.6 }}>
                      <LocationIcon sx={{ fontSize: 15, color: '#9CA3AF' }} />
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'text.secondary',
                          fontWeight: 500,
                          fontSize: '0.78rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {meta.city}
                      </Typography>
                    </Stack>

                    {/* Description */}
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: 1.35,
                        fontSize: '0.76rem',
                      }}
                    >
                      {loc.description || 'Central hub for storage and regional distribution.'}
                    </Typography>
                  </Box>
                </Box>

                {/* Middle Stats Row */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    mt: 2.2,
                    mb: 2,
                    pt: 1.5,
                    borderTop: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.06)' : '#F3F4F6'}`,
                  }}
                >
                  {/* Movements */}
                  <Stack direction="row" spacing={1} alignItems="center">
                    <MovementsIcon sx={{ fontSize: 18, color: isDark ? '#818CF8' : '#4F46E5' }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 800, lineHeight: 1, color: 'text.primary' }}>
                        {movementsCount}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                        Movements
                      </Typography>
                    </Box>
                  </Stack>

                  {/* Staff */}
                  <Stack direction="row" spacing={1} alignItems="center">
                    <PeopleIcon sx={{ fontSize: 18, color: isDark ? '#818CF8' : '#4F46E5' }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 800, lineHeight: 1, color: 'text.primary' }}>
                        {staffCount}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                        Staff
                      </Typography>
                    </Box>
                  </Stack>

                  {/* Stock On-Hand Badge if available */}
                  {(loc.total_stock ?? 0) > 0 && (
                    <Chip
                      size="small"
                      label={`${(loc.total_stock ?? 0).toLocaleString()} units`}
                      sx={{
                        ml: 'auto',
                        height: 22,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        bgcolor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#DCFCE7',
                        color: isDark ? '#34D399' : '#16A34A',
                        borderRadius: 1.5,
                      }}
                    />
                  )}
                </Box>

                {/* Full-Width Action Button */}
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<PeopleIcon sx={{ fontSize: 18 }} />}
                  onClick={() => handleOpenAssignStaff(loc)}
                  sx={{
                    py: 1,
                    borderRadius: 2.5,
                    fontWeight: 600,
                    fontSize: '0.84rem',
                    textTransform: 'none',
                    color: isDark ? '#A5B4FC' : '#4F46E5',
                    borderColor: isDark ? 'rgba(99, 102, 241, 0.35)' : '#E0E7FF',
                    bgcolor: isDark ? 'rgba(99, 102, 241, 0.06)' : 'rgba(79, 70, 229, 0.02)',
                    '&:hover': {
                      borderColor: '#4F46E5',
                      bgcolor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF',
                    },
                  }}
                >
                  Manage Staff Assignments
                </Button>
              </Card>
            );
          })}
        </Box>
      ) : viewMode === 'map' ? (
        /* REAL INTERACTIVE OPENSTREETMAP LEAFLET VIEW */
        <RealFacilityMap
          locations={filteredLocations}
          isDark={isDark}
          onInspect={handleOpenInspect}
          onNavigateMovements={(locId) => navigate(`/movements?location_id=${locId}`)}
        />
      ) : (
        /* TABLE VIEW */
        <TableContainer
          component={Paper}
          sx={{
            borderRadius: 3.5,
            overflow: 'hidden',
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#E5E7EB'}`,
            bgcolor: isDark ? 'background.paper' : '#FFFFFF',
          }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#F9FAFB' }}>
                <TableCell sx={{ fontWeight: 700 }}>Facility</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>City / Region</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Stock On Hand</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Movements</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Assigned Team</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLocations.map((loc) => {
                const meta = getFacilityMeta(loc);
                const stockUnits = loc.total_stock ?? 0;
                const staffList = loc.assigned_staff ?? [];

                return (
                  <TableRow
                    key={loc.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleOpenInspect(loc)}
                  >
                    <TableCell>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box
                          component="img"
                          src={meta.image}
                          alt={loc.name}
                          onError={(e: any) => {
                            e.currentTarget.src = DEFAULT_FACILITY_IMG;
                          }}
                          sx={{
                            width: 44,
                            height: 44,
                            borderRadius: 2,
                            objectFit: 'cover',
                          }}
                        />
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {loc.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 260, display: 'block' }}>
                            {loc.description || 'Warehouse facility'}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={meta.type}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          fontSize: '0.72rem',
                          bgcolor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#EEF2FF',
                          color: isDark ? '#A5B4FC' : '#4F46E5',
                        }}
                      />
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={loc.is_active === false ? 'Not Active' : 'Active'}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          fontSize: '0.72rem',
                          bgcolor: loc.is_active === false
                            ? (isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2')
                            : (isDark ? 'rgba(16, 185, 129, 0.2)' : '#ECFDF5'),
                          color: loc.is_active === false
                            ? (isDark ? '#F87171' : '#EF4444')
                            : (isDark ? '#34D399' : '#10B981'),
                        }}
                      />
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                        {meta.city}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: stockUnits > 0 ? '#10B981' : 'text.secondary' }}>
                        {stockUnits.toLocaleString()} units
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        icon={<MovementsIcon sx={{ fontSize: 16 }} />}
                        label={`${loc.movement_count ?? 0}`}
                        size="small"
                        variant="outlined"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/movements?location_id=${loc.id}`);
                        }}
                      />
                    </TableCell>

                    <TableCell>
                      {staffList.length === 0 ? (
                        <Typography variant="caption" color="text.secondary">
                          None assigned
                        </Typography>
                      ) : (
                        <AvatarGroup max={3} sx={{ justifyContent: 'flex-start' }}>
                          {staffList.map((s) => (
                            <Tooltip key={s.id} title={`${s.name} (${s.email})`}>
                              <Avatar sx={{ width: 26, height: 26, fontSize: '0.7rem', bgcolor: stringToColor(s.name) }}>
                                {getInitials(s.name)}
                              </Avatar>
                            </Tooltip>
                          ))}
                        </AvatarGroup>
                      )}
                    </TableCell>

                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="Manage staff">
                          <IconButton size="small" onClick={() => handleOpenAssignStaff(loc)}>
                            <PeopleIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {isManager && (
                          <Tooltip title="Edit facility">
                            <IconButton size="small" onClick={() => handleOpenEdit(loc)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <IconButton size="small" onClick={(e) => handleOpenMenu(e, loc)}>
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 5. Quick Actions Context Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleCloseMenu}
        PaperProps={{
          sx: {
            borderRadius: 2.5,
            minWidth: 190,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
          },
        }}
      >
        <MenuItem onClick={() => menuLocation && handleOpenInspect(menuLocation)}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Inspect Facility" />
        </MenuItem>

        <MenuItem
          onClick={() => {
            if (menuLocation) navigate(`/movements?location_id=${menuLocation.id}`);
            handleCloseMenu();
          }}
        >
          <ListItemIcon>
            <MovementsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Movement Ledger" />
        </MenuItem>

        {isManager && (
          <MenuItem onClick={() => menuLocation && handleOpenAssignStaff(menuLocation)}>
            <ListItemIcon>
              <PersonAddIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Assign Staff" />
          </MenuItem>
        )}

        {isManager && (
          <MenuItem onClick={() => menuLocation && handleOpenEdit(menuLocation)}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Edit Facility" />
          </MenuItem>
        )}

        {isManager && menuLocation && (
          <MenuItem onClick={() => handleToggleActiveStatus(menuLocation)}>
            <ListItemIcon>
              {menuLocation.is_active === false ? (
                <CheckCircleIcon fontSize="small" sx={{ color: '#10B981' }} />
              ) : (
                <PauseCircleIcon fontSize="small" sx={{ color: '#EF4444' }} />
              )}
            </ListItemIcon>
            <ListItemText
              primary={menuLocation.is_active === false ? 'Set as Active' : 'Set as Not Active'}
            />
          </MenuItem>
        )}

        <Divider sx={{ my: 0.5 }} />

        <MenuItem
          onClick={() => {
            if (menuLocation) handleCopyId(menuLocation.id);
            handleCloseMenu();
          }}
        >
          <ListItemIcon>
            <CopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Copy Facility ID" />
        </MenuItem>

        {isManager && (
          <Tooltip
            title={
              (menuLocation?.movement_count ?? 0) > 0
                ? 'Cannot delete: movements exist for this facility'
                : ''
            }
          >
            <span>
              <MenuItem
                disabled={(menuLocation?.movement_count ?? 0) > 0}
                onClick={() => menuLocation && handleDeleteLocation(menuLocation)}
                sx={{ color: 'error.main' }}
              >
                <ListItemIcon sx={{ color: 'error.main' }}>
                  <DeleteIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Delete Facility" />
              </MenuItem>
            </span>
          </Tooltip>
        )}
      </Menu>

      {/* 6. Facility Inspection Slide-Over Drawer with generous left/right spacing */}
      <Drawer
        anchor="right"
        open={inspectDrawerOpen}
        onClose={() => setInspectDrawerOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: { xs: '100%', sm: 480, md: 520 },
              bgcolor: isDark ? '#121829' : '#FFFFFF',
              boxShadow: isDark
                ? '-16px 0 48px rgba(0, 0, 0, 0.7)'
                : '-16px 0 48px rgba(15, 23, 42, 0.12)',
              borderLeft: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#E5E7EB'}`,
              overflow: 'hidden',
            },
          },
        }}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 480, md: 520 },
            bgcolor: isDark ? '#121829' : '#FFFFFF',
            boxShadow: isDark
              ? '-16px 0 48px rgba(0, 0, 0, 0.7)'
              : '-16px 0 48px rgba(15, 23, 42, 0.12)',
            borderLeft: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#E5E7EB'}`,
            overflow: 'hidden',
          },
        }}
      >
        {inspectLocation && (() => {
          const meta = getFacilityMeta(inspectLocation);
          const staffList = inspectLocation.assigned_staff ?? [];

          return (
            <Box
              sx={{
                display: 'block',
                height: '100%',
                p: { xs: 3, sm: 4 },
                overflowY: 'auto',
                boxSizing: 'border-box',
              }}
            >
              {/* Drawer Header */}
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                <Box sx={{ flex: 1, pr: 1.5 }}>
                  <Stack direction="row" spacing={1} sx={{ mb: 1.2 }}>
                    <Chip
                      label={meta.type}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        bgcolor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#EEF2FF',
                        color: isDark ? '#A5B4FC' : '#4F46E5',
                        borderRadius: 1.5,
                      }}
                    />
                    <Chip
                      label={inspectLocation.is_active === false ? 'Not Active' : 'Active'}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        bgcolor: inspectLocation.is_active === false
                          ? (isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEF2F2')
                          : (isDark ? 'rgba(16, 185, 129, 0.2)' : '#ECFDF5'),
                        color: inspectLocation.is_active === false
                          ? (isDark ? '#F87171' : '#EF4444')
                          : (isDark ? '#34D399' : '#10B981'),
                        borderRadius: 1.5,
                      }}
                    />
                    <Chip
                      label={meta.city}
                      size="small"
                      sx={{ fontWeight: 600, borderRadius: 1.5 }}
                    />
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.25 }}>
                    {inspectLocation.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Created on {formatDateIST(inspectLocation.created_at)}
                  </Typography>
                </Box>
                <IconButton
                  onClick={() => setInspectDrawerOpen(false)}
                  sx={{
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 2,
                    p: 0.8,
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>

              <Divider sx={{ mb: 2.5 }} />

              {/* Facility Cover Image */}
              <Box
                component="img"
                src={meta.image}
                alt={inspectLocation.name}
                onError={(e: any) => {
                  e.currentTarget.src = DEFAULT_FACILITY_IMG;
                }}
                sx={{
                  width: '100%',
                  height: 180,
                  borderRadius: 3,
                  objectFit: 'cover',
                  mb: 2.5,
                  border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#E5E7EB'}`,
                }}
              />

              {/* Metrics Breakdown */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
                <Paper
                  sx={{
                    p: 2.2,
                    borderRadius: 3,
                    bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC',
                    border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.05)' : '#E5E7EB'}`,
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Stock Units
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: '#10B981' }}>
                    {(inspectLocation.total_stock ?? 0).toLocaleString()}
                  </Typography>
                </Paper>
                <Paper
                  sx={{
                    p: 2.2,
                    borderRadius: 3,
                    bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC',
                    border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.05)' : '#E5E7EB'}`,
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Movements Logged
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: '#4F46E5' }}>
                    {(inspectLocation.movement_count ?? 0).toLocaleString()}
                  </Typography>
                </Paper>
              </Box>

              {/* Description / Address */}
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.6 }}>
                Facility Notes & Description
              </Typography>
              <Paper
                sx={{
                  p: 2,
                  mb: 3,
                  borderRadius: 2.5,
                  bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#F9FAFB',
                  border: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                  {inspectLocation.description || 'No specific notes recorded for this facility.'}
                </Typography>
              </Paper>

              {/* Assigned Personnel */}
              <Box sx={{ mb: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Authorized Personnel ({staffList.length})
                  </Typography>
                  {isManager && (
                    <Button
                      size="small"
                      startIcon={<PersonAddIcon />}
                      onClick={() => handleOpenAssignStaff(inspectLocation)}
                      sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                      Edit Roster
                    </Button>
                  )}
                </Stack>

                <Paper
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : '#E5E7EB'}`,
                    bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#FAFAFA',
                    overflow: 'visible',
                  }}
                >
                  <Box sx={{ maxHeight: 280, overflowY: 'auto', borderRadius: 2 }}>
                    {staffList.length === 0 ? (
                      <Box sx={{ py: 3, px: 2, textAlign: 'center' }}>
                        <PeopleIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 0.8 }} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                          No personnel assigned yet.
                        </Typography>
                        {isManager && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            Click "Edit Roster" above to assign staff.
                          </Typography>
                        )}
                      </Box>
                    ) : (
                      staffList.map((s, idx) => (
                        <Box
                          key={s.id}
                          sx={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 1.5,
                            px: 2,
                            py: 1.5,
                            borderBottom: idx < staffList.length - 1
                              ? `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : '#F0F0F0'}`
                              : 'none',
                            '&:hover': {
                              bgcolor: isDark ? 'rgba(99,102,241,0.08)' : '#F5F3FF',
                            },
                            transition: 'background-color 0.15s',
                          }}
                        >
                          <Avatar
                            sx={{
                              width: 40,
                              height: 40,
                              fontSize: '0.88rem',
                              fontWeight: 700,
                              bgcolor: stringToColor(s.name),
                              flexShrink: 0,
                            }}
                          >
                            {getInitials(s.name)}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: 'text.primary', lineHeight: 1.3 }}>
                              {s.name}
                            </Typography>
                            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                              {s.email}
                            </Typography>
                          </Box>
                          <Chip
                            label="Authorized"
                            size="small"
                            sx={{
                              height: 22,
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              bgcolor: isDark ? 'rgba(99,102,241,0.18)' : '#EEF2FF',
                              color: isDark ? '#A5B4FC' : '#4F46E5',
                              borderRadius: 1.5,
                              flexShrink: 0,
                            }}
                          />
                        </Box>
                      ))
                    )}
                  </Box>
                </Paper>
              </Box>

              {/* Quick Actions Footer */}
              <Box sx={{ pt: 2, pb: 1 }}>
                <Stack spacing={1.5}>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<MovementsIcon />}
                    onClick={() => {
                      setInspectDrawerOpen(false);
                      navigate(`/movements?location_id=${inspectLocation.id}`);
                    }}
                    sx={{
                      py: 1.2,
                      borderRadius: 2.5,
                      bgcolor: '#4F46E5',
                      '&:hover': { bgcolor: '#4338CA' },
                      fontWeight: 700,
                      textTransform: 'none',
                    }}
                  >
                    View Facility Movements
                  </Button>

                  {isManager && (
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={inspectLocation.is_active === false ? <CheckCircleIcon /> : <PauseCircleIcon />}
                      onClick={() => handleToggleActiveStatus(inspectLocation)}
                      sx={{
                        py: 1,
                        borderRadius: 2.5,
                        fontWeight: 600,
                        textTransform: 'none',
                        color: inspectLocation.is_active === false ? '#10B981' : '#EF4444',
                        borderColor: inspectLocation.is_active === false ? '#10B981' : '#EF4444',
                        '&:hover': {
                          borderColor: inspectLocation.is_active === false ? '#059669' : '#DC2626',
                          bgcolor: inspectLocation.is_active === false ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                        },
                      }}
                    >
                      {inspectLocation.is_active === false ? 'Re-activate Facility' : 'Deactivate Facility (Set Not Active)'}
                    </Button>
                  )}

                  {isManager && (
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<EditIcon />}
                      onClick={() => handleOpenEdit(inspectLocation)}
                      sx={{ py: 1, borderRadius: 2.5, fontWeight: 600, textTransform: 'none' }}
                    >
                      Edit Facility Information
                    </Button>
                  )}
                </Stack>
              </Box>
            </Box>
          );
        })()}
      </Drawer>

      {/* 7. Dialogs */}
      <LocationDialog
        open={locationDialogOpen}
        location={selectedLocationForEdit}
        onClose={() => setLocationDialogOpen(false)}
        onSaved={() => fetchLocations()}
      />

      <AssignStaffDialog
        open={assignStaffDialogOpen}
        location={selectedLocationForStaff}
        onClose={() => setAssignStaffDialogOpen(false)}
        onSaved={() => fetchLocations()}
      />
    </Box>
  );
};

// ----------------------------------------------------------------------
// Real Interactive OpenStreetMap Leaflet Component
// ----------------------------------------------------------------------
interface RealMapProps {
  locations: Location[];
  isDark: boolean;
  onInspect: (loc: Location) => void;
  onNavigateMovements: (locId: string) => void;
}

/** Compute a tiny lat/lng offset so stacked markers spiral out and are all clickable */
const spreadMarkers = (locs: Location[]): Array<{ loc: Location; lat: number; lng: number }> => {
  // Group by rounded coordinate key
  const groups = new Map<string, Location[]>();
  locs.forEach((loc) => {
    const meta = getFacilityMeta(loc);
    const key = `${meta.lat.toFixed(4)},${meta.lng.toFixed(4)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(loc);
  });

  const result: Array<{ loc: Location; lat: number; lng: number }> = [];
  groups.forEach((group) => {
    if (group.length === 1) {
      const meta = getFacilityMeta(group[0]);
      result.push({ loc: group[0], lat: meta.lat, lng: meta.lng });
    } else {
      // Fan out in a circle — radius scales with group size
      const radius = 0.018 + group.length * 0.004; // ~1-2 km spread
      group.forEach((loc, i) => {
        const meta = getFacilityMeta(loc);
        const angle = (2 * Math.PI * i) / group.length;
        const lat = meta.lat + radius * Math.cos(angle);
        const lng = meta.lng + (radius * 1.3) * Math.sin(angle); // widen for lng degree difference
        result.push({ loc, lat, lng });
      });
    }
  });
  return result;
};

const RealFacilityMap: React.FC<RealMapProps> = ({
  locations,
  isDark,
  onInspect,
  onNavigateMovements,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  const handleFlyTo = (lat: number, lng: number, zoom = 12) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], zoom, { duration: 1.2 });
    }
  };

  const handleFitAll = () => {
    if (mapInstanceRef.current && markersRef.current.length > 0) {
      const group = L.featureGroup(markersRef.current);
      mapInstanceRef.current.fitBounds(group.getBounds(), { padding: [50, 50], maxZoom: 13 });
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Destroy existing instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: true,
      minZoom: 4,
      maxZoom: 18,
    }).setView([22.5937, 78.9629], 5);

    mapInstanceRef.current = map;

    // Standard OpenStreetMap basemap (100% free, no API key required)
    const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    L.tileLayer(tileUrl, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      subdomains: 'abc',
      maxZoom: 19,
    }).addTo(map);

    markersRef.current = [];

    // Spread overlapping markers so every location has its own visible pin
    const spread = spreadMarkers(locations);

    spread.forEach(({ loc, lat, lng }) => {
      const meta = getFacilityMeta(loc);
      const stockUnits = (loc.total_stock ?? 0).toLocaleString();
      const movements = loc.movement_count ?? 0;
      const isActive = loc.is_active !== false;

      // Color pins: green = active, red = inactive
      const pinColor = isActive ? '#4F46E5' : '#EF4444';
      const pinShadow = isActive
        ? 'rgba(79, 70, 229, 0.45)'
        : 'rgba(239, 68, 68, 0.45)';

      const markerHtml = `
        <div style="
          width: 36px;
          height: 36px;
          background: ${pinColor};
          border: 3px solid #FFFFFF;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px ${pinShadow};
          cursor: pointer;
          transition: transform 0.15s;
        ">
          <svg style="width: 19px; height: 19px; fill: white;" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'facility-leaflet-icon',
        html: markerHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -40],
      });

      const statusBadge = isActive
        ? `<span style="background:#DCFCE7;color:#16A34A;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:700;">ACTIVE</span>`
        : `<span style="background:#FEF2F2;color:#DC2626;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:700;">OFFLINE</span>`;

      const popupHtml = `
        <div style="font-family: system-ui, -apple-system, sans-serif; min-width: 230px; padding: 4px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px; flex-wrap: wrap;">
            <span style="font-size: 11px; font-weight: 700; background: #EEF2FF; color: #4F46E5; padding: 2px 8px; border-radius: 4px;">${meta.type}</span>
            ${statusBadge}
            <span style="font-size: 11px; color: #6B7280;">${meta.city}</span>
          </div>
          <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 800; color: #111827;">${loc.name}</h4>
          <p style="margin: 0 0 8px 0; font-size: 12px; color: #4B5563; line-height: 1.3;">${loc.description || 'Regional storage node'}</p>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 12px; background: #F8FAFC; padding: 6px; border-radius: 4px;">
            <span>Stock: <strong style="color: #10B981;">${stockUnits}</strong></span>
            <span>Movements: <strong>${movements}</strong></span>
          </div>
          <button id="inspect-btn-${loc.id}" style="
            width: 100%;
            background: ${pinColor};
            color: #FFFFFF;
            border: none;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
          ">
            Inspect Facility Details
          </button>
        </div>
      `;

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
      marker.bindPopup(popupHtml);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`inspect-btn-${loc.id}`);
        if (btn) {
          btn.onclick = () => onInspect(loc);
        }
      });

      markersRef.current.push(marker);
    });

    if (markersRef.current.length > 0) {
      const group = L.featureGroup(markersRef.current);
      map.fitBounds(group.getBounds(), { padding: [60, 60], maxZoom: 12 });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [locations, isDark]);

  return (
    <Card
      sx={{
        p: 2.5,
        borderRadius: 3.5,
        bgcolor: isDark ? 'background.paper' : '#FFFFFF',
        border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#E5E7EB'}`,
        boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.3)' : '0 2px 10px rgba(0, 0, 0, 0.04)',
      }}
    >
      {/* Top Header & Quick-Fly Toolbar */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <ExploreIcon sx={{ color: '#4F46E5', fontSize: 22 }} />
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Live National Facility Network Map
            </Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Real interactive OpenStreetMap navigation with precise coordinates across Delhi NCR, Bengaluru & Mumbai.
          </Typography>
        </Box>

        {/* Region Quick Fly Buttons — counts are dynamic based on actual locations */}
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip
            label={`All (${locations.length})`}
            onClick={handleFitAll}
            size="small"
            clickable
            sx={{ fontWeight: 700, bgcolor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' }}
          />
          {/* Dynamically generate region chips based on location addresses/cities */}
          {(() => {
            // Group locations by broad region based on lat/lng
            const delhiCount = locations.filter((l) => {
              const m = getFacilityMeta(l);
              return m.lat > 27.5 && m.lat < 29.5 && m.lng > 76.5 && m.lng < 78.0;
            }).length;
            const bengaluruCount = locations.filter((l) => {
              const m = getFacilityMeta(l);
              return m.lat > 12 && m.lat < 14 && m.lng > 77 && m.lng < 78;
            }).length;
            const mumbaiCount = locations.filter((l) => {
              const m = getFacilityMeta(l);
              return m.lat > 18 && m.lat < 20 && m.lng > 72 && m.lng < 73.5;
            }).length;
            return (
              <>
                {delhiCount > 0 && (
                  <Chip
                    label={`Delhi NCR (${delhiCount})`}
                    onClick={() => handleFlyTo(28.6139, 77.2090, 11)}
                    size="small"
                    clickable
                    sx={{ fontWeight: 700, bgcolor: isDark ? 'rgba(99,102,241,0.2)' : '#EEF2FF', color: '#4F46E5' }}
                  />
                )}
                {bengaluruCount > 0 && (
                  <Chip
                    label={`Bengaluru (${bengaluruCount})`}
                    onClick={() => handleFlyTo(12.9716, 77.5946, 12)}
                    size="small"
                    clickable
                    sx={{ fontWeight: 700, bgcolor: isDark ? 'rgba(16,185,129,0.2)' : '#ECFDF5', color: '#10B981' }}
                  />
                )}
                {mumbaiCount > 0 && (
                  <Chip
                    label={`Mumbai (${mumbaiCount})`}
                    onClick={() => handleFlyTo(18.9438, 72.9515, 12)}
                    size="small"
                    clickable
                    sx={{ fontWeight: 700, bgcolor: isDark ? 'rgba(245,158,11,0.2)' : '#FEF3C7', color: '#D97706' }}
                  />
                )}
              </>
            );
          })()}
        </Stack>
      </Stack>

      {/* Real Map Canvas Container */}
      <Box
        ref={mapContainerRef}
        sx={{
          width: '100%',
          height: { xs: 450, md: 560 },
          borderRadius: 3,
          overflow: 'hidden',
          border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : '#E5E7EB'}`,
          zIndex: 0,
          position: 'relative',
          '& .leaflet-tile-pane': isDark
            ? {
                filter: 'brightness(0.65) invert(1) contrast(3) hue-rotate(200deg) saturate(0.25) brightness(0.8)',
              }
            : {},
        }}
      />
    </Card>
  );
};


