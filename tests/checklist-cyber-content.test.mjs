import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const cyber = await readFile(new URL('../src/components/CyberHygieneView.tsx', import.meta.url), 'utf8');
const checklist = await readFile(new URL('../src/components/PreDeploymentChecklistView.tsx', import.meta.url), 'utf8');

test('phishing scenario names and email identity fields remain readable', () => {
  assert.match(cyber, /<div className="font-bold">Scenario \{idx \+ 1\}<\/div>/);
  assert.match(cyber, /text-\[11px\] break-words \$\{selectedPhishIndex/);
  assert.doesNotMatch(cyber, /font-bold truncate">Scenario/);
  assert.match(cyber, /font-mono text-\[11px\] break-all/);
  assert.match(cyber, /\{currentPhish\.subject\}<\/span>/);
  assert.match(cyber, /currentPhish\.body/);
});

test('phishing email toolbar and executive summary controls reflow', () => {
  assert.match(cyber, /flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0/);
  assert.match(cyber, /flex flex-wrap items-center gap-2 sm:shrink-0/);
  assert.match(cyber, /flex flex-wrap items-center gap-2/);
  assert.match(cyber, /whitespace-pre-wrap font-sans/);
});

test('checklist descriptions and compliance notes are not line-clamped', () => {
  assert.match(checklist, /text-slate-600 break-words">\{item\.description\}/);
  assert.doesNotMatch(checklist, /line-clamp-2">\{item\.description\}/);
  assert.match(checklist, /item\.complianceNotes\}/);
  assert.match(checklist, /break-words/);
});

test('checklist filters and status controls can wrap', () => {
  assert.doesNotMatch(checklist, /transition whitespace-nowrap \$\{/);
  assert.match(checklist, /flex flex-wrap items-start justify-between gap-2 pt-1 border-t/);
  assert.match(checklist, /flex flex-wrap items-center gap-1/);
});
