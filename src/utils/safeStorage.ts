/**
 * Defensive parsing helpers for browser-local demonstration data.
 * localStorage is user-controlled and must never be trusted as typed application data.
 */

export function parseStoredValue<T>(
  raw: string | null,
  fallback: T,
  isValid: (value: unknown) => value is T
): T {
  if (raw === null) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function parseStoredArray<T>(
  raw: string | null,
  fallback: T[],
  isValidItem: (value: unknown) => value is T
): T[] {
  if (raw === null) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    const validItems = parsed.filter(isValidItem);
    // If every stored item is malformed, prefer known-good demo data.
    return parsed.length > 0 && validItems.length === 0 ? fallback : validItems;
  } catch {
    return fallback;
  }
}
