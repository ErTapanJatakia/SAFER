# SAFER Firestore authorization architecture

**Status:** Proposed design; not an implementation approval  
**Scope:** Architecture and security boundaries for future tenant-scoped Firestore access  
**Baseline:** Firestore client access remains deny-all

## 1. Decision summary

SAFER will use Firebase Authentication UIDs as the immutable identity key and Firestore organisation membership documents as the authoritative source of tenant roles. A signed-in session alone does not grant access to operational records.

The client must never determine its own role from local state, profile fields, URL parameters, browser storage, or user-editable claims. Every future access decision must be enforced by Firestore Security Rules, not merely by UI visibility.

This document does not enable any reads or writes. The production rules remain default-deny until a separate implementation change and its emulator tests are reviewed.

## 2. Proposed document layout

```text
/users/{uid}
/organisations/{orgId}
/organisations/{orgId}/members/{uid}
/organisations/{orgId}/personnel/{recordId}
/organisations/{orgId}/incidents/{recordId}
/organisations/{orgId}/evidence/{recordId}
/organisations/{orgId}/auditEvents/{eventId}
```

- `users/{uid}`: minimal user-owned preferences/profile data only. The document ID must equal the authenticated UID. It is not an authority for organisation roles.
- `organisations/{orgId}`: tenant metadata. No client-supplied organisation ID may bypass membership checks.
- `members/{uid}`: authoritative membership state and role for that tenant. Document ID must equal the member's Firebase Auth UID.
- Operational collections: always nested beneath one organisation. No global client-readable operational collection is planned.
- `auditEvents`: append-only design is proposed; client writes are not enabled by this ADR.

Collection names and fields remain provisional until the schema and validation rules are reviewed.

## 3. Identity and membership invariants

1. Every authenticated identity is keyed by Firebase Auth `uid`, never email address.
2. A membership lookup is scoped to the exact organisation path and the authenticated UID.
3. Membership must be explicitly active; missing, pending, revoked, or suspended membership grants no access.
4. A client cannot create or modify its own role, membership status, organisation ownership, or privilege-bearing fields.
5. User profile fields never confer tenant access or platform-wide privileges.
6. No `platform-admin` role is accepted from client data, browser state, or a Firestore profile document.
7. Tenant identifiers and record ownership fields are validated against the path and authenticated identity, not trusted merely because the client supplied them.

## 4. Proposed least-privilege role vocabulary

The following is a starting vocabulary, not a final grant matrix:

| Role | Intended scope |
| --- | --- |
| `owner` | Tenant governance and membership oversight |
| `admin` | Approved tenant administration |
| `manager` | Operational workflows explicitly assigned to managers |
| `viewer` | Read-only access to explicitly approved records |

Permissions must be defined per collection and operation (get, list, create, update, delete). A broad role check such as "any active member can read/write everything" is not acceptable. Sensitive personnel, incident, evidence, and audit data may require narrower permissions than the general role.

## 5. Bootstrap and membership lifecycle

The first tenant owner is a critical trust anchor. With the current zero-cost constraint and no trusted server-side provisioning service, SAFER must not implement public self-service organisation creation that lets the creator write their own `owner` membership.

Initial bootstrap must be a controlled, documented operator action outside the untrusted client (for example, a carefully reviewed Firebase Console seed using a verified UID). The process must verify the UID from Firebase Authentication, record the organisation identifier and intended owner, and preserve an auditable change record. Do not put credentials or service-account keys in the repository or browser.

Invitations, role changes, suspensions, revocations, owner transfer, and recovery require explicit lifecycle design. Until that design is implemented and tested, membership writes remain denied to application clients. Do not imply that email verification alone proves authority to join an organisation.

## 6. Firestore Rules design requirements

A future rules implementation must:

- deny by default and use explicit per-path, per-operation grants;
- validate authentication and active membership using authoritative membership documents;
- bind membership document IDs to `request.auth.uid`;
- prevent clients from creating or escalating owner/admin/platform privileges;
- enforce immutable fields and strict allowed-key/type/range validation on create and update;
- enforce tenant path consistency and prevent cross-tenant references;
- constrain list/query access so rules are satisfiable by the query; rules do not filter result sets;
- reject unapproved collection-group or root-level access;
- use `request.time` for trusted server timestamps where applicable;
- keep audit events immutable to ordinary clients;
- include negative tests for missing membership, inactive membership, wrong tenant, forged role, changed owner UID, invalid fields, query bypass, and privilege escalation.

Firestore Security Rules cannot redact selected fields from a document. If a user must not see a sensitive field, that field must be stored in a separately protected document or otherwise excluded from the data returned to that user. UI redaction is not an authorization control.

## 7. Zero-cost and deployment constraints

- Remain on Firebase Spark; do not attach a billing account.
- Do not introduce Cloud Functions, Cloud Run, Admin SDK credentials in the client, Storage, SMS, or paid services.
- Firebase web configuration is public client configuration, not a secret; authorization belongs in Rules.
- If a required lifecycle operation cannot be implemented securely with the approved Spark-compatible design, defer that operation rather than weakening authorization or introducing an unapproved paid dependency.
- Production rules remain deny-all throughout architecture and implementation preparation.

## 8. Data migration and local data boundary

Existing personnel, incidents, checklist, and related operational data remain in browser `localStorage`. Authentication does not make that data tenant-isolated. No automatic migration, background sync, or upload is permitted.

A later migration must be explicit and opt-in, show the destination organisation, validate and preview records, preserve export and redaction behaviour, handle duplicate/conflicting records, and require a deliberate user confirmation. Only synthetic data may be used in development until the complete authorization model is deployed and independently reviewed.

## 9. Required implementation sequence

1. Review and freeze the collection schema, role/capability matrix, and membership lifecycle.
2. Specify the controlled first-owner bootstrap and recovery procedure.
3. Implement rules in a separate change while retaining default-deny for all unapproved paths.
4. Add emulator tests for positive access and the negative cases in section 6; test queries and cross-tenant isolation.
5. Review rules and tests before any production publication.
6. Add client data access only after the rules are deployed and verified.
7. Implement opt-in migration only after access control and data validation are complete.

Passing the current deny-all baseline tests is not evidence that tenant authorization is ready. A future test suite must prove both allowed and denied cases against the intended policy.

## 10. Explicit non-goals

This ADR does not implement tenant creation, membership management, roles in the UI, Firestore reads/writes, operational data migration, audit-event writes, or platform administration. It does not change `firestore.rules` or the production Firebase project.
