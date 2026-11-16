import React, { createContext, useContext, useLayoutEffect, useMemo, useRef } from 'react';
import { createDemoRepository } from '../lib/demoRepository.ts';
import { createRevocableDemoRepository, selectDemoWorkspaceRepository } from '../lib/demoWorkspace.ts';
import type { DemoWorkspaceRepository } from '../lib/demoWorkspace.ts';
import type { DataAccessState } from '../lib/dataBoundary.ts';

const DemoWorkspaceContext = createContext<DemoWorkspaceRepository | null>(null);

interface ProviderProps {
  accessState: DataAccessState;
  children: React.ReactNode;
}

/** Mounts the storage-backed repository only for an explicit Demo Guest state. */
export function DemoGuestWorkspaceProvider({ accessState, children }: ProviderProps) {
  if (accessState.kind !== 'demo_guest') {
    return <main role="alert">The operational workspace is unavailable for this session.</main>;
  }
  return <AuthorizedDemoGuestWorkspace accessState={accessState}>{children}</AuthorizedDemoGuestWorkspace>;
}

function AuthorizedDemoGuestWorkspace({ accessState, children }: { accessState: DataAccessState; children: React.ReactNode }) {
  const activeRef = useRef(true);
  useLayoutEffect(() => {
    activeRef.current = true;
    return () => {
      // Layout cleanup revokes the capability during the unmount commit,
      // before passive effects and before the browser can paint the next state.
      activeRef.current = false;
    };
  }, []);

  const repository = useMemo(() => {
    try {
      const browserRepository = createDemoRepository(window.localStorage, {
        locks: window.navigator.locks,
        requireCrossTabLock: true,
      });
      // Probe all four reads before mounting the workspace. A blocked storage
      // API must not be mistaken for an empty workspace and overwritten later.
      browserRepository.loadSnapshot();
      return createRevocableDemoRepository(browserRepository, () => activeRef.current);
    } catch {
      return null;
    }
  }, []);
  if (!repository) {
    return (
      <main role="alert" aria-live="assertive">
        SAFER cannot safely read the Demo Guest workspace. Browser storage may be unavailable or saved records may be damaged or invalid. The workspace is locked to avoid overwriting stored data. Do not clear this site's browser data unless you intend to discard the local demo records; check browser storage permissions or restore a valid browser profile, then reload.
      </main>
    );
  }
  const selection = selectDemoWorkspaceRepository(accessState, repository);
  if (selection.kind !== 'demo') {
    return <main role="alert">The operational workspace is unavailable for this session.</main>;
  }
  return (
    <DemoWorkspaceContext.Provider value={selection.repository}>
      {children}
    </DemoWorkspaceContext.Provider>
  );
}

export function useDemoWorkspaceRepository(): DemoWorkspaceRepository {
  const repository = useContext(DemoWorkspaceContext);
  if (!repository) {
    throw new Error('Demo Guest repository requested outside its authorised workspace boundary.');
  }
  return repository;
}
