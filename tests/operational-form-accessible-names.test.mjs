import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const incident = await readFile(new URL('../src/components/IncidentReportsView.tsx', import.meta.url), 'utf8');
const checklist = await readFile(new URL('../src/components/PreDeploymentChecklistView.tsx', import.meta.url), 'utf8');

test('incident search, filters, and entry controls have explicit accessible names', () => {
  for (const name of [
    'Search incidents',
    'Filter incidents by type',
    'Incident title',
    'Incident type',
    'Incident priority',
    'Incident location',
    'Reported by',
    'Incident summary',
  ]) {
    assert.ok(incident.includes(`aria-label="${name}"`), `Missing accessible name: ${name}`);
  }
});

test('pre-deployment search, review, and task controls have explicit accessible names', () => {
  for (const name of [
    'Search checklist tasks, notes, and assigned staff',
    'Reviewer name',
    'Task title',
    'Task category',
    'Task status',
    'Task priority',
    'Task deadline',
    'Assigned staff member',
    'Task description',
    'Task notes',
  ]) {
    assert.ok(checklist.includes(`aria-label="${name}"`), `Missing accessible name: ${name}`);
  }
});
