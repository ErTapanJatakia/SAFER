import type { DemoRepository, DataAccessState, RepositorySelection } from './dataBoundary.ts';
import { selectOperationalRepository } from './dataBoundary.ts';

/** The only approved selector for browser-local operational data. */
export function selectDemoWorkspaceRepository<TDemo extends DemoRepository>(
  state: DataAccessState,
  repository: TDemo,
): RepositorySelection<TDemo> {
  return selectOperationalRepository(state, repository);
}
