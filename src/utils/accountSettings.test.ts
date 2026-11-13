import { describe, expect, it } from 'vitest';
import {
  createAccountSettingsExport,
  DEFAULT_ACCOUNT_SETTINGS,
  normalizeAccountSettings,
  validateAccountProfile,
} from './accountSettings.ts';

describe('account settings normalization', () => {
  it('returns an independent default object for malformed input', () => {
    const first = normalizeAccountSettings(null);
    first.profile.displayName = 'Changed';
    expect(normalizeAccountSettings(null)).toEqual(DEFAULT_ACCOUNT_SETTINGS);
  });

  it('preserves supported values and normalizes unknown preference values', () => {
    expect(normalizeAccountSettings({
      profile: { displayName: 'Operator', callSign: 'ALPHA', bio: 'Bio' },
      preferences: { dateFormat: 'YYYY-MM-DD', timeFormat: '12h', timezone: 'UTC', numberFormat: 'en-US' },
    })).toEqual({
      version: 1,
      profile: { displayName: 'Operator', callSign: 'ALPHA', bio: 'Bio' },
      preferences: { dateFormat: 'YYYY-MM-DD', timeFormat: '12h', timezone: 'UTC', numberFormat: 'en-US' },
    });
  });

  it('bounds imported profile strings', () => {
    const normalized = normalizeAccountSettings({
      profile: { displayName: 'A'.repeat(100), callSign: 'B'.repeat(40), bio: 'C'.repeat(300) },
    });
    expect(normalized.profile.displayName).toHaveLength(80);
    expect(normalized.profile.callSign).toHaveLength(32);
    expect(normalized.profile.bio).toHaveLength(280);
  });
});

describe('account profile validation', () => {
  it('accepts the default empty profile', () => {
    expect(validateAccountProfile(DEFAULT_ACCOUNT_SETTINGS.profile)).toEqual([]);
  });

  it('rejects profile values beyond their documented limits', () => {
    expect(validateAccountProfile({
      displayName: 'A'.repeat(81),
      callSign: 'B'.repeat(33),
      bio: 'C'.repeat(281),
    })).toHaveLength(3);
  });
});

describe('personal settings export', () => {
  it('labels the export as browser-local and excludes operational data', () => {
    const exported = createAccountSettingsExport(DEFAULT_ACCOUNT_SETTINGS, '2026-11-13T00:00:00.000Z');
    expect(exported.metadata.storageBoundary).toContain('excludes authentication credentials and operational records');
    expect(exported.settings).toEqual(DEFAULT_ACCOUNT_SETTINGS);
    expect(JSON.stringify(exported)).not.toContain('personnel');
    expect(JSON.stringify(exported)).not.toContain('incident');
  });

  it('does not include a user identifier or authentication token', () => {
    const serialized = JSON.stringify(createAccountSettingsExport(DEFAULT_ACCOUNT_SETTINGS));
    expect(serialized).not.toMatch(/uid|token|password/i);
  });
});
