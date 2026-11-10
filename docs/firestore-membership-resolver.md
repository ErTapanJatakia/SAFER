# Application tenant-membership resolver

**Status:** resolver service, emulator-backed tests, and AuthGate UI integration implemented; stale-request handling covered by UI tests  
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
- AuthGate invalidates pending lookups when the organisation locator changes, the authenticated identity changes, or the user signs out.
- Demo Guest sessions do not resolve or inherit an authenticated user's membership.

## Security boundary

Firestore Security Rules remain authoritative. This helper is not an access-control bypass and does not grant access to operational collections. Every later Firestore operation must independently satisfy the published rules.

AuthGate now exposes the exact-membership verification flow for signed-in users. The verified membership is held in React session state only; it is not persisted as a role or reusable access token. This UI integration is not an operational data-access integration.

The application continues to use clearly labelled synthetic demonstration data. Operational records remain browser-local and are not yet tenant/account isolated. No real organisation data should be entered or migrated.

## Validation

The dedicated test suite uses synthetic fixtures and the Firestore Emulator to cover supported roles, unauthenticated calls, unsafe organisation locators, missing membership, inactive membership, unsupported roles, mismatched tenant IDs, and unexpected membership fields.

AuthGate UI tests cover Demo Guest isolation, exact authenticated UID/organisation membership lookup, generic denied-lookup handling, stale lookups after locator changes, account switching, and sign-out cleanup.

Run with:
- `npm run test:tenant-membership`
- `npm run test:auth-membership-ui`

Production rules publication, first-owner provisioning, operational repositories, and migration remain separately gated.
