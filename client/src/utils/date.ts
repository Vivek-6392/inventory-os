/**
 * Date and Time utilities formatted for Indian Standard Time (IST / Asia/Kolkata).
 * Time zone offset: UTC+05:30.
 */

export const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Formats a timestamp into full IST date and time string:
 * Example: "03 Sep 2026, 12:43 AM"
 */
export const formatDateTimeIST = (dateStr?: string | Date | null): string => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    timeZone: IST_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Formats a timestamp into an IST date string:
 * Example: "03 Sep 2026"
 */
export const formatDateIST = (dateStr?: string | Date | null): string => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    timeZone: IST_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Formats a timestamp into an IST time string:
 * Example: "12:43 AM"
 */
export const formatTimeIST = (dateStr?: string | Date | null): string => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-IN', {
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};
