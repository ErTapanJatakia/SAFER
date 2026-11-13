# Organisation and RBAC implementation baseline

**Status:** Domain/UI contracts only; existing Firestore Rules remain authoritative  
**Parent:** Privacy Console safety hardening  
**Cost boundary:** INR 0; Firebase Spark only  
**Data boundary:** Synthetic development data only

## Current SAFER implementation discovered

SAFER already contains a substantial tenant authorization foundation. This migration must extend that implementation rather than introduce a parallel Remix-shaped model:

- `src/lib/tenantMembership.ts` resolves one exact membership document at `organisations/{orgId}/members/{uid}`.
- Membership parsing requires the exact minimal fields `uid`, `orgId`, `role`, and `status`, and binds UID and tenant ID to the authenticated context.
- Current roles are `owner`, `admin`, `manager`, and `viewer`.
- `firestore.rules` is default-deny and currently grants operational collection access only to active owner/admin memberships.
- Membership list/create/update/delete, evidence writes, private personnel, restricted incidents, and audit event access remain denied.
- Existing emulator-backed suites are registered as `test:firestore-rules` and `test:tenant-membership`.

The current UI capability map in `src/types/organisation.ts` deliberately mirrors only the grants that exist today. It is presentation metadata, not authorization.

## Domain contracts added

- Canonical organisation metadata contract aligned to the current `orgId`, `displayName`, `status`, and `schemaVersion` fields.
- Minimal membership contract aligned exactly to the current Rules schema.
- Role vocabulary and UI capability hints aligned with the existing tenant membership resolver and Rules.
- Runtime role validation and a narrow membership provenance helper.

No Remix sample organisation names, old Firebase IDs, or alternate role vocabulary are carried over.

## Security boundaries retained

1. Firebase Authentication UID is the identity key. Email is not a membership identifier.
2. Membership document ID, `uid`, authenticated UID, and requested tenant must agree.
3. Membership must be active and the organisation must be active.
4. A role shown in the client is never sufficient to authorize a Firestore operation.
5. No client-side membership creation, role assignment, owner transfer, invitation, or revocation.
6. No production rules publication, tenant provisioning, or operational-record migration.
7. No local Demo Guest data is synchronized or uploaded.
8. Firestore rules remain the only authorization authority; any future grants require emulator-backed negative and positive tests.

## Read-only workspace context implemented

- `OrganisationWorkspacePanel` displays the exact verified organisation ID and current role after the existing exact-membership resolver succeeds.
- The panel presents a role capability preview aligned to the existing Rules model. Manager/viewer currently receive no tenant operational capabilities.
- Membership administration and audit-event access are explicitly shown as unavailable for every role.
- The panel states that authenticated operational workspace access is not released and that its capability preview is informational only.
- `AuthGate` renders the panel only for a membership verified in the current in-memory session. Changing the organisation locator or crossing an authentication/session boundary clears the membership result.
- Focused UI regression coverage is registered as `test:organisation-workspace` and has been added but not yet executed.

## Next implementation slices

1. Add a safe, read-only organisation profile view for roles whose current Rules permit the exact organisation document read; do not query metadata for manager/viewer.
2. Design membership lifecycle and trusted owner bootstrap without client-side privilege assignment.
3. Extend emulator coverage for cross-tenant queries, role mutation attempts, membership lifecycle, and immutable audit-event policy.
4. Only after review and separate approval, consider production rules changes or tenant provisioning.
5. Keep operational localStorage records separate until an explicit, reviewed migration workflow exists.

## Explicitly not implemented

- No Firestore reads/writes added by this domain contract.
- No changes to `firestore.rules` or Firebase configuration.
- No production tenant creation, role assignment, or membership mutation.
- No operational-record migration or synchronization.
- No claim that every Remix RBAC screen or workflow has been migrated.
