# Application tenant-membership resolver

**Status:** resolver service and emulator-backed tests implemented; UI integration remains separate  
**Production posture:** Firebase Console-published Firestore rules remain deny-all  
**Data posture:** no operational Firestore reads/writes, localStorage migration, or background sync

## Purpose

The resolver provides a narrow application-side way to validate a membership after a user has authenticated and has received an opaque organisation ID through an approved out-of-band process.

## Behaviour

- Requires a non-empty authenticated Firebase UID.
- Accepts one organisation ID as a locator; it is not a credential.
- Restricts the locator to one safe Firestore document-ID segment.
- Performs exactly one getDoc at /organisations/{orgId}/members/{authenticatedUid}.
- Accepts only the exact minimal fields uid, orgId, role, and status.
- Requires matching UID and organisation ID, active membership, and one supported role (owner, admin, manager, viewer).
- Returns an immutable minimal result in memory.
- Does not query, discover, create, update, delete, persist, or cache membership data.
- Fails closed with generic user-facing errors.

## Security boundary

Firestore Security Rules remain authoritative. This helper is not an access-control bypass and does not grant access to operational collections. Every later Firestore operation must independently satisfy the published rules.

The service is not yet wired into the authentication UI. Until that separate integration is reviewed, the app continues to operate in its clearly labelled synthetic demonstration mode. No real organisation data should be entered or migrated.

## Validation

The dedicated test suite uses synthetic fixtures and the Firestore Emulator to cover supported roles, unauthenticated calls, unsafe organisation locators, missing membership, inactive membership, unsupported roles, mismatched tenant IDs, and unexpected membership fields.

Run with: npm run test:tenant-membership

Production rules publication, first-owner provisioning, operational repositories, and migration remain separately gated.
