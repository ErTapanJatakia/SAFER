# ORG-03 — Invitation acceptance and canonical tenant membership

**Status:** server-side invitation acceptance implemented in draft branch; tests added but not run; organisation activation remains gated  
**Parent:** ORG-01/ORG-02 on `feature/org-01-tenant-onboarding`  
**Runtime:** Existing Vercel Node Functions + Firebase Admin SDK  
**Cost target:** INR 0 recurring infrastructure spend, subject to provider quotas

## 1. Required outcome

A nominated PMC Super Admin can accept an invitation only while authenticated as the exact Firebase UID named by the invitation. Acceptance must be idempotent, auditable, and atomic. It must not activate an organisation until the canonical membership schema, client resolver, and Firestore Rules agree.

## 2. Canonical identity and membership schema

Platform authority remains separate at `platformAdministrators/{uid}`. A PMC membership is stored only at:

`organisations/{orgId}/members/{uid}`

Canonical membership fields:

- `uid`: Firebase Auth UID; immutable.
- `orgId`: exact tenant ID; immutable.
- `role`: one of `tenant_super_admin`, `tenant_admin`, `tenant_manager`, `tenant_employee`, `tenant_auditor`.
- `status`: `pending_activation`, `active`, `suspended`, or `revoked`. The client resolver and membership-read Rules accept only `active`.
- `createdAt`, `createdByUid`, `updatedAt`, `updatedByUid`.
- `schemaVersion`: integer version for explicit migration and parser compatibility.

Do not add role, orgId, UID, or status authority from Firebase custom claims, browser state, email domain, local storage, or request bodies.

## 3. Invitation acceptance contract

Candidate endpoint: `POST /api/tenant/invitations/accept` (implemented in this draft branch). It accepts `{ "orgId": "...", "invitationId": "..." }`; the organisation ID is only a locator and both values are checked against server-loaded records.

The route must:

1. Accept only POST and require a Firebase ID token in the Authorization Bearer header.
2. Verify the token with revocation checking and require a non-disabled, email-verified Firebase Auth user.
3. Treat the supplied `orgId` only as a document-path locator and the `invitationId` as an opaque identifier; load the fixed invitation path server-side and verify both stored values. Never trust either field or a client-supplied role as authority.
4. Verify invitation status is pending, invited UID equals verified UID, normalized invited email equals the verified Auth email, role is exactly `tenant_super_admin`, and the organisation is still in the expected provisioning lifecycle.
5. In one Firestore transaction, re-read and validate the organisation, invitation, and any existing membership; create the canonical membership with `status: pending_activation`, mark the invitation accepted, update the organisation lifecycle stage, and append an immutable platform audit event.
6. Treat a retry by the same UID for an already accepted invitation as an idempotent success only when the existing membership exactly matches the accepted invitation. Reject conflicting, expired, revoked, mismatched, or duplicate invitations.
7. Never allow a caller to choose the resulting role or tenant.

Invitation IDs are now generated server-side from 32 random bytes (256 bits), stored as opaque document IDs, and expire after seven days. The invitation document is not addressable solely by an email address. The identifier is a locator, not a login credential; acceptance still requires the exact verified Firebase UID and matching verified email.

Acceptance also rejects invitations whose `invitedByUid` is not a valid Firebase UID. Super Admin acceptance replay validates the entire canonical membership field set, inviter UID, schema version, role/status and timestamp metadata before returning idempotent success; malformed or extra membership fields are treated as a conflict.

## 4.1 Pending invitation revocation

The tenant administration API exposes a separate authenticated endpoint: `POST /api/tenant/invitations/revoke`. It accepts an organisation locator, opaque invitation ID and bounded revocation reason. The server verifies the Firebase ID token with revocation checking, rejects disabled accounts, and authorizes the tenant actor against the canonical membership and active organisation.

The revocation service performs a permission preflight before reading the caller-supplied invitation ID, then rechecks the actor, organisation, invitation identity, role and pending state in the mutation transaction. Only invitations for assignable non-Super-Admin roles can be revoked. The invitation status update and tenant audit event are written in the same transaction. Accepted, expired-state, already-revoked, malformed and missing invitations are not mutated. A revoked invitation is rejected by the existing acceptance service because it no longer has `pending` status.

## 4.2 Platform Owner revocation of the initial Super Admin invitation

