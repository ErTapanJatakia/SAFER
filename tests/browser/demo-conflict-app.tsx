import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../../src/App.tsx';
import { DemoGuestWorkspaceProvider } from '../../src/components/DemoGuestWorkspaceProvider.tsx';
import { enterDemoGuest } from '../../src/lib/dataBoundary.ts';
import '../../src/index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DemoGuestWorkspaceProvider accessState={enterDemoGuest(1)}>
      <App />
    </DemoGuestWorkspaceProvider>
  </React.StrictMode>,
);
