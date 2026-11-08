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


/**
 * Reads a user-selected IANA time zone from the document root.
 * Invalid or absent preferences safely fall back to the browser's local zone.
 */
function getPreferredTimeZone(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const candidate = document.documentElement.getAttribute('data-time-zone');
  if (!candidate) return undefined;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: candidate });
    return candidate;
  } catch {
    return undefined;
  }
}

function getDateParts(date: Date, timeZone?: string): Record<string, string> {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

/**
 * Returns the selected-zone calendar date as YYYY-MM-DD.
 * Avoids UTC date shifts and respects a saved account time zone.
 */
export function getLocalISODate(date: Date = new Date()): string {
  const zone = getPreferredTimeZone();
  if (zone) {
    const parts = getDateParts(date, zone);
    return `${parts.year}-${parts.month}-${parts.day}`;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns the selected-zone date and time as YYYY-MM-DD HH:mm.
 */
export function getLocalDateTime(date: Date = new Date()): string {
  const zone = getPreferredTimeZone();
  if (zone) {
    const parts = getDateParts(date, zone);
    return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
  }
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${getLocalISODate(date)} ${hours}:${minutes}`;
}

/**
 * Formats a display date using the account's selected date format and time zone.
 * Without account preferences, it uses the caller's locale as before.
 */
export function formatLocalDisplayDate(
  date: Date = new Date(),
  locale = 'en-IN'
): string {
  const zone = getPreferredTimeZone();
  const dateFormat = typeof document !== 'undefined'
    ? document.documentElement.getAttribute('data-date-format')
    : null;

  if (zone || dateFormat === 'DD-MM-YYYY' || dateFormat === 'YYYY-MM-DD') {
    const parts = getDateParts(date, zone);
    return dateFormat === 'YYYY-MM-DD'
      ? `${parts.year}-${parts.month}-${parts.day}`
      : `${parts.day}-${parts.month}-${parts.year}`;
  }

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}


/**
 * Returns the short time-zone label for an operational timestamp.
 * Uses the signed-in account's selected zone when valid, otherwise the
 * browser's local zone. Never labels a non-IST time as IST.
 */
export function getTimeZoneLabel(date: Date = new Date(), locale = 'en-IN'): string {
  const zone = getPreferredTimeZone();
  try {
    const parts = new Intl.DateTimeFormat(locale, {
      timeZone: zone,
      timeZoneName: 'short',
    }).formatToParts(date);
    return parts.find((part) => part.type === 'timeZoneName')?.value || (zone || 'Local time');
  } catch {
    return 'Local time';
  }
}
