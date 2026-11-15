import type { ExportableField } from './personnelExport.ts';
import type { AccountRedactionLevel } from './accountSettings.ts';

/**
 * Resolve a saved redaction preference against the current export schema.
 * Strict mode redacts every available field; standard mode preserves the
 * application's existing sensitive-field defaults.
 */
export function getDefaultExportRedactionKeys(
  fields: readonly ExportableField[],
  level: AccountRedactionLevel,
): Set<string> {
  return new Set(
    fields
      .filter((field) => level === 'strict' || field.isSensitive)
      .map((field) => field.key),
  );
}
