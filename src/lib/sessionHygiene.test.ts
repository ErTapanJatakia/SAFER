import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTH_FLOW_MARKER_KEY,
  AUTH_FLOW_MARKER_TTL_MS,
  beginAuthFlow,
  cleanupStaleAuthFlowMarker,
  endAuthFlow,
} from './sessionHygiene.ts';

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

describe('SAFER auth-flow session hygiene', () => {
  it('removes only a stale SAFER auth marker and preserves unrelated preferences and data', () => {
    const storage = new MemoryStorage();
    storage.setItem('safer:theme', 'obsidian');
    storage.setItem('prot_ops_personnel_v2', '[synthetic]');
    storage.setItem(AUTH_FLOW_MARKER_KEY, JSON.stringify({ startedAt: 1_000 }));
    assert.equal(cleanupStaleAuthFlowMarker(storage as unknown as Storage, 1_000 + AUTH_FLOW_MARKER_TTL_MS + 1), true);
    assert.equal(storage.getItem(AUTH_FLOW_MARKER_KEY), null);
    assert.equal(storage.getItem('safer:theme'), 'obsidian');
    assert.equal(storage.getItem('prot_ops_personnel_v2'), '[synthetic]');
  });

  it('preserves a fresh in-progress marker', () => {
    const storage = new MemoryStorage();
    assert.equal(beginAuthFlow(storage as unknown as Storage, 10_000), true);
    assert.equal(cleanupStaleAuthFlowMarker(storage as unknown as Storage, 10_001), false);
    assert.notEqual(storage.getItem(AUTH_FLOW_MARKER_KEY), null);
  });

  it('removes malformed and future-dated markers without throwing', () => {
    const storage = new MemoryStorage();
    storage.setItem(AUTH_FLOW_MARKER_KEY, '{broken');
    assert.equal(cleanupStaleAuthFlowMarker(storage as unknown as Storage, 20_000), true);
    storage.setItem(AUTH_FLOW_MARKER_KEY, JSON.stringify({ startedAt: 20_001 }));
    assert.equal(cleanupStaleAuthFlowMarker(storage as unknown as Storage, 20_000), true);
  });

  it('clears the flow marker after completion or failure', () => {
    const storage = new MemoryStorage();
    beginAuthFlow(storage as unknown as Storage, 30_000);
    endAuthFlow(storage as unknown as Storage);
    assert.equal(storage.getItem(AUTH_FLOW_MARKER_KEY), null);
  });

  it('fails safely when browser storage is unavailable', () => {
    const denied = {
      getItem() { throw new Error('denied'); },
      setItem() { throw new Error('denied'); },
      removeItem() { throw new Error('denied'); },
    } as unknown as Storage;
    assert.equal(cleanupStaleAuthFlowMarker(denied), false);
    assert.equal(beginAuthFlow(denied), false);
    assert.doesNotThrow(() => endAuthFlow(denied));
  });
});
