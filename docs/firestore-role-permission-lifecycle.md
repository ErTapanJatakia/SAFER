# Firestore role-to-permission matrix and membership lifecycle

**Status:** proposed policy; documentation only  
**Applies to:** SAFER Firestore default database in `asia-south1`  
**Security posture:** production client rules remain default-deny

This document turns the authorization architecture into an explicit reviewable policy. It does not authorize client access, deploy rules, create membership records, migrate local data, or enable any paid Firebase product. The role names and permissions below are a proposed baseline and must be implemented and tested before they become effective.

## 1. Security invariants

1. Every request is authenticated. The Firebase Auth UID is the sole user identity key; an email address, display name, client-supplied role, custom UI state, or email-verification status is not authorization.
2. Every organisation-scoped request is bound to the organisation ID in the document path and to an authoritative membership document at `/organisations/{orgId}/members/{uid}`.
3. Membership must exist and have `status == "active"`. Missing, suspended, revoked, malformed, or ambiguous membership denies access.
4. A client cannot create its own membership, assign or increase its own role, reactivate itself, alter its UID binding, or grant platform-wide privileges.
5. The client cannot create or mutate authoritative audit events. A client-generated log is not a trustworthy security audit trail.
6. Production rules remain deny-all until the schema, rules, emulator tests, query behaviour, and deployment review are complete.
7. Operational data currently held in browser localStorage remains local. No automatic or background upload is permitted.

## 2. Proposed role vocabulary

Roles are scoped to one organisation. They are not Firebase custom claims and do not grant platform-wide authority.

- **owner** — accountable organisation authority. May administer organisation configuration and membership through a separately approved, controlled lifecycle process.
- **admin** — operational administrator. May manage ordinary organisation records but cannot appoint owners, transfer ownership, or administer platform-level settings.
- **manager** — operational contributor with constrained write access; cannot administer membership or organisation security settings.
- **viewer** — read-only access to explicitly approved, non-sensitive organisation data.

There is no client-assignable `platform_admin` role. Platform administration, if ever required, needs a separate trust and authorization design.

## 3. Proposed permission matrix

The table describes intended application capabilities, not currently deployed Firestore permissions. “Read” means both document get and list/query, subject to query constraints and field separation. “Create/update/delete” are document operations; field-level restrictions must be enforced with strict allowlists and immutable-field checks.

| Resource | Owner | Admin | Manager | Viewer |
|---|---|---|---|---|
| Own `/users/{uid}` profile/preferences | Read; update allowlisted self-service fields | Same | Same | Same |
| Other users' profile/preferences | No access by default | No access by default | No access | No access |
| Organisation profile/configuration | Read; update allowlisted non-security fields | Read; update allowlisted operational fields only | Read approved fields | Read approved fields |
| Membership documents | Read; lifecycle changes only through controlled procedure | Read minimal directory fields only; no role/status changes | No access by default | No access by default |
| Personnel records | Read/create/update/delete | Read/create/update/delete | Read/create/update; no delete | Read only |
| Incident records | Read/create/update/delete | Read/create/update/delete | Read/create/update; no delete or closure of restricted cases | Read only |
| Evidence metadata and references | Read/create/update/delete subject to evidence policy | Read/create/update/delete subject to evidence policy | Read/create; update only own draft metadata; no delete | Read approved metadata only |
| Evidence file bytes / attachments | Not enabled in this phase | Not enabled | Not enabled | Not enabled |
| Security audit events | Read only | Read only | No access by default | No access |
| Privacy requests / subject rights workflow | Not enabled for Firestore in this phase | Not enabled | Not enabled | Not enabled |
| Platform configuration / platform administration | No access | No access | No access | No access |

### Important interpretation and constraints

- The proposed manager permissions are intentionally narrower than owner/admin. Exact field-level editability for personnel and incident records must be defined before rules are written. Until then, treat manager writes as **not enabled**.
- Sensitive personal, health, identity, disciplinary, or otherwise restricted fields must not be placed in documents readable by broad roles. Firestore Rules cannot redact selected fields from a document returned to a client. Split restricted attributes into separately protected documents or keep them out of Firestore in this phase.
- Evidence file storage is out of scope. Do not add Firebase Storage or external upload services.
- Audit-event reads should be limited to owner/admin only. No browser client may write audit events and then represent them as immutable or authoritative.
- A viewer's access must not imply access to every field in a personnel, incident, or evidence document. Use separate documents for distinct confidentiality levels.
- Firestore list/query access must be designed so that the query itself proves the rules' constraints. Do not assume rules act as post-query filters.
- Deletes should be rare and governed by a retention/legal-hold policy. Until that policy exists, disable deletion for operational records even where the matrix marks it as a potential owner/admin capability.

## 4. Membership document contract

Proposed path: `/organisations/{orgId}/members/{uid}`.

Minimum fields to consider:
- `uid`: must equal the path UID.
- `orgId`: must equal the path organisation ID.
- `role`: one of `owner`, `admin`, `manager`, `viewer`.
- `status`: one of `active`, `suspended`, `revoked`.
- `createdAt`, `createdBy`, `updatedAt`, `updatedBy`: controlled metadata with server/trusted-operator provenance where possible.

Do not store an invitation token, password, secret, or unnecessary personal data in a membership document. Email addresses are not stable identity keys and must not substitute for UID binding.

Before implementation, define exact allowed keys, types, timestamp semantics, immutable fields, and who can change each field. A client must never be able to write `role`, `status`, `uid`, `orgId`, or provenance fields merely because it can edit its own profile.

## 5. Membership lifecycle and current safe operating model

