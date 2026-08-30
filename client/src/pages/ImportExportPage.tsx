import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Divider,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  alpha,
  useTheme,
} from '@mui/material';
import {
  FileUpload as ImportIcon,
  FileDownload as ExportIcon,
  CheckCircle as CheckIcon,
  Help as HelpIcon,
  Download as TemplateIcon,
} from '@mui/icons-material';
import { exportItemsCsv } from '../services/items';
import { useAuth } from '../contexts/AuthContext';
import { CsvImportDialog } from '../components/CsvImportDialog';

export const ImportExportPage: React.FC = () => {
  const theme = useTheme();
  const { isManager } = useAuth();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setErrorMsg(null);
    try {
      await exportItemsCsv();
      setSuccessMsg('Stock position CSV report downloaded successfully!');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to export stock report');
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const templateContent =
      'sku,name,description,category,unit_of_measure,reorder_level,initial_stock,initial_location\n' +
      'SKU-WIDGET-01,Heavy Duty Industrial Widget,High durability polymer widget,Industrial,pcs,15,50,Main Warehouse\n' +
      'SKU-BOLT-02,M8 Hex Head Steel Bolts,Pack of 100 zinc coated bolts,Fasteners,pack,20,100,Retail Floor A\n' +
      'SKU-CABLE-03,Cat6 Ethernet Cable 10m,Shielded blue patch cable,Electronics,pcs,10,0,\n';

    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'items_import_template.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
          Import & Export Center
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Perform bulk product imports and export complete multi-location inventory reports.
        </Typography>
      </Box>

      {successMsg && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setSuccessMsg(null)}>
          {successMsg}
        </Alert>
      )}

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}

      {/* Main Action Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Bulk Import Card */}
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            }}
          >
            <CardContent sx={{ flex: 1, p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2.5,
                    backgroundColor: alpha(theme.palette.primary.main, 0.12),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ImportIcon color="primary" sx={{ fontSize: 26 }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Bulk CSV Product Import
                  </Typography>
                  <Chip
                    label={isManager ? 'Manager Authorized' : 'Manager Only'}
                    size="small"
                    color={isManager ? 'primary' : 'default'}
                    variant="outlined"
                    sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                  />
                </Box>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Upload a structured CSV file to create items in bulk. Automatically validates unique SKUs, assigns
                categories, and records opening inventory balances.
              </Typography>

              <List dense disablePadding>
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Creates categories & locations automatically on the fly"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Records initial receipt movements for items with initial stock"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Detailed row-by-row error report on validation failures"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              </List>
            </CardContent>

            <Divider />

            <CardActions sx={{ p: 2.5, gap: 1.5, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<ImportIcon />}
                disabled={!isManager}
                onClick={() => setImportDialogOpen(true)}
              >
                Upload & Import CSV
              </Button>
              <Button
                variant="outlined"
                startIcon={<TemplateIcon />}
                onClick={handleDownloadTemplate}
              >
                Download Template
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {/* Stock Position Export Card */}
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
            }}
          >
            <CardContent sx={{ flex: 1, p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2.5,
                    backgroundColor: alpha(theme.palette.secondary.main, 0.12),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ExportIcon color="secondary" sx={{ fontSize: 26 }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Stock Position CSV Export
                  </Typography>
                  <Chip
                    label="All Staff Access"
                    size="small"
                    color="secondary"
                    variant="outlined"
                    sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                  />
                </Box>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Download a real-time CSV snapshot containing item metadata, reorder thresholds, derived total on-hand
                balances, and exact breakdown across all warehouse locations.
              </Typography>

              <List dense disablePadding>
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Complete multi-location breakdown columns"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Highlights below-reorder indicators"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Includes active and archived catalog items"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              </List>
            </CardContent>

            <Divider />

            <CardActions sx={{ p: 2.5 }}>
              <Button
                variant="contained"
                color="secondary"
                startIcon={exporting ? <CircularProgress size={18} color="inherit" /> : <ExportIcon />}
                disabled={exporting}
                onClick={handleExport}
              >
                {exporting ? 'Generating Report...' : 'Download Stock Position CSV'}
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>

      {/* CSV Schema Reference Table */}
      <Card sx={{ p: 3, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <HelpIcon color="primary" fontSize="small" />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            CSV Import Column Specification
          </Typography>
        </Box>

        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Column Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Required</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Description & Invariant Rules</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>sku</TableCell>
                <TableCell><Chip label="Required" size="small" color="error" variant="outlined" /></TableCell>
                <TableCell>String</TableCell>
                <TableCell>Unique product SKU. Cannot duplicate existing items or rows within the same batch.</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>name</TableCell>
                <TableCell><Chip label="Required" size="small" color="error" variant="outlined" /></TableCell>
                <TableCell>String</TableCell>
                <TableCell>Item display title (cannot be empty).</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>unit_of_measure</TableCell>
                <TableCell><Chip label="Required" size="small" color="error" variant="outlined" /></TableCell>
                <TableCell>String</TableCell>
                <TableCell>e.g. pcs, box, kg, liters, pack.</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>reorder_level</TableCell>
                <TableCell><Chip label="Required" size="small" color="error" variant="outlined" /></TableCell>
                <TableCell>Integer (≥ 0)</TableCell>
                <TableCell>Minimum inventory threshold before triggering low-stock alerts.</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>category</TableCell>
                <TableCell><Chip label="Optional" size="small" variant="outlined" /></TableCell>
                <TableCell>String</TableCell>
                <TableCell>Category name. Created automatically if not already existing.</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>description</TableCell>
                <TableCell><Chip label="Optional" size="small" variant="outlined" /></TableCell>
                <TableCell>String</TableCell>
                <TableCell>Optional item notes or technical specifications.</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>initial_stock</TableCell>
                <TableCell><Chip label="Optional" size="small" variant="outlined" /></TableCell>
                <TableCell>Integer (≥ 0)</TableCell>
                <TableCell>If &gt; 0, automatically creates an initial RECEIPT movement.</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>initial_location</TableCell>
                <TableCell><Chip label="Conditional" size="small" color="warning" variant="outlined" /></TableCell>
                <TableCell>String</TableCell>
                <TableCell>Required if initial_stock &gt; 0. Created automatically if new location.</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* CSV Import Dialog */}
      <CsvImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onSuccess={() => setSuccessMsg('Products imported successfully into inventory!')}
      />
    </Box>
  );
};

export default ImportExportPage;
