import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Stack,
  alpha,
  useTheme,
  Snackbar,
  LinearProgress,
  Divider,
  Avatar,
} from '@mui/material';
import {
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Refresh as RefreshIcon,
  Inventory2 as ItemIcon,
  NotificationsOff as DismissIcon,
  NotificationsActive as UndismissIcon,
  ArrowForward as ArrowForwardIcon,
  TrendingDown as TrendDownIcon,
} from '@mui/icons-material';
import {
  listAlerts,
  listAllAlerts,
  dismissAlert,
  undismissAlert,
  type AlertItem,
} from '../services/alerts';
import { useAuth } from '../contexts/AuthContext';
import { formatDateTimeIST } from '../utils/date';

export const AlertsPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { isManager } = useAuth();

  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDismissed, setShowDismissed] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = showDismissed && isManager ? await listAllAlerts() : await listAlerts();
      setAlerts(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, [showDismissed, isManager]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleDismiss = async (itemId: string, itemName: string) => {
    setActionLoading(itemId);
    try {
      await dismissAlert(itemId);
      setSnackbar({ open: true, message: `Alert dismissed for "${itemName}"`, severity: 'success' });
      fetchAlerts();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.response?.data?.detail || 'Failed to dismiss alert', severity: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleUndismiss = async (itemId: string, itemName: string) => {
    setActionLoading(itemId);
    try {
      await undismissAlert(itemId);
      setSnackbar({ open: true, message: `Alert re-activated for "${itemName}"`, severity: 'success' });
      fetchAlerts();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.response?.data?.detail || 'Failed to re-activate alert', severity: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const activeAlerts = alerts.filter((a) => !a.is_dismissed);
  const dismissedAlerts = alerts.filter((a) => a.is_dismissed);

  const getSeverityColor = (deficit: number, reorderLevel: number) => {
    const ratio = deficit / (reorderLevel || 1);
    if (ratio >= 1) return 'error'; // completely out
    if (ratio >= 0.5) return 'warning'; // critically low
    return 'info'; // just below reorder
  };

  const getDeficitPercent = (onHand: number, reorderLevel: number) => {
    if (reorderLevel === 0) return 0;
    return Math.min(100, Math.round((onHand / reorderLevel) * 100));
  };

  return (
    <Box>
      {/* Header */}
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
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon color="warning" />
            Low-Stock Alerts
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Real-time tracking of items below their reorder threshold. Alerts auto-re-trigger on new stock movements.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center">
          {isManager && (
            <FormControlLabel
              control={
                <Switch
                  checked={showDismissed}
                  onChange={(e) => setShowDismissed(e.target.checked)}
                  size="small"
                />
              }
              label={
                <Typography variant="body2" color="text.secondary">
                  Show dismissed
                </Typography>
              }
            />
          )}
          <IconButton onClick={fetchAlerts} sx={{ border: `1px solid ${theme.palette.divider}` }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      {/* Summary Bar */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <Card
          sx={{
            flex: 1,
            p: 2.5,
            borderRadius: 3,
            background: activeAlerts.length > 0
              ? `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.15)} 0%, ${theme.palette.background.paper} 100%)`
              : `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${theme.palette.background.paper} 100%)`,
            border: `1px solid ${activeAlerts.length > 0 ? alpha(theme.palette.warning.main, 0.3) : alpha(theme.palette.success.main, 0.3)}`,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                Active Alerts
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 800, color: activeAlerts.length > 0 ? 'warning.main' : 'success.main' }}>
                {loading ? '—' : activeAlerts.length}
              </Typography>
            </Box>
            <Avatar sx={{ bgcolor: alpha(activeAlerts.length > 0 ? theme.palette.warning.main : theme.palette.success.main, 0.15), width: 52, height: 52 }}>
              {activeAlerts.length > 0 ? <WarningIcon color="warning" /> : <CheckIcon color="success" />}
            </Avatar>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {activeAlerts.length === 0 ? 'All inventory levels are healthy' : 'Items below reorder threshold requiring action'}
          </Typography>
        </Card>

        {isManager && showDismissed && (
          <Card sx={{ flex: 1, p: 2.5, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                  Dismissed Alerts
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 800, color: 'text.secondary' }}>
                  {loading ? '—' : dismissedAlerts.length}
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: alpha(theme.palette.text.secondary, 0.1), width: 52, height: 52 }}>
                <DismissIcon color="disabled" />
              </Avatar>
            </Box>
            <Typography variant="caption" color="text.secondary">
              Acknowledged but still below reorder level
            </Typography>
          </Card>
        )}
      </Stack>

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} action={<Button size="small" onClick={fetchAlerts}>Retry</Button>}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : activeAlerts.length === 0 && !showDismissed ? (
        /* Empty State */
        <Card sx={{ p: 6, borderRadius: 3, textAlign: 'center', border: `1px solid ${theme.palette.divider}` }}>
          <Avatar sx={{ width: 72, height: 72, bgcolor: alpha(theme.palette.success.main, 0.1), mx: 'auto', mb: 2 }}>
            <CheckIcon sx={{ fontSize: 40, color: 'success.main' }} />
          </Avatar>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            All Stock Levels Healthy
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            No items are currently below their reorder threshold. Great inventory management!
          </Typography>
          <Button variant="outlined" startIcon={<ItemIcon />} onClick={() => navigate('/items')}>
            View All Items
          </Button>
        </Card>
      ) : (
        /* Alerts Table */
        <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
          {/* Active Alerts */}
          {activeAlerts.length > 0 && (
            <>
              <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.warning.main, 0.05) }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WarningIcon color="warning" fontSize="small" />
                  Active Alerts ({activeAlerts.length})
                </Typography>
              </Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha(theme.palette.background.default, 0.5) }}>
                      <TableCell sx={{ fontWeight: 700 }}>Item</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">On-Hand</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Reorder Pt</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Stock Level</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">Deficit</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {activeAlerts.map((alert) => {
                      const severity = getSeverityColor(alert.deficit, alert.reorder_level);
                      const pct = getDeficitPercent(alert.on_hand, alert.reorder_level);
                      const isActing = actionLoading === alert.item_id;

                      return (
                        <TableRow
                          key={alert.item_id}
                          hover
                          sx={{
                            borderLeft: `3px solid ${
                              severity === 'error'
                                ? theme.palette.error.main
                                : severity === 'warning'
                                ? theme.palette.warning.main
                                : theme.palette.info.main
                            }`,
                          }}
                        >
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar sx={{ width: 32, height: 32, bgcolor: alpha(theme.palette.warning.main, 0.15) }}>
                                <TrendDownIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                              </Avatar>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                  {alert.name}
                                </Typography>
                                <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                                  {alert.sku}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip label={alert.category_name || 'Uncategorized'} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" sx={{ fontWeight: 700, color: `${severity}.main` }}>
                              {alert.on_hand} {alert.unit_of_measure}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color="text.secondary">
                              {alert.reorder_level} {alert.unit_of_measure}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ minWidth: 140 }}>
                            <Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="caption" color="text.secondary">{pct}% of reorder</Typography>
                              </Box>
                              <LinearProgress
                                variant="determinate"
                                value={pct}
                                color={severity as any}
                                sx={{ height: 6, borderRadius: 3 }}
                              />
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={`-${alert.deficit} ${alert.unit_of_measure}`}
                              size="small"
                              color={severity as any}
                              sx={{ fontWeight: 700 }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Tooltip title="View item details">
                                <IconButton
                                  size="small"
                                  onClick={() => navigate(`/items/${alert.item_id}`)}
                                >
                                  <ArrowForwardIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              {isManager && (
                                <Tooltip title="Dismiss alert (re-triggers automatically when stock is restocked)">
                                  <span>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="inherit"
                                      startIcon={isActing ? <CircularProgress size={14} /> : <DismissIcon />}
                                      onClick={() => handleDismiss(alert.item_id, alert.name)}
                                      disabled={isActing}
                                      sx={{ minWidth: 110 }}
                                    >
                                      Dismiss
                                    </Button>
                                  </span>
                                </Tooltip>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}

          {/* Dismissed Alerts Section */}
          {showDismissed && dismissedAlerts.length > 0 && (
            <>
              {activeAlerts.length > 0 && <Divider />}
              <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.text.secondary, 0.04) }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                  <DismissIcon fontSize="small" />
                  Dismissed Alerts ({dismissedAlerts.length})
                </Typography>
              </Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha(theme.palette.background.default, 0.5) }}>
                      <TableCell sx={{ fontWeight: 700 }}>Item</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">On-Hand</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Reorder Pt</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Dismissed By</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Dismissed At</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dismissedAlerts.map((alert) => {
                      const isActing = actionLoading === alert.item_id;
                      return (
                        <TableRow key={alert.item_id} hover sx={{ opacity: 0.75 }}>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {alert.name}
                              </Typography>
                              <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                                {alert.sku}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip label={alert.category_name || 'Uncategorized'} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color="text.secondary">
                              {alert.on_hand} {alert.unit_of_measure}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color="text.secondary">
                              {alert.reorder_level}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">{alert.dismissed_by_name || '—'}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {alert.dismissed_at
                                ? `${formatDateTimeIST(alert.dismissed_at)} IST`
                                : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Tooltip title="View item">
                                <IconButton size="small" onClick={() => navigate(`/items/${alert.item_id}`)}>
                                  <ArrowForwardIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Re-activate alert">
                                <span>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="warning"
                                    startIcon={isActing ? <CircularProgress size={14} /> : <UndismissIcon />}
                                    onClick={() => handleUndismiss(alert.item_id, alert.name)}
                                    disabled={isActing}
                                  >
                                    Re-activate
                                  </Button>
                                </span>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Card>
      )}

      {/* Auto-retrigger Info Banner */}
      <Alert
        severity="info"
        sx={{ mt: 3, borderRadius: 2 }}
        icon={<UndismissIcon />}
      >
        <strong>Auto Re-trigger:</strong> Dismissed alerts automatically re-activate when a stock movement
        is recorded that raises inventory above the reorder level — no manual action needed.
      </Alert>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AlertsPage;
