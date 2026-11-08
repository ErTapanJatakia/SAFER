import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStoredArray, parseStoredValue } from './safeStorage.ts';

const isString = (value: unknown): value is string => typeof value === 'string';
const isIdRecord = (value: unknown): value is { id: string } =>
  typeof value === 'object' && value !== null &&
  'id' in value && typeof value.id === 'string';

test('parseStoredValue returns valid values and safe fallbacks', () => {
  assert.equal(parseStoredValue('"dark"', 'light', isString), 'dark');
  assert.equal(parseStoredValue('{"unexpected":true}', 'light', isString), 'light');
  assert.equal(parseStoredValue('{broken', 'light', isString), 'light');
  assert.equal(parseStoredValue(null, 'light', isString), 'light');
});

test('parseStoredArray filters malformed records and preserves empty lists', () => {
  const fallback = [{ id: 'sample' }];
  assert.deepEqual(parseStoredArray('[{"id":"saved"},null,{"wrong":true}]', fallback, isIdRecord), [{ id: 'saved' }]);
  assert.deepEqual(parseStoredArray('[]', fallback, isIdRecord), []);
  assert.deepEqual(parseStoredArray('[null,{"wrong":true}]', fallback, isIdRecord), fallback);
  assert.deepEqual(parseStoredArray('not-json', fallback, isIdRecord), fallback);
  assert.deepEqual(parseStoredArray('{"id":"wrong-shape"}', fallback, isIdRecord), fallback);
});