The initial organisation-provisioning invitation has a separate Owner-only endpoint: `POST /api/owner/organisations/invitations/revoke`. It requires a verified active Platform Owner principal and accepts the organisation locator, opaque invitation ID and a bounded revocation reason. The service verifies the organisation is still in `provisioning` at `super_admin_invitation_pending`, and verifies the invitation is the matching pending `tenant_super_admin` invitation.

One Firestore transaction marks the invitation `revoked`, moves the organisation to `suspended` with lifecycle stage `super_admin_invitation_revoked`, and appends a platform audit event. This is deliberately fail-closed: the generic registry cannot reactivate the revoked provisioning record. A replacement-invitation workflow is not yet implemented; a new nomination must not be simulated by editing the old invitation.

## 4. Activation gate

Acceptance and activation are separate states:

- Before acceptance: organisation `provisioning`, lifecycle `super_admin_invitation_pending`.
- After acceptance: organisation remains `provisioning`, lifecycle `super_admin_invitation_accepted`; membership exists with `pending_activation` and cannot pass the active-only client resolver or Firestore Rules.
- Activation is permitted only after the client membership parser, Firestore membership-read rule, tenant role permission functions, and server RBAC engine use the same five-role vocabulary and schema version.
- Activation and its platform audit event must be committed atomically.
- An organisation with no matching active `tenant_super_admin` membership must never be activated.
- Suspended or closed organisations cannot be activated through this flow.

Do not use the existing ORG-02 generic lifecycle endpoint to activate a provisioning organisation.

## 5. Compatibility work completed and remaining before activation

The candidate branch now updates `src/lib/tenantMembership.ts`, its tests, the Firestore self-membership read rule, and Firestore Rules test fixtures to accept only the canonical five tenant roles and exact version-1 membership schema. Legacy values are rejected. Client membership writes remain denied. Existing direct operational grants are limited to `tenant_super_admin` and `tenant_admin`; this is a conservative interim boundary, not full role parity. The server-side invitation acceptance endpoint and service create pending-activation memberships atomically, with replay protection and audit logging. A dedicated unit-test suite and package script have been added but not executed.

Remaining work before organisation activation and general tenant access:

- Implement and test Manager read scopes and constrained operational writes.
- Implement Employee own-record and assigned-checklist access with both server-side and Rules enforcement.
- Implement Auditor read-only access and explicit export denial.
- Wire the RBAC engine into every tenant API and data access path; never trust browser-supplied membership.
- Implement the separate audited organisation activation workflow only after the full role-to-operation matrix is enforced and tested.
- Keep Platform Owner access separate and purpose-bound for cross-tenant operational data.
- Review existing legacy membership fixtures and any real records before migration. Never automatically promote an unverified legacy role.
- Preserve deny-by-default behaviour for every unmodelled collection and field.

Suggested explicit migration mapping for individually reviewed records only:

| Legacy role | Canonical role | Migration condition |
|---|---|---|
| `owner` | `tenant_super_admin` | Confirmed organisation owner; never platform owner |
| `admin` | `tenant_admin` | Confirmed organisation administrator |
| `manager` | `tenant_manager` | Confirmed manager |
| `viewer` | `tenant_auditor` | Read-only intent confirmed; otherwise leave unmigrated for manual assignment |
| No legacy equivalent | `tenant_employee` | Assign explicitly from an authorised tenant administrator |

Migration must be a reviewed, auditable server-side operation. No client self-migration or privilege inference is permitted.

## 6. Non-goals and safety boundaries

- No Firestore Rules relaxation before the complete five-role matrix and emulator tests are ready.
- No membership creation through client SDK.
- No first-user-wins bootstrap or public Owner bootstrap endpoint.
- No use of real PMC data in the Vercel PoC.
- No Firebase/Vercel paid service activation or subscription change.
- No CI execution until the user requests the complete validation batch.

## 7. Acceptance criteria

- Invitation acceptance binds the exact verified Firebase UID and email.
- Duplicate/replayed acceptance cannot create duplicate or conflicting membership.
- Cross-tenant invitation substitution is rejected.
- Invitation, pending-activation membership, organisation lifecycle, and audit event cannot partially commit.
- Organisation activation is impossible before role-schema compatibility is complete.
- All five roles have regression coverage for both allowed and denied operations.
- Existing legacy roles are rejected by the new runtime until individually migrated.
- Firestore Rules remain default-deny outside explicitly reviewed paths.
