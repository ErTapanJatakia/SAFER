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
- Owner/admin memberships trigger one exact read of `organisations/{orgId}` for profile metadata. Manager/viewer roles never issue that metadata read.
- The profile reader validates the organisation ID against the verified membership, active status, display-name bounds, and schema version; malformed, missing, and unavailable profiles fail closed without cached/inferred data.
- `AuthGate` renders the panel only for a membership verified in the current in-memory session. Changing the organisation locator or crossing an authentication/session boundary clears the membership result.
- Focused regression suites are registered as `test:organisation-workspace` and `test:organisation-profile`; they have been added but not yet executed.

## Next implementation slices

1. [x] Add a safe, read-only organisation profile view for roles whose current Rules permit the exact organisation document read; do not query metadata for manager/viewer.
2. [x] Define a pure membership lifecycle policy and a structural audit-event contract without enabling writes.
3. [x] Record the trusted provisioning decision in `docs/TRUSTED-ORGANISATION-PROVISIONING-ADR.md`: manual project-owner administration is the only approved Spark-era provisioning path; no client mutations or unassessed third-party backend.
4. [x] Add the organisation security assurance matrix and expand emulator coverage for cross-tenant reads/writes, all-role membership mutation attempts, cross-user role changes, and audit-event read/write denial. See `docs/ORGANISATION-SECURITY-ASSURANCE-MATRIX.md`. Tests are added but intentionally not executed before the consolidated validation milestone.
5. [x] Assess the current execution options against the zero-cost and trust requirements. No alternative provider is approved; retain manual owner-operated provisioning unless a future provider passes every ADR gate.
6. [ ] Only after review and separate approval, consider production rules changes or tenant provisioning.
7. Keep operational localStorage records separate until an explicit, reviewed migration workflow exists.

## Explicitly not implemented

- No Firestore writes, membership mutations, or operational-record reads/writes are added by this slice. The only new Firestore read is the exact organisation metadata `get` for an already-verified active owner/admin membership.
- No changes to `firestore.rules` or Firebase configuration.
- No production tenant creation, role assignment, or membership mutation.
- No operational-record migration or synchronization.
- No claim that every Remix RBAC screen or workflow has been migrated.

## Membership lifecycle policy model (not enabled)

A pure, non-persistent policy model has been added in `src/lib/membershipLifecycle.ts`. It describes safe future transitions without creating invitations, changing membership documents, or granting client write access.

- Invitation states are `draft`, `issued`, `accepted`, `expired`, and `revoked`; terminal states cannot be reused.
- Invitation metadata accepts a SHA-256 token digest only (never a raw token), binds the invitation to an organisation, invited email, inviter UID, and non-owner role, and caps validity at seven days.
- Acceptance requires a separate trusted service to authenticate the recipient and verify the token digest and verified email. The client-side transition helper is not proof of either.
- The advisory membership policy forbids self-modification, client owner assignment, admin management of owners/administrators, reactivation of revoked memberships, and removal/demotion/suspension of the final active owner.
- Owner bootstrap/transfer, invitation issue/accept, membership writes, and append-only audit events are explicitly reserved for a trusted authority. No such authority is implemented in this slice.
- The model is not authorization. Existing Firestore Rules remain unchanged and continue to deny membership writes and audit access.

Regression tests are registered as `test:membership-lifecycle`; they have been added but intentionally not executed before the consolidated validation milestone.

## Immutable audit-event contract (not enabled)

A minimal envelope and chain-link verifier now live in `src/types/organisationAudit.ts`. The contract allowlists membership and organisation-profile event names, rejects unexpected fields, bounds identifiers, requires SHA-256-shaped event digests, and checks previous-hash continuity and non-decreasing timestamps across a supplied sequence.

This is structural validation only: it does not calculate canonical hashes, verify signatures, guarantee ordering under concurrent writers, or make client storage immutable/tamper-proof. A future trusted backend must own append-only writes, canonical serialization, signing/key custody, retention, access controls, and emulator-backed negative tests. Current Firestore rules still deny audit reads and writes. The regression suite is registered as `test:organisation-audit-contract` and has not been executed.


## Trusted provisioning decision

The current Firebase Spark configuration has no trusted application execution service. The approved interim model is manual, project-owner-controlled provisioning through the Firebase administration plane, documented in `docs/TRUSTED-ORGANISATION-PROVISIONING-ADR.md`. The client remains read-only for organisation membership and audit events. No provider, privileged credential, Firebase plan, Rules, or production tenant configuration was changed by this decision.


## Security assurance status

The assurance matrix maps Firestore Rules, tenant membership resolution, lifecycle contracts, audit-envelope validation, and UI capability claims to their evidence. New emulator scenarios cover cross-tenant access and attempted membership mutations by every supported role, including cross-user role changes. This is test coverage authored, not test execution: no result is claimed until the consolidated emulator/CI milestone.
