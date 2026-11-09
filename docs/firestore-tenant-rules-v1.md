# Firestore tenant rules v1 — implementation and release boundary

**Status:** candidate implementation; emulator-tested before merge  
**Production posture:** the rules currently published in Firebase Console remain deny-all  
**Project:** `safer-2026`, default database in `asia-south1`  
**Cost boundary:** Firebase Spark only; no billing, Functions, Storage, Admin SDK credentials, or other paid services

This change introduces a conservative tenant authorization ruleset in the repository and a positive/negative emulator test suite. It does not deploy the candidate rules to Firebase, seed production records, connect application modules to Firestore, or migrate browser-local data.

## 1. Authorization trust chain

For tenant-scoped reads and writes, the rules require all of the following:

1. A signed-in Firebase Authentication user.
2. An existing membership at `/organisations/{orgId}/members/{request.auth.uid}`.
3. Membership `uid` and `orgId` matching the authenticated UID and path.
4. Membership `status == "active"`.
5. Organisation `orgId` matching the path and organisation `status == "active"`.
6. An explicit `owner` or `admin` role for operational collection access.

Role and status are read from the membership document, never from client payloads, UI state, email address, or email-verification status. Membership documents themselves remain unreadable and unwritable by clients. The organisation and membership records must be provisioned by a trusted operator outside this client ruleset.

## 2. Effective candidate permissions

| Path | Candidate client permission |
|---|---|
| `/users/{uid}` | User may get/create/update only their own minimal profile/preferences; delete and list denied |
| `/organisations/{orgId}` | Active owner/admin may get; list and all client writes denied |
| `/organisations/{orgId}/members/{uid}` | All client reads/writes denied |
| `/organisations/{orgId}/personnel/{recordId}` | Active owner/admin may get/list/create/update with strict allowlists; delete denied |
| `/organisations/{orgId}/incidents/{incidentId}` | Active owner/admin may get/list/create/update with strict allowlists; delete denied |
| `/organisations/{orgId}/evidence/{evidenceId}` | Active owner/admin read only; all writes denied |
| `personnelPrivate`, `incidentRestricted`, `auditEvents` | All client reads/writes denied |
| Every unmodelled path | Denied by catch-all |

Managers and viewers have no tenant Firestore access in this v1 candidate. Admin and owner permissions are identical for the two operational collections; neither can administer memberships or organisations from the client.

## 3. Field-level constraints in this release

### User preferences

Only `uid`, optional `displayName` (100 characters maximum), optional locale code, optional theme identifier, and creation/update timestamps are accepted. UID is path-bound and immutable. Creation and update timestamps are bound to Firestore `request.time`; the user cannot add role, membership, email, phone, or platform-admin fields.

### Personnel operational summary

The candidate accepts only the following keys: `recordId`, `orgId`, `employeeRef`, optional `displayLabel`, `operationalRoles`, `specialisations`, `assignmentSector`, `readinessStatus`, `requiresHumanReview`, and the four provenance timestamps/UID fields.

- Record ID and organisation ID must match the path.
- Employee reference is a non-empty string of at most 64 characters.
- Display label is at most 80 characters.
- Operational roles and specialisations are limited to 10 non-empty string entries each; each entry is length-bounded. Canonical vocabulary validation remains an application-level requirement because enumerating every current label in Rules exceeded Firestore's per-evaluation expression budget.
- Assignment sector and readiness status use the current TypeScript enum values.
- Creator UID and creation timestamp are immutable.
- Update UID and update timestamp must match the authenticated request.

The proposed `qualificationSummary` nested-object field from the schema document is intentionally **not enabled** in this first rules release. It needs its own strict nested-key/date/size validation and dedicated tests before it can be accepted. Full personnel records, direct identifiers, contact details, health particulars, blood group, addresses, employer details, work history, and notes remain excluded.

### Incident summary

The candidate accepts only the incident summary keys defined in `firestore.rules`: tenant/record identifiers, reference, incident type, date, title, status, priority, summary, reporter UID, optional coarse location label, and provenance metadata.

Incident type/status/priority are strict enums. Title, reference, summary, and optional location label have bounded lengths. Reporter UID must match the creator on create and cannot be changed later. Creator UID and creation timestamp are immutable. Update provenance must match the authenticated request.

Do not place raw narratives, witness information, medical details, detailed locations, people involved, unverified claims, or evidence bytes in this collection. Those belong to deferred restricted domains and are denied.

## 4. Query behaviour

Rules are not post-query filters. Personnel and incident list requests must constrain `orgId` to the organisation path value. The emulator suite checks a constrained query succeeds for an authorized owner and an unconstrained query fails. Collection-group access is not granted.

## 5. Provisioning and lifecycle boundary

This ruleset does not create organisations or memberships. No client can invite users, accept invitations, grant roles, reactivate membership, suspend/revoke membership, transfer ownership, or change organisation status. Those operations remain operator-controlled/deferred under the Spark-only architecture. A verified email address does not establish organisational authority.

The initial owner bootstrap remains a manual trusted-operator action using the verified Firebase Auth UID and a reviewed membership record. This is a manual trust control, not an automated immutable audit trail. If this process cannot be safely maintained, tenant access must remain disabled.

## 6. Emulator test coverage

The test suite includes positive and negative cases for:

- unauthenticated denial;
- own-profile allowlist and cross-user/privilege-escalation denial;
- active owner/admin permitted operations;
- manager/viewer denial;
- missing, suspended, revoked, and inactive-organisation denial;
- tenant ID and UID provenance spoofing;
- invalid enums and unexpected fields;
- immutable creator, reporter, tenant, and record identifiers;
- membership self-assignment denial;
- restricted collections and client audit-event denial;
- organisation write denial;
- constrained versus unconstrained tenant queries;
- evidence metadata read-only behaviour;
- deletion denial.

All test records are synthetic. Membership and organisation fixtures are inserted only through the emulator's rules-disabled test context.

## 7. Explicit release gate

**Do not publish these candidate rules to production merely because this PR merges.** Production Firestore currently has the separately published deny-all rules. Keep that posture until:

1. CI passes on the final PR commit;
2. the rules and positive/negative tests receive a security review;
3. query patterns and client integration are reviewed;
4. the trusted first-owner bootstrap procedure is ready;
5. a separate production release step is explicitly approved.

No application Firestore reads/writes, localStorage migration, background upload, Storage, Cloud Functions, Cloud Run, Admin SDK credentials, SMS, Analytics, or billing are introduced here. Existing localStorage records remain local.
