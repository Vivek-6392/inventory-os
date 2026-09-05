import React, { useState, useEffect, useRef } from 'react';
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
  Box,
  Stack,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  IconButton,
  Paper,
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  AddPhotoAlternate as UploadIcon,
  Delete as DeleteIcon,
  CheckCircle as ActiveIcon,
  PauseCircle as InactiveIcon,
  Warehouse as WarehouseIcon,
  Storefront as StoreIcon,
  LocalShipping as ShippingIcon,
  PrecisionManufacturing as FulfillmentIcon,
  AcUnit as ColdIcon,
  Biotech as QuarantineIcon,
  CloudUpload as CloudUploadIcon,
  Image as ImageIcon,
  MyLocation as GeocodeIcon,
} from '@mui/icons-material';
import type { Location } from '../types';
import { createLocation, updateLocation } from '../services/locations';
import type { LocationFormData } from '../services/locations';

interface LocationDialogProps {
  open: boolean;
  location?: Location | null;
  onClose: () => void;
  onSaved: () => void;
}

const FACILITY_TYPES = [
  { value: 'Warehouse', label: 'Warehouse (Bulk Storage)', icon: <WarehouseIcon fontSize="small" /> },
  { value: 'Retail Store', label: 'Retail Store (Showroom & POS)', icon: <StoreIcon fontSize="small" /> },
  { value: 'Distribution Center', label: 'Distribution Center (Regional Dispatch)', icon: <ShippingIcon fontSize="small" /> },
  { value: 'Fulfillment Hub', label: 'Fulfillment Hub (High-Velocity Pick & Pack)', icon: <FulfillmentIcon fontSize="small" /> },
  { value: 'Cold Storage', label: 'Cold Storage (Climate Controlled)', icon: <ColdIcon fontSize="small" /> },
  { value: 'Quarantine Depot', label: 'Quarantine Depot (RMA & Inspection)', icon: <QuarantineIcon fontSize="small" /> },
];

const PRESET_IMAGES = [
  {
    name: 'Modern Logistics',
    url: 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'High-Bay Warehouse',
    url: 'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Retail Showroom',
    url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Cold Storage',
    url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
  },
];

const REGION_SHORTCUTS = [
  'Delhi NCR',
  'Gurugram, Haryana',
  'Noida, Uttar Pradesh',
  'Bengaluru, Karnataka',
  'Mumbai, Maharashtra',
];

