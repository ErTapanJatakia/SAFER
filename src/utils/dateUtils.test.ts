import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidDDMMYYYY,
  toDDMMYYYY,
  toYYYYMMDD,
  formatDisplayDate,
  isStartBeforeOrEqualEnd,
} from './dateUtils.ts';

test('isValidDDMMYYYY validates standard DD-MM-YYYY dates correctly', () => {
  assert.equal(isValidDDMMYYYY('15-10-2026'), true);
  assert.equal(isValidDDMMYYYY('29-02-2024'), true); // leap year
  assert.equal(isValidDDMMYYYY('29-02-2023'), false); // non-leap year
  assert.equal(isValidDDMMYYYY('31-04-2026'), false); // April only has 30 days
  assert.equal(isValidDDMMYYYY('00-10-2026'), false);
  assert.equal(isValidDDMMYYYY('15-13-2026'), false);
  assert.equal(isValidDDMMYYYY('2026-10-15'), false); // not in DD-MM-YYYY format
  assert.equal(isValidDDMMYYYY(''), false);
});

test('toDDMMYYYY converts YYYY-MM-DD and preserves DD-MM-YYYY', () => {
  assert.equal(toDDMMYYYY('2026-10-15'), '15-10-2026');
  assert.equal(toDDMMYYYY('15-10-2026'), '15-10-2026');
  assert.equal(toDDMMYYYY(null), '');
});

test('toYYYYMMDD converts DD-MM-YYYY to ISO format', () => {
  assert.equal(toYYYYMMDD('15-10-2026'), '2026-10-15');
  assert.equal(toYYYYMMDD('2026-10-15'), '2026-10-15');
});

test('formatDisplayDate handles fallbacks', () => {
  assert.equal(formatDisplayDate('2026-05-20'), '20-05-2026');
  assert.equal(formatDisplayDate(null), 'N/A');
  assert.equal(formatDisplayDate('', 'Non-expiring'), 'Non-expiring');
});

test('isStartBeforeOrEqualEnd compares properly', () => {
  assert.equal(isStartBeforeOrEqualEnd('01-01-2024', '15-10-2026'), true);
  assert.equal(isStartBeforeOrEqualEnd('15-10-2026', '01-01-2024'), false);
});
