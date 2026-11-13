import {
  ACCOUNT_SETTINGS_STORAGE_KEY,
  normalizeAccountSettings,
  type AccountPreferences,
} from './accountSettings.ts';

export function readAccountPreferences(storage?: Pick<Storage, 'getItem'>): AccountPreferences {
  try {
    const source = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
    if (!source) return normalizeAccountSettings(null).preferences;
    const raw = source.getItem(ACCOUNT_SETTINGS_STORAGE_KEY);
    return normalizeAccountSettings(raw ? JSON.parse(raw) : null).preferences;
  } catch {
    return normalizeAccountSettings(null).preferences;
  }
}

function parseCalendarDate(value: string): { year: number; month: number; day: number } | null {
  const dmy = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  const ymd = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const slash = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const parts = dmy ? [Number(dmy[3]), Number(dmy[2]), Number(dmy[1])]
    : ymd ? [Number(ymd[1]), Number(ymd[2]), Number(ymd[3])]
      : slash ? [Number(slash[3]), Number(slash[2]), Number(slash[1])] : null;
  if (!parts) return null;
  const [year, month, day] = parts;
  const check = new Date(Date.UTC(year, month - 1, day));
  return check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === day
    ? { year, month, day } : null;
}

function dateParts(date: Date, timezone: AccountPreferences['timezone']): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  return {
    year: Number(parts.find((part) => part.type === 'year')?.value),
    month: Number(parts.find((part) => part.type === 'month')?.value),
    day: Number(parts.find((part) => part.type === 'day')?.value),
  };
}

export function formatAccountDate(
  value: string | Date | null | undefined,
  preferences: AccountPreferences,
  fallback = '—',
): string {
  if (value === null || value === undefined || value === '') return fallback;
  let parts: { year: number; month: number; day: number } | null = null;
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) return fallback;
    parts = dateParts(value, preferences.timezone);
  } else {
    const calendarDate = parseCalendarDate(value.trim());
    if (calendarDate) parts = calendarDate;
    else {
      const timestamp = new Date(value);
      if (!Number.isFinite(timestamp.getTime())) return fallback;
      parts = dateParts(timestamp, preferences.timezone);
    }
  }
  const { year, month, day } = parts;
  if (preferences.dateFormat === 'YYYY-MM-DD') return [year, String(month).padStart(2, '0'), String(day).padStart(2, '0')].join('-');
  const separator = preferences.dateFormat === 'DD/MM/YYYY' ? '/' : '-';
  return [String(day).padStart(2, '0'), String(month).padStart(2, '0'), year].join(separator);
}

export function formatAccountTime(
  value: string | Date | null | undefined,
  preferences: AccountPreferences,
  fallback = '—',
): string {
  if (value === null || value === undefined || value === '') return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return fallback;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: preferences.timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: preferences.timeFormat === '12h',
  }).format(date);
}

export function formatAccountDateTime(
  value: string | Date | null | undefined,
  preferences: AccountPreferences,
  fallback = '—',
): string {
  if (value === null || value === undefined || value === '') return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return fallback;
  return `${formatAccountDate(date, preferences, fallback)} ${formatAccountTime(date, preferences, fallback)}`;
}

export function formatAccountNumber(value: number, preferences: AccountPreferences): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(preferences.numberFormat, {
    maximumFractionDigits: 2,
  }).format(value);
}
