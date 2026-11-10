import type { DemoRepository, DataAccessState, RepositorySelection } from './dataBoundary.ts';
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
    replacePersonnel: async (records) => { assertActive(); return repository.replacePersonnel(records); },
    savePersonnel: async (record) => { assertActive(); return repository.savePersonnel(record); },
    deletePersonnel: async (recordId) => { assertActive(); return repository.deletePersonnel(recordId); },
    listIncidents: async () => { assertActive(); return repository.listIncidents(); },
    replaceIncidents: async (records) => { assertActive(); return repository.replaceIncidents(records); },
    saveIncident: async (record) => { assertActive(); return repository.saveIncident(record); },
    listCyberHygiene: async () => { assertActive(); return repository.listCyberHygiene(); },
    replaceCyberHygiene: async (items) => { assertActive(); return repository.replaceCyberHygiene(items); },
    saveCyberHygiene: async (item) => { assertActive(); return repository.saveCyberHygiene(item); },
    listChecklist: async () => { assertActive(); return repository.listChecklist(); },
    replaceChecklist: async (items) => { assertActive(); return repository.replaceChecklist(items); },
    saveChecklist: async (item) => { assertActive(); return repository.saveChecklist(item); },
  });
}
