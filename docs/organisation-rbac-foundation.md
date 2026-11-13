# Organisation and RBAC foundation

**Status:** Domain contracts only; not enabled for tenant access  
**Parent:** Privacy Console safety hardening  
**Cost boundary:** INR 0; Firebase Spark only  
**Data boundary:** Synthetic development data only

## Delivered in this foundation

- A canonical organisation record and UID-keyed membership contract.
- Explicit organisation and membership lifecycle states.
- A conservative five-role vocabulary: owner, admin, manager, auditor, member.
- A single capability matrix for UI presentation and later policy review.
- Runtime role-shape validation and a narrow active-membership consistency helper.

The capability matrix is a user-interface hint only. It is not an authorization boundary and must not be used to authorize Firestore operations. A signed-in user receives no tenant access unless the authoritative membership document and Firestore Security Rules independently permit the requested operation.

## Security decisions

1. Firebase Authentication UID is the identity key. Email addresses are contact attributes and never membership identifiers.
2. Membership document ID must equal its `userId` and authenticated UID.
3. Membership is tenant-scoped and must be explicitly active. Invited, suspended, revoked, missing, and malformed membership grants no access.
4. No platform-wide super-admin role is exposed in client domain contracts.
5. Owner/admin membership assignment is not available to the untrusted client. Initial owner provisioning requires a separately reviewed trusted operator procedure.
6. No client self-service organisation creation, owner transfer, invitations, role escalation, or membership revocation is implemented here.
7. Audit events, personnel, incidents, evidence, and privacy records remain inaccessible through this model until the Firestore schema and per-operation rules are approved and emulator-tested.
8. No old SAFER-Remix Firebase project configuration, rules, IDs, or sample organisations are copied.

## Role capability baseline

| Role | Intended UI capability |
|---|---|
| Owner | Tenant governance and broad operational capability |
| Admin | Tenant administration and broad operational capability |
| Manager | Personnel and incident workflows; no membership management or operational export |
| Auditor | Read-only views and audit visibility |
| Member | Limited incident participation; no personnel, membership, audit, or export access |

This matrix is a starting product policy, not a final legal or operational authorization decision. Firestore rules must independently define allowed document paths, fields, and operations for each role. Sensitive fields may require separate documents because Firestore rules cannot redact fields from a returned document.

## Next implementation slices

1. Define and review a concrete Firestore document schema and field-level data classification.
2. Implement rule helper functions and explicit per-collection grants while keeping production access deny-all.
3. Build Firebase Emulator tests for unauthenticated access, missing/inactive membership, cross-tenant reads and writes, self-promotion, forged roles, invalid fields, query constraints, and immutable audit events.
4. Only after those gates pass, request separate approval for any production rules publication or tenant provisioning.
5. Design invitation and membership lifecycle without client-trusted role assignment.
6. Keep existing local Demo Guest records separate. No automatic localStorage-to-Firestore migration is permitted.

## Explicitly not implemented

- No Firestore reads or writes.
- No changes to `firestore.rules` or Firebase configuration.
- No production tenant creation, sign-in activation, or role assignment.
- No operational-record migration or synchronization.
- No claims of tenant isolation being active or guaranteed.
