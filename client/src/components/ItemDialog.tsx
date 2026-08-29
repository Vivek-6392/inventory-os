import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Grid,
  Alert,
  CircularProgress,
  Typography,
  useTheme,
} from '@mui/material';
import { Inventory as ItemIcon } from '@mui/icons-material';
import type { Item, Category } from '../types';
import { createItem, updateItem } from '../services/items';
import type { ItemFormData } from '../services/items';
import { getCategories } from '../services/categories';

interface ItemDialogProps {
  open: boolean;
  item?: Item | null; // If provided, we are editing
  onClose: () => void;
  onSaved: () => void;
}

export const ItemDialog: React.FC<ItemDialogProps> = ({
  open,
  item,
  onClose,
  onSaved,
}) => {
  const theme = useTheme();
  const isEditing = Boolean(item);

  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState<ItemFormData>({
    sku: '',
    name: '',
    description: '',
    unit_of_measure: 'pcs',
    reorder_level: 0,
    category_id: null,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      // Load categories
      getCategories().then(setCategories).catch(() => {});

      if (item) {
        setFormData({
          sku: item.sku,
          name: item.name,
          description: item.description || '',
          unit_of_measure: item.unit_of_measure,
          reorder_level: item.reorder_level,
          category_id: item.category_id,
        });
      } else {
        setFormData({
          sku: '',
          name: '',
          description: '',
          unit_of_measure: 'pcs',
          reorder_level: 10,
          category_id: null,
        });
      }
      setError(null);
    }
  }, [open, item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sku.trim() || !formData.name.trim() || !formData.unit_of_measure.trim()) {
      setError('Please fill in all required fields (SKU, Name, Unit of Measure)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isEditing && item) {
        await updateItem(item.id, {
          sku: formData.sku.trim(),
          name: formData.name.trim(),
          description: formData.description?.trim() || undefined,
          unit_of_measure: formData.unit_of_measure.trim(),
          reorder_level: Number(formData.reorder_level),
          category_id: formData.category_id || null,
        });
      } else {
        await createItem({
          sku: formData.sku.trim(),
          name: formData.name.trim(),
          description: formData.description?.trim() || undefined,
          unit_of_measure: formData.unit_of_measure.trim(),
          reorder_level: Number(formData.reorder_level),
          category_id: formData.category_id || null,
        });
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
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
          <ItemIcon color="primary" />
          <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
            {isEditing ? `Edit Item: ${item?.name}` : 'Create New Item'}
          </Typography>
        </DialogTitle>

        <DialogContent dividers sx={{ borderColor: theme.palette.divider }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2.5} sx={{ mt: 0.2 }}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                required
                label="SKU / Item Code"
                placeholder="e.g. SKU-001"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                helperText="Unique product code"
              />
            </Grid>

            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                required
                label="Item Name"
                placeholder="e.g. Cordless Power Drill 18V"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Category"
                value={formData.category_id || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    category_id: e.target.value ? (e.target.value as string) : null,
                  })
                }
                helperText="Select maintained category"
              >
                <MenuItem value="">
                  <em>None (Uncategorized)</em>
                </MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                required
                label="Unit of Measure"
                placeholder="e.g. pcs, kg, box"
                value={formData.unit_of_measure}
                onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                required
                type="number"
                label="Reorder Level"
                inputProps={{ min: 0 }}
                value={formData.reorder_level}
                onChange={(e) =>
                  setFormData({ ...formData, reorder_level: Math.max(0, parseInt(e.target.value) || 0) })
                }
                helperText="Triggers low-stock alert"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                placeholder="Optional detailed description, manufacturer, specifications..."
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
            {isEditing ? 'Save Changes' : 'Create Item'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
