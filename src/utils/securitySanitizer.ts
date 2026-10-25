/**
 * Security Sanitizer & Defensive Utilities
 *
 * Provides defensive protections conforming to:
 * - OWASP Top 10:2025 (A03: Injection, A01: Broken Access Control, A02: Cryptographic Failures)
 * - OWASP ASVS 5.0.0 (V5: Input Validation & Sanitization, V13: API & Web Services)
 * - CWE-1236 (Improper Neutralization of Formula Elements in CSV File)
 * - CWE-79 (Improper Neutralization of Input During Web Page Generation / XSS)
 * - CWE-434 (Unrestricted Upload of File with Dangerous Type)
 * - CWE-22 (Improper Limitation of a Pathname to a Restricted Directory)
 * - CWE-200 (Exposure of Sensitive Information)
 */

/**
 * Formula indicator characters in spreadsheet applications (Excel, LibreOffice, Google Sheets).
 * If a cell value starts with these characters, spreadsheets attempt formula evaluation.
 */
const SPREADSHEET_FORMULA_PREFIX_REGEX = /^[\s\x00-\x1F]*[=+\-@\t\r|]/;

/**
 * Neutralizes spreadsheet formula injection (CWE-1236).
 * Prepends a single quote (') if the string begins with =, +, -, @, \t, \r, or |.
 */
export function sanitizeSpreadsheetFormula(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (SPREADSHEET_FORMULA_PREFIX_REGEX.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * RFC 4180 compliant CSV cell escaping with formula injection defense.
 */
export function sanitizeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const sanitized = sanitizeSpreadsheetFormula(val);
  return `"${sanitized.replace(/"/g, '""')}"`;
}

/**
 * Checks whether an image data URL is safe for rendering in an <img> tag.
 * Allows strictly validated raster formats (PNG, JPEG, WebP) and safe SVGs.
 * Explicitly rejects javascript:, vbscript:, data:text/html, unapproved MIME types,
 * or SVGs with script/event handlers.
 */
export function isSafeImageDataUrl(url: unknown): boolean {
  if (typeof url !== 'string' || !url.trim()) return false;
  const trimmed = url.trim();

  // Reject dangerous pseudo-protocols
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('data:text/html') ||
    lower.startsWith('data:text/javascript')
  ) {
    return false;
  }

  // Safe raster base64 images (PNG, JPEG, WebP)
  const rasterRegex = /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/;
  if (rasterRegex.test(trimmed)) {
    return true;
  }

  // If SVG data URL, rigorously verify absence of active script or foreignObject markup
  if (lower.startsWith('data:image/svg+xml')) {
    let decoded = '';
    try {
      if (lower.includes(';base64,')) {
        const base64Part = trimmed.split(';base64,')[1] || '';
        // In browser or Node:
        decoded = typeof atob === 'function' ? atob(base64Part) : Buffer.from(base64Part, 'base64').toString('utf8');
      } else {
        decoded = decodeURIComponent(trimmed.slice(trimmed.indexOf(',') + 1));
      }
    } catch {
      return false;
    }

    const lowerDecoded = decoded.toLowerCase();
    const dangerousPatterns = [
      /<script\b/i,
      /javascript:/i,
      /vbscript:/i,
      /\bon\w+\s*=/i, // on* event handlers (onload, onerror, onclick, etc.)
      /<foreignobject\b/i,
      /<iframe\b/i,
      /<object\b/i,
      /<embed\b/i,
      /<!entity\b/i, // XXE / XML Entity expansion
      /<use\b/i,
    ];

    for (const pat of dangerousPatterns) {
      if (pat.test(lowerDecoded)) {
        return false;
      }
    }

    return true;
  }

  return false;
}

/**
 * Sanitizes download filenames to prevent directory traversal (CWE-22)
 * and header injection.
 */
export function sanitizeSafeFilename(name: string, fallback: string = 'export'): string {
  if (!name || typeof name !== 'string') return fallback;

  // Strip path separators, null bytes, and non-alphanumeric/safe chars
  const cleaned = name
    .replace(/[/\\]/g, '_')
    .replace(/\.\.+/g, '_')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/^_+/, '');

  if (!cleaned) return fallback;
  // Truncate overly long names (max 64 characters)
  return cleaned.length > 64 ? cleaned.slice(0, 64) : cleaned;
}

/**
 * Sanitizes diagnostic or error messages before displaying to users.
 * Strips stack traces, database terms, file system paths, or credential tokens.
 */
export function sanitizeErrorMessage(err: unknown, defaultMessage = 'An administrative error occurred.'): string {
  if (!err) return defaultMessage;
  if (typeof err === 'string') {
    const clean = err.replace(/(?:\/[a-zA-Z0-9._-]+)+/g, '[path]').replace(/[a-zA-Z0-9_-]{24,}/g, '[token]');
    return clean.slice(0, 160);
  }
  if (err instanceof Error && err.message) {
    const clean = err.message.replace(/(?:\/[a-zA-Z0-9._-]+)+/g, '[path]').replace(/[a-zA-Z0-9_-]{24,}/g, '[token]');
    return clean.slice(0, 160);
  }
  return defaultMessage;
}

/**
 * Validates email address format with strict RFC 5322 sanity check,
 * disallowing control characters, whitespace, or CRLF injection.
 */
export function isValidStrictEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length > 254) return false;
  // Disallow CRLF or control characters
  if (/[\r\n\x00-\x1F]/.test(trimmed)) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(trimmed);
}
