import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
const view = await readFile(new URL('../src/components/IncidentReportsView.tsx', import.meta.url), 'utf8');
test('incident report titles and narratives wrap on narrow screens', () => {
 assert.match(view,/font-mono text-xs font-bold[^"]*break-all/);
 assert.match(view,/text-sm font-bold text-slate-900 break-words/);
 assert.match(view,/text-xs text-slate-700 mt-1 leading-relaxed break-words/);
 assert.match(view,/flex flex-wrap items-center gap-2 min-w-0/);
});
test('incident filters and action controls can reflow', () => {
 assert.match(view,/w-full sm:w-auto flex flex-wrap items-center gap-2 min-w-0/);
 assert.match(view,/w-full sm:w-auto min-w-0 px-2\.5 py-1\.5/);
 assert.match(view,/flex flex-wrap items-center justify-end gap-2/);
});
test('quick-log modal is height constrained and its form remains usable on mobile', () => {
 assert.match(view,/max-w-lg w-full max-h-\[90vh\] min-w-0 overflow-y-auto/);
 assert.match(view,/p-4 sm:p-6 space-y-4 text-xs min-w-0/);
 assert.match(view,/grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0/);
 assert.match(view,/onSubmit={handleCreate}/);
});
