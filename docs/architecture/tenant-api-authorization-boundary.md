# Trusted tenant API authorization boundary

## Purpose

`src/server/tenant-authorization.mjs` is the mandatory starting point for tenant API handlers. It establishes identity and tenant authority from server-controlled Firebase and Firestore records. It deliberately does not expose a tenant operational endpoint or enable client-side Firestore access by itself.

## Required request flow

1. Read the bearer token from the Authorization header.
2. Call `resolveTenantAuthorization` with the token, the requested organisation ID as a locator, the intended action, Firebase Admin Auth, and Firebase Admin Firestore.
3. The helper verifies the ID token with revocation checking enabled and confirms that the Firebase account is enabled.
4. It loads `organisations/{orgId}/members/{verifiedUid}` and `organisations/{orgId}` directly from Firestore. Token claims, browser state, request body role fields, and UI capability flags are not authority sources.
5. The shared RBAC engine validates the exact version-1 membership schema, active membership, active organisation, role/action permission, and any supplied resource-owner or assignment scope.
6. Only after authorization may the handler perform the operation. Resource-owner and assignment values must come from a server-loaded resource snapshot, never from request input.

Map `TenantAuthorizationError.status` and `.code` to a minimal API response. Do not return membership documents, internal policy details, or Firebase errors to clients.

## Role enforcement contract

- `tenant_super_admin`: full authority within one active PMC.
- `tenant_admin`: delegated PMC administration; cannot change organisation-level settings or promote to Super Admin.
- `tenant_manager`: operational work only; no membership administration or audit access.
- `tenant_employee`: own-record and assigned-task scope only; no reports export.
- `tenant_auditor`: read-only; no operational mutation or report export.
- `platform_owner`: not a tenant role. Platform actions continue through the separate `platformAdministrators/{uid}` authority boundary.

## Release boundary

The repository now contains server-side API/service foundations for tenant membership administration and invitations, personnel directory metadata, incident summaries, evidence metadata, assigned checklists, tenant audit events, and aggregate reports. The handlers use the trusted server authorization boundary, and resource-specific services re-check relevant permissions and tenant paths where applicable. These are implementation foundations, not a production release of authenticated tenant operations.

The default production Firebase configuration selects `firestore.production.rules`, which denies all client reads and writes. Candidate role-scoped rules remain in `firestore.rules` and are selected only by `firebase.emulator.json` for synthetic emulator validation. The authenticated tenant workspace and production tenant repository selection remain disabled. Evidence is metadata-only; no file upload, malware scanning, server-side hash verification, or chain-of-custody solution is provided.

Do not infer that a feature is released because an API route or policy catalogue exists. Production release still requires positive and negative emulator coverage, review of every resource query and mutation, browser integration/accessibility validation, and an explicit release decision. Membership and operational APIs do not by themselves authorise direct client Firestore access.

## Additional operational API slices (implementation batch)
The development branch now includes server-side API foundations for:
- Personnel operational directory metadata (`GET/POST/PATCH /api/tenant/personnel`), deliberately excluding sensitive personal and health information.
- Evidence metadata registration and listing (`GET/POST /api/tenant/evidence`), explicitly metadata-only and not a file upload or chain-of-custody solution.
- Assigned checklists (`GET/POST/PATCH /api/tenant/checklists`), with server-verified active employee assignment and employee status-only updates for their own assigned items.
- Aggregate operational reports (`GET/POST /api/tenant/reports`), returning counts only; export is permission-gated and audited.

These are API/service foundations, not completed UI integrations. Each remains subject to the same unexecuted validation and release gates. Tenant direct Firestore access, real evidence storage, employee personnel self-service, and production tenant repository selection remain disabled.

## Request-abuse controls and current limits

All JSON-mutating tenant and Platform Owner API routes enforce an application-level 64 KiB payload limit in the handler. The guard rejects an oversized Content-Length before reading the parsed body and checks the serialized parsed body as a fallback. This is not a streaming parser limit: the Vercel runtime may parse the body before handler invocation, and the hosting platform's function payload cap remains the upstream transport limit. Evidence registration remains metadata-only; the limit is not a file-upload allowance.

The application does not currently claim to provide distributed per-IP or per-account rate limiting. Vercel serverless instances do not share process memory, so an in-memory counter would be bypassable across instances and cold starts. Do not treat such a counter as a security control. A reliable limiter requires a shared atomic counter/store or an approved edge/WAF facility, plus a defined retention and privacy policy. Do not introduce a paid dependency or persistent Firestore counter writes under the current zero-cost constraint without a separate cost and abuse-resistance review.

Until a shared limiter is approved, monitor platform-level request usage and keep privileged routes authenticated, authorization-first, bounded-input, and generic in their error responses. This is a documented residual risk, not a claim that rate limiting is implemented.
