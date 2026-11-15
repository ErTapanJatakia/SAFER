import {afterEach,describe,expect,it} from 'vitest';
import {formatDisplayDate,formatDisplayNumber,formatDisplayTime} from './dateUtils.ts';
import {ACCOUNT_SETTINGS_STORAGE_KEY,DEFAULT_ACCOUNT_SETTINGS} from './accountSettings.ts';
const writePreferences=(preferences: Partial<typeof DEFAULT_ACCOUNT_SETTINGS.preferences>)=>{
 window.localStorage.setItem(ACCOUNT_SETTINGS_STORAGE_KEY,JSON.stringify({...DEFAULT_ACCOUNT_SETTINGS,preferences:{...DEFAULT_ACCOUNT_SETTINGS.preferences,...preferences}}));
};
afterEach(()=>window.localStorage.clear());
describe('regional display preferences',()=>{
 it('formats dates using the selected convention without changing stored ISO values',()=>{
  writePreferences({dateFormat:'YYYY-MM-DD'}); expect(formatDisplayDate('15-11-2026')).toBe('2026-11-15');
  writePreferences({dateFormat:'DD/MM/YYYY'}); expect(formatDisplayDate('2026-11-15')).toBe('15/11/2026');
  expect(formatDisplayDate('2026-11-15 13:05')).toBe('15/11/2026');
 });
 it('formats numeric values using the selected regional grouping',()=>{
  writePreferences({numberFormat:'en-IN'}); expect(formatDisplayNumber(123456.78)).toBe('1,23,456.78');
  writePreferences({numberFormat:'en-US'}); expect(formatDisplayNumber(123456.78)).toBe('123,456.78');
 });
 it('formats time in the selected timezone and clock convention',()=>{
  writePreferences({locale:'en',timezone:'UTC',timeFormat:'24h'}); expect(formatDisplayTime('2026-11-15T13:05:00.000Z')).toContain('13');
  writePreferences({timezone:'Asia/Kolkata',timeFormat:'12h'}); expect(formatDisplayTime('2026-11-15T13:05:00.000Z')).toContain('06:35');
 });
 it('formats local wall-clock timestamps and returns fallbacks for invalid values',()=>{writePreferences({timezone:'UTC',timeFormat:'24h'});expect(formatDisplayTime('2026-11-15 13:05')).toContain('13');expect(formatDisplayTime('not-a-date','Unknown')).toBe('Unknown');expect(formatDisplayDate('', 'Unknown')).toBe('Unknown');});
});