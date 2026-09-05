import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
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
  Avatar,
  Divider,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Inventory2 as InventoryIcon,
  Warning as WarningIcon,
  SwapHoriz as MovementsIcon,
  LocationOn as LocationIcon,
  ArrowForward as ArrowForwardIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  TrendingUp as TrendingUpIcon,
  Category as CategoryIcon,
  Today as TodayIcon,
  DateRange as DateRangeIcon,
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { getDashboardStats, type DashboardStats } from '../services/dashboard';
import { useAuth } from '../contexts/AuthContext';
import { formatDateTimeIST } from '../utils/date';

const PIE_COLORS = ['#6C63FF', '#00D9A6', '#FFB74D', '#FF5252', '#33E0B8', '#8B83FF', '#FF9800', '#9C27B0'];

export const DashboardPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trendMode, setTrendMode] = useState<'weekly' | 'daily'>('weekly');

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const getMovementKindColor = (kind: string) => {
    switch (kind) {
      case 'RECEIPT':
        return 'success';
      case 'ISSUE':
        return 'error';
      case 'TRANSFER':
        return 'primary';
      case 'ADJUSTMENT':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !stats) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={fetchStats}>Retry</Button>}>
          {error || 'Failed to load dashboard'}
        </Alert>
      </Box>
    );
  }

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
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
            Inventory Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Welcome back, {user?.name}. Real-time analytics, stock levels, and ledger activity.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5}>
          <IconButton onClick={fetchStats} sx={{ border: `1px solid ${theme.palette.divider}` }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<MovementsIcon />}
            onClick={() => navigate('/movements')}
          >
            Record Movement
          </Button>
        </Stack>
      </Box>

      {/* KPI Cards Row (Goal 8 Headline Numbers) */}
      {/* KPI Cards Row (Goal 8 Headline Numbers) */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
            xl: 'repeat(6, 1fr)',
          },
          gap: 2,
          mb: 3,
        }}
      >
        {/* Total Stock Units */}
        <Card
          sx={{
            p: 2,
            borderRadius: 3,
            height: '100%',
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.12)} 0%, ${theme.palette.background.paper} 100%)`,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                Total Units
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: 'text.primary' }}>
                {stats.total_stock_units.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Across {stats.total_locations} locations
              </Typography>
            </Box>
            <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.2), color: 'primary.main', width: 40, height: 40 }}>
              <TrendingUpIcon fontSize="small" />
            </Avatar>
          </Box>
        </Card>

        {/* Low Stock Alerts */}
        <Card
          onClick={() => navigate('/alerts')}
          sx={{
            p: 2,
            borderRadius: 3,
            height: '100%',
            cursor: 'pointer',
            background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, stats.low_stock_count > 0 ? 0.15 : 0.05)} 0%, ${theme.palette.background.paper} 100%)`,
            border: `1px solid ${alpha(theme.palette.warning.main, stats.low_stock_count > 0 ? 0.3 : 0.1)}`,
            transition: 'transform 0.2s ease',
            '&:hover': { transform: 'translateY(-2px)' },
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                Low Stock
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: stats.low_stock_count > 0 ? 'warning.main' : 'text.primary' }}>
                {stats.low_stock_count}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {stats.low_stock_count > 0 ? 'At or below reorder' : 'All levels healthy'}
              </Typography>
            </Box>
            <Avatar sx={{ bgcolor: alpha(theme.palette.warning.main, 0.2), color: 'warning.main', width: 40, height: 40 }}>
              <WarningIcon fontSize="small" />
            </Avatar>
          </Box>
        </Card>

        {/* Movements Recorded Today (Goal 8 Headline) */}
        <Card
          onClick={() => navigate('/movements')}
          sx={{
            p: 2,
            borderRadius: 3,
            height: '100%',
            cursor: 'pointer',
            background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.12)} 0%, ${theme.palette.background.paper} 100%)`,
            border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
            transition: 'transform 0.2s ease',
            '&:hover': { transform: 'translateY(-2px)' },
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                Movements Today
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: 'text.primary' }}>
                {stats.movements_today}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Logged since 00:00 IST
              </Typography>
            </Box>
            <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.2), color: 'info.main', width: 40, height: 40 }}>
              <TodayIcon fontSize="small" />
            </Avatar>
          </Box>
        </Card>

        {/* Items Moved This Week (Goal 8 Headline) */}
        <Card
          onClick={() => navigate('/movements')}
          sx={{
            p: 2,
            borderRadius: 3,
            height: '100%',
            cursor: 'pointer',
            background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.12)} 0%, ${theme.palette.background.paper} 100%)`,
            border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
            transition: 'transform 0.2s ease',
            '&:hover': { transform: 'translateY(-2px)' },
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                Moved This Week
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: 'text.primary' }}>
                {stats.distinct_items_moved_this_week}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Distinct items in 7 days
              </Typography>
            </Box>
            <Avatar sx={{ bgcolor: alpha(theme.palette.success.main, 0.2), color: 'success.main', width: 40, height: 40 }}>
              <DateRangeIcon fontSize="small" />
            </Avatar>
          </Box>
        </Card>

        {/* Active Catalog Items */}
        <Card
          onClick={() => navigate('/items')}
          sx={{
            p: 2,
            borderRadius: 3,
            height: '100%',
            cursor: 'pointer',
            background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.12)} 0%, ${theme.palette.background.paper} 100%)`,
            border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
            transition: 'transform 0.2s ease',
            '&:hover': { transform: 'translateY(-2px)' },
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                Catalog Items
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: 'text.primary' }}>
                {stats.total_items}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {stats.archived_items} archived
              </Typography>
            </Box>
            <Avatar sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.2), color: 'secondary.main', width: 40, height: 40 }}>
              <InventoryIcon fontSize="small" />
            </Avatar>
          </Box>
        </Card>

        {/* Ledger Transactions */}
        <Card
          onClick={() => navigate('/movements')}
          sx={{
            p: 2,
            borderRadius: 3,
            height: '100%',
            cursor: 'pointer',
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${theme.palette.background.paper} 100%)`,
            border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
            transition: 'transform 0.2s ease',
            '&:hover': { transform: 'translateY(-2px)' },
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                Total Ledger
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: 'text.primary' }}>
                {stats.total_movements}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Append-only records
              </Typography>
            </Box>
            <Avatar sx={{ bgcolor: alpha(theme.palette.text.primary, 0.1), color: 'text.primary', width: 40, height: 40 }}>
              <MovementsIcon fontSize="small" />
            </Avatar>
          </Box>
        </Card>
      </Box>

      {/* Visual Analytics Row 1: Movement Trends (60%) + Category Breakdown (40%) */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '3fr 2fr' },
          gap: '20px',
          mb: 3,
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
          <Card sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {trendMode === 'weekly' ? '8-Week Movement Volume Trends' : '14-Day Movement Trends'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {trendMode === 'weekly'
                    ? 'Weekly aggregate totals for Receipts, Issues, and Transfers over the last 8 weeks'
                    : 'Daily aggregate quantities for Receipts, Issues, Transfers, and Adjustments'}
                </Typography>
              </Box>

              <ToggleButtonGroup
                value={trendMode}
                exclusive
                onChange={(_, val) => {
                  if (val) setTrendMode(val);
                }}
                size="small"
              >
                <ToggleButton value="weekly" sx={{ px: 1.5, py: 0.5, fontSize: '0.75rem', fontWeight: 600 }}>
                  8 Weeks
                </ToggleButton>
                <ToggleButton value="daily" sx={{ px: 1.5, py: 0.5, fontSize: '0.75rem', fontWeight: 600 }}>
                  14 Days
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Box sx={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                {trendMode === 'weekly' ? (
                  <BarChart
                    data={stats.weekly_movement_trends || []}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis dataKey="week_label" tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
                    <YAxis tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 8,
                      }}
                    />
                    <Legend />
                    <Bar dataKey="receipts" name="Receipts (Incoming)" fill="#00D9A6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="issues" name="Issues (Outgoing)" fill="#FF5252" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="transfers" name="Transfers" fill="#6C63FF" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : (
                  <AreaChart data={stats.movement_trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="receiptGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00D9A6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#00D9A6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="issueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF5252" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#FF5252" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="transferGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#6C63FF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                      tickFormatter={(val) => val.slice(5)}
                    />
                    <YAxis tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 8,
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="receipts"
                      name="Receipts"
                      stroke="#00D9A6"
                      fillOpacity={1}
                      fill="url(#receiptGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="issues"
                      name="Issues"
                      stroke="#FF5252"
                      fillOpacity={1}
                      fill="url(#issueGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="transfers"
                      name="Transfers"
                      stroke="#6C63FF"
                      fillOpacity={1}
                      fill="url(#transferGrad)"
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </Box>
          </Card>

        {/* Category Breakdown (Donut Chart) */}
        <Box>
          <Card sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Stock by Category
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Proportion of derived stock units per category
            </Typography>

            <Box sx={{ width: '100%', height: 280, mt: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.category_distribution}
                    dataKey="total_stock"
                    nameKey="category_name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                  >
                    {stats.category_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 8,
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Card>
        </Box>
      </Box>

      {/* Row 2: Location Distribution (40%) & Low Stock Watchlist (60%) */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '2fr 3fr' },
          gap: '20px',
          mb: 3,
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* Stock by Location (Bar Chart) */}
        <Box>
          <Card sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Stock by Location
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Units stored across warehouse locations
                </Typography>
              </Box>
              <Button size="small" onClick={() => navigate('/locations')}>
                Manage
              </Button>
            </Box>

            <Box sx={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.location_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                  <XAxis dataKey="location_name" tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
                  <YAxis tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="total_stock" name="Total Units" fill={theme.palette.primary.main} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Card>
        </Box>

        {/* Critical Low Stock Watchlist */}
        <Box>
          <Card sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WarningIcon color="warning" fontSize="small" />
                  Low Stock Watchlist
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Items currently at or below their reorder threshold
                </Typography>
              </Box>
              <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/alerts')}>
                View All Alerts
              </Button>
            </Box>

            {stats.low_stock_items.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No items below reorder levels. Inventory is in healthy standing!
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Item</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">On-Hand</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Reorder Pt</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">Deficit</TableCell>
                      <TableCell align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.low_stock_items.slice(0, 5).map((item) => (
                      <TableRow key={item.item_id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {item.name}
                          </Typography>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                            {item.sku}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {item.category_name || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.main' }}>
                            {item.on_hand} {item.unit_of_measure}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="text.secondary">
                            {item.reorder_level}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`-${item.deficit}`}
                            size="small"
                            color="error"
                            variant="outlined"
                            sx={{ fontWeight: 700, height: 22 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => navigate(`/items/${item.item_id}`)}
                          >
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>
        </Box>
      </Box>

      {/* Row 3: Recent Ledger Activity Feed */}
      <Card sx={{ p: 3, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Recent Ledger Activity
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Latest immutable stock movements recorded across all warehouses
            </Typography>
          </Box>
          <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/movements')}>
            Full Movements Ledger
          </Button>
        </Box>

        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Item</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Quantity</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Location Route</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Reason / Note</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Recorded By</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stats.recent_movements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                    No stock movements recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                stats.recent_movements.map((m) => (
                  <TableRow key={m.id} hover>
                    <TableCell>
                      <Chip
                        label={m.kind}
                        size="small"
                        color={getMovementKindColor(m.kind) as any}
                        sx={{ fontWeight: 700, height: 22 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {m.item_name}
                      </Typography>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                        {m.item_sku}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {m.kind === 'ISSUE' ? `-${m.quantity}` : `+${m.quantity}`}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {m.kind === 'TRANSFER' ? (
                        <Typography variant="caption">
                          {m.from_location_name} &rarr; {m.to_location_name}
                        </Typography>
                      ) : (
                        <Typography variant="caption">{m.location_name || '—'}</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 200, display: 'inline-block' }}>
                        {m.reason || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{m.user_name}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption" color="text.secondary">
                        {formatDateTimeIST(m.created_at)} IST
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
};

export default DashboardPage;
