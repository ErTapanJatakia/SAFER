import type {
  CyberHygieneItem,
  IncidentReport,
  PersonnelRecord,
  PreDeploymentChecklistItem,
} from '../types/index.ts';
import type { TenantMembership } from './tenantMembership.ts';

export type DataAccessState =
  | { readonly kind: 'signed_out'; readonly generation: number }
  | { readonly kind: 'demo_guest'; readonly generation: number }
  | { readonly kind: 'authenticated_unresolved'; readonly uid: string; readonly orgId: string | null; readonly generation: number }
  | { readonly kind: 'tenant_active'; readonly membership: TenantMembership; readonly generation: number }
  | { readonly kind: 'tenant_denied'; readonly uid: string; readonly orgId: string | null; readonly reason: 'invalid-organisation-id' | 'membership-unavailable' | 'membership-mismatch'; readonly generation: number }
  | { readonly kind: 'signed_out_transition'; readonly generation: number };

export interface OperationalRepository {
  listPersonnel(): Promise<readonly PersonnelRecord[]>;
  savePersonnel(record: PersonnelRecord): Promise<void>;
  deletePersonnel(recordId: string): Promise<void>;
  listIncidents(): Promise<readonly IncidentReport[]>;
  saveIncident(record: IncidentReport): Promise<void>;
  listCyberHygiene(): Promise<readonly CyberHygieneItem[]>;
  saveCyberHygiene(item: CyberHygieneItem): Promise<void>;
  listChecklist(): Promise<readonly PreDeploymentChecklistItem[]>;
  saveChecklist(item: PreDeploymentChecklistItem): Promise<void>;
}

/** Repository implementations must be selected by this boundary, never by a UI role or URL value. */
export interface DemoRepository extends OperationalRepository {
  readonly kind: 'demo';
}

/** Reserved contract. No tenant implementation is released or selected in this phase. */
export interface TenantRepository extends OperationalRepository {
  readonly kind: 'tenant';
  readonly uid: string;
  readonly orgId: string;
  readonly role: TenantMembership['role'];
  readonly generation: number;
}

export type RepositorySelection<TDemo extends DemoRepository> =
  | { readonly kind: 'demo'; readonly repository: TDemo }
  | { readonly kind: 'unavailable'; readonly reason: 'signed-out' | 'authentication-unresolved' | 'tenant-denied' | 'tenant-repository-not-released' | 'transitioning' };

/** Start with no operational data capability. */
export function signedOutState(generation = 0): DataAccessState {
  return Object.freeze({ kind: 'signed_out', generation });
}

export function enterDemoGuest(generation: number): DataAccessState {
  return Object.freeze({ kind: 'demo_guest', generation });
}

export function beginAuthenticatedSession(uid: string, generation: number): DataAccessState {
  if (!uid.trim()) return signedOutState(generation);
  return Object.freeze({ kind: 'authenticated_unresolved', uid, orgId: null, generation });
}

/** An organisation ID is only a locator; it cannot grant access. */
export function beginTenantResolution(
  state: DataAccessState,
  orgIdInput: string,
  generation: number,
): DataAccessState {
  if (state.kind !== 'authenticated_unresolved') return state;
  const orgId = typeof orgIdInput === 'string' ? orgIdInput.trim() : '';
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(orgId)) {
    return Object.freeze({
      kind: 'tenant_denied',
      uid: state.uid,
      orgId: null,
      reason: 'invalid-organisation-id',
      generation,
    });
  }
  return Object.freeze({ kind: 'authenticated_unresolved', uid: state.uid, orgId, generation });
}

/**
 * Commit a membership result only to the exact unresolved request generation.
 * Late results from an earlier account/org request leave the current state untouched.
 */
export function completeTenantResolution(
  currentState: DataAccessState,
  requestGeneration: number,
  membership: TenantMembership | null,
): DataAccessState {
  if (
    currentState.kind !== 'authenticated_unresolved'
    || currentState.generation !== requestGeneration
    || currentState.orgId === null
  ) return currentState;

  if (!membership) {
    return Object.freeze({
      kind: 'tenant_denied',
      uid: currentState.uid,
      orgId: currentState.orgId,
      reason: 'membership-unavailable',
      generation: requestGeneration,
    });
  }

  if (
    membership.status !== 'active'
    || membership.uid !== currentState.uid
    || membership.orgId !== currentState.orgId
  ) {
    return Object.freeze({
      kind: 'tenant_denied',
      uid: currentState.uid,
      orgId: currentState.orgId,
      reason: 'membership-mismatch',
      generation: requestGeneration,
    });
  }

  return Object.freeze({ kind: 'tenant_active', membership, generation: requestGeneration });
}

export function denyTenantAccess(
  state: DataAccessState,
  reason: 'membership-unavailable' | 'membership-mismatch',
  generation: number,
): DataAccessState {
  if (state.kind !== 'authenticated_unresolved' || state.orgId === null) return state;
  return Object.freeze({
    kind: 'tenant_denied',
    uid: state.uid,
    orgId: state.orgId,
    reason,
    generation,
  });
}

export function beginSignOut(generation: number): DataAccessState {
  return Object.freeze({ kind: 'signed_out_transition', generation });
}

export function completeSignOut(state: DataAccessState, generation: number): DataAccessState {
  if (state.kind !== 'signed_out_transition' || state.generation !== generation) return state;
  return signedOutState(generation);
}

/**
 * Demo is the only operational repository currently eligible for selection.
 * Even a valid active membership receives no tenant repository until a separate
 * production rules release and tenant repository implementation are approved.
 */
export function selectOperationalRepository<TDemo extends DemoRepository>(
  state: DataAccessState,
  demoRepository: TDemo,
): RepositorySelection<TDemo> {
  switch (state.kind) {
    case 'demo_guest':
      return Object.freeze({ kind: 'demo', repository: demoRepository });
    case 'signed_out':
      return Object.freeze({ kind: 'unavailable', reason: 'signed-out' });
    case 'authenticated_unresolved':
      return Object.freeze({ kind: 'unavailable', reason: 'authentication-unresolved' });
    case 'tenant_denied':
      return Object.freeze({ kind: 'unavailable', reason: 'tenant-denied' });
    case 'tenant_active':
      return Object.freeze({ kind: 'unavailable', reason: 'tenant-repository-not-released' });
    case 'signed_out_transition':
      return Object.freeze({ kind: 'unavailable', reason: 'transitioning' });
  }
}
