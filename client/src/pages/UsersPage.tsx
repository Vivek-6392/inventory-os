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
  TextField,
  Divider,
  alpha,
  useTheme,
} from '@mui/material';
import {
  People as PeopleIcon,
  LocationOn as LocationIcon,
  Edit as EditIcon,
  Shield as ShieldIcon,
  PersonAdd as PersonAddIcon,
} from '@mui/icons-material';
import type { Location } from '../types';
import { getUsers, assignUserLocations, createStaffUser } from '../services/users';
import type { UserWithLocations } from '../services/users';
import { getLocations } from '../services/locations';
import { useAuth } from '../contexts/AuthContext';

export const UsersPage: React.FC = () => {
  const theme = useTheme();
  const { isManager } = useAuth();

  const [users, setUsers] = useState<UserWithLocations[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Edit user location modal
  const [selectedUser, setSelectedUser] = useState<UserWithLocations | null>(null);
  const [userLocDialogOpen, setUserLocDialogOpen] = useState(false);
  const [selectedLocIds, setSelectedLocIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Create staff user modal
  const [createStaffOpen, setCreateStaffOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffLocIds, setNewStaffLocIds] = useState<string[]>([]);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

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

  const handleToggleNewStaffLocation = (locId: string) => {
    setNewStaffLocIds((prev) =>
      prev.includes(locId) ? prev.filter((id) => id !== locId) : [...prev, locId]
    );
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffEmail.trim() || !newStaffPassword.trim()) {
      setCreateError('Please fill in Name, Email, and Password');
      return;
    }
    if (newStaffPassword.trim().length < 6) {
      setCreateError('Password must be at least 6 characters');
      return;
    }

    setCreateSubmitting(true);
    setCreateError(null);
    try {
      await createStaffUser({
        name: newStaffName.trim(),
        email: newStaffEmail.trim().toLowerCase(),
        password: newStaffPassword.trim(),
        location_ids: newStaffLocIds,
      });
      setSuccessMsg(`Warehouse staff account for ${newStaffName.trim()} created successfully!`);
      setCreateStaffOpen(false);
      setNewStaffName('');
      setNewStaffEmail('');
      setNewStaffPassword('');
      setNewStaffLocIds([]);
      fetchUsers();
    } catch (err: any) {
      setCreateError(err.response?.data?.detail || 'Failed to create staff account');
    } finally {
      setCreateSubmitting(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
            User Accounts & Permissions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage warehouse staff accounts and configure which warehouse facilities each staff member can access.
          </Typography>
        </Box>
        {isManager && (
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={() => {
              setCreateError(null);
              setCreateStaffOpen(true);
            }}
            sx={{ fontWeight: 600, px: 2.5, py: 1, borderRadius: 2 }}
          >
            Add Staff Member
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {successMsg && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setSuccessMsg(null)}>
          {successMsg}
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

      {/* Create New Staff Member Modal (Managers only) */}
      <Dialog
        open={createStaffOpen}
        onClose={() => !createSubmitting && setCreateStaffOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            border: `1px solid ${theme.palette.divider}`,
          },
        }}
      >
        <form onSubmit={handleCreateStaff}>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <PersonAddIcon color="primary" />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Add New Warehouse Staff
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Onboard a new warehouse team member and set their initial facility permissions.
              </Typography>
            </Box>
          </DialogTitle>

          <DialogContent dividers sx={{ borderColor: theme.palette.divider }}>
            {createError && (
              <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setCreateError(null)}>
                {createError}
              </Alert>
            )}

            <Stack spacing={2.5}>
              <TextField
                label="Full Name"
                placeholder="e.g. Vikram Sharma"
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                required
                fullWidth
                size="small"
                autoFocus
              />

              <TextField
                label="Email Address"
                placeholder="e.g. vikram@invstock.com"
                type="email"
                value={newStaffEmail}
                onChange={(e) => setNewStaffEmail(e.target.value)}
                required
                fullWidth
                size="small"
              />

              <TextField
                label="Initial Password"
                type="password"
                placeholder="Minimum 6 characters"
                value={newStaffPassword}
                onChange={(e) => setNewStaffPassword(e.target.value)}
                required
                fullWidth
                size="small"
                helperText="Temporary login password for the staff member"
              />

              {/* Role Indicator */}
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.primary.main, 0.06),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    Assigned Role
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Warehouse Staff (Floor operations restricted to assigned facilities)
                  </Typography>
                </Box>
                <Chip
                  icon={<ShieldIcon sx={{ fontSize: '1rem !important' }} />}
                  label="STAFF"
                  color="primary"
                  size="small"
                  sx={{ fontWeight: 700 }}
                />
              </Box>

              {/* Location Permissions */}
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Authorized Facilities ({newStaffLocIds.length} selected)
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => {
                      if (newStaffLocIds.length === locations.length) {
                        setNewStaffLocIds([]);
                      } else {
                        setNewStaffLocIds(locations.map((l) => l.id));
                      }
                    }}
                    sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                  >
                    {newStaffLocIds.length === locations.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                  Staff can only record receipts, issues, and transfers at authorized facilities.
                </Typography>

                <List sx={{ p: 0, maxHeight: 180, overflowY: 'auto' }}>
                  {locations.map((loc) => {
                    const isChecked = newStaffLocIds.includes(loc.id);
                    return (
                      <ListItem key={loc.id} disablePadding sx={{ mb: 0.5 }}>
                        <ListItemButton
                          onClick={() => handleToggleNewStaffLocation(loc.id)}
                          sx={{
                            py: 0.5,
                            borderRadius: 1.5,
                            backgroundColor: isChecked
                              ? alpha(theme.palette.primary.main, 0.08)
                              : alpha(theme.palette.background.default, 0.4),
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <Checkbox edge="start" checked={isChecked} tabIndex={-1} size="small" disableRipple />
                          </ListItemIcon>
                          <ListItemText
                            primary={loc.name}
                            primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 600 }}
                            secondary={loc.description}
                            secondaryTypographyProps={{ fontSize: '0.75rem' }}
                          />
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </List>
              </Box>
            </Stack>
          </DialogContent>

          <DialogActions sx={{ p: 2.5, gap: 1 }}>
            <Button
              onClick={() => setCreateStaffOpen(false)}
              variant="outlined"
              disabled={createSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createSubmitting}
              startIcon={createSubmitting ? <CircularProgress size={16} /> : <PersonAddIcon />}
              sx={{ fontWeight: 600 }}
            >
              Create Staff Member
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};
