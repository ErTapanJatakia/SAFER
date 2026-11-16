import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const cloudflare = readFileSync(new URL('../docs/deployment/cloudflare-pages.md', import.meta.url), 'utf8');
const workflow = readFileSync(new URL('../.github/workflows/firebase-foundation.yml', import.meta.url), 'utf8');

test('Bun is the single declared package manager and npm lockfile is absent', () => {
  assert.equal(manifest.packageManager, 'bun@1.4.4');
  assert.equal(existsSync(new URL('../bun.lock', import.meta.url)), true);
  assert.equal(existsSync(new URL('../package-lock.json', import.meta.url)), false);
});

test('Vite development server is not exposed on all network interfaces by default', () => {
  assert.equal(manifest.scripts.dev, 'vite --port=3000 --host=127.0.0.1');
  const viteConfig = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');
  assert.match(viteConfig, /host:\s*'127\.0\.0\.1'/u);
});

test('supported deployment and validation paths use frozen Bun dependencies', () => {
  assert.equal(vercel.installCommand, 'bun install --frozen-lockfile');
  assert.match(cloudflare, /bun install --frozen-lockfile/u);
  assert.match(cloudflare, /bun run build/u);
  assert.match(workflow, /bun install --frozen-lockfile/u);
});
