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

This helper and its focused tests are an authorization foundation, not a release of operational tenant access. The API tree now includes tenant membership directory, invitation creation/acceptance, role assignment, and suspension endpoints. These routes use the trusted server authorization boundary or revalidate actor/target/organisation state inside a Firestore transaction. Tenant personnel, incident, evidence, checklist, report and audit APIs are now wired into this boundary. Employee personnel reads are limited to records explicitly linked to the verified employee UID; the personnel service and candidate Firestore Rules both constrain the query to that UID. The application data boundary still does not select a released authenticated tenant repository, and published production Firestore rules remain deny-all. Those release restrictions remain until the complete resource schema, query constraints, route-level authorization, and positive/negative emulator coverage have been reviewed and validated.

Do not infer that a feature is available because the policy catalogue lists its action. A route and data-store rule must both enforce it. Membership administration is the first implemented tenant API slice; its UI and invitation notification transport are not yet implemented.

## Additional operational API slices (implementation batch)
The development branch now includes server-side API foundations for:
- Personnel operational directory metadata (`GET/POST/PATCH /api/tenant/personnel`), deliberately excluding sensitive personal and health information.
- Evidence metadata registration and listing (`GET/POST /api/tenant/evidence`), explicitly metadata-only and not a file upload or chain-of-custody solution.
- Assigned checklists (`GET/POST/PATCH /api/tenant/checklists`), with server-verified active employee assignment and employee status-only updates for their own assigned items.
- Aggregate operational reports (`GET/POST /api/tenant/reports`), returning counts only; export is permission-gated and audited.

These are API/service foundations, not completed UI integrations. Each remains subject to the same unexecuted validation and release gates. Tenant direct Firestore access, real evidence storage, employee personnel self-service, and production tenant repository selection remain disabled.
