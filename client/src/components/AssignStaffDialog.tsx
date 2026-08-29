import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Avatar,
  Typography,
  Alert,
  CircularProgress,
  Box,
  Divider,
  alpha,
  useTheme,
} from '@mui/material';
import { People as PeopleIcon } from '@mui/icons-material';
import type { Location, User } from '../types';
import { getLocationStaff, setLocationStaff } from '../services/locations';
import { getStaffUsers } from '../services/users';

interface AssignStaffDialogProps {
  open: boolean;
  location: Location | null;
  onClose: () => void;
  onSaved: () => void;
}

export const AssignStaffDialog: React.FC<AssignStaffDialogProps> = ({
  open,
  location,
  onClose,
  onSaved,
}) => {
  const theme = useTheme();

  const [allStaff, setAllStaff] = useState<User[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && location) {
      setLoading(true);
      setError(null);

      Promise.all([getStaffUsers(), getLocationStaff(location.id)])
        .then(([staffList, assignedList]) => {
          setAllStaff(staffList);
          setSelectedStaffIds(assignedList.map((u) => u.id));
        })
        .catch((err: any) => {
          setError(err.response?.data?.detail || 'Failed to load staff list');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [open, location]);

  const handleToggle = (userId: string) => {
    setSelectedStaffIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSave = async () => {
    if (!location) return;
    setSaving(true);
    setError(null);
    try {
      await setLocationStaff(location.id, selectedStaffIds);
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update staff assignments');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
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
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <PeopleIcon color="primary" />
        <Box>
          <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
            Staff Assignments
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Location: {location?.name}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ borderColor: theme.palette.divider }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Selected staff members will be authorized to record receipts, issues, and transfers at this location.
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : allStaff.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
            No staff accounts found. Create staff accounts in Users management.
          </Typography>
        ) : (
          <List sx={{ maxHeight: 320, overflow: 'auto', p: 0 }}>
            {allStaff.map((staff) => {
              const isChecked = selectedStaffIds.includes(staff.id);
              return (
                <ListItem key={staff.id} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => handleToggle(staff.id)}
                    sx={{
                      borderRadius: 2,
                      backgroundColor: isChecked
                        ? alpha(theme.palette.primary.main, 0.1)
                        : alpha(theme.palette.background.default, 0.4),
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.15),
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Checkbox
                        edge="start"
                        checked={isChecked}
                        tabIndex={-1}
                        disableRipple
                      />
                    </ListItemIcon>
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        mr: 1.5,
                        bgcolor: theme.palette.primary.main,
                        fontSize: '0.8rem',
                        fontWeight: 600,
                      }}
                    >
                      {staff.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <ListItemText
                      primary={staff.name}
                      secondary={staff.email}
                      primaryTypographyProps={{ fontWeight: 600 }}
                      secondaryTypographyProps={{ fontSize: '0.75rem' }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving}
          startIcon={saving && <CircularProgress size={16} />}
        >
          Save Assignments ({selectedStaffIds.length})
        </Button>
      </DialogActions>
    </Dialog>
  );
};
