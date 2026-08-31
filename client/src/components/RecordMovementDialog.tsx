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
  ToggleButtonGroup,
  ToggleButton,
  Box,
  Divider,
  useTheme,
} from '@mui/material';
import {
  SwapHoriz as MovementIcon,
  Add as PlusIcon,
  Remove as MinusIcon,
  Tune as AdjustIcon,
  CompareArrows as TransferIcon,
} from '@mui/icons-material';
import { MovementKind, type Item, type Location } from '../types';
import { recordMovement } from '../services/movements';
import { getItems, getItem } from '../services/items';
import { getLocations } from '../services/locations';
import { useAuth } from '../contexts/AuthContext';

interface RecordMovementDialogProps {
  open: boolean;
  preselectedItem?: Item | null;
  onClose: () => void;
  onMovementRecorded: () => void;
}

export const RecordMovementDialog: React.FC<RecordMovementDialogProps> = ({
  open,
  preselectedItem,
  onClose,
  onMovementRecorded,
}) => {
  const theme = useTheme();
  const { user, isManager } = useAuth();

  const assignedLocationIds = React.useMemo(() => {
    if (isManager) return null; // Managers can access all locations
    return new Set((user?.assigned_locations || []).map((l) => l.id));
  }, [user, isManager]);

  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [activeItemDetails, setActiveItemDetails] = useState<Item | null>(null);

  const [kind, setKind] = useState<MovementKind>(MovementKind.RECEIPT);
  const [quantity, setQuantity] = useState<number>(1);
  const [locationId, setLocationId] = useState<string>('');
  const [fromLocationId, setFromLocationId] = useState<string>('');
  const [toLocationId, setToLocationId] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      getLocations().then(setLocations).catch(() => {});
      getItems({ archived: false, limit: 100 }).then((res) => setItems(res.items)).catch(() => {});

      if (preselectedItem) {
        setSelectedItemId(preselectedItem.id);
        getItem(preselectedItem.id).then(setActiveItemDetails).catch(() => {});
      } else {
        setSelectedItemId('');
        setActiveItemDetails(null);
      }

      setKind(MovementKind.RECEIPT);
      setQuantity(1);
      setLocationId('');
      setFromLocationId('');
      setToLocationId('');
      setReason('');
    }
  }, [open, preselectedItem]);

  const handleItemSelect = async (itemId: string) => {
    setSelectedItemId(itemId);
    if (!itemId) {
      setActiveItemDetails(null);
      return;
    }
    try {
      const details = await getItem(itemId);
      setActiveItemDetails(details);
    } catch {
      setActiveItemDetails(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) {
      setError('Please select an item');
      return;
    }

    if (kind === MovementKind.ADJUSTMENT) {
      if (quantity === 0) {
        setError('Adjustment quantity cannot be 0');
        return;
      }
      if (!reason.trim()) {
        setError('A reason is strictly required for stock adjustments');
        return;
      }
      if (!locationId) {
        setError('Please select a location');
        return;
      }
    } else {
      if (quantity <= 0) {
        setError('Quantity must be greater than 0');
        return;
      }
      if (kind === MovementKind.TRANSFER) {
        if (!fromLocationId || !toLocationId) {
          setError('Both source and destination locations are required');
          return;
        }
        if (fromLocationId === toLocationId) {
          setError('Source and destination locations must be different');
          return;
        }
      } else {
        if (!locationId) {
          setError('Please select a location');
          return;
        }
      }
    }

    setLoading(true);
    setError(null);

    try {
      await recordMovement({
        item_id: selectedItemId,
        kind,
        quantity: Number(quantity),
        location_id: kind === MovementKind.TRANSFER ? null : locationId,
        from_location_id: kind === MovementKind.TRANSFER ? fromLocationId : null,
        to_location_id: kind === MovementKind.TRANSFER ? toLocationId : null,
        reason: reason.trim() || null,
      });
      onMovementRecorded();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to record movement');
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
          <MovementIcon color="primary" />
          <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
            Record Stock Movement
          </Typography>
        </DialogTitle>

        <DialogContent dividers sx={{ borderColor: theme.palette.divider }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Movement Kind Selector */}
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
              MOVEMENT TYPE
            </Typography>
            <ToggleButtonGroup
              value={kind}
              exclusive
              onChange={(_, newKind) => {
                if (newKind) {
                  setKind(newKind);
                  setError(null);
                }
              }}
              fullWidth
              size="small"
            >
              <ToggleButton value={MovementKind.RECEIPT} color="success">
                <PlusIcon fontSize="small" sx={{ mr: 0.5 }} /> Receipt
              </ToggleButton>
              <ToggleButton value={MovementKind.ISSUE} color="info">
                <MinusIcon fontSize="small" sx={{ mr: 0.5 }} /> Issue
              </ToggleButton>
              <ToggleButton value={MovementKind.TRANSFER} color="primary">
                <TransferIcon fontSize="small" sx={{ mr: 0.5 }} /> Transfer
              </ToggleButton>
              {isManager && (
                <ToggleButton value={MovementKind.ADJUSTMENT} color="warning">
                  <AdjustIcon fontSize="small" sx={{ mr: 0.5 }} /> Adjustment
                </ToggleButton>
              )}
            </ToggleButtonGroup>
          </Box>

          <Grid container spacing={2.5}>
            {/* Item Selection */}
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                required
                label="Item"
                value={selectedItemId}
                onChange={(e) => handleItemSelect(e.target.value)}
                disabled={Boolean(preselectedItem)}
                helperText={
                  activeItemDetails
                    ? `Current Total Stock: ${activeItemDetails.on_hand} ${activeItemDetails.unit_of_measure} | Reorder Level: ${activeItemDetails.reorder_level}`
                    : 'Choose item to record movement for'
                }
              >
                <MenuItem value="">
                  <em>Select an Item</em>
                </MenuItem>
                {items.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.name} ({item.sku}) — {item.on_hand ?? 0} {item.unit_of_measure} on hand
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

          {!isManager && assignedLocationIds && assignedLocationIds.size === 0 && (
            <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 2 }}>
              You are currently not assigned to any locations. Contact a manager to assign you to a warehouse to record stock movements.
            </Alert>
          )}

          {/* Dynamic Location Inputs */}
          {kind === MovementKind.TRANSFER ? (
            <>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  required
                  label="Source Location (From)"
                  value={fromLocationId}
                  onChange={(e) => setFromLocationId(e.target.value)}
                  helperText={
                    activeItemDetails && fromLocationId
                      ? `Available at source: ${activeItemDetails.stock_by_location?.[fromLocationId] ?? 0} ${activeItemDetails.unit_of_measure}`
                      : 'Where stock is moving from'
                  }
                >
                  <MenuItem value="">
                    <em>Select Source</em>
                  </MenuItem>
                  {locations.map((loc) => {
                    const avail = activeItemDetails?.stock_by_location?.[loc.id] ?? 0;
                    const isAssigned = !assignedLocationIds || assignedLocationIds.has(loc.id);
                    return (
                      <MenuItem
                        key={loc.id}
                        value={loc.id}
                        disabled={loc.id === toLocationId || !isAssigned}
                      >
                        {loc.name} ({avail} avail){!isAssigned ? ' — [Not Assigned]' : ''}
                      </MenuItem>
                    );
                  })}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  required
                  label="Destination Location (To)"
                  value={toLocationId}
                  onChange={(e) => setToLocationId(e.target.value)}
                  helperText="Where stock is arriving"
                >
                  <MenuItem value="">
                    <em>Select Destination</em>
                  </MenuItem>
                  {locations.map((loc) => (
                    <MenuItem key={loc.id} value={loc.id} disabled={loc.id === fromLocationId}>
                      {loc.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </>
          ) : (
            <Grid item xs={12} sm={7}>
              <TextField
                select
                fullWidth
                required
                label="Location"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                helperText={
                  activeItemDetails && locationId
                    ? `Stock at this location: ${activeItemDetails.stock_by_location?.[locationId] ?? 0} ${activeItemDetails.unit_of_measure}`
                    : 'Select warehouse or retail location'
                }
              >
                <MenuItem value="">
                  <em>Select Location</em>
                </MenuItem>
                {locations.map((loc) => {
                  const avail = activeItemDetails?.stock_by_location?.[loc.id] ?? 0;
                  const isAssigned = !assignedLocationIds || assignedLocationIds.has(loc.id);
                  return (
                    <MenuItem key={loc.id} value={loc.id} disabled={!isAssigned}>
                      {loc.name} ({avail} on hand){!isAssigned ? ' — [Not Assigned]' : ''}
                    </MenuItem>
                  );
                })}
              </TextField>
            </Grid>
          )}

            {/* Quantity */}
            <Grid item xs={12} sm={kind === MovementKind.TRANSFER ? 12 : 5}>
              <TextField
                fullWidth
                required
                type="number"
                label={kind === MovementKind.ADJUSTMENT ? 'Quantity (+/-)' : 'Quantity'}
                inputProps={kind === MovementKind.ADJUSTMENT ? {} : { min: 1 }}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
                helperText={
                  kind === MovementKind.ADJUSTMENT
                    ? 'Use positive (e.g. +5) or negative (e.g. -3)'
                    : `Units to ${kind.toLowerCase()}`
                }
              />
            </Grid>

            {/* Reason input (Required for adjustments, optional for other movements) */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                required={kind === MovementKind.ADJUSTMENT}
                label={kind === MovementKind.ADJUSTMENT ? 'Reason (Required)' : 'Notes / Reference (Optional)'}
                placeholder={
                  kind === MovementKind.ADJUSTMENT
                    ? 'e.g. Physical inventory count discrepancy, damage write-off'
                    : 'e.g. PO #12345, Delivery Slip #8910'
                }
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                helperText={kind === MovementKind.ADJUSTMENT ? 'Every adjustment must carry a valid reason' : undefined}
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
            Record Movement
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
