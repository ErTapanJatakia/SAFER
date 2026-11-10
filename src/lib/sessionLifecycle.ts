export type SessionPhase = 'signed_out' | 'authenticated' | 'signing_out';

export interface SessionSnapshot {
  readonly generation: number;
  readonly phase: SessionPhase;
  readonly uid: string | null;
  readonly orgId: string | null;
}

export interface SessionRequestToken {
  readonly generation: number;
  readonly requestId: number;
  readonly uid: string;
  readonly orgId: string;
}

export interface SessionLifecycle {
  snapshot(): SessionSnapshot;
  startAuthenticated(uid: string): SessionSnapshot;
  selectOrganisation(orgId: string): SessionSnapshot;
  beginRequest(): SessionRequestToken | null;
  isCurrent(token: SessionRequestToken): boolean;
  invalidate(): SessionSnapshot;
  beginSignOut(): SessionSnapshot;
  endSession(): SessionSnapshot;
}

/**
 * In-memory generation gate for all session-bound asynchronous work.
 * Every identity, organisation, or sign-out transition invalidates older tokens.
 * This controller grants no authorisation and stores no data or credentials.
 */
export function createSessionLifecycle(): SessionLifecycle {
  let state: SessionSnapshot = Object.freeze({
    generation: 0, phase: 'signed_out', uid: null, orgId: null,
  });
  let requestId = 0;

  const transition = (next: Omit<SessionSnapshot, 'generation'>): SessionSnapshot => {
    requestId += 1;
    state = Object.freeze({ ...next, generation: state.generation + 1 });
    return state;
  };

  return Object.freeze({
    snapshot: () => state,
    startAuthenticated: (uid: string) => {
      if (!uid.trim()) return transition({ phase: 'signed_out', uid: null, orgId: null });
      return transition({ phase: 'authenticated', uid, orgId: null });
    },
    selectOrganisation: (orgId: string) => {
      if (state.phase !== 'authenticated' || !state.uid) return state;
      const normalized = orgId.trim();
      if (normalized === state.orgId) return state;
      return transition({ phase: 'authenticated', uid: state.uid, orgId: normalized || null });
    },
    beginRequest: () => {
      if (state.phase !== 'authenticated' || !state.uid || !state.orgId) return null;
      requestId += 1;
      return Object.freeze({
        generation: state.generation,
        requestId,
        uid: state.uid,
        orgId: state.orgId,
      });
    },
    isCurrent: (token: SessionRequestToken) =>
      state.phase === 'authenticated'
      && state.generation === token.generation
      && requestId === token.requestId
      && state.uid === token.uid
      && state.orgId === token.orgId,
    invalidate: () => transition({
      phase: state.phase === 'authenticated' ? 'authenticated' : state.phase,
      uid: state.uid,
      orgId: null,
    }),
    beginSignOut: () => transition({ phase: 'signing_out', uid: null, orgId: null }),
    endSession: () => transition({ phase: 'signed_out', uid: null, orgId: null }),
  });
}
