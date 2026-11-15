# SAFER Firestore Security Rules tests

## Purpose and execution

The Firestore Local Emulator Suite is the required validation environment for security-rule changes. Tests use the non-production project ID `demo-safer` and load the repository's exact `firestore.rules` file. They do not connect to the production Firebase project.

Run locally with:

```sh
npm ci
npm run test:firestore-rules
```

The Firebase CLI starts the Firestore emulator, executes the Node test suite, and shuts the emulator down. Java 21 is required by the CI setup.

## Repository candidate policy

The checked-in `firestore.rules` is a conservative tenant-scoped **candidate ruleset**, not a deny-all ruleset and not proof of production deployment. Its current grants are:

- A signed-in user may get only their own `users/{uid}` profile and may create/update only the allowlisted profile fields bound to that UID. Profile listing and deletion are denied.
- A signed-in user may get only their own exact active membership document when its UID, organisation ID, role and parent organisation state match the requested path. Every tenant authorization decision also requires the exact membership key set (`uid`, `orgId`, `role`, `status`) and the exact active organisation key set (`orgId`, `displayName`, `status`, `schemaVersion`), including a bounded display name and schema version 1. Membership listing and all client membership mutations are denied.
- Only active `owner` and `admin` memberships may read the organisation metadata document and perform approved direct document gets and writes for personnel and incident records. Direct gets enforce exact field allowlists, path/document identity, bounded values, supported enums and expected types; create/update additionally enforce immutable creator/reporter provenance and server timestamps. Collection listing for personnel, incidents and evidence is explicitly denied until a separate schema-safe index design is approved.
- Owner/admin roles may directly get only an explicit metadata-only evidence envelope with bounded optional fields; unknown fields (including raw evidence URLs/storage paths) are denied. Evidence listing and create/update/delete are denied.
- `personnelPrivate`, `incidentRestricted`, and `auditEvents` deny all client access.
- Manager and viewer memberships can resolve their own minimal membership but receive no tenant operational-data access under this candidate policy.
- Organisation metadata writes, collection listing at the organisation root, membership list/create/update/delete, operational record deletion, and unmodelled paths remain denied.

The emulator suite includes positive and negative cases for profile ownership, owner/admin access, manager/viewer denial, missing/suspended/revoked membership, suspended organisations, malformed trust anchors (including extra membership/organisation fields, unsupported organisation schema versions and invalid display names), tenant/path/UID binding, immutable provenance, denied tenant collection queries pending a schema-safe index design, malformed stored-record direct-get denial for personnel/incidents/evidence, membership mutation attempts for every supported role, cross-tenant access, evidence restrictions, audit denial and restricted paths.

## Verified CI baseline

On exact commit `f02edc221066edab232902d5471dc790feebea88` (2026-11-15), the mandatory `validate` workflow passed. Its completed steps included:

- Firestore Security Rules Emulator tests;
- tenant membership resolver Emulator tests;
- organisation domain contract tests;
- organisation workspace and profile tests;
- membership lifecycle policy tests;
- organisation audit-envelope contract tests;
- DPDP governance/repository/casework tests;
- TypeScript type-check and production build.

This is CI evidence for that exact repository commit and candidate Rules file. Later commits require fresh checks. It is not a production penetration test, an independent Firebase Console configuration audit, or a deployment approval.

## Production and data boundary

The production Firebase Console rules remain separately published deny-all according to the repository's release-readiness audit. This repository candidate has **not** been authorised for production publication by this migration work. Do not infer production state from branch contents or PR merge status.

Passing emulator tests does not authorise production Rules publication, tenant provisioning, operational-data onboarding, or migration of browser-local records. Each requires a separate review and explicit approval. Keep synthetic emulator fixtures only; do not use client-controlled role state or profile fields as an authorization source.


## Candidate trust-anchor hardening — latest validation pending

A follow-up review identified that the earlier tenant authorization helper did not apply the exact membership and organisation document key/schema checks consistently to every authorization path. The candidate Rules now centralise those checks, and new emulator cases reject extra membership fields, extra organisation metadata, unsupported schema versions, and malformed display names before organisation metadata or operational access is granted.

The prior exact-head baseline above remains valid for `f02edc221066edab232902d5471dc790feebea88`. The additional trust-anchor changes and tests require a fresh mandatory CI pass on the current branch head before this follow-up can be considered validated.


## Stored-record read validation — follow-up pending CI

A further review closed the gap where a tenant-matching but malformed stored personnel, incident, or evidence document could pass the read rule despite carrying unexpected fields. Read rules now validate the stored document's exact key set and core schema before returning it. The evidence read path is restricted to an explicit metadata-only allowlist.

The emulator regression `tenant reads reject stored personnel, incident, and evidence documents with unapproved fields` has been added. The latest candidate changes require a fresh mandatory CI pass before being treated as validated.


## Query listing deferral — 2026-11-15

The strict stored-document schema checks use `resource.data.keys().hasOnly(...)`. Firestore Rules query authorization cannot establish this arbitrary per-document key-set predicate from an `orgId` equality filter. The earlier positive constrained-list test therefore failed with `permission-denied`. The candidate policy now explicitly denies collection listing for personnel, incidents and evidence while preserving schema-validated direct document gets and the existing create/update restrictions. This is an intentional fail-closed deferral, not a grant reduction hidden as a fix. A future listing capability must use a separately designed, minimal, fixed-schema index collection (or another reviewed safe query model), with its own positive/negative emulator coverage. No tenant operational repository is released in the current application, so this does not remove an active UI capability.
