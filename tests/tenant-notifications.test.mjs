import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source = await readFile(new URL('../api/tenant/notifications.js', import.meta.url), 'utf8');

test('tenant activity feed requires the canonical audit:read permission', () => {
  assert.match(source, /action:\s*'audit:read'/);
  assert.doesNotMatch(source, /action:\s*'organisation:read'/);
});

test('tenant activity feed returns only minimized event metadata', () => {
  assert.match(source, /return \[\{eventId:doc\.id,action:value\.action,occurredAt:/);
  assert.doesNotMatch(source, /return \[\{[^}]*actorUid:/);
  assert.doesNotMatch(source, /return \[\{[^}]*targetResourceId:/);
});