| Lifecycle event | Proposed handling | Client self-service status |
|---|---|---|
| First owner bootstrap | A trusted project operator verifies the intended user's Firebase Auth UID, then seeds the first owner membership through a controlled, documented operator procedure. Record who performed the action and when. | Disabled |
| Invitation | Requires a secure, expiring, single-use invitation design bound to an organisation and intended identity. Email delivery alone is not proof of acceptance or authority. | Deferred |
| Acceptance | Authenticated user must prove possession of the invited identity and accept the exact organisation/role; membership becomes active only through a trusted, validated flow. | Deferred |
| Activation | Must be an explicit trusted transition; no user can activate their own pending/suspended/revoked membership. | Operator-only |
| Role change | Must be authorized by an existing owner through a controlled procedure; no self-promotion, no owner appointment by admin, and every change needs a traceable operator record. | Operator-only |
| Suspension | Trusted owner/operator action; suspension takes effect immediately when the authoritative membership status changes. | Operator-only |
| Revocation | Trusted owner/operator action; revoke membership without deleting audit context. | Operator-only |
| Owner transfer | Requires a separately reviewed transfer protocol that establishes the successor before removing the current owner and prevents accidental loss of all owners. | Deferred |
| Last-owner protection | Must be enforced by a trusted workflow or a rigorously tested atomic invariant. Do not rely on a client UI check. | Deferred |
| Account deletion | Revoke or review organisation memberships before account deletion; preserve records and audit obligations according to retention policy. | Deferred |
| Account recovery | Re-authentication or recovery of the same Firebase UID may restore sign-in, but must not automatically restore revoked membership or infer organisational authority. | Deferred |

### First-owner bootstrap: operator checklist

1. Confirm the organisation is legitimate and its accountable owner is authorized outside the application.
2. Have the intended person complete Firebase Authentication registration and email verification.
3. Obtain the UID from the trusted Firebase Console Authentication user record. Do not derive it from an email address or accept a UID supplied by the client.
4. Independently verify the UID and organisation ID before creating the membership document.
5. Create exactly one initial `owner` membership with `status: active`, matching `uid` and `orgId`, and record operator provenance in the approved operational record.
6. Review the resulting document and ensure no other user can create, alter, or elevate membership.
7. Keep a controlled record of the bootstrap action. Do not put credentials, tokens, or service-account keys in GitHub, browser code, or project documentation.

This is a manual operational control, not an automated or cryptographically attested audit trail. The console operator is part of the trust boundary. If the project cannot maintain this control safely, do not enable tenant access.

## 6. Lifecycle operations intentionally deferred

The following are not safe to implement as browser-only conveniences without a trusted transaction and abuse-resistant protocol:

- public self-service organisation creation that grants the creator owner authority;
- invitation issuance, token generation, redemption, expiry, replay protection, and email/identity binding;
- owner transfer and guaranteed last-owner protection;
- self-service role changes, membership reactivation, or account recovery that changes membership;
- authoritative audit logging of membership and sensitive-record changes;
- automatic deletion/retention workflows for privacy requests.

These flows remain deferred under the current Spark-only, no-Functions, no-Admin-SDK-credentials constraint. Do not add Cloud Functions, Cloud Run, paid infrastructure, or Admin SDK credentials to the client as a workaround. Revisit only after a separately approved architecture and pricing/security review.

## 7. Firestore Rules implementation gate

A future rules change must satisfy all of the following before any production deployment:

- Default-deny remains the catch-all for every unmodelled path and operation.
- Authenticated UID equals the membership document path UID; membership exists and is active.
- Role and status are read from the authoritative membership document, never from request data or client state.
- Organisation path, document `orgId`, and referenced tenant IDs are consistent.
- Each operation has a precise role check and field allowlist; immutable identity, tenant, creation, and provenance fields cannot be altered.
- Create/update validation checks exact key sets, types, lengths, ranges, enumerations, and timestamps.
- Users cannot read other users' private profiles or write membership documents.
- No client can create, update, or delete audit events.
- Queries are tested for satisfiability and cannot broaden access beyond the intended tenant or confidentiality class.
- Restricted fields are physically separated into documents with stricter read rules.
- Negative tests cover unauthenticated access, cross-tenant reads/writes, role escalation, self-reactivation, spoofed UID/org IDs, malformed fields, forbidden deletes, and audit forgery.
- Positive tests prove only the explicitly intended operations succeed for each role.
- Emulator tests run in CI against the exact rules file proposed for deployment.
- A security review checks the rules and tests together; only then may a separate PR propose deployment. Production rules stay deny-all until that review passes.

## 8. Required next implementation sequence

1. Review and approve this proposed matrix and lifecycle policy.
2. Freeze schemas and field classification for users, organisations, memberships, personnel, incidents, evidence metadata, and audit events.
3. Define manager field-level permissions and retention/deletion rules.
4. Design and test a controlled bootstrap/revocation procedure that can be operated without paid services.
5. In a separate change, implement tenant rules with positive and negative emulator tests.
6. Review query patterns and client integration without migrating real local data.
7. Only after explicit review, deploy rules and add opt-in migration for synthetic/test data first.

## 9. Scope of this change

This document is architecture and policy guidance only. It does **not**:
- modify `firestore.rules` or `firebase.json`;
- grant any production read/write permission;
- create or alter Firestore documents;
- add Firebase Storage, Cloud Functions, Cloud Run, Analytics, SMS, phone authentication, or billing;
- change localStorage behaviour or upload existing data;
- claim that browser-generated audit events are trustworthy.

Until a later, separately reviewed rules release, the published production Firestore rules must continue to deny all client reads and writes.
