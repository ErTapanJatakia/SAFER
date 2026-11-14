import { describe, expect, it } from 'vitest';
import { getDefaultExportRedactionKeys } from './exportPreferences.ts';
import type { ExportableField } from './personnelExport.ts';

const fields = [
  { key: 'name', label: 'Name', category: 'Identification', isSensitive: false },
  { key: 'email', label: 'Email', category: 'Contact Details', isSensitive: true },
  { key: 'health', label: 'Health', category: 'Personal & Health', isSensitive: true },
] satisfies ExportableField[];

describe('default export redaction preferences', () => {
  it('keeps standard mode aligned with the current sensitive-field defaults', () => {
    expect([...getDefaultExportRedactionKeys(fields, 'standard')].sort()).toEqual(['email', 'health']);
  });

  it('redacts every currently exportable field in strict mode', () => {
    expect([...getDefaultExportRedactionKeys(fields, 'strict')].sort()).toEqual(['email', 'health', 'name']);
  });

  it('does not mutate the supplied export field definitions', () => {
    const before = structuredClone(fields);
    getDefaultExportRedactionKeys(fields, 'strict');
    expect(fields).toEqual(before);
  });
});
