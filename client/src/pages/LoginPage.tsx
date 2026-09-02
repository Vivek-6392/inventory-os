import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  Stack,
  Chip,
  Divider,
  Tooltip,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock as LockIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Shield as ShieldIcon,
  AccountTree as LedgerIcon,
  QueryStats as AnalyticsIcon,
  LocationOn as LocationIcon,
  CheckCircle as CheckIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useColorMode } from '../contexts/ThemeContext';

const LoginPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { mode, toggleColorMode } = useColorMode();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isDark = mode === 'dark';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
        bgcolor: 'background.default',
      }}
    >
      {/* Background Decorative Ambient Glows */}
      <Box
        sx={{
          position: 'absolute',
          top: '-15%',
          left: '-10%',
          width: '50vw',
          height: '50vw',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, isDark ? 0.18 : 0.1)} 0%, transparent 70%)`,
          filter: 'blur(80px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '-15%',
          right: '-10%',
          width: '45vw',
          height: '45vw',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(theme.palette.secondary.main, isDark ? 0.15 : 0.08)} 0%, transparent 70%)`,
          filter: 'blur(90px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Main Grid: Split Layout on Desktop, Centered on Mobile */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          zIndex: 1,
          width: '100%',
          minHeight: '100vh',
        }}
      >
        {/* Left Side: Brand Showcase & System Value (Visible on Desktop >= md) */}
        <Box
          sx={{
            flex: { md: 1, lg: 1.2 },
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            justifyContent: 'space-between',
            py: { md: 3.5, lg: 4.5 },
            px: { md: 4, lg: 6 },
            position: 'relative',
            borderRight: `1px solid ${theme.palette.divider}`,
            background: isDark
              ? `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.25)} 0%, ${alpha(theme.palette.background.paper, 0.5)} 100%)`
              : `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.08)} 0%, ${alpha(theme.palette.background.paper, 0.8)} 100%)`,
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Top Brand Header */}
          <Box>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: 2.5,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: 20,
                  color: '#fff',
                  boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.4)}`,
                }}
              >
                IS
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', fontSize: '1.1rem' }}>
                  InventoryOS
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.68rem' }}>
                  STOCK CONTROL PLATFORM
                </Typography>
              </Box>
              <Chip
                label="v1.0 • Enterprise"
                size="small"
                variant="outlined"
                color="primary"
                sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, borderRadius: 1.5, ml: 1 }}
              />
            </Stack>

            {/* Headline */}
            <Typography
              variant="h3"
              sx={{
                fontWeight: 900,
                letterSpacing: '-0.03em',
                lineHeight: 1.18,
                fontSize: { md: '1.85rem', lg: '2.3rem' },
                mb: 1.5,
                background: isDark
                  ? 'linear-gradient(180deg, #FFFFFF 0%, #B4B9C7 100%)'
                  : 'linear-gradient(180deg, #0F172A 0%, #334155 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Precision inventory control built on an immutable ledger.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 500, lineHeight: 1.5, mb: 2.5, fontSize: '0.9rem' }}>
              Derive accurate on-hand balances across multi-warehouse locations with zero balance drift,
              automated low-stock alerts, and full financial audit traceability.
            </Typography>
          </Box>

          {/* Three Feature Highlight Cards */}
          <Stack spacing={1.2} sx={{ my: 'auto', maxWidth: 540 }}>
            <Card
              sx={{
                p: 1.5,
                borderRadius: 2.5,
                backgroundColor: alpha(theme.palette.background.paper, isDark ? 0.6 : 0.7),
                backdropFilter: 'blur(10px)',
                border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
              }}
            >
              <Stack direction="row" spacing={1.8} alignItems="center">
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: alpha(theme.palette.primary.main, 0.12),
                    color: 'primary.main',
                    flexShrink: 0,
                  }}
                >
                  <LedgerIcon sx={{ fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
                    Append-Only Stock Ledger
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem', lineHeight: 1.3 }}>
                    Movements (receipts, issues, transfers, adjustments) are strictly immutable. Zero mutable counter race conditions.
                  </Typography>
                </Box>
              </Stack>
            </Card>

            <Card
              sx={{
                p: 1.5,
                borderRadius: 2.5,
                backgroundColor: alpha(theme.palette.background.paper, isDark ? 0.6 : 0.7),
                backdropFilter: 'blur(10px)',
                border: `1px solid ${alpha(theme.palette.secondary.main, 0.15)}`,
              }}
            >
              <Stack direction="row" spacing={1.8} alignItems="center">
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: alpha(theme.palette.secondary.main, 0.12),
                    color: 'secondary.main',
                    flexShrink: 0,
                  }}
                >
                  <LocationIcon sx={{ fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
                    Multi-Location Staff RBAC
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem', lineHeight: 1.3 }}>
                    Warehouse staff are strictly assigned to authorized facilities with write-time permission enforcement.
                  </Typography>
                </Box>
              </Stack>
            </Card>

            <Card
              sx={{
                p: 1.5,
                borderRadius: 2.5,
                backgroundColor: alpha(theme.palette.background.paper, isDark ? 0.6 : 0.7),
                backdropFilter: 'blur(10px)',
                border: `1px solid ${alpha(theme.palette.warning.main, 0.15)}`,
              }}
            >
              <Stack direction="row" spacing={1.8} alignItems="center">
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: alpha(theme.palette.warning.main, 0.12),
                    color: 'warning.main',
                    flexShrink: 0,
                  }}
                >
                  <AnalyticsIcon sx={{ fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
                    Analytics & Auto Re-Triggering Alerts
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem', lineHeight: 1.3 }}>
                    8-week receipt/issue trends, real-time threshold monitoring, and manager dismissal with auto re-arm.
                  </Typography>
                </Box>
              </Stack>
            </Card>
          </Stack>

          {/* Bottom Trust & Operational Metrics */}
          <Box sx={{ pt: 2 }}>
            <Divider sx={{ mb: 1.8 }} />
            <Stack direction="row" spacing={3} alignItems="center">
              <Tooltip title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}>
                <IconButton
                  onClick={toggleColorMode}
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2.5,
                    backgroundColor: alpha(theme.palette.background.paper, 0.8),
                    border: `1px solid ${theme.palette.divider}`,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'scale(1.06)',
                      borderColor: alpha(theme.palette.primary.main, 0.4),
                    },
                  }}
                >
                  {isDark ? (
                    <LightModeIcon sx={{ color: '#FFB74D', fontSize: 20 }} />
                  ) : (
                    <DarkModeIcon sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
                  )}
                </IconButton>
              </Tooltip>

              <Divider orientation="vertical" flexItem sx={{ height: 26, alignSelf: 'center' }} />

              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main', lineHeight: 1 }}>
                  100%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Audit Immutability
                </Typography>
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: 'secondary.main', lineHeight: 1 }}>
                  0 Drift
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Dynamic Derivation
                </Typography>
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: 'info.main', lineHeight: 1 }}>
                  IST (UTC+5:30)
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Indian Standard Time
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Box>

        {/* Right Side: Authentication Form Card */}
        <Box
          sx={{
            flex: { xs: 1, md: 0.9, lg: 0.8 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: { xs: 2.5, sm: 4, md: 6 },
          }}
        >
          <Card
            elevation={0}
            sx={{
              width: '100%',
              maxWidth: 440,
              borderRadius: 3.5,
              backgroundColor: alpha(theme.palette.background.paper, isDark ? 0.8 : 0.9),
              backdropFilter: 'blur(25px)',
              border: `1px solid ${alpha(theme.palette.primary.main, isDark ? 0.18 : 0.12)}`,
              boxShadow: isDark
                ? '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)'
                : '0 20px 50px rgba(79, 70, 229, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04)',
            }}
          >
            <CardContent sx={{ p: { xs: 3, sm: 4.5 } }}>
              {/* Mobile-only Header with Logo & Theme Toggle */}
              <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: 18,
                      color: '#fff',
                    }}
                  >
                    IS
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    InventoryOS
                  </Typography>
                </Box>
                <IconButton
                  onClick={toggleColorMode}
                  size="small"
                  sx={{
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 2,
                    p: 0.8,
                  }}
                >
                  {isDark ? (
                    <LightModeIcon sx={{ color: '#FFB74D', fontSize: 20 }} />
                  ) : (
                    <DarkModeIcon sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
                  )}
                </IconButton>
              </Box>

              {/* Form Title */}
              <Box sx={{ mb: 3.5 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 0.8 }}>
                  Sign in to workspace
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Enter your credentials to access inventory control & stock ledger.
                </Typography>
              </Box>

              {error && (
                <Alert
                  severity="error"
                  onClose={() => setError('')}
                  sx={{
                    mb: 3,
                    borderRadius: 2,
                    fontSize: '0.85rem',
                    border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
                  }}
                >
                  {error}
                </Alert>
              )}

              <form onSubmit={handleSubmit}>
                <Box sx={{ mb: 2.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.8, color: 'text.primary' }}>
                    EMAIL ADDRESS
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="name@company.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>

                <Box sx={{ mb: 3.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.8, color: 'text.primary' }}>
                    PASSWORD
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="••••••••••••"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            size="small"
                            sx={{ color: 'text.secondary' }}
                          >
                            {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  endIcon={!loading && <ArrowForwardIcon sx={{ fontSize: 18 }} />}
                  sx={{
                    py: 1.4,
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    borderRadius: 2.5,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                    boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      boxShadow: `0 8px 25px ${alpha(theme.palette.primary.main, 0.55)}`,
                    },
                  }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Authenticate & Continue'}
                </Button>
              </form>

              {/* Security Footnote */}
              <Box
                sx={{
                  mt: 3.5,
                  pt: 2.5,
                  borderTop: `1px solid ${theme.palette.divider}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                }}
              >
                <ShieldIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
                <Typography variant="caption" color="text.secondary">
                  Protected with encrypted JWT OAuth2 authentication
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default LoginPage;
