import type { DemoRepository, DataAccessState, RepositorySelection } from './dataBoundary.ts';
import type { CyberHygieneItem, IncidentReport, PersonnelRecord, PreDeploymentChecklistItem } from '../types/index.ts';
import { selectOperationalRepository } from './dataBoundary.ts';
import type { DemoSnapshot } from './demoRepository.ts';

export type DemoWorkspaceRepository = DemoRepository & {
  loadSnapshot(): DemoSnapshot;
  reset(): Promise<void>;
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
 * Calls are rejected both before they begin and after their asynchronous
 * operation settles, so a result completing after session exit is never
 * returned to a caller holding a stale capability.
 *
 * The current browser-local adapter performs all storage access synchronously
 * before returning its promises. Any future asynchronous storage adapter must
 * add cancellation at its own I/O boundary; this wrapper cannot undo a write
 * that an asynchronous adapter performs after revocation.
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

  const run = async <T,>(operation: () => Promise<T>): Promise<T> => {
    assertActive();
    const result = await operation();
    assertActive();
    return result;
  };

  return Object.freeze({
    kind: 'demo' as const,
    loadSnapshot: () => {
      assertActive();
      return repository.loadSnapshot();
    },
    reset: () => run(() => repository.reset()),
    listPersonnel: () => run(() => repository.listPersonnel()),
    replacePersonnel: (records: readonly PersonnelRecord[]) => run(() => repository.replacePersonnel(records)),
    savePersonnel: (record: PersonnelRecord) => run(() => repository.savePersonnel(record)),
    deletePersonnel: (recordId: string) => run(() => repository.deletePersonnel(recordId)),
    listIncidents: () => run(() => repository.listIncidents()),
    replaceIncidents: (records: readonly IncidentReport[]) => run(() => repository.replaceIncidents(records)),
    saveIncident: (record: IncidentReport) => run(() => repository.saveIncident(record)),
    listCyberHygiene: () => run(() => repository.listCyberHygiene()),
    replaceCyberHygiene: (items: readonly CyberHygieneItem[]) => run(() => repository.replaceCyberHygiene(items)),
    saveCyberHygiene: (item: CyberHygieneItem) => run(() => repository.saveCyberHygiene(item)),
    listChecklist: () => run(() => repository.listChecklist()),
    replaceChecklist: (items: readonly PreDeploymentChecklistItem[]) => run(() => repository.replaceChecklist(items)),
    saveChecklist: (item: PreDeploymentChecklistItem) => run(() => repository.saveChecklist(item)),
  });
}
