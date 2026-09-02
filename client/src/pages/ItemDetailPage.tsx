import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  Grid,
  Typography,
  Button,
  Chip,
  Tabs,
  Tab,
  Divider,
  Stack,
  Alert,
  CircularProgress,
  IconButton,
  Paper,
  alpha,
  useTheme,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Edit as EditIcon,
  Archive as ArchiveIcon,
  Unarchive as RestoreIcon,
  WarningAmber as WarningIcon,
  Inventory2 as StockIcon,
  LocationOn as LocationIcon,
  History as HistoryIcon,
  SwapHoriz as MovementsIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import type { Item, Location, StockMovement } from '../types';
import { getItem, toggleArchiveItem } from '../services/items';
import { getLocations } from '../services/locations';
import { getItemMovements } from '../services/movements';
import { useAuth } from '../contexts/AuthContext';
import { ItemDialog } from '../components/ItemDialog';
import { MovementsTable } from '../components/MovementsTable';
import { RecordMovementDialog } from '../components/RecordMovementDialog';
import { ItemHistoryTimeline } from '../components/ItemHistoryTimeline';
import { formatDateIST } from '../utils/date';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export const ItemDetailPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { isManager } = useAuth();

  const [item, setItem] = useState<Item | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [recordMovementDialogOpen, setRecordMovementDialogOpen] = useState(false);

  const loadItemDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [itemData, locs] = await Promise.all([
        getItem(id),
        getLocations(),
      ]);
      setItem(itemData);
      setLocations(locs);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load item details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadMovements = useCallback(async () => {
    if (!id) return;
    setMovementsLoading(true);
    try {
      const mvData = await getItemMovements(id);
      setMovements(mvData);
    } catch {
      // Ignore
    } finally {
      setMovementsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadItemDetails();
    loadMovements();
  }, [loadItemDetails, loadMovements]);

  const handleToggleArchive = async () => {
    if (!item) return;
    try {
      const updated = await toggleArchiveItem(item.id);
      setItem(updated);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update archive status');
    }
  };

  const handleMovementRecorded = () => {
    loadItemDetails();
    loadMovements();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !item) {
    return (
      <Box>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/items')} sx={{ mb: 2 }}>
          Back to Items
        </Button>
        <Alert severity="error">{error || 'Item not found'}</Alert>
      </Box>
    );
  }

  const isLowStock = !item.archived && (item.on_hand ?? 0) <= item.reorder_level;

  return (
    <Box>
      {/* Top bar with back button & actions */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <IconButton onClick={() => navigate('/items')} size="small">
            <BackIcon />
          </IconButton>
          <Box>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                {item.name}
              </Typography>
              <Chip
                label={item.sku}
                size="small"
                sx={{
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  backgroundColor: alpha(theme.palette.primary.main, 0.15),
                  color: theme.palette.primary.light,
                }}
              />
              {item.archived ? (
                <Chip label="Archived" size="small" color="default" variant="outlined" />
              ) : (
                <Chip label="Active" size="small" color="success" variant="outlined" />
              )}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Added on {formatDateIST(item.created_at)}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1.5}>
          {!item.archived && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setRecordMovementDialogOpen(true)}
            >
              Record Movement
            </Button>
          )}

          {isManager && (
            <>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => setEditDialogOpen(true)}
              >
                Edit Item
              </Button>
              <Button
                variant="outlined"
                color={item.archived ? 'success' : 'warning'}
                startIcon={item.archived ? <RestoreIcon /> : <ArchiveIcon />}
                onClick={handleToggleArchive}
              >
                {item.archived ? 'Restore' : 'Archive'}
              </Button>
            </>
          )}
        </Stack>
      </Stack>

      {/* KPI Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Total On Hand */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: isLowStock ? `1px solid ${theme.palette.warning.main}` : undefined,
              backgroundColor: isLowStock ? alpha(theme.palette.warning.main, 0.05) : undefined,
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  TOTAL ON HAND
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: isLowStock ? 'warning.main' : 'text.primary' }}>
                  {item.on_hand ?? 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Unit: {item.unit_of_measure}
                </Typography>
              </Box>
              <StockIcon sx={{ color: isLowStock ? 'warning.main' : 'primary.main', fontSize: 32 }} />
            </Stack>
          </Card>
        </Grid>

        {/* Reorder Level */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2.5, borderRadius: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  REORDER LEVEL
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5 }}>
                  {item.reorder_level}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Alert threshold
                </Typography>
              </Box>
              <WarningIcon sx={{ color: 'text.secondary', fontSize: 32 }} />
            </Stack>
          </Card>
        </Grid>

        {/* Category */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              CATEGORY
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5 }}>
              {item.category?.name || 'Uncategorized'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Product classification
            </Typography>
          </Card>
        </Grid>

        {/* Unit of measure */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              UNIT OF MEASURE
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5 }}>
              {item.unit_of_measure}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Stock counting unit
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Description if available */}
      {item.description && (
        <Card sx={{ p: 2.5, mb: 3, borderRadius: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
            Description
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {item.description}
          </Typography>
        </Card>
      )}

      {/* Stock by Location breakdown */}
      <Card sx={{ p: 2.5, mb: 3, borderRadius: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocationIcon color="primary" />
          Stock Breakdown by Location
        </Typography>

        <Grid container spacing={2}>
          {locations.map((loc) => {
            const locQty = item.stock_by_location?.[loc.id] ?? 0;
            return (
              <Grid item xs={12} sm={6} md={4} key={loc.id}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.background.default, 0.4),
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {loc.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                    {loc.description || 'No location notes'}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                    <Typography variant="caption" color="text.secondary">
                      Quantity:
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: locQty > 0 ? 'primary.light' : 'text.secondary' }}>
                      {locQty} {item.unit_of_measure}
                    </Typography>
                  </Stack>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Card>

      {/* Detail Tabs: Movements & History */}
      <Card sx={{ borderRadius: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, pt: 1 }}>
          <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)}>
            <Tab icon={<MovementsIcon fontSize="small" />} iconPosition="start" label={`Stock Movements (${movements.length})`} />
            <Tab icon={<HistoryIcon fontSize="small" />} iconPosition="start" label="Audit Trail / History" />
          </Tabs>
        </Box>

        <Box sx={{ p: 3 }}>
          {activeTab === 0 && (
            movementsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={32} />
              </Box>
            ) : (
              <MovementsTable movements={movements} hideItemColumn />
            )
          )}

          {activeTab === 1 && (
            <ItemHistoryTimeline itemId={item.id} />
          )}
        </Box>
      </Card>

      {/* Edit dialog */}
      <ItemDialog
        open={editDialogOpen}
        item={item}
        onClose={() => setEditDialogOpen(false)}
        onSaved={loadItemDetails}
      />

      {/* Record movement dialog */}
      <RecordMovementDialog
        open={recordMovementDialogOpen}
        preselectedItem={item}
        onClose={() => setRecordMovementDialogOpen(false)}
        onMovementRecorded={handleMovementRecorded}
      />
    </Box>
  );
};
