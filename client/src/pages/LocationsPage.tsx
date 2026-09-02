import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  Grid,
  Typography,
  Button,
  IconButton,
  Chip,
  Stack,
  Divider,
  Alert,
  CircularProgress,
  Tooltip,
  Paper,
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
} from '@mui/icons-material';
import type { Location } from '../types';
import { getLocations, deleteLocation } from '../services/locations';
import { useAuth } from '../contexts/AuthContext';
import { LocationDialog } from '../components/LocationDialog';
import { formatDateIST } from '../utils/date';
import { AssignStaffDialog } from '../components/AssignStaffDialog';

export const LocationsPage: React.FC = () => {
  const theme = useTheme();
  const { isManager } = useAuth();

  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialogs
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [selectedLocationForEdit, setSelectedLocationForEdit] = useState<Location | null>(null);

  const [assignStaffDialogOpen, setAssignStaffDialogOpen] = useState(false);
  const [selectedLocationForStaff, setSelectedLocationForStaff] = useState<Location | null>(null);

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getLocations();
      setLocations(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load locations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleOpenCreate = () => {
    setSelectedLocationForEdit(null);
    setLocationDialogOpen(true);
  };

  const handleOpenEdit = (loc: Location) => {
    setSelectedLocationForEdit(loc);
    setLocationDialogOpen(true);
  };

  const handleOpenAssignStaff = (loc: Location) => {
    setSelectedLocationForStaff(loc);
    setAssignStaffDialogOpen(true);
  };

  const handleDeleteLocation = async (loc: Location) => {
    if (!window.confirm(`Are you sure you want to delete location "${loc.name}"?`)) return;
    setError(null);
    try {
      await deleteLocation(loc.id);
      fetchLocations();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete location');
    }
  };

  return (
    <Box>
      {/* Header */}
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
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
            Locations & Warehouses
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage warehouse facilities, retail floors, and assign authorized staff members.
          </Typography>
        </Box>

        {isManager && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreate}
          >
            New Location
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={36} />
        </Box>
      ) : locations.length === 0 ? (
        <Card sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
          <LocationIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1.5 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            No Locations Configured
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Create your first warehouse or retail outlet to begin managing stock.
          </Typography>
          {isManager && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
              Create Location
            </Button>
          )}
        </Card>
      ) : (
        <Grid container spacing={3}>
          {locations.map((loc) => {
            const hasMovements = (loc.movement_count ?? 0) > 0;
            return (
              <Grid item xs={12} sm={6} md={4} key={loc.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 3,
                    p: 3,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.12)}`,
                    },
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box
                        sx={{
                          width: 42,
                          height: 42,
                          borderRadius: 2,
                          backgroundColor: alpha(theme.palette.primary.main, 0.12),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'primary.main',
                        }}
                      >
                        <LocationIcon />
                      </Box>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                          {loc.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Added {formatDateIST(loc.created_at)}
                        </Typography>
                      </Box>
                    </Box>

                    {isManager && (
                      <Stack direction="row" spacing={0.5}>
                        <IconButton size="small" onClick={() => handleOpenEdit(loc)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <Tooltip
                          title={
                            hasMovements
                              ? 'Cannot delete location: movements are recorded against it'
                              : 'Delete location'
                          }
                        >
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              disabled={hasMovements}
                              onClick={() => handleDeleteLocation(loc)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    )}
                  </Stack>

                  {/* Description */}
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2, flex: 1, minHeight: 36 }}
                  >
                    {loc.description || 'No description provided.'}
                  </Typography>

                  <Divider sx={{ my: 1.5 }} />

                  {/* Badges / Metrics */}
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Chip
                      icon={<MovementsIcon fontSize="small" />}
                      label={`${loc.movement_count ?? 0} movements`}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.75rem' }}
                    />
                    <Chip
                      icon={<PeopleIcon fontSize="small" />}
                      label={`${loc.staff_count ?? 0} staff assigned`}
                      size="small"
                      color={loc.staff_count && loc.staff_count > 0 ? 'primary' : 'default'}
                      variant={loc.staff_count && loc.staff_count > 0 ? 'filled' : 'outlined'}
                      sx={{ fontSize: '0.75rem', fontWeight: 600 }}
                    />
                  </Stack>

                  {/* Action */}
                  {isManager && (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<PeopleIcon />}
                      fullWidth
                      onClick={() => handleOpenAssignStaff(loc)}
                    >
                      Manage Staff Assignments
                    </Button>
                  )}
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Location create/edit modal */}
      <LocationDialog
        open={locationDialogOpen}
        location={selectedLocationForEdit}
        onClose={() => setLocationDialogOpen(false)}
        onSaved={fetchLocations}
      />

      {/* Staff assignment modal */}
      <AssignStaffDialog
        open={assignStaffDialogOpen}
        location={selectedLocationForStaff}
        onClose={() => setAssignStaffDialogOpen(false)}
        onSaved={fetchLocations}
      />
    </Box>
  );
};
