import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Stack,
  Alert,
  CircularProgress,
  alpha,
  useTheme,
} from '@mui/material';
import {
  People as PeopleIcon,
  LocationOn as LocationIcon,
  Edit as EditIcon,
  Shield as ShieldIcon,
} from '@mui/icons-material';
import type { Location } from '../types';
import { getUsers, assignUserLocations } from '../services/users';
import type { UserWithLocations } from '../services/users';
import { getLocations } from '../services/locations';

export const UsersPage: React.FC = () => {
  const theme = useTheme();

  const [users, setUsers] = useState<UserWithLocations[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit user location modal
  const [selectedUser, setSelectedUser] = useState<UserWithLocations | null>(null);
  const [userLocDialogOpen, setUserLocDialogOpen] = useState(false);
  const [selectedLocIds, setSelectedLocIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [userData, locData] = await Promise.all([
        getUsers(),
        getLocations(),
      ]);
      setUsers(userData);
      setLocations(locData);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenAssignModal = (user: UserWithLocations) => {
    setSelectedUser(user);
    setSelectedLocIds(user.assigned_locations.map((l) => l.id));
    setUserLocDialogOpen(true);
  };

  const handleToggleLocation = (locId: string) => {
    setSelectedLocIds((prev) =>
      prev.includes(locId) ? prev.filter((id) => id !== locId) : [...prev, locId]
    );
  };

  const handleSaveUserLocations = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      await assignUserLocations(selectedUser.id, selectedLocIds);
      setUserLocDialogOpen(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update user locations');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
          User Accounts & Permissions
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage staff accounts and configure which warehouses and retail locations each staff member can access.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table sx={{ minWidth: 650 }}>
            <TableHead sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.04) }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>User</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Assigned Locations</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => {
                  const isManagerUser = user.role === 'MANAGER';
                  return (
                    <TableRow key={user.id} hover>
                      {/* User Info */}
                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar
                            sx={{
                              width: 36,
                              height: 36,
                              bgcolor: isManagerUser
                                ? theme.palette.secondary.main
                                : theme.palette.primary.main,
                              fontWeight: 700,
                              fontSize: '0.85rem',
                            }}
                          >
                            {user.name.charAt(0).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {user.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {user.email}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>

                      {/* Role */}
                      <TableCell>
                        {isManagerUser ? (
                          <Chip
                            icon={<ShieldIcon fontSize="small" />}
                            label="Manager"
                            size="small"
                            color="secondary"
                            sx={{ fontWeight: 700 }}
                          />
                        ) : (
                          <Chip
                            icon={<PeopleIcon fontSize="small" />}
                            label="Staff"
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                          />
                        )}
                      </TableCell>

                      {/* Assigned Locations */}
                      <TableCell>
                        {isManagerUser ? (
                          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            All Locations (Manager Global Access)
                          </Typography>
                        ) : user.assigned_locations.length === 0 ? (
                          <Typography variant="caption" color="warning.main" sx={{ fontWeight: 600 }}>
                            No locations assigned (Cannot record movements)
                          </Typography>
                        ) : (
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {user.assigned_locations.map((loc) => (
                              <Chip
                                key={loc.id}
                                icon={<LocationIcon fontSize="small" />}
                                label={loc.name}
                                size="small"
                                sx={{
                                  backgroundColor: alpha(theme.palette.primary.main, 0.12),
                                  color: theme.palette.primary.light,
                                  fontSize: '0.75rem',
                                }}
                              />
                            ))}
                          </Stack>
                        )}
                      </TableCell>

                      {/* Action */}
                      <TableCell align="right">
                        {!isManagerUser && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<EditIcon />}
                            onClick={() => handleOpenAssignModal(user)}
                          >
                            Assign Locations
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* User location assignment dialog */}
      <Dialog
        open={userLocDialogOpen}
        onClose={() => setUserLocDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <LocationIcon color="primary" />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Assign Locations to {selectedUser?.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {selectedUser?.email}
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ borderColor: theme.palette.divider }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Check the locations this staff member is authorized to manage:
          </Typography>

          <List sx={{ p: 0 }}>
            {locations.map((loc) => {
              const isChecked = selectedLocIds.includes(loc.id);
              return (
                <ListItem key={loc.id} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => handleToggleLocation(loc.id)}
                    sx={{
                      borderRadius: 2,
                      backgroundColor: isChecked
                        ? alpha(theme.palette.primary.main, 0.1)
                        : alpha(theme.palette.background.default, 0.4),
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Checkbox edge="start" checked={isChecked} tabIndex={-1} disableRipple />
                    </ListItemIcon>
                    <ListItemText
                      primary={loc.name}
                      secondary={loc.description}
                      primaryTypographyProps={{ fontWeight: 600 }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setUserLocDialogOpen(false)} variant="outlined" disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveUserLocations}
            variant="contained"
            disabled={saving}
            startIcon={saving && <CircularProgress size={16} />}
          >
            Save Locations ({selectedLocIds.length})
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
