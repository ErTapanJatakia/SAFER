import type { DemoRepository, DataAccessState, RepositorySelection } from './dataBoundary.ts';
import type { CyberHygieneItem, IncidentReport, PersonnelRecord, PreDeploymentChecklistItem } from '../types/index.ts';
import { selectOperationalRepository } from './dataBoundary.ts';
import type { DemoSnapshot } from './demoRepository.ts';

export type DemoWorkspaceRepository = DemoRepository & {
  loadSnapshot(): DemoSnapshot;
  reset(): void;
};

/** The only approved selector for browser-local operational data. */
export function selectDemoWorkspaceRepository<TDemo extends DemoRepository>(
  state: DataAccessState,
  repository: TDemo,
): RepositorySelection<TDemo> {
  return selectOperationalRepository(state, repository);
}

/**
 * Wraps a Demo Guest repository in a revocable capability.
 * Once the owning workspace unmounts, retained callbacks/components can no
 * longer read or mutate browser-local operational data.
 */
export function createRevocableDemoRepository(
  repository: DemoWorkspaceRepository,
  isActive: () => boolean,
): DemoWorkspaceRepository {
  const assertActive = () => {
    if (!isActive()) {
      throw new Error('Demo Guest session has ended; repository access is revoked.');
    }
  };

  return Object.freeze({
    kind: 'demo' as const,
    loadSnapshot: () => {
      assertActive();
      return repository.loadSnapshot();
    },
    reset: () => {
      assertActive();
      repository.reset();
    },
    listPersonnel: async () => { assertActive(); return repository.listPersonnel(); },
    replacePersonnel: async (records: readonly PersonnelRecord[]) => { assertActive(); return repository.replacePersonnel(records); },
    savePersonnel: async (record: PersonnelRecord) => { assertActive(); return repository.savePersonnel(record); },
    deletePersonnel: async (recordId: string) => { assertActive(); return repository.deletePersonnel(recordId); },
    listIncidents: async () => { assertActive(); return repository.listIncidents(); },
    replaceIncidents: async (records: readonly IncidentReport[]) => { assertActive(); return repository.replaceIncidents(records); },
    saveIncident: async (record: IncidentReport) => { assertActive(); return repository.saveIncident(record); },
    listCyberHygiene: async () => { assertActive(); return repository.listCyberHygiene(); },
    replaceCyberHygiene: async (items: readonly CyberHygieneItem[]) => { assertActive(); return repository.replaceCyberHygiene(items); },
    saveCyberHygiene: async (item: CyberHygieneItem) => { assertActive(); return repository.saveCyberHygiene(item); },
    listChecklist: async () => { assertActive(); return repository.listChecklist(); },
    replaceChecklist: async (items: readonly PreDeploymentChecklistItem[]) => { assertActive(); return repository.replaceChecklist(items); },
    saveChecklist: async (item: PreDeploymentChecklistItem) => { assertActive(); return repository.saveChecklist(item); },
  });
}
