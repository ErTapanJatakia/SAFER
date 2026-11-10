import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';
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
  useEffect(() => {
    activeRef.current = true;
    return () => {
      // Revoke retained repository references as soon as this session boundary exits.
      activeRef.current = false;
    };
  }, []);

  const repository = useMemo(() => {
    const browserRepository = createDemoRepository(window.localStorage);
    return createRevocableDemoRepository(browserRepository, () => activeRef.current);
  }, []);
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
