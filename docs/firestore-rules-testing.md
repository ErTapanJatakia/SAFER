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
- A signed-in user may get only their own exact active membership document when its UID, organisation ID, role and parent organisation state match the requested path. Membership listing and all client membership mutations are denied.
- Only active `owner` and `admin` memberships may read the organisation metadata document and access the approved personnel and incident operations. Create/update operations enforce strict field allowlists, path binding, immutable creator/reporter provenance and server timestamps.
- Owner/admin roles may read evidence metadata, but evidence create/update/delete is denied.
- `personnelPrivate`, `incidentRestricted`, and `auditEvents` deny all client access.
- Manager and viewer memberships can resolve their own minimal membership but receive no tenant operational-data access under this candidate policy.
- Organisation metadata writes, collection listing at the organisation root, membership list/create/update/delete, operational record deletion, and unmodelled paths remain denied.

The emulator suite includes positive and negative cases for profile ownership, owner/admin access, manager/viewer denial, missing/suspended/revoked membership, suspended organisations, malformed trust anchors, tenant/path/UID binding, immutable provenance, constrained tenant queries, membership mutation attempts for every supported role, cross-tenant access, evidence restrictions, audit denial and restricted paths.

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
