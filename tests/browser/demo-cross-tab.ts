import { createDemoRepository } from '../../src/lib/demoRepository.ts';
import { INITIAL_PERSONNEL } from '../../src/data/mockData.ts';

declare global {
  interface Window {
    saferBrowserHarness?: {
      ready: boolean;
      externalChange: string | null;
      savePersonnel: (id: string, fullName: string) => Promise<void>;
      listPersonnel: () => Promise<readonly { id: string; fullName: string }[]>;
    };
  }
}

const operationalKeys = new Set([
  'prot_ops_personnel_v2',
  'prot_ops_incidents_v2',
  'prot_ops_cyber_v2',
  'prot_ops_checklist_v2',
]);

if (new URLSearchParams(window.location.search).get('reset') === '1') window.localStorage.clear();

const repository = createDemoRepository(window.localStorage, {
  locks: window.navigator.locks,
  requireCrossTabLock: true,
});
repository.loadSnapshot();

let externalChange: string | null = null;
window.addEventListener('storage', (event) => {
  if (event.storageArea !== window.localStorage || !event.key || !operationalKeys.has(event.key)) return;
  externalChange = event.key;
});

const baseline = INITIAL_PERSONNEL[0];
if (!baseline) throw new Error('The synthetic personnel fixture is unavailable.');

window.saferBrowserHarness = {
  ready: true,
  get externalChange() { return externalChange; },
  async savePersonnel(id, fullName) {
    await repository.savePersonnel({ ...baseline, id, fullName });
  },
  async listPersonnel() {
    return repository.listPersonnel();
  },
};

document.querySelector('#status')!.textContent = 'Browser repository ready';
