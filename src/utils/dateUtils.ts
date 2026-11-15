/**
 * Date helpers keep stored values canonical while applying browser-local display
 * preferences at presentation time.
 */
import {DEFAULT_ACCOUNT_SETTINGS, normalizeAccountSettings, ACCOUNT_SETTINGS_STORAGE_KEY} from './accountSettings.ts';

export function getRegionalPreferences() {
  try {
    const raw = window.localStorage.getItem(ACCOUNT_SETTINGS_STORAGE_KEY);
    return normalizeAccountSettings(raw ? JSON.parse(raw) : null).preferences;
  } catch {
    return DEFAULT_ACCOUNT_SETTINGS.preferences;
  }
}

/**
 * Returns the current local calendar date as YYYY-MM-DD.
 * Local getters avoid shifting the date around midnight through UTC conversion.
 */
export function getCurrentISODate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Returns the current local date and time as YYYY-MM-DD HH:mm. */
export function getCurrentLocalDateTime(date: Date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${getCurrentISODate(date)} ${hours}:${minutes}`;
}

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
  // Accept canonical ISO dates and ISO datetime values without shifting timezone.
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T|\\s)/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  return trimmed;
}

/**
 * Formats a display date in DD-MM-YYYY or returns fallback label.
 */
export function formatDisplayDate(dateStr: string | null | undefined, fallback = 'N/A'): string {
  if (!dateStr) return fallback;
  const iso = toYYYYMMDD(dateStr);
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return toDDMMYYYY(dateStr);
  const [, year, month, day] = match;
  const format = getRegionalPreferences().dateFormat;
  if (format === 'YYYY-MM-DD') return `${year}-${month}-${day}`;
  if (format === 'DD/MM/YYYY') return `${day}/${month}/${year}`;
  return `${day}-${month}-${year}`;
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


/** Format a time value in the user's selected timezone and clock convention. */
export function formatDisplayTime(value: string | Date | null | undefined, fallback = 'N/A'): string {
  if (!value) return fallback;
  const localMatch = typeof value === 'string'
    ? value.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/)
    : null;
  const date = value instanceof Date
    ? value
    : localMatch
      ? new Date(Number(localMatch[1]), Number(localMatch[2]) - 1, Number(localMatch[3]), Number(localMatch[4]), Number(localMatch[5]))
      : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  const preferences = getRegionalPreferences();
  try {
    return new Intl.DateTimeFormat(preferences.locale, {
      timeZone: preferences.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: preferences.timeFormat === '12h',
    }).format(date);
  } catch {
    return fallback;
  }
}

/** Format a number using the selected regional grouping and decimal conventions. */
export function formatDisplayNumber(value: number, maximumFractionDigits = 2): string {
  if (!Number.isFinite(value)) return '—';
  const preferences = getRegionalPreferences();
  return new Intl.NumberFormat(preferences.numberFormat, {maximumFractionDigits}).format(value);
}
