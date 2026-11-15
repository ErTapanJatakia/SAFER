import { EMPTY_PRIVACY_GOVERNANCE, type PrivacyGovernanceSnapshot } from '../types/dpdpGovernance.ts';
import { validatePrivacyGovernanceSnapshot } from './dpdpGovernance.ts';

export interface GovernanceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export const DPDP_GOVERNANCE_STORAGE_KEY = 'safer_dpdp_governance_demo_v1';
const MAX_BYTES = 1_000_000;

export function createDpdpGovernanceRepository(storage: GovernanceStorage) {
  let expectedRaw: string | null | undefined;
  const read = () => {
    try { return storage.getItem(DPDP_GOVERNANCE_STORAGE_KEY); }
    catch (error) { throw new Error('Unable to read DPDP governance demo storage.', { cause: error }); }
  };
  const load = (): PrivacyGovernanceSnapshot => {
    const raw = read();
    expectedRaw = raw;
    if (raw === null) return structuredClone(EMPTY_PRIVACY_GOVERNANCE);
    if (new TextEncoder().encode(raw).byteLength > MAX_BYTES) throw new Error('DPDP governance workspace exceeds 1 MB; no data was replaced.');
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch (error) { throw new Error('DPDP governance workspace is malformed; no data was replaced.', { cause: error }); }
    if (!validatePrivacyGovernanceSnapshot(parsed)) throw new Error('DPDP governance workspace failed validation; access is blocked to protect it.');
    return structuredClone(parsed);
  };
  const save = (snapshot: PrivacyGovernanceSnapshot) => {
    if (!validatePrivacyGovernanceSnapshot(snapshot)) throw new Error('Refusing to save invalid or non-synthetic DPDP governance data.');
    const current = read();
    if (expectedRaw === undefined) expectedRaw = current;
    if (current !== expectedRaw) throw new Error('DPDP governance workspace changed in another tab or session. Reopen it before retrying.');
    const serialized = JSON.stringify(snapshot);
    if (new TextEncoder().encode(serialized).byteLength > MAX_BYTES) throw new Error('DPDP governance workspace exceeds 1 MB.');
    try { storage.setItem(DPDP_GOVERNANCE_STORAGE_KEY, serialized); }
    catch (error) { throw new Error('Unable to write DPDP governance demo storage.', { cause: error }); }
    if (read() !== serialized) throw new Error('Unable to verify DPDP governance storage after writing.');
    expectedRaw = serialized;
  };
  return Object.freeze({ load, save });
}
