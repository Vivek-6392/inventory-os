import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Typography,
  Stack,
  Tooltip,
  alpha,
  useTheme,
} from '@mui/material';
import {
  ArrowForward as ArrowForwardIcon,
  Add as PlusIcon,
  Remove as MinusIcon,
  Tune as AdjustIcon,
  SwapHoriz as TransferIcon,
  InfoOutlined as InfoIcon,
} from '@mui/icons-material';
import { MovementKind, type StockMovement } from '../types';

interface MovementsTableProps {
  movements: StockMovement[];
  hideItemColumn?: boolean;
}

export const MovementsTable: React.FC<MovementsTableProps> = ({
  movements,
  hideItemColumn = false,
}) => {
  const theme = useTheme();

  const getKindBadge = (kind: MovementKind) => {
    switch (kind) {
      case MovementKind.RECEIPT:
        return (
          <Chip
            icon={<PlusIcon fontSize="small" />}
            label="Receipt"
            size="small"
            sx={{
              backgroundColor: alpha(theme.palette.success.main, 0.15),
              color: theme.palette.success.light,
              fontWeight: 700,
            }}
          />
        );
      case MovementKind.ISSUE:
        return (
          <Chip
            icon={<MinusIcon fontSize="small" />}
            label="Issue"
            size="small"
            sx={{
              backgroundColor: alpha(theme.palette.info.main, 0.15),
              color: theme.palette.info.light,
              fontWeight: 700,
            }}
          />
        );
      case MovementKind.TRANSFER:
        return (
          <Chip
            icon={<TransferIcon fontSize="small" />}
            label="Transfer"
            size="small"
            sx={{
              backgroundColor: alpha(theme.palette.primary.main, 0.15),
              color: theme.palette.primary.light,
              fontWeight: 700,
            }}
          />
        );
      case MovementKind.ADJUSTMENT:
        return (
          <Chip
            icon={<AdjustIcon fontSize="small" />}
            label="Adjustment"
            size="small"
            sx={{
              backgroundColor: alpha(theme.palette.warning.main, 0.15),
              color: theme.palette.warning.light,
              fontWeight: 700,
            }}
          />
        );
      default:
        return <Chip label={kind} size="small" />;
    }
  };

  const getQuantityDisplay = (movement: StockMovement) => {
    const qty = movement.quantity;
    let color = 'text.primary';
    let prefix = '';

    if (movement.kind === MovementKind.RECEIPT) {
      color = 'success.main';
      prefix = '+';
    } else if (movement.kind === MovementKind.ISSUE) {
      color = 'info.main';
      prefix = '-';
    } else if (movement.kind === MovementKind.ADJUSTMENT) {
      if (qty > 0) {
        color = 'success.main';
        prefix = '+';
      } else {
        color = 'warning.main';
      }
    }

    return (
      <Typography
        variant="body2"
        sx={{
          fontWeight: 700,
          color,
          fontFamily: 'monospace',
          fontSize: '0.95rem',
        }}
      >
        {prefix}{qty}
      </Typography>
    );
  };

  if (movements.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
        No stock movements recorded yet.
      </Typography>
    );
  }

  return (
    <TableContainer>
      <Table sx={{ minWidth: 700 }}>
        <TableHead sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.04) }}>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Date & Time</TableCell>
            {!hideItemColumn && <TableCell sx={{ fontWeight: 700 }}>Item</TableCell>}
            <TableCell sx={{ fontWeight: 700 }}>Kind</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>Quantity</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Location Details</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Reason / Notes</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Recorded By</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {movements.map((mv) => (
            <TableRow key={mv.id} hover>
              {/* Date & Time */}
              <TableCell sx={{ whiteSpace: 'nowrap' }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {new Date(mv.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(mv.created_at).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Typography>
              </TableCell>

              {/* Item */}
              {!hideItemColumn && (
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {mv.item?.name || '—'}
                  </Typography>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'primary.light' }}>
                    {mv.item?.sku}
                  </Typography>
                </TableCell>
              )}

              {/* Kind */}
              <TableCell>{getKindBadge(mv.kind)}</TableCell>

              {/* Quantity */}
              <TableCell align="right">{getQuantityDisplay(mv)}</TableCell>

              {/* Location details */}
              <TableCell>
                {mv.kind === MovementKind.TRANSFER ? (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                      {mv.from_location?.name || 'Unknown'}
                    </Typography>
                    <ArrowForwardIcon fontSize="small" sx={{ color: 'primary.main', fontSize: 14 }} />
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      {mv.to_location?.name || 'Unknown'}
                    </Typography>
                  </Stack>
                ) : (
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {mv.location?.name || '—'}
                  </Typography>
                )}
              </TableCell>

              {/* Reason / Notes */}
              <TableCell sx={{ maxWidth: 220 }}>
                {mv.reason ? (
                  <Tooltip title={mv.reason}>
                    <Typography variant="body2" noWrap sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                      {mv.reason}
                    </Typography>
                  </Tooltip>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    —
                  </Typography>
                )}
              </TableCell>

              {/* Recorded by */}
              <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {mv.recorder?.name || 'System'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {mv.recorder?.role}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
