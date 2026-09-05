import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Card,
  Typography,
  Button,
  TextField,
  MenuItem,
  Stack,
  TablePagination,
  Alert,
  CircularProgress,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  SwapHoriz as MovementsIcon,
} from '@mui/icons-material';
import { MovementKind, type StockMovement, type Item, type Location } from '../types';
import { getMovements } from '../services/movements';
import { getItems } from '../services/items';
import { getLocations } from '../services/locations';
import { MovementsTable } from '../components/MovementsTable';
import { RecordMovementDialog } from '../components/RecordMovementDialog';

export const MovementsPage: React.FC = () => {
  const theme = useTheme();
  const [searchParams] = useSearchParams();

  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [totalMovements, setTotalMovements] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>(
    searchParams.get('location_id') || ''
  );
  const [selectedKind, setSelectedKind] = useState<string>('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  useEffect(() => {
    const locId = searchParams.get('location_id');
    if (locId) {
      setSelectedLocationId(locId);
      setPage(0);
    }
  }, [searchParams]);

  const [recordDialogOpen, setRecordDialogOpen] = useState(false);

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMovements({
        item_id: selectedItemId || undefined,
        location_id: selectedLocationId || undefined,
        kind: selectedKind ? (selectedKind as MovementKind) : undefined,
        page: page + 1,
        limit: rowsPerPage,
      });
      setMovements(data.items);
      setTotalMovements(data.total);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load movements');
    } finally {
      setLoading(false);
    }
  }, [selectedItemId, selectedLocationId, selectedKind, page, rowsPerPage]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  useEffect(() => {
    getItems({ limit: 100 }).then((res) => setItems(res.items)).catch(() => {});
    getLocations().then(setLocations).catch(() => {});
  }, []);

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
            Stock Movements Ledger
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Immutable append-only ledger of every delivery, sale, transfer, and adjustment.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setRecordDialogOpen(true)}
        >
          Record Movement
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filter Bar */}
      <Card sx={{ p: 2.5, mb: 3, borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          {/* Item filter */}
          <TextField
            select
            size="small"
            label="Filter by Item"
            value={selectedItemId}
            onChange={(e) => {
              setSelectedItemId(e.target.value);
              setPage(0);
            }}
            sx={{ flex: 2, minWidth: 200 }}
          >
            <MenuItem value="">All Items</MenuItem>
            {items.map((item) => (
              <MenuItem key={item.id} value={item.id}>
                {item.name} ({item.sku})
              </MenuItem>
            ))}
          </TextField>

          {/* Location filter */}
          <TextField
            select
            size="small"
            label="Filter by Location"
            value={selectedLocationId}
            onChange={(e) => {
              setSelectedLocationId(e.target.value);
              setPage(0);
            }}
            sx={{ flex: 1.5, minWidth: 180 }}
          >
            <MenuItem value="">All Locations</MenuItem>
            {locations.map((loc) => (
              <MenuItem key={loc.id} value={loc.id}>
                {loc.name}
              </MenuItem>
            ))}
          </TextField>

          {/* Movement Kind filter */}
          <TextField
            select
            size="small"
            label="Movement Type"
            value={selectedKind}
            onChange={(e) => {
              setSelectedKind(e.target.value);
              setPage(0);
            }}
            sx={{ flex: 1, minWidth: 150 }}
          >
            <MenuItem value="">All Types</MenuItem>
            <MenuItem value={MovementKind.RECEIPT}>Receipts</MenuItem>
            <MenuItem value={MovementKind.ISSUE}>Issues</MenuItem>
            <MenuItem value={MovementKind.TRANSFER}>Transfers</MenuItem>
            <MenuItem value={MovementKind.ADJUSTMENT}>Adjustments</MenuItem>
          </TextField>
        </Stack>
      </Card>

      {/* Movements Table */}
      <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <>
            <MovementsTable movements={movements} />
            <TablePagination
              rowsPerPageOptions={[10, 20, 50, 100]}
              component="div"
              count={totalMovements}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              sx={{ borderTop: `1px solid ${theme.palette.divider}` }}
            />
          </>
        )}
      </Card>

      {/* Record Movement Dialog */}
      <RecordMovementDialog
        open={recordDialogOpen}
        onClose={() => setRecordDialogOpen(false)}
        onMovementRecorded={fetchMovements}
      />
    </Box>
  );
};
