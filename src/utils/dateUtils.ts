/**
 * Date utility helpers supporting DD-MM-YYYY input, display, and validation.
 */

export function isValidDDMMYYYY(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  const match = str.trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return false;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  if (year < 1920 || year > 2100) return false;
  if (month < 1 || month > 12) return false;

  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) return false;

  return true;
}

/**
 * Normalizes any valid date string (YYYY-MM-DD or DD-MM-YYYY) into DD-MM-YYYY format.
 */
export function toDDMMYYYY(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  // If already DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
    return trimmed;
  }
  // If YYYY-MM-DD
  const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    const [, year, month, day] = ymdMatch;
    return `${day}-${month}-${year}`;
  }
  return trimmed;
}

/**
 * Converts a DD-MM-YYYY or ISO date string to ISO YYYY-MM-DD format for calculation.
 */
export function toYYYYMMDD(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  // If DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return `${year}-${month}-${day}`;
  }
  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  return trimmed;
}

/**
 * Formats a display date in DD-MM-YYYY or returns fallback label.
 */
export function formatDisplayDate(dateStr: string | null | undefined, fallback = 'N/A'): string {
  if (!dateStr) return fallback;
  return toDDMMYYYY(dateStr);
}

/**
 * Checks whether an employment/certificate date range is valid (start <= end).
 */
export function isStartBeforeOrEqualEnd(startDate: string, endDate: string): boolean {
  if (!startDate || !endDate) return true;
  const sIso = toYYYYMMDD(startDate);
  const eIso = toYYYYMMDD(endDate);
  return sIso <= eIso;
}
