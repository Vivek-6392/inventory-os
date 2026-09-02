import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  Stack,
  Chip,
  Avatar,
  TextField,
  Button,
  ButtonGroup,
  Divider,
  Alert,
  CircularProgress,
  Paper,
  alpha,
  useTheme,
} from '@mui/material';
import {
  AddComment as NoteIcon,
  Edit as EditIcon,
  CheckCircle as CreateIcon,
  Archive as ArchiveIcon,
  Unarchive as RestoreIcon,
  Send as SendIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import type { ItemHistory } from '../types';
import { getItemHistory, addItemNote } from '../services/history';
import { formatDateTimeIST } from '../utils/date';

interface ItemHistoryTimelineProps {
  itemId: string;
}

export const ItemHistoryTimeline: React.FC<ItemHistoryTimelineProps> = ({ itemId }) => {
  const theme = useTheme();

  const [history, setHistory] = useState<ItemHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterType, setFilterType] = useState<'ALL' | 'CHANGES' | 'NOTES'>('ALL');
  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getItemHistory(itemId, filterType);
      setHistory(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load item history');
    } finally {
      setLoading(false);
    }
  }, [itemId, filterType]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setSubmittingNote(true);
    try {
      await addItemNote(itemId, newNote.trim());
      setNewNote('');
      fetchHistory();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to post note');
    } finally {
      setSubmittingNote(false);
    }
  };

  const getActionBadge = (record: ItemHistory) => {
    if (record.action === 'CREATED') {
      return {
        icon: <CreateIcon fontSize="small" />,
        label: 'Item Created',
        color: 'success' as const,
        bg: alpha(theme.palette.success.main, 0.1),
        text: theme.palette.success.main,
      };
    }
    if (record.action === 'NOTE') {
      return {
        icon: <NoteIcon fontSize="small" />,
        label: 'Staff Note',
        color: 'warning' as const,
        bg: alpha(theme.palette.warning.main, 0.1),
        text: theme.palette.warning.main,
      };
    }
    if (record.field_name === 'archived') {
      const isArchived = record.new_value === 'True' || record.new_value === 'true';
      return {
        icon: isArchived ? <ArchiveIcon fontSize="small" /> : <RestoreIcon fontSize="small" />,
        label: isArchived ? 'Archived' : 'Restored',
        color: (isArchived ? 'error' : 'success') as const,
        bg: alpha(isArchived ? theme.palette.error.main : theme.palette.success.main, 0.1),
        text: isArchived ? theme.palette.error.main : theme.palette.success.main,
      };
    }
    return {
      icon: <EditIcon fontSize="small" />,
      label: `Updated ${record.field_name || 'field'}`,
      color: 'info' as const,
      bg: alpha(theme.palette.info.main, 0.1),
      text: theme.palette.info.main,
    };
  };

  return (
    <Box>
      {/* Top Filter and Add Note Form */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <ButtonGroup variant="outlined" size="small">
          <Button
            variant={filterType === 'ALL' ? 'contained' : 'outlined'}
            onClick={() => setFilterType('ALL')}
          >
            All Activity
          </Button>
          <Button
            variant={filterType === 'CHANGES' ? 'contained' : 'outlined'}
            onClick={() => setFilterType('CHANGES')}
          >
            Field Changes
          </Button>
          <Button
            variant={filterType === 'NOTES' ? 'contained' : 'outlined'}
            onClick={() => setFilterType('NOTES')}
          >
            Notes Only
          </Button>
        </ButtonGroup>
      </Stack>

      {/* Note input box */}
      <Paper
        component="form"
        onSubmit={handleAddNote}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 2.5,
          border: `1px solid ${theme.palette.divider}`,
          backgroundColor: alpha(theme.palette.background.paper, 0.6),
        }}
      >
        <TextField
          fullWidth
          multiline
          rows={2}
          placeholder="Leave a note or audit observation (available to both staff and managers)..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          sx={{ mb: 1.5 }}
        />
        <Stack direction="row" justifyContent="flex-end">
          <Button
            type="submit"
            variant="contained"
            size="small"
            disabled={!newNote.trim() || submittingNote}
            startIcon={submittingNote ? <CircularProgress size={16} /> : <SendIcon />}
          >
            Post Note
          </Button>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={32} />
        </Box>
      ) : history.length === 0 ? (
        <Paper
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 2.5,
            border: `1px dashed ${theme.palette.divider}`,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            No history records match the selected filter.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {history.map((record) => {
            const badge = getActionBadge(record);
            return (
              <Card
                key={record.id}
                sx={{
                  p: 2.5,
                  borderRadius: 2.5,
                  border: `1px solid ${theme.palette.divider}`,
                  backgroundColor: alpha(theme.palette.background.paper, 0.8),
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        bgcolor: badge.bg,
                        color: badge.text,
                      }}
                    >
                      {badge.icon}
                    </Avatar>
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          label={badge.label}
                          size="small"
                          color={badge.color}
                          variant="outlined"
                          sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          by <strong>{record.changed_by_user?.name || 'User'}</strong> (
                          {record.changed_by_user?.role || 'Staff'})
                        </Typography>
                      </Stack>
                    </Box>
                  </Stack>

                  <Typography variant="caption" color="text.secondary">
                    {formatDateTimeIST(record.created_at)} IST
                  </Typography>
                </Stack>

                {/* Content */}
                {record.action === 'NOTE' ? (
                  <Paper
                    sx={{
                      p: 1.5,
                      mt: 1,
                      borderRadius: 2,
                      backgroundColor: alpha(theme.palette.warning.main, 0.05),
                      borderLeft: `3px solid ${theme.palette.warning.main}`,
                    }}
                  >
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {record.note}
                    </Typography>
                  </Paper>
                ) : record.field_name ? (
                  <Box sx={{ mt: 1, pl: 5 }}>
                    <Typography variant="body2" color="text.secondary">
                      Changed <code style={{ color: theme.palette.primary.light }}>{record.field_name}</code> from{' '}
                      <del style={{ color: theme.palette.error.light }}>
                        {record.old_value || 'None'}
                      </del>{' '}
                      to{' '}
                      <ins style={{ color: theme.palette.success.light, textDecoration: 'none', fontWeight: 600 }}>
                        {record.new_value || 'None'}
                      </ins>
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ pl: 5, mt: 0.5 }}>
                    Initial item creation in system.
                  </Typography>
                )}
              </Card>
            );
          })}
        </Stack>
      )}
    </Box>
  );
};
