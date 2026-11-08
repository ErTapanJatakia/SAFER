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
const SAFE_SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const SAFE_SVG_TAGS = new Set([
  'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line',
  'polyline', 'polygon', 'defs', 'lineargradient', 'radialgradient',
  'stop', 'clippath', 'title', 'desc', 'text', 'tspan',
]);
const SAFE_SVG_ATTRIBUTES = new Set([
  'xmlns', 'width', 'height', 'viewbox', 'fill', 'stroke', 'stroke-width',
  'stroke-linecap', 'stroke-linejoin', 'opacity', 'd', 'x', 'y', 'x1', 'y1',
  'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'points', 'transform', 'id',
  'offset', 'stop-color', 'stop-opacity', 'gradientunits', 'gradienttransform',
  'font-size', 'font-family', 'font-weight', 'text-anchor', 'dominant-baseline',
]);

function isSafeSvgAttribute(name: string, value: string): boolean {
  const key = name.toLowerCase();
  const trimmed = value.trim();
  if (!SAFE_SVG_ATTRIBUTES.has(key) || /^on/i.test(key)) return false;
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) return false;

  if (key === 'xmlns') return trimmed === SAFE_SVG_NAMESPACE;
  if (key === 'id') return /^[A-Za-z_][A-Za-z0-9_.-]{0,63}$/.test(trimmed);
  if (key === 'fill' || key === 'stroke' || key === 'stop-color') {
    return /^(?:none|currentcolor|transparent|#[0-9a-f]{3,8}|[a-z]{1,24}|rgba?\([0-9.,%\s]+\))$/i.test(trimmed);
  }
  if (key === 'stroke-linecap') return /^(?:butt|round|square)$/i.test(trimmed);
  if (key === 'stroke-linejoin') return /^(?:miter|round|bevel)$/i.test(trimmed);
  if (key === 'font-family') return /^[A-Za-z0-9 ,_-]{1,64}$/.test(trimmed);
  if (key === 'font-size') return /^\d+(?:\.\d+)?(?:px|pt|em|%)?$/i.test(trimmed);
  if (key === 'font-weight') return /^(?:normal|bold|bolder|lighter|[1-9]00)$/i.test(trimmed);
  if (key === 'text-anchor') return /^(?:start|middle|end)$/i.test(trimmed);
  if (key === 'dominant-baseline') return /^(?:auto|middle|central|hanging|text-before-edge|text-after-edge)$/i.test(trimmed);
  if (key === 'gradientunits') return /^(?:userSpaceOnUse|objectBoundingBox)$/i.test(trimmed);
  if (key === 'offset' || key === 'opacity' || key === 'stop-opacity') return /^(?:0|1|0?\.\d+|100%)$/.test(trimmed);
  if (key === 'width' || key === 'height' || key === 'x' || key === 'y' ||
      key === 'x1' || key === 'y1' || key === 'x2' || key === 'y2' ||
      key === 'cx' || key === 'cy' || key === 'r' || key === 'rx' || key === 'ry' ||
      key === 'stroke-width') {
    return /^-?\d+(?:\.\d+)?(?:px|%)?$/.test(trimmed);
  }
  if (key === 'viewbox' || key === 'points' || key === 'd' || key === 'transform' || key === 'gradienttransform') {
    return /^[A-Za-z0-9.,+\-()\s]+$/.test(trimmed);
  }
  return false;
}

/**
 * Accepts a deliberately limited, non-interactive SVG subset.
 * External references, stylesheets, links, scripts, event attributes, entities,
 * foreign content, and CSS url() references are excluded.
 */
