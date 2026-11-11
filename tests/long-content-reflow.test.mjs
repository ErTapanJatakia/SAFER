import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const personnel = await readFile(new URL('../src/components/PersonnelReadinessView.tsx', import.meta.url), 'utf8');
const dashboard = await readFile(new URL('../src/components/DashboardView.tsx', import.meta.url), 'utf8');

test('personnel identity and qualification details wrap without hiding identifiers', () => {
  assert.match(personnel, /PMC ID: \{person\.pmcEmployeeId[^\n]+break-all/);
  assert.match(personnel, /Call Sign: \{person\.callSign[^\n]+break-all/);
  assert.match(personnel, /Badge: \{person\.badgeId\}/);
  assert.match(personnel, /person\.displayName \|\| person\.fullName/);
  assert.match(personnel, /font-bold break-words text-\[11px\] sm:text-xs/);
  assert.doesNotMatch(personnel, /font-bold truncate text-\[11px\] sm:text-xs/);
  assert.match(personnel, /min-w-0 break-words\">\{cert\.issuer\}/);
  assert.doesNotMatch(personnel, /truncate max-w-\[130px\]/);
});

test('personnel qualification dates and status badges can wrap independently', () => {
  assert.match(personnel, /flex flex-wrap items-start justify-between gap-x-2 gap-y-1 text-\[10px\] text-slate-500/);
  assert.match(personnel, /Completed: \{cert\.completionDate\}/);
  assert.match(personnel, /flex flex-wrap items-start justify-between gap-1 pt-0\.5 border-t/);
});

test('dashboard incident titles and summaries remain readable for long content', () => {
  assert.match(dashboard, /flex flex-wrap items-start gap-2[\s\S]{0,180}font-semibold text-slate-900 min-w-0 flex-1 break-words/);
  assert.doesNotMatch(dashboard, /font-semibold text-slate-900 truncate max-w-\[190px\]/);
  assert.match(dashboard, /line-clamp-2 break-words/);
});
