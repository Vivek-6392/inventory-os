import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  Typography,
  Button,
  TextField,
  MenuItem,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  Menu,
  Tooltip,
  CircularProgress,
  Alert,
  Stack,
  FormControlLabel,
  Switch,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Category as CategoryIcon,
  MoreVert as MoreVertIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Archive as ArchiveIcon,
  Unarchive as RestoreIcon,
  WarningAmber as WarningIcon,
  SwapHoriz as MovementIcon,
  FileDownload as ExportIcon,
} from '@mui/icons-material';
import type { Item, Category, Location } from '../types';
import { getItems, toggleArchiveItem } from '../services/items';
import { getCategories } from '../services/categories';
import { getLocations } from '../services/locations';
import { useAuth } from '../contexts/AuthContext';
import { ItemDialog } from '../components/ItemDialog';
import { CategoryDialog } from '../components/CategoryDialog';

export const ItemsPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { isManager } = useAuth();

  // State: Data
  const [items, setItems] = useState<Item[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State: Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [archivedFilter, setArchivedFilter] = useState<boolean | undefined>(false);
  const [belowReorderOnly, setBelowReorderOnly] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0); // 0-indexed for MUI
  const [rowsPerPage, setRowsPerPage] = useState(15);

  // Modals state
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [selectedItemForEdit, setSelectedItemForEdit] = useState<Item | null>(null);

  // Row action menu
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [activeItem, setActiveItem] = useState<Item | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getItems({
        search: searchTerm || undefined,
        category_id: selectedCategory || undefined,
        location_id: selectedLocation || undefined,
        archived: archivedFilter,
        below_reorder: belowReorderOnly || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        page: page + 1, // backend is 1-indexed
        limit: rowsPerPage,
      });
      setItems(data.items);
      setTotalItems(data.total);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load items');
    } finally {
      setLoading(false);
    }
  }, [
    searchTerm,
    selectedCategory,
    selectedLocation,
    archivedFilter,
    belowReorderOnly,
    sortBy,
    sortOrder,
    page,
    rowsPerPage,
  ]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
    getLocations().then(setLocations).catch(() => {});
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(0);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedCategory(e.target.value);
    setPage(0);
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedLocation(e.target.value);
    setPage(0);
  };

  const handleArchiveFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === 'active') setArchivedFilter(false);
    else if (val === 'archived') setArchivedFilter(true);
    else setArchivedFilter(undefined);
    setPage(0);
  };

  const handleToggleBelowReorder = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBelowReorderOnly(e.target.checked);
    setPage(0);
  };

  const handleSortChange = (newSortBy: string) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
    setPage(0);
  };

  const handleOpenActionMenu = (event: React.MouseEvent<HTMLElement>, item: Item) => {
    setActionMenuAnchor(event.currentTarget);
    setActiveItem(item);
  };

  const handleCloseActionMenu = () => {
    setActionMenuAnchor(null);
  };

  const handleOpenCreateItem = () => {
    setSelectedItemForEdit(null);
    setItemDialogOpen(true);
  };

  const handleOpenEditItem = (item: Item) => {
    setSelectedItemForEdit(item);
    setItemDialogOpen(true);
    handleCloseActionMenu();
  };

  const handleToggleArchive = async (item: Item) => {
    handleCloseActionMenu();
    try {
      await toggleArchiveItem(item.id);
      fetchItems();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update item archive status');
    }
  };

  return (
    <Box>
      {/* Page Header */}
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
            Items & Inventory
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your catalog, track derived on-hand quantities, and monitor reorder levels.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
          {isManager && (
            <>
              <Button
                variant="outlined"
                startIcon={<CategoryIcon />}
                onClick={() => setCategoryDialogOpen(true)}
              >
                Categories
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleOpenCreateItem}
              >
                New Item
              </Button>
            </>
          )}
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filter & Search Bar */}
      <Card sx={{ p: 2.5, mb: 3, borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          {/* Search input */}
          <TextField
            size="small"
            placeholder="Search by name or SKU..."
            value={searchTerm}
            onChange={handleSearchChange}
            sx={{ flex: 2, minWidth: { xs: '100%', md: 240 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
          />

          {/* Category filter */}
          <TextField
            select
            size="small"
            label="Category"
            value={selectedCategory}
            onChange={handleCategoryChange}
            sx={{ minWidth: 160, flex: 1 }}
          >
            <MenuItem value="">All Categories</MenuItem>
            {categories.map((cat) => (
              <MenuItem key={cat.id} value={cat.id}>
                {cat.name}
              </MenuItem>
            ))}
          </TextField>

          {/* Location filter */}
          {locations.length > 0 && (
            <TextField
              select
              size="small"
              label="Location"
              value={selectedLocation}
              onChange={handleLocationChange}
              sx={{ minWidth: 160, flex: 1 }}
            >
              <MenuItem value="">All Locations</MenuItem>
              {locations.map((loc) => (
                <MenuItem key={loc.id} value={loc.id}>
                  {loc.name}
                </MenuItem>
              ))}
            </TextField>
          )}

          {/* Status filter */}
          <TextField
            select
            size="small"
            label="Status"
            value={archivedFilter === false ? 'active' : archivedFilter === true ? 'archived' : 'all'}
            onChange={handleArchiveFilterChange}
            sx={{ minWidth: 130 }}
          >
            <MenuItem value="active">Active Only</MenuItem>
            <MenuItem value="archived">Archived Only</MenuItem>
            <MenuItem value="all">All Items</MenuItem>
          </TextField>

          {/* Low Stock Toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={belowReorderOnly}
                onChange={handleToggleBelowReorder}
                color="warning"
                size="small"
              />
            }
            label={
              <Typography variant="body2" sx={{ fontWeight: 600, color: belowReorderOnly ? 'warning.main' : 'text.secondary' }}>
                Low Stock
              </Typography>
            }
            sx={{ ml: 1, whiteSpace: 'nowrap' }}
          />
        </Stack>
      </Card>

      {/* Items Table */}
      <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table sx={{ minWidth: 750 }}>
            <TableHead sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.04) }}>
              <TableRow>
                <TableCell
                  onClick={() => handleSortChange('sku')}
                  sx={{ cursor: 'pointer', fontWeight: 700 }}
                >
                  SKU {sortBy === 'sku' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </TableCell>
                <TableCell
                  onClick={() => handleSortChange('name')}
                  sx={{ cursor: 'pointer', fontWeight: 700 }}
                >
                  Item Name {sortBy === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>UOM</TableCell>
                <TableCell
                  align="right"
                  onClick={() => handleSortChange('on_hand')}
                  sx={{ cursor: 'pointer', fontWeight: 700 }}
                >
                  On Hand {sortBy === 'on_hand' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </TableCell>
                <TableCell
                  align="right"
                  onClick={() => handleSortChange('reorder_level')}
                  sx={{ cursor: 'pointer', fontWeight: 700 }}
                >
                  Reorder Level {sortBy === 'reorder_level' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <Typography variant="body1" color="text.secondary">
                      No items found matching your filters.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => {
                  const isLowStock = !item.archived && (item.on_hand ?? 0) <= item.reorder_level;
                  return (
                    <TableRow
                      key={item.id}
                      hover
                      sx={{
                        cursor: 'pointer',
                        opacity: item.archived ? 0.6 : 1,
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.04),
                        },
                      }}
                      onClick={() => navigate(`/items/${item.id}`)}
                    >
                      {/* SKU */}
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'primary.light' }}>
                        {item.sku}
                      </TableCell>

                      {/* Name & Description preview */}
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                          {item.name}
                        </Typography>
                        {item.description && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                            sx={{ display: 'block', maxWidth: 300 }}
                          >
                            {item.description}
                          </Typography>
                        )}
                      </TableCell>

                      {/* Category */}
                      <TableCell>
                        {item.category ? (
                          <Chip
                            label={item.category.name}
                            size="small"
                            sx={{
                              backgroundColor: alpha(theme.palette.primary.main, 0.12),
                              color: theme.palette.primary.light,
                              fontWeight: 600,
                            }}
                          />
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            —
                          </Typography>
                        )}
                      </TableCell>

                      {/* Unit of measure */}
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {item.unit_of_measure}
                        </Typography>
                      </TableCell>

                      {/* On Hand Stock */}
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                          {isLowStock && (
                            <Tooltip title="At or below reorder level">
                              <WarningIcon color="warning" fontSize="small" />
                            </Tooltip>
                          )}
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.95rem',
                              color: isLowStock ? 'warning.main' : 'text.primary',
                            }}
                          >
                            {item.on_hand ?? 0}
                          </Typography>
                        </Stack>
                      </TableCell>

                      {/* Reorder Level */}
                      <TableCell align="right">
                        <Typography variant="body2" color="text.secondary">
                          {item.reorder_level}
                        </Typography>
                      </TableCell>

                      {/* Status */}
                      <TableCell align="center">
                        {item.archived ? (
                          <Chip label="Archived" size="small" color="default" variant="outlined" />
                        ) : (
                          <Chip label="Active" size="small" color="success" variant="outlined" />
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                        <IconButton
                          size="small"
                          onClick={(e) => handleOpenActionMenu(e, item)}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination Controls */}
        <TablePagination
          rowsPerPageOptions={[10, 15, 25, 50]}
          component="div"
          count={totalItems}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          sx={{ borderTop: `1px solid ${theme.palette.divider}` }}
        />
      </Card>

      {/* Row Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleCloseActionMenu}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem
          onClick={() => {
            if (activeItem) navigate(`/items/${activeItem.id}`);
            handleCloseActionMenu();
          }}
        >
          <VisibilityIcon fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} />
          View Details
        </MenuItem>

        {isManager && activeItem && (
          <MenuItem onClick={() => handleOpenEditItem(activeItem)}>
            <EditIcon fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} />
            Edit Item
          </MenuItem>
        )}

        {isManager && activeItem && (
          <MenuItem onClick={() => handleToggleArchive(activeItem)}>
            {activeItem.archived ? (
              <>
                <RestoreIcon fontSize="small" sx={{ mr: 1.5, color: 'success.main' }} />
                Restore Item
              </>
            ) : (
              <>
                <ArchiveIcon fontSize="small" sx={{ mr: 1.5, color: 'warning.main' }} />
                Archive Item
              </>
            )}
          </MenuItem>
        )}
      </Menu>

      {/* Item Create / Edit Dialog */}
      <ItemDialog
        open={itemDialogOpen}
        item={selectedItemForEdit}
        onClose={() => setItemDialogOpen(false)}
        onSaved={fetchItems}
      />

      {/* Category Management Dialog */}
      <CategoryDialog
        open={categoryDialogOpen}
        onClose={() => setCategoryDialogOpen(false)}
        onCategoriesChanged={() => {
          getCategories().then(setCategories).catch(() => {});
          fetchItems();
        }}
      />
    </Box>
  );
};
