# IAM-03 — Tenant isolation and data-boundary enforcement

**Status:** Candidate source policy and server authorization foundations implemented; production rules publication and operational workspace release remain blocked.

## Enforced tenant identity

- Tenant identity is resolved from a revocation-checked Firebase ID token and the authoritative document path `organisations/{orgId}/members/{verifiedUid}`.
- The membership must match the verified UID and requested organisation ID, have the exact version-1 schema, an approved tenant role, and active status.
- The organisation document must match the requested ID and be active.
- Request body roles, Firebase custom claims, local storage, UI flags and organisation URL parameters are not authority sources.
- Tenant APIs use the shared `resolveTenantAuthorization()` boundary before invoking Firebase Admin SDK services. Admin SDK operations require this explicit check because Admin SDK bypasses Firestore Rules.

## Candidate Firestore policy

The checked-in `firestore.rules` independently enforces:
- exact UID + organisation membership binding;
- active membership and active organisation state;
- per-role collection permissions;
- strict field allowlists and immutable tenant/creator/reporter provenance;
- query constraints for tenant-scoped list operations;
- deny-only treatment for restricted collections, client membership writes, audit writes, and unmodelled paths.

The source policy is not the production policy. Production remains deny-all pending a separate approval.

## Regression coverage in source

`tests/firestore-rules.test.mjs` uses the Firebase Local Emulator Suite with synthetic fixtures. It covers unauthenticated denial, membership/organisation suspension, five-role read/write boundaries, self-membership resolution, member-directory restrictions, schema/provenance validation, query constraints, and restricted/default-deny paths.

This batch adds explicit cross-tenant tests proving a user with membership in PMC A cannot read, query, or write PMC B, and cannot access platform or unmodelled collections.

## Remaining release gates

1. Run the Firestore emulator suite and review the complete output.
2. Review every Admin SDK endpoint for an authorization check before the first tenant-data operation.
3. Review the operational application repository boundary and confirm no browser-local data is exposed as authenticated tenant data.
4. Compare the exact candidate rules against the separately published production rules; do not publish them as part of this feature branch.
5. Obtain explicit approval for any production rules change and production tenant-data activation.

No production rules or live data are changed by this milestone.
