import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const incidentView = await readFile(
  new URL('../src/components/IncidentReportsView.tsx', import.meta.url),
  'utf8',
);
const personnelModal = await readFile(
  new URL('../src/components/PersonnelModal.tsx', import.meta.url),
  'utf8',
);

test('incident category and priority fields stack below the small breakpoint', () => {
  const responsiveGrid = 'grid grid-cols-1 sm:grid-cols-2 gap-3';
  assert.equal(incidentView.split(responsiveGrid).length - 1, 2);
  assert.doesNotMatch(incidentView, /className="grid grid-cols-2 gap-3"/);
});

test('residence and correspondence address fields use a single column on narrow screens', () => {
  const responsiveGrid = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5';
  assert.equal(personnelModal.split(responsiveGrid).length - 1, 2);
  assert.doesNotMatch(personnelModal, /className="grid grid-cols-2 sm:grid-cols-4 gap-2\.5"/);
});
