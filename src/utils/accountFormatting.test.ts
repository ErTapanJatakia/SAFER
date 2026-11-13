import { describe, expect, it } from 'vitest';
import { DEFAULT_ACCOUNT_SETTINGS, ACCOUNT_SETTINGS_STORAGE_KEY } from './accountSettings.ts';
import {
  formatAccountDate, formatAccountDateTime, formatAccountNumber, formatAccountTime, readAccountPreferences,
} from './accountFormatting.ts';

const prefs = (overrides: Partial<typeof DEFAULT_ACCOUNT_SETTINGS.preferences> = {}) => ({
  ...DEFAULT_ACCOUNT_SETTINGS.preferences, ...overrides,
});

describe('account regional formatting', () => {
  it('formats date-only values without timezone day shifts', () => {
    expect(formatAccountDate('2026-11-13', prefs({ dateFormat: 'DD/MM/YYYY', timezone: 'UTC' }))).toBe('13/11/2026');
    expect(formatAccountDate('13-11-2026', prefs({ dateFormat: 'YYYY-MM-DD' }))).toBe('2026-11-13');
    expect(formatAccountDate('13/11/2026', prefs())).toBe('13-11-2026');
  });

  it('rejects impossible or ambiguous date-only strings instead of guessing', () => {
    expect(formatAccountDate('31-02-2026', prefs())).toBe('—');
    expect(formatAccountDate('11/13/2026', prefs())).toBe('—');
  });

  it('applies the selected timezone to timestamp display', () => {
    const timestamp = '2026-11-13T00:30:00.000Z';
    expect(formatAccountDate(timestamp, prefs({ timezone: 'Asia/Kolkata' }))).toBe('13-11-2026');
    expect(formatAccountDate(timestamp, prefs({ timezone: 'UTC' }))).toBe('13-11-2026');
    expect(formatAccountDateTime(timestamp, prefs({ timezone: 'Asia/Kolkata', timeFormat: '24h' }))).toContain('06:00');
  });

  it('honours 12-hour and 24-hour time preferences', () => {
    const timestamp = '2026-11-13T13:05:00.000Z';
    expect(formatAccountTime(timestamp, prefs({ timezone: 'UTC', timeFormat: '24h' }))).toBe('13:05');
    expect(formatAccountTime(timestamp, prefs({ timezone: 'UTC', timeFormat: '12h' }))).toMatch(/01:05\sPM/);
  });

  it('formats numbers using the selected numbering convention', () => {
    expect(formatAccountNumber(123456.78, prefs({ numberFormat: 'en-IN' }))).toBe('1,23,456.78');
    expect(formatAccountNumber(123456.78, prefs({ numberFormat: 'en-US' }))).toBe('123,456.78');
    expect(formatAccountNumber(Number.NaN, prefs())).toBe('—');
  });

  it('reads validated browser-local preferences and falls back safely', () => {
    const storage = { getItem: (key: string) => key === ACCOUNT_SETTINGS_STORAGE_KEY
      ? JSON.stringify({ preferences: { timezone: 'UTC', dateFormat: 'YYYY-MM-DD' } }) : null };
    expect(readAccountPreferences(storage).timezone).toBe('UTC');
    expect(readAccountPreferences({ getItem: () => { throw new Error('blocked'); } })).toEqual(DEFAULT_ACCOUNT_SETTINGS.preferences);
  });
});
