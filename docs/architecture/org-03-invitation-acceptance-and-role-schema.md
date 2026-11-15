# ORG-03 — Invitation acceptance and canonical tenant membership

**Status:** implementation contract; not yet wired to live tenant access  
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
- `status`: `active`, `suspended`, or `revoked`.
- `createdAt`, `createdByUid`, `updatedAt`, `updatedByUid`.
- `schemaVersion`: integer version for explicit migration and parser compatibility.

Do not add role, orgId, UID, or status authority from Firebase custom claims, browser state, email domain, local storage, or request bodies.

## 3. Invitation acceptance contract

Proposed endpoint: `POST /api/tenant/invitations/accept`.

The route must:

1. Accept only POST and require a Firebase ID token in the Authorization Bearer header.
2. Verify the token with revocation checking and require a non-disabled, email-verified Firebase Auth user.
3. Resolve the invitation from a server-controlled invitation identifier; never trust a client-supplied orgId or role as authority.
4. Verify invitation status is pending, invited UID equals verified UID, normalized invited email equals the verified Auth email, role is exactly `tenant_super_admin`, and the organisation is still in the expected provisioning lifecycle.
5. In one Firestore transaction, re-read and validate the organisation, invitation, and any existing membership; create the canonical membership, mark the invitation accepted, update the organisation lifecycle stage, and append an immutable platform audit event.
6. Treat a retry by the same UID for an already accepted invitation as an idempotent success only when the existing membership exactly matches the accepted invitation. Reject conflicting, expired, revoked, mismatched, or duplicate invitations.
7. Never allow a caller to choose the resulting role or tenant.

Invitation IDs must be opaque, high-entropy, server-generated values. The invitation document must not be addressable solely by an email address. A pending invitation is not a login credential.

## 4. Activation gate

Acceptance and activation are separate states:

- Before acceptance: organisation `provisioning`, lifecycle `super_admin_invitation_pending`.
- After acceptance: organisation remains `provisioning`, lifecycle `super_admin_invitation_accepted`; membership exists but is not yet usable for operational tenant access.
- Activation is permitted only after the client membership parser, Firestore membership-read rule, tenant role permission functions, and server RBAC engine use the same five-role vocabulary and schema version.
- Activation and its platform audit event must be committed atomically.
- An organisation with no matching active `tenant_super_admin` membership must never be activated.
- Suspended or closed organisations cannot be activated through this flow.

Do not use the existing ORG-02 generic lifecycle endpoint to activate a provisioning organisation.

## 5. Required compatibility work before activation

The current application has a legacy client resolver and Firestore membership-read rule that accept `owner`, `admin`, `manager`, and `viewer`. The canonical server RBAC engine rejects those legacy values and defines five tenant roles. This mismatch is a hard release blocker.

Required changes in one coordinated implementation batch:

- Update `src/lib/tenantMembership.ts` and its tests to accept only the canonical five tenant roles and the versioned membership schema.
- Update the exact-membership Firestore read rule to validate the canonical fields and five-role vocabulary without allowing client membership writes.
- Align every Firestore operational permission function with the approved role matrix. Do not leave a broad `owner/admin` shortcut that accidentally grants Manager, Employee, or Auditor access.
- Keep Employee record ownership and assigned-checklist constraints enforced server-side and in Rules where direct client access exists.
- Keep Auditor read-only and deny export/write operations.
- Keep Platform Owner access separate and purpose-bound for cross-tenant operational data.
- Review all existing legacy membership fixtures and any real records before migration. Never automatically promote an unverified legacy role.
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
- Invitation, membership, organisation lifecycle, and audit event cannot partially commit.
- Organisation activation is impossible before role-schema compatibility is complete.
- All five roles have regression coverage for both allowed and denied operations.
- Existing legacy roles are rejected by the new runtime until individually migrated.
- Firestore Rules remain default-deny outside explicitly reviewed paths.
