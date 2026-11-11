import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardView } from './DashboardView.tsx';
import type { PersonnelRecord } from '../types/index.ts';

describe('DashboardView accessibility and empty states', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
      .IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const renderDashboard = (personnelList: PersonnelRecord[] = []) => {
    act(() => {
      root.render(
        <DashboardView
          personnelList={personnelList}
          incidentList={[]}
          checklistItems={[]}
          onNavigate={vi.fn()}
          onSelectPersonnel={vi.fn()}
          onOpenAddPersonnel={vi.fn()}
        />
      );
    });
  };

  it('renders explicit empty states and zero-valued accessible progress bars', () => {
    renderDashboard();

    expect(container.textContent).toContain('No checklist items have been added yet.');
    expect(container.textContent).toContain('No incident records have been added yet.');

    const progressBars = Array.from(container.querySelectorAll('[role="progressbar"]'));
    expect(progressBars).toHaveLength(2);
    expect(progressBars.map((bar) => bar.getAttribute('aria-valuenow'))).toEqual(['0', '0']);
    expect(progressBars.map((bar) => bar.getAttribute('aria-label'))).toEqual([
      'Administrative task completion',
      'Pre-deployment checklist verification',
    ]);
  });

  it('counts distinct represented sectors and exposes the calculated task completion rate', () => {
    const personnelList = [
      {
        assignmentSector: 'Sector Alpha (Metropolitan)',
        certifications: [],
        tasksCompleted: 3,
        tasksOutstanding: 1,
      },
      {
        assignmentSector: 'Sector Alpha (Metropolitan)',
        certifications: [],
        tasksCompleted: 0,
        tasksOutstanding: 0,
      },
      {
        assignmentSector: 'Sector Bravo (Transit)',
        certifications: [],
        tasksCompleted: 0,
        tasksOutstanding: 0,
      },
    ] as PersonnelRecord[];

    renderDashboard(personnelList);

    expect(container.textContent).toContain('2 Sectors Represented');
    const taskProgress = container.querySelector(
      '[aria-label="Administrative task completion"]'
    );
    expect(taskProgress?.getAttribute('aria-valuenow')).toBe('75');
  });
});
