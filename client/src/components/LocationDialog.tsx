import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Alert,
  CircularProgress,
  Typography,
  useTheme,
} from '@mui/material';
import { LocationOn as LocationIcon } from '@mui/icons-material';
import type { Location } from '../types';
import { createLocation, updateLocation } from '../services/locations';
import type { LocationFormData } from '../services/locations';

interface LocationDialogProps {
  open: boolean;
  location?: Location | null;
  onClose: () => void;
  onSaved: () => void;
}

export const LocationDialog: React.FC<LocationDialogProps> = ({
  open,
  location,
  onClose,
  onSaved,
}) => {
  const theme = useTheme();
  const isEditing = Boolean(location);

  const [formData, setFormData] = useState<LocationFormData>({
    name: '',
    description: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (location) {
        setFormData({
          name: location.name,
          description: location.description || '',
        });
      } else {
        setFormData({
          name: '',
          description: '',
        });
      }
      setError(null);
    }
  }, [open, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Location name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isEditing && location) {
        await updateLocation(location.id, {
          name: formData.name.trim(),
          description: formData.description?.trim() || undefined,
        });
      } else {
        await createLocation({
          name: formData.name.trim(),
          description: formData.description?.trim() || undefined,
        });
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save location');
    } finally {
      setLoading(false);
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
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <LocationIcon color="primary" />
          <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
            {isEditing ? `Edit Location: ${location?.name}` : 'Create New Location'}
          </Typography>
        </DialogTitle>

        <DialogContent dividers sx={{ borderColor: theme.palette.divider }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2.5} sx={{ mt: 0.2 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Location Name"
                placeholder="e.g. Central Warehouse, Retail Outlet A"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                helperText="Unique warehouse or retail floor identifier"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description / Notes"
                placeholder="Address, zone, or operational purpose..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={onClose} variant="outlined" disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={loading && <CircularProgress size={16} />}
          >
            {isEditing ? 'Save Changes' : 'Create Location'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
