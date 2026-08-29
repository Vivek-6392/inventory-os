import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Divider,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Category as CategoryIcon,
} from '@mui/icons-material';
import { Category } from '../types';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../services/categories';

interface CategoryDialogProps {
  open: boolean;
  onClose: () => void;
  onCategoriesChanged?: () => void;
}

export const CategoryDialog: React.FC<CategoryDialogProps> = ({
  open,
  onClose,
  onCategoriesChanged,
}) => {
  const theme = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New category input
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const loadCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadCategories();
      setNewCategoryName('');
      setEditingId(null);
      setError(null);
      setSuccess(null);
    }
  }, [open]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await createCategory(newCategoryName.trim());
      setNewCategoryName('');
      setSuccess('Category created successfully');
      loadCategories();
      onCategoriesChanged?.();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingName.trim()) return;
    setError(null);
    try {
      await updateCategory(id, editingName.trim());
      setEditingId(null);
      setSuccess('Category updated');
      loadCategories();
      onCategoriesChanged?.();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update category');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete category "${name}"?`)) return;
    setError(null);
    try {
      await deleteCategory(id);
      setSuccess('Category deleted');
      loadCategories();
      onCategoriesChanged?.();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete category');
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
        <CategoryIcon color="primary" />
        <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
          Manage Categories
        </Typography>
      </DialogTitle>

      <DialogContent dividers sx={{ borderColor: theme.palette.divider }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {/* Add new category form */}
        <Box component="form" onSubmit={handleAdd} sx={{ display: 'flex', gap: 1.5, mb: 3, mt: 1 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="New category name (e.g. Electronics)"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            disabled={isSubmitting}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting || !newCategoryName.trim()}
            startIcon={isSubmitting ? <CircularProgress size={16} /> : <AddIcon />}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Add
          </Button>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* List of categories */}
        <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1, fontWeight: 600 }}>
          Existing Categories ({categories.length})
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : categories.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
            No categories yet. Create your first category above.
          </Typography>
        ) : (
          <List sx={{ maxHeight: 320, overflow: 'auto', p: 0 }}>
            {categories.map((cat) => (
              <ListItem
                key={cat.id}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  backgroundColor: alpha(theme.palette.background.default, 0.5),
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  },
                }}
                secondaryAction={
                  editingId === cat.id ? (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton size="small" color="primary" onClick={() => handleSaveEdit(cat.id)}>
                        <CheckIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={handleCancelEdit}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton size="small" onClick={() => handleStartEdit(cat)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(cat.id, cat.name)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )
                }
              >
                {editingId === cat.id ? (
                  <TextField
                    size="small"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    autoFocus
                    sx={{ mr: 6 }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(cat.id);
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                  />
                ) : (
                  <ListItemText
                    primary={cat.name}
                    primaryTypographyProps={{ fontWeight: 500 }}
                  />
                )}
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
};
