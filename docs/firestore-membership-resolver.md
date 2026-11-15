# Application tenant-membership resolver

**Status:** canonical schema resolver implementation; validation not yet run  
**Production posture:** production Firestore rules remain separately published deny-all  
**Data posture:** no operational Firestore writes, localStorage migration, or background sync

## Canonical tenant roles

The resolver accepts exactly five tenant-scoped roles: `tenant_super_admin`, `tenant_admin`, `tenant_manager`, `tenant_employee`, and `tenant_auditor`.

The platform-level `platform_owner` principal is stored separately under `platformAdministrators/{uid}` and is never a tenant membership role.

Legacy values (`owner`, `admin`, `manager`, `viewer`) are rejected. They must be migrated only through a reviewed, auditable server-side process; no role is inferred or silently upgraded.

## Versioned membership schema

The exact document at `organisations/{orgId}/members/{uid}` contains `uid`, `orgId`, `role`, `status`, `createdAt`, `createdByUid`, `updatedAt`, `updatedByUid`, and `schemaVersion: 1`.

The resolver requires matching authenticated UID and expected organisation ID, active status, one canonical tenant role, valid timestamp/provenance fields, and the supported schema version. Unexpected or missing fields fail closed.

## Behaviour and boundary

- Requires a non-empty authenticated Firebase UID.
- Accepts one organisation ID as a locator, never as an authorization token.
- Performs exactly one getDoc at `/organisations/{orgId}/members/{authenticatedUid}`.
- Returns an immutable minimal in-memory result.
- Does not query, discover, create, update, delete, persist, or cache membership data.
- Firestore Security Rules remain the authoritative access-control boundary.
- Membership client writes remain denied; only trusted server provisioning may create or change membership.
- Demo Guest sessions do not resolve or inherit authenticated membership.

## Current operational permission limitation

The canonical resolver and membership-read rule now recognize the five-role schema. Existing direct operational Firestore rules currently grant personnel, incident and evidence access only to `tenant_super_admin` and `tenant_admin`. Manager, Employee and Auditor access remains denied at this direct-client boundary until their record-level and query-level constraints are implemented and tested. This is intentionally restrictive and does not yet represent the complete RBAC permission catalogue.

No role in this resolver grants Platform Owner privileges or cross-tenant access.

## Validation

The emulator suite is updated for all five canonical roles, exact schema validation, legacy-role rejection, malformed fields, unsupported versions, and inactive membership. Tests have not been run at the user's request.

Production rules publication, invitation acceptance, membership activation, operational repositories, and legacy data migration remain separately gated.
