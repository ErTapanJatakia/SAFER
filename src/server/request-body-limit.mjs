const DEFAULT_MAX_BODY_BYTES = 64 * 1024;

/**
 * Enforce an application-level limit on JSON payloads handled by Vercel
 * Node.js Functions. Content-Length is checked before touching req.body;
 * parsed payload size is checked as a fallback when the header is absent.
 *
 * This is not a streaming parser limit: the hosting runtime may parse the
 * body before invoking this handler. The platform's own function payload
 * limit remains the upstream transport safeguard.
 */
export function isRequestBodyTooLarge(request, maxBytes = DEFAULT_MAX_BODY_BYTES) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) return true;
  const contentLength = request?.headers?.['content-length'];
  if (contentLength !== undefined) {
    const raw = Array.isArray(contentLength) ? contentLength[0] : contentLength;
    if (typeof raw !== 'string' || !/^\d+$/.test(raw)) return true;
    if (Number(raw) > maxBytes) return true;
  }

  let body;
  let serialized;
  try {
    // Vercel's request.body helper may throw while parsing malformed JSON.
    body = request?.body;
    if (body === undefined || body === null) return false;
    serialized = typeof body === 'string' ? body : JSON.stringify(body);
  } catch {
    // Reject unreadable payloads before route code can access the body again.
    return true;
  }
  if (typeof serialized !== 'string') return true;
  return Buffer.byteLength(serialized, 'utf8') > maxBytes;
}

export { DEFAULT_MAX_BODY_BYTES };
