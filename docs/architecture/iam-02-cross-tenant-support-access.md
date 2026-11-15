# IAM-02 — Purpose-bound Platform Owner cross-tenant access

**Status:** Scoped aggregate read/export API implemented on `feature/iam-02-04-completion`; raw tenant-record browsing and cross-tenant writes remain deliberately unavailable.

## Authority chain

Every request to `/api/owner/tenant-data` must satisfy all of the following:

1. A fresh Firebase ID token passes revocation checking.
2. The Firebase Auth account is enabled and email-verified.
3. The authoritative `platformAdministrators/{uid}` record is active and matches the verified UID.
4. The one-time `platform/settings` bootstrap pointer agrees with that UID.
5. The supplied support session belongs to that same Owner, is active and unexpired, is bound to the requested active PMC, and contains the exact requested action.
6. The session purpose and change/ticket reference were required when the session was created.

The session identifier is supplied in the `X-Support-Session` header, not in a URL or response log. The endpoint returns `Cache-Control: no-store`.

## Implemented operations

| Request | Required support scope | Result |
|---|---|---|
| `GET /api/owner/tenant-data?orgId=...` | `platform:tenant-data:read` | Aggregate counts for members, personnel, incidents, evidence metadata and checklists |
| `POST /api/owner/tenant-data` with `orgId` | `platform:tenant-data:export` | Same minimized aggregate summary, suitable for controlled export |

No raw personnel, incident, evidence, checklist or membership document content is returned. No health data, personal identifiers, evidence payloads or invitation secrets are exposed by this API.

## Audit behaviour

- The support-session helper writes an authorization event transactionally with the session/organisation state check before the data operation.
- A successful summary read or export writes a separate completion event with actor, target PMC, purpose, change reference and minimized scope.
- If the data read or completion audit fails, the endpoint returns no summary. The authorization event remains the durable evidence that the access attempt was authorized.
- Ordinary tenant users cannot read or mutate the platform audit collection under the candidate Firestore rules.

## Explicit limits

- The `platform:tenant-data:write` scope has no consuming data endpoint yet. Do not treat the ability to create a write-scoped session as permission to perform an operation.
- No generic Firestore path/document browser is provided.
- No impersonation, raw-record export, cross-tenant query, or arbitrary mutation endpoint is provided.
- A future write operation must be a named, schema-validated business operation with resource-level authorization and before/after audit metadata; do not add a generic Admin SDK write proxy.
- This development API is not a production release. No production Firestore rules, real tenant records, deployment or paid service configuration is changed.
