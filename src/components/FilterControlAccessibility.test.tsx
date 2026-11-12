import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { PersonnelReadinessView } from './PersonnelReadinessView';
import { CyberHygieneView } from './CyberHygieneView';

describe('Filter control accessible names', () => {
  it('names the personnel search and each personnel filter', () => {
    const html = renderToStaticMarkup(
      <PersonnelReadinessView
        personnelList={[]}
        onOpenAddModal={vi.fn()}
        onOpenEditModal={vi.fn()}
        onOpenDetailModal={vi.fn()}
        onDeletePerson={vi.fn()}
        onOpenReadinessSummary={vi.fn()}
      />
    );

    expect(html).toContain('aria-label="Search personnel records"');
    expect(html).toContain('aria-label="Filter personnel by qualification indicator"');
    expect(html).toContain('aria-label="Filter personnel by verification status"');
    expect(html).toContain('aria-label="Filter personnel by role"');
    expect(html).toContain('role="status" aria-live="polite" aria-atomic="true" data-personnel-filter-results');
  });

  it('names the cyber hygiene search field', () => {
    const html = renderToStaticMarkup(
      <CyberHygieneView
        items={[]}
        onUpdateStatus={vi.fn()}
        onRunAudit={vi.fn()}
      />
    );

    expect(html).toContain('aria-label="Search defensive controls and audit notes"');
  });
});
