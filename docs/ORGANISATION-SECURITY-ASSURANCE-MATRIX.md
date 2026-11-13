# Organisation security assurance matrix

**Scope:** Organisation profile, membership resolution, tenant isolation, lifecycle policy, and audit boundaries  
**Environment:** Synthetic data and Firebase Emulator only  
**Release boundary:** Firebase Spark; INR 0; no production Rules/configuration changes  
**Validation status:** Test cases added or mapped; consolidated execution is intentionally pending

## Assurance matrix

| Control objective | Adversarial scenario | Enforcement point | Existing or added coverage | Expected result |
|---|---|---|---|---|
| Authenticated identity binding | Unauthenticated user requests tenant or membership data | Firestore Rules | tests/firestore-rules.test.mjs | Deny |
| Exact membership provenance | Membership UID, embedded UID, org ID, or parent organisation is mismatched | Firestore Rules + tenantMembership.ts | Firestore Rules and src/lib/tenantMembership.test.ts | Deny / resolver fails closed |
| Minimal membership schema | Extra keys, invalid role, inactive status | Firestore Rules + parser | Firestore Rules and parser tests | Deny |
| Self-only membership read | User reads another member or lists membership collection | Firestore Rules | Firestore Rules test | Deny |
| No client membership mutation | Every role attempts create, update, or delete | Firestore Rules | Existing denial test plus expanded role-by-role test | Deny for every role |
| No privilege escalation | User promotes self or another member to owner/admin | Firestore Rules | Expanded role-by-role test; pure policy tests are supplementary only | Deny |
| Tenant isolation | Tenant A member reads/writes tenant B organisation, membership, personnel, or incident records | Firestore Rules | New cross-tenant emulator test | Deny |
| Role separation | Manager/viewer attempt operational data access | Firestore Rules | Existing manager/viewer tests | Deny |\n| Explicit operation denials | Owner/admin attempt personnel or incident deletion, evidence create/update/delete, membership mutation, or audit read/write | Firestore Rules + capability matrix | Firestore Rules tests and organisation domain/UI tests | Deny; UI must display the denial |
| Organisation lifecycle | Suspended organisation or suspended/revoked membership is used | Firestore Rules | Existing suspended/revoked fixtures | Deny |
| Organisation metadata integrity | Client creates/updates/deletes organisation metadata | Firestore Rules | Existing organisation write denial test | Deny |
| Audit confidentiality and integrity boundary | Client reads or writes audit events | Firestore Rules | Expanded cross-tenant audit read/write test; existing same-tenant write denial | Deny |
| Restricted records | Client reads/writes private personnel or restricted incidents | Firestore Rules | Existing restricted-path tests | Deny |
| Operational record provenance | Client changes tenant ID, record ID, creator, reporter, or timestamps | Firestore Rules | Existing personnel/incident mutation tests | Deny |
| Invitation policy | Invalid digest, excessive expiry, terminal-state reuse, untrusted role | Pure policy model | src/lib/membershipLifecycle.test.ts | Reject; not authorization |
| Last-owner safety | Last active owner demoted, suspended, or revoked | Pure policy model | Existing lifecycle tests | Reject; trusted backend must enforce atomically |
| Audit envelope shape | Unknown event, extra field, malformed digest, invalid identifier; optional target omitted | TypeScript contract | src/types/organisationAudit.test.ts | Accept valid optional-field omission; reject malformed envelope |
| Audit chain linkage | Broken previous hash or time reversal | TypeScript contract | Existing audit contract tests | Reject malformed sequence; not proof of immutability |
| UI capability accuracy | UI conflates Rules-level permission with a released application workflow | UI/domain tests | Organisation workspace and capability tests | Label Rules permission separately; state that UI workflow is not released |

## Validation tiers

### Tier 1 — Emulator-enforced security

These tests are the release-critical authority for Firestore access. They must run against the exact candidate Rules file using the Firebase Emulator and rules-unit-testing. A pure TypeScript policy test is never a substitute for a Rules assertion.

Required negative cases include:
- Cross-tenant reads and writes across all tenant paths.
- Membership create/update/delete attempts by all four roles.
- Self-promotion and cross-user role promotion attempts.
- Audit-event read and write attempts.
- Missing, malformed, suspended, and revoked membership trust anchors.
- Suspended organisation access.
- Collection listing and unconstrained tenant queries.

### Tier 2 — Pure domain contracts

Lifecycle and audit tests validate deterministic input and transition handling. They do not authenticate a user, write Firestore, enforce concurrency, or establish trusted execution. Their passing status must not be described as proof of authorization or immutable audit storage.

### Tier 3 — UI and integration

Workspace/profile tests verify that the interface does not overstate capabilities, does not fetch organisation metadata for manager/viewer roles, and clears stale data across organisation/session changes. UI hiding is not an access-control boundary.

## Known gaps and explicit non-claims

1. No trusted server currently exists to issue/accept invitations or mutate membership documents.
2. Last-owner checks in the TypeScript policy are advisory; they are not atomic against concurrent changes.
3. Audit hashes are structurally checked only. There is no canonical hash calculation, signature, protected key custody, append-only writer, or tamper-proof guarantee.
4. Current manager/viewer roles do not have tenant operational read access in Firestore Rules. Do not describe them as read-only operational roles.
5. Emulator tests use synthetic fixtures and do not constitute a production penetration test or independent cloud configuration audit.
6. No production Firestore Rules deployment, tenant provisioning, or real operational-data migration is authorized by this matrix.

## Consolidated validation gate

At the next planned validation milestone:
1. Run type checking and the organisation domain/workspace/profile/lifecycle/audit suites.
2. Run test:tenant-membership and test:firestore-rules against the Firestore Emulator.
3. Run the full existing project CI once after the broader implementation batch is ready.
4. Review failures, correct the underlying design or implementation, and preserve each test's security intent. After three consecutive failures of the same strategy, stop repeating it and redesign or defer.
5. Do not merge if any required security gate fails. Do not deploy production Rules as part of this milestone.

## Evidence and maintenance

Update this matrix whenever Rules schema, tenant paths, membership roles, trusted provisioning, or audit design changes. Each row must continue to point to executable evidence or be explicitly marked as a documented limitation.