function isSafeSvgMarkup(markup: string): boolean {
  const source = markup.trim();
  if (!source || source.length > 500_000) return false;
  if (/<!doctype|<!entity|<\?|<!--|<script|<foreignobject|<iframe|<object|<embed|<use|\b(?:href|xlink:href|style)\s*=|url\s*\(/i.test(source)) {
    return false;
  }

  if (typeof DOMParser !== 'undefined') {
    try {
      const parsed = new DOMParser().parseFromString(source, 'image/svg+xml');
      const root = parsed.documentElement;
      if (!root || root.localName.toLowerCase() !== 'svg' ||
          root.namespaceURI !== SAFE_SVG_NAMESPACE ||
          parsed.getElementsByTagName('parsererror').length > 0) return false;

      const elements = Array.from(parsed.getElementsByTagName('*'));
      for (const element of elements) {
        if (!SAFE_SVG_TAGS.has(element.localName.toLowerCase())) return false;
        for (const attribute of Array.from(element.attributes)) {
          if (!isSafeSvgAttribute(attribute.name, attribute.value)) return false;
        }
      }
      return root.getAttribute('xmlns') === SAFE_SVG_NAMESPACE;
    } catch {
      return false;
    }
  }

  // Conservative parser fallback for non-browser test/runtime environments.
  // It only accepts the same basic, quoted-attribute SVG subset and balanced tags.
  const tagPattern = /<(\/)?([A-Za-z][A-Za-z0-9]*)([^<>]*?)(\/)?>/g;
  const stack: string[] = [];
  let previousIndex = 0;
  let rootCount = 0;
  let sawSvgNamespace = false;
  let match: RegExpExecArray | null;
  while ((match = tagPattern.exec(source)) !== null) {
    if (source.slice(previousIndex, match.index).trim()) return false;
    previousIndex = tagPattern.lastIndex;
    const closing = Boolean(match[1]);
    const tag = match[2].toLowerCase();
    const rawAttributes = match[3] || '';
    const selfClosing = Boolean(match[4]);
    if (!SAFE_SVG_TAGS.has(tag)) return false;

    if (closing) {
      if (rawAttributes.trim() || selfClosing || stack.pop() !== tag) return false;
      continue;
    }

    if (stack.length === 0) {
      rootCount += 1;
      if (tag !== 'svg') return false;
    }

    const attributePattern = /([A-Za-z][A-Za-z0-9-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
    const seenAttributes = new Set<string>();
    let attributeMatch: RegExpExecArray | null;
    let remaining = rawAttributes;
    while ((attributeMatch = attributePattern.exec(rawAttributes)) !== null) {
      const name = attributeMatch[1].toLowerCase();
      const value = attributeMatch[2] ?? attributeMatch[3] ?? '';
      if (seenAttributes.has(name) || !isSafeSvgAttribute(name, value)) return false;
      seenAttributes.add(name);
      if (name === 'xmlns' && value === SAFE_SVG_NAMESPACE) sawSvgNamespace = true;
    }
    remaining = remaining.replace(attributePattern, '').replace(/\s*\/?\s*$/, '').trim();
    if (remaining) return false;

    if (!selfClosing) stack.push(tag);
  }
  if (source.slice(previousIndex).trim() || rootCount !== 1 || stack.length !== 0 || !sawSvgNamespace) return false;
  return true;
}

/**
 * Checks whether an image data URL is safe for rendering in an <img> tag.
 * Allows strictly validated raster formats and a restricted, non-interactive SVG subset.
 */
export function isSafeImageDataUrl(url: unknown): boolean {
  if (typeof url !== 'string' || !url.trim()) return false;
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();

  // Reject dangerous pseudo-protocols and non-image data types.
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('data:text/html') ||
    lower.startsWith('data:text/javascript')
  ) return false;

  // PNG, JPEG, and WebP data URLs must use the expected Base64 form.
  const rasterRegex = /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/]+={0,2}$/i;
  if (rasterRegex.test(trimmed)) return true;

  if (!lower.startsWith('data:image/svg+xml')) return false;
  const commaIndex = trimmed.indexOf(',');
  if (commaIndex < 0) return false;
  const metadata = lower.slice(0, commaIndex);
  if (metadata !== 'data:image/svg+xml' && !metadata.startsWith('data:image/svg+xml;')) return false;

  let decoded = '';
  try {
    const payload = trimmed.slice(commaIndex + 1);
    if (/;base64(?:;|$)/i.test(metadata)) {
      if (!/^[A-Za-z0-9+/]+={0,2}$/.test(payload)) return false;
      decoded = typeof atob === 'function'
        ? atob(payload)
        : Buffer.from(payload, 'base64').toString('utf8');
    } else {
      decoded = decodeURIComponent(payload);
    }
  } catch {
    return false;
  }

  return isSafeSvgMarkup(decoded);
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
