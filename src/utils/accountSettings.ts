export type AccountDateFormat = 'DD-MM-YYYY' | 'YYYY-MM-DD' | 'DD/MM/YYYY';
export type AccountTimeFormat = '24h' | '12h';
export type AccountTimezone = string;
export type AccountLocale = string;
export type AccountNumberFormat = string;
export type AccountExportFormat = 'txt' | 'csv' | 'xlsx' | 'pdf' | 'docx';
export type AccountRedactionLevel = 'standard' | 'strict';

export interface AccountProfile {
  displayName: string;
  callSign: string;
  bio: string;
}

export interface AccountPreferences {
  dateFormat: AccountDateFormat;
  timeFormat: AccountTimeFormat;
  timezone: AccountTimezone;
  locale: AccountLocale;
  numberFormat: AccountNumberFormat;
  defaultExportFormat: AccountExportFormat;
  defaultRedactionLevel: AccountRedactionLevel;
}

export interface AccountSettings {
  version: 1;
  profile: AccountProfile;
  preferences: AccountPreferences;
}

export const DEFAULT_ACCOUNT_SETTINGS: AccountSettings = {
  version: 1,
  profile: { displayName: '', callSign: '', bio: '' },
  preferences: {
    dateFormat: 'DD-MM-YYYY',
    timeFormat: '24h',
    timezone: 'Asia/Kolkata',
    locale: 'en-IN',
    numberFormat: 'en-IN',
    defaultExportFormat: 'txt',
    defaultRedactionLevel: 'standard',
  },
};

export const ACCOUNT_SETTINGS_STORAGE_KEY = 'safer_account_settings_v1';

function isValidTimezone(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 64) return false;
  try { new Intl.DateTimeFormat('en-US', { timeZone: value }); return true; } catch { return false; }
}

function normalizeLocale(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || value.length > 64) return fallback;
  try { return Intl.getCanonicalLocales(value)[0] ?? fallback; } catch { return fallback; }
}

export function normalizeAccountSettings(raw: unknown): AccountSettings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return structuredClone(DEFAULT_ACCOUNT_SETTINGS);
  const value = raw as Record<string, unknown>;
  const profile = value.profile && typeof value.profile === 'object'
    ? value.profile as Record<string, unknown> : {};
  const preferences = value.preferences && typeof value.preferences === 'object'
    ? value.preferences as Record<string, unknown> : {};
  return {
    version: 1,
    profile: {
      displayName: typeof profile.displayName === 'string' ? profile.displayName.slice(0, 80) : '',
      callSign: typeof profile.callSign === 'string' ? profile.callSign.slice(0, 32) : '',
      bio: typeof profile.bio === 'string' ? profile.bio.slice(0, 280) : '',
    },
    preferences: {
      dateFormat: ['DD-MM-YYYY', 'YYYY-MM-DD', 'DD/MM/YYYY'].includes(String(preferences.dateFormat))
        ? preferences.dateFormat as AccountDateFormat : DEFAULT_ACCOUNT_SETTINGS.preferences.dateFormat,
      timeFormat: preferences.timeFormat === '12h' ? '12h' : '24h',
      timezone: isValidTimezone(preferences.timezone) ? preferences.timezone : DEFAULT_ACCOUNT_SETTINGS.preferences.timezone,
      locale: normalizeLocale(preferences.locale, DEFAULT_ACCOUNT_SETTINGS.preferences.locale),
      numberFormat: normalizeLocale(preferences.numberFormat, DEFAULT_ACCOUNT_SETTINGS.preferences.numberFormat),
      defaultExportFormat: ['txt', 'csv', 'xlsx', 'pdf', 'docx'].includes(String(preferences.defaultExportFormat))
        ? preferences.defaultExportFormat as AccountExportFormat : DEFAULT_ACCOUNT_SETTINGS.preferences.defaultExportFormat,
      defaultRedactionLevel: preferences.defaultRedactionLevel === 'strict' ? 'strict' : 'standard',
    },
  };
}

export function validateAccountProfile(profile: AccountProfile): string[] {
  const errors: string[] = [];
  if (profile.displayName.trim().length > 80) errors.push('Display name must be 80 characters or fewer.');
  if (profile.callSign.trim().length > 32) errors.push('Call sign must be 32 characters or fewer.');
  if (profile.bio.trim().length > 280) errors.push('Bio must be 280 characters or fewer.');
  return errors;
}

export function createAccountSettingsExport(settings: AccountSettings, exportedAt = new Date().toISOString()) {
  return {
    metadata: {
      product: 'SAFER',
      exportType: 'Personal account preferences',
      schemaVersion: 1,
      exportedAt,
      storageBoundary: 'Browser-local preferences only; excludes authentication credentials and operational records.',
    },
    settings: normalizeAccountSettings(settings),
  };
}


/**
 * Read the optional browser-local profile for display only.
 * This value is not a Firebase identity and must never be used for authorization.
 */
export function readAccountProfile(storage?: Pick<Storage, 'getItem'>): AccountProfile {
  try {
    const target = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
    if (!target) return { ...DEFAULT_ACCOUNT_SETTINGS.profile };
    const raw = target.getItem(ACCOUNT_SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_ACCOUNT_SETTINGS.profile };
    return normalizeAccountSettings(JSON.parse(raw)).profile;
  } catch {
    return { ...DEFAULT_ACCOUNT_SETTINGS.profile };
  }
}