export const LocationDialog: React.FC<LocationDialogProps> = ({
  open,
  location,
  onClose,
  onSaved,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isEditing = Boolean(location);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [facilityType, setFacilityType] = useState('Warehouse');
  const [isActive, setIsActive] = useState(true);
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeStatus, setGeocodeStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (location) {
        setName(location.name || '');
        setAddress(location.address || '');
        setFacilityType(location.type || 'Warehouse');
        setIsActive(location.is_active !== undefined ? Boolean(location.is_active) : true);
        setImageUrl(location.image_url || '');
        setDescription(location.description || '');
        setLatitude(location.latitude != null ? String(location.latitude) : '');
        setLongitude(location.longitude != null ? String(location.longitude) : '');
      } else {
        setName('');
        setAddress('');
        setFacilityType('Warehouse');
        setIsActive(true);
        setImageUrl('');
        setDescription('');
        setLatitude('');
        setLongitude('');
      }
      setError(null);
      setGeocodeStatus('idle');
    }
  }, [open, location]);

  // Geocode address using free Nominatim (OpenStreetMap) — no API key required
  const handleGeocode = async (addressToGeocode?: string) => {
    const query = (addressToGeocode ?? address).trim();
    if (!query) {
      setError('Please enter an address or city to geocode');
      return;
    }
    setGeocoding(true);
    setGeocodeStatus('idle');
    try {
      const encoded = encodeURIComponent(query + ', India');
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setLatitude(parseFloat(lat).toFixed(6));
        setLongitude(parseFloat(lon).toFixed(6));
        setGeocodeStatus('success');
      } else {
        setGeocodeStatus('error');
        setError('Location not found. Try a more specific address or enter coordinates manually.');
      }
    } catch {
      setGeocodeStatus('error');
      setError('Geocoding failed. Please enter coordinates manually.');
    } finally {
      setGeocoding(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, or WEBP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image file size exceeds 5MB limit');
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 900;
        let { width, height } = img;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          setImageUrl(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          setImageUrl(dataUrl);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Location name is required');
      return;
    }

    setLoading(true);
    setError(null);

    const parsedLat = latitude.trim() !== '' ? parseFloat(latitude) : undefined;
    const parsedLng = longitude.trim() !== '' ? parseFloat(longitude) : undefined;

    const payload: LocationFormData = {
      name: cleanName,
      address: address.trim() || undefined,
      type: facilityType,
      is_active: isActive,
      image_url: imageUrl || undefined,
      description: description.trim() || undefined,
      latitude: parsedLat !== undefined && !isNaN(parsedLat) ? parsedLat : undefined,
      longitude: parsedLng !== undefined && !isNaN(parsedLng) ? parsedLng : undefined,
    };

    try {
      if (isEditing && location) {
        await updateLocation(location.id, payload);
      } else {
        await createLocation(payload);
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
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3.5,
          backgroundColor: theme.palette.background.paper,
          backgroundImage: 'none',
          boxShadow: isDark
            ? '0 24px 60px rgba(0, 0, 0, 0.8)'
            : '0 20px 60px rgba(15, 23, 42, 0.15)',
          border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#E5E7EB'}`,
        },
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle
          sx={{
            p: { xs: 2.5, sm: 3 },
            pb: 2,
            borderBottom: `1px solid ${theme.palette.divider}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: 2.5,
                bgcolor: isDark ? 'rgba(99, 102, 241, 0.18)' : '#EEF2FF',
                color: isDark ? '#A5B4FC' : '#4F46E5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LocationIcon fontSize="medium" />
            </Box>
            <Box>
              <Typography variant="h6" component="h2" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                {isEditing ? `Edit Facility: ${location?.name}` : 'Create New Facility'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Configure facility identification, geographical location, operational state, and cover visual.
              </Typography>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          {error && (
            <Alert
              severity="error"
              sx={{ mb: 3, borderRadius: 2.5 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* 1. Location Name */}
            <Grid item xs={12} sm={7}>
              <TextField
                fullWidth
                required
                id="location-name-input"
                label="Location Name"
                placeholder="e.g. Okhla Logistics Park, CyberHub Retail Floor"
                value={name}
                onChange={(e) => setName(e.target.value)}
                helperText="Primary identifier for warehouse, retail outlet, or storage node"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2.5,
                  },
                }}
              />
            </Grid>

            {/* 2. Facility Type */}
            <Grid item xs={12} sm={5}>
              <FormControl fullWidth required sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}>
                <InputLabel id="facility-type-select-label">Facility Type</InputLabel>
                <Select
                  labelId="facility-type-select-label"
                  id="facility-type-select"
                  value={facilityType}
                  label="Facility Type"
                  onChange={(e) => setFacilityType(e.target.value)}
                >
                  {FACILITY_TYPES.map((t) => (
                    <MenuItem key={t.value} value={t.value}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box sx={{ color: 'primary.main', display: 'flex' }}>{t.icon}</Box>
                        <span>{t.label}</span>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* 3. Location / Address */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                id="location-address-input"
                label="Facility Location / City / Address"
                placeholder="e.g. Okhla Phase III, New Delhi 110020 or Gurugram CyberHub"
                value={address}
                onChange={(e) => { setAddress(e.target.value); setGeocodeStatus('idle'); }}
                helperText="Geographical location, city, or physical postal address for navigation and map pin"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2.5,
                  },
                }}
              />
              {/* Quick region autofill suggestions */}
              <Stack direction="row" spacing={1} sx={{ mt: 1.2 }} flexWrap="wrap" useFlexGap>
                <Typography variant="caption" sx={{ alignSelf: 'center', color: 'text.secondary', mr: 0.5 }}>
                  Quick Hub:
                </Typography>
                {REGION_SHORTCUTS.map((reg) => (
                  <Chip
                    key={reg}
                    label={reg}
                    size="small"
                    clickable
                    onClick={() => {
                      setAddress(reg);
                      setGeocodeStatus('idle');
                      // Auto-geocode the selected region
                      handleGeocode(reg);
                    }}
                    sx={{
                      borderRadius: 1.5,
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      bgcolor: address === reg ? (isDark ? '#4F46E5' : '#EEF2FF') : undefined,
                      color: address === reg ? (isDark ? '#FFFFFF' : '#4F46E5') : undefined,
                    }}
                  />
                ))}
              </Stack>
            </Grid>

            {/* 3b. Coordinates (auto-geocoded or manual) */}
            <Grid item xs={12}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#F9FAFB',
                  border: `1px solid ${
                    geocodeStatus === 'success'
                      ? '#10B981'
                      : geocodeStatus === 'error'
                      ? '#EF4444'
                      : isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB'
                  }`,
                  transition: 'border-color 0.2s',
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      <GeocodeIcon sx={{ fontSize: 16, color: geocodeStatus === 'success' ? '#10B981' : 'primary.main' }} />
                      Map Coordinates
                      {geocodeStatus === 'success' && (
                        <Chip label="Geocoded ✓" size="small" sx={{ height: 20, fontSize: '0.7rem', bgcolor: '#DCFCE7', color: '#16A34A', fontWeight: 700 }} />
                      )}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Required for map pin placement — use the button to auto-detect from address
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={geocoding ? <CircularProgress size={14} /> : <GeocodeIcon />}
                    disabled={geocoding || !address.trim()}
                    onClick={() => handleGeocode()}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 700,
                      borderRadius: 2,
                      fontSize: '0.8rem',
                      whiteSpace: 'nowrap',
                      borderColor: '#4F46E5',
                      color: '#4F46E5',
                      '&:hover': { bgcolor: '#EEF2FF', borderColor: '#4338CA' },
                      '&.Mui-disabled': { opacity: 0.5 },
                    }}
                  >
                    {geocoding ? 'Detecting…' : 'Geocode from Address'}
                  </Button>
                </Stack>
                <Stack direction="row" spacing={2}>
                  <TextField
                    fullWidth
                    size="small"
                    id="location-latitude-input"
                    label="Latitude"
                    placeholder="e.g. 28.6139"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    type="number"
                    inputProps={{ step: 'any', min: -90, max: 90 }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    id="location-longitude-input"
                    label="Longitude"
                    placeholder="e.g. 77.2090"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    type="number"
                    inputProps={{ step: 'any', min: -180, max: 180 }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Stack>
              </Paper>
            </Grid>

            {/* 4. Active or Not Active (Operational Status) */}
            <Grid item xs={12}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.2,
                  borderRadius: 2.5,
                  bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#F9FAFB',
                  border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#E5E7EB'}`,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Operational Status
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {isActive
                        ? 'Facility is Active and accepts incoming/outgoing ledger stock movements'
                        : 'Facility is Not Active (Offline / Maintenance mode)'}
                    </Typography>
                  </Box>
                  <Switch
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    color="success"
                    id="location-active-switch"
                  />
                </Box>

                {/* Segmented Selectable Options */}
                <Grid container spacing={1.5}>
                  <Grid item xs={6}>
                    <Button
                      fullWidth
                      variant={isActive ? 'contained' : 'outlined'}
                      onClick={() => setIsActive(true)}
                      startIcon={<ActiveIcon />}
                      sx={{
                        py: 1,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 700,
                        bgcolor: isActive ? '#10B981' : 'transparent',
                        color: isActive ? '#FFFFFF' : (isDark ? '#9CA3AF' : '#6B7280'),
                        borderColor: isActive ? '#10B981' : theme.palette.divider,
                        '&:hover': {
                          bgcolor: isActive ? '#059669' : (isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6'),
                          borderColor: isActive ? '#059669' : theme.palette.divider,
                        },
                      }}
                    >
                      Active (Operational)
                    </Button>
                  </Grid>

                  <Grid item xs={6}>
                    <Button
                      fullWidth
                      variant={!isActive ? 'contained' : 'outlined'}
                      onClick={() => setIsActive(false)}
                      startIcon={<InactiveIcon />}
                      sx={{
                        py: 1,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 700,
                        bgcolor: !isActive ? '#EF4444' : 'transparent',
                        color: !isActive ? '#FFFFFF' : (isDark ? '#9CA3AF' : '#6B7280'),
                        borderColor: !isActive ? '#EF4444' : theme.palette.divider,
                        '&:hover': {
                          bgcolor: !isActive ? '#DC2626' : (isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6'),
                          borderColor: !isActive ? '#DC2626' : theme.palette.divider,
                        },
                      }}
                    >
                      Not Active (Offline)
                    </Button>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* 5. Option to Upload Image */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <ImageIcon fontSize="small" color="primary" />
                Facility Cover Image
              </Typography>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              {imageUrl ? (
                /* Preview Container */
                <Box
                  sx={{
                    position: 'relative',
                    height: 180,
                    width: '100%',
                    borderRadius: 3,
                    overflow: 'hidden',
                    border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : '#E5E7EB'}`,
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                  }}
                >
                  <Box
                    component="img"
                    src={imageUrl}
                    alt="Facility preview"
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      display: 'flex',
                      gap: 1,
                      bgcolor: 'rgba(0, 0, 0, 0.55)',
                      backdropFilter: 'blur(8px)',
                      p: 0.6,
                      borderRadius: 2,
                    }}
                  >
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<UploadIcon />}
                      onClick={() => fileInputRef.current?.click()}
                      sx={{
                        fontSize: '0.75rem',
                        textTransform: 'none',
                        fontWeight: 700,
                        bgcolor: '#4F46E5',
                        '&:hover': { bgcolor: '#4338CA' },
                      }}
                    >
                      Change
                    </Button>
                    <IconButton
                      size="small"
                      onClick={handleRemoveImage}
                      sx={{ color: '#EF4444', p: 0.5 }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 8,
                      left: 12,
                      bgcolor: 'rgba(0, 0, 0, 0.65)',
                      backdropFilter: 'blur(6px)',
                      px: 1.2,
                      py: 0.4,
                      borderRadius: 1.5,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                      Custom Facility Visual Ready
                    </Typography>
                  </Box>
                </Box>
              ) : (
                /* Drag & Drop / Click to Upload Box */
                <Paper
                  elevation={0}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    border: `2px dashed ${isDark ? 'rgba(255, 255, 255, 0.15)' : '#D1D5DB'}`,
                    bgcolor: isDark ? 'rgba(255, 255, 255, 0.01)' : '#F9FAFB',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: '#4F46E5',
                      bgcolor: isDark ? 'rgba(99, 102, 241, 0.05)' : '#EEF2FF',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      mx: 'auto',
                      mb: 1.5,
                      borderRadius: '50%',
                      bgcolor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF',
                      color: isDark ? '#A5B4FC' : '#4F46E5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CloudUploadIcon fontSize="medium" />
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                    Click to browse or drag & drop facility photo
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    PNG, JPG, or WEBP up to 5MB (automatically optimized for fast loading)
                  </Typography>
                </Paper>
              )}

              {/* Presets quick selection */}
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
                <Typography variant="caption" sx={{ alignSelf: 'center', color: 'text.secondary', mr: 0.5 }}>
                  Or select preset:
                </Typography>
                {PRESET_IMAGES.map((preset) => (
                  <Chip
                    key={preset.name}
                    label={preset.name}
                    size="small"
                    clickable
                    onClick={() => setImageUrl(preset.url)}
                    sx={{
                      borderRadius: 1.5,
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      border: `1px solid ${imageUrl === preset.url ? '#4F46E5' : theme.palette.divider}`,
                      bgcolor: imageUrl === preset.url ? (isDark ? 'rgba(99,102,241,0.2)' : '#EEF2FF') : undefined,
                      color: imageUrl === preset.url ? (isDark ? '#A5B4FC' : '#4F46E5') : undefined,
                    }}
                  />
                ))}
              </Stack>
            </Grid>

            {/* 6. Description / Notes */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2.5}
                id="location-description-input"
                label="Description / Operational Notes"
                placeholder="Access restrictions, dock door counts, cold storage temperature zones, or facility remarks..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2.5,
                  },
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions
          sx={{
            p: { xs: 2, sm: 2.5 },
            px: { xs: 2.5, sm: 3.5 },
            borderTop: `1px solid ${theme.palette.divider}`,
            gap: 1.5,
          }}
        >
          <Button
            onClick={onClose}
            variant="outlined"
            disabled={loading}
            sx={{
              borderRadius: 2,
              px: 2.5,
              fontWeight: 600,
              textTransform: 'none',
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : <LocationIcon />}
            sx={{
              borderRadius: 2,
              px: 3,
              fontWeight: 700,
              textTransform: 'none',
              bgcolor: '#4F46E5',
              '&:hover': { bgcolor: '#4338CA' },
            }}
          >
            {isEditing ? 'Save Changes' : 'Create Facility'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
