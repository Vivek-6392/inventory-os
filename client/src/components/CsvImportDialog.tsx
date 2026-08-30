import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  LinearProgress,
  List,
  ListItem,
  Chip,
  Paper,
  IconButton,
  alpha,
  useTheme,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Close as CloseIcon,
  InsertDriveFile as FileIcon,
} from '@mui/icons-material';
import { importItemsCsv, type ImportResult } from '../services/items';

interface CsvImportDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CsvImportDialog: React.FC<CsvImportDialogProps> = ({ open, onClose, onSuccess }) => {
  const theme = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);

  const resetState = () => {
    setSelectedFile(null);
    setGeneralError('');
    setResult(null);
    setLoading(false);
  };

  const handleClose = () => {
    if (result && result.imported > 0) {
      onSuccess();
    }
    resetState();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!file.name.endsWith('.csv')) {
        setGeneralError('Please select a valid .csv file.');
        return;
      }
      setSelectedFile(file);
      setGeneralError('');
      setResult(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (!file.name.endsWith('.csv')) {
        setGeneralError('Please select a valid .csv file.');
        return;
      }
      setSelectedFile(file);
      setGeneralError('');
      setResult(null);
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

  const handleUpload = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setGeneralError('');
    setResult(null);

    try {
      const res = await importItemsCsv(selectedFile);
      setResult(res);
      if (res.imported > 0 && res.failed === 0) {
        // Full success
        onSuccess();
      }
    } catch (err: any) {
      setGeneralError(err.response?.data?.detail || 'Failed to upload CSV file. Please verify format.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <UploadIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Bulk CSV Item Import
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 2 }}>
        {/* Template download notice */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            mb: 3,
            borderRadius: 2,
            backgroundColor: alpha(theme.palette.primary.main, 0.06),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
          }}
        >
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Need the CSV template?
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Includes required headers: sku, name, unit_of_measure, reorder_level, initial_stock, initial_location
            </Typography>
          </Box>
          <Button
            size="small"
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadTemplate}
            sx={{ flexShrink: 0 }}
          >
            Download Template
          </Button>
        </Box>

        {generalError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {generalError}
          </Alert>
        )}

        {/* Drag and Drop Zone */}
        {!result && (
          <Box
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            sx={{
              p: 4,
              border: '2px dashed',
              borderColor: isDragging ? theme.palette.primary.main : alpha(theme.palette.divider, 0.8),
              borderRadius: 3,
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: isDragging
                ? alpha(theme.palette.primary.main, 0.08)
                : alpha(theme.palette.background.paper, 0.4),
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: theme.palette.primary.main,
                backgroundColor: alpha(theme.palette.primary.main, 0.04),
              },
            }}
          >
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {selectedFile ? selectedFile.name : 'Click or Drag & Drop CSV file here'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedFile
                ? `${(selectedFile.size / 1024).toFixed(1)} KB — Click to change file`
                : 'Supports standard CSV format with comma separation'}
            </Typography>
          </Box>
        )}

        {loading && (
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Processing CSV rows & updating inventory ledger...
            </Typography>
            <LinearProgress />
          </Box>
        )}

        {/* Import Results View */}
        {result && (
          <Box sx={{ mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <Paper
                sx={{
                  flex: 1,
                  p: 2,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  backgroundColor: alpha(theme.palette.success.main, 0.1),
                  border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
                }}
              >
                <SuccessIcon color="success" sx={{ fontSize: 36 }} />
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>
                    {result.imported}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Items Successfully Imported
                  </Typography>
                </Box>
              </Paper>

              <Paper
                sx={{
                  flex: 1,
                  p: 2,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  backgroundColor:
                    result.failed > 0
                      ? alpha(theme.palette.error.main, 0.1)
                      : alpha(theme.palette.text.secondary, 0.05),
                  border: `1px solid ${
                    result.failed > 0
                      ? alpha(theme.palette.error.main, 0.3)
                      : alpha(theme.palette.divider, 0.1)
                  }`,
                }}
              >
                <ErrorIcon color={result.failed > 0 ? 'error' : 'disabled'} sx={{ fontSize: 36 }} />
                <Box>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      color: result.failed > 0 ? 'error.main' : 'text.secondary',
                    }}
                  >
                    {result.failed}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Rows with Validation Errors
                  </Typography>
                </Box>
              </Paper>
            </Box>

            {/* Error Breakdown List */}
            {result.errors.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'error.main' }}>
                  Validation Errors by Row:
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{
                    maxHeight: 220,
                    overflow: 'auto',
                    borderRadius: 2,
                    p: 1,
                    backgroundColor: alpha(theme.palette.background.default, 0.5),
                  }}
                >
                  <List dense disablePadding>
                    {result.errors.map((errItem, idx) => (
                      <ListItem
                        key={idx}
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 1.5,
                          py: 1,
                          borderBottom:
                            idx !== result.errors.length - 1
                              ? `1px solid ${theme.palette.divider}`
                              : 'none',
                        }}
                      >
                        <Chip
                          label={`Row ${errItem.row}`}
                          size="small"
                          color="error"
                          variant="outlined"
                          sx={{ fontWeight: 700, flexShrink: 0 }}
                        />
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {errItem.errors.map((errMsg, eIdx) => (
                            <Typography key={eIdx} variant="body2" sx={{ color: 'text.primary' }}>
                              • {errMsg}
                            </Typography>
                          ))}
                        </Box>
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} color="inherit">
          {result ? 'Done' : 'Cancel'}
        </Button>
        {!result && (
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={!selectedFile || loading}
            startIcon={<UploadIcon />}
          >
            {loading ? 'Importing...' : 'Upload & Import'}
          </Button>
        )}
        {result && result.failed > 0 && (
          <Button
            onClick={resetState}
            variant="outlined"
            startIcon={<UploadIcon />}
          >
            Upload Corrected CSV
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
