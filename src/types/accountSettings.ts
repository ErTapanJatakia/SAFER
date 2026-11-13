export type AccountDateFormat = 'DD-MM-YYYY' | 'YYYY-MM-DD' | 'DD/MM/YYYY';
export type AccountTimeFormat = '24h' | '12h';
export type AccountTimezone = 'Asia/Kolkata' | 'UTC';
export type AccountNumberFormat = 'en-IN' | 'en-US';

export interface AccountProfile {
  displayName: string;
  callSign: string;
  bio: string;
}

export interface AccountPreferences {
  dateFormat: AccountDateFormat;
  timeFormat: AccountTimeFormat;
  timezone: AccountTimezone;
  numberFormat: AccountNumberFormat;
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
    numberFormat: 'en-IN',
  },
};

export const ACCOUNT_SETTINGS_STORAGE_KEY = 'safer_account_settings_v1';

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
      timezone: preferences.timezone === 'UTC' ? 'UTC' : 'Asia/Kolkata',
      numberFormat: preferences.numberFormat === 'en-US' ? 'en-US' : 'en-IN',
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
