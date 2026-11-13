import test from 'node:test';
import assert from 'node:assert/strict';
import { copyToClipboard } from './clipboard.ts';

test('copyToClipboard handles empty strings gracefully', async () => {
  const result = await copyToClipboard('');
  assert.equal(result, false);
});
