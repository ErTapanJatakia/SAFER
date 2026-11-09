# ADR: self-service resolution of an explicitly supplied tenant membership

**Status:** proposed for review; not yet implemented  
**Scope:** application bootstrap and candidate Firestore authorization only  
**Production posture:** Firebase Console-published rules remain deny-all  
**Cost boundary:** Firebase Spark only; no Functions, Admin SDK, custom claims, paid services, or billing

## Context

The current candidate rules use the authenticated user's membership document as the authorization trust anchor, but deny every client read of `/organisations/{orgId}/members/{uid}`. The browser therefore cannot resolve whether the signed-in user belongs to a tenant. It also cannot discover an organisation ID because organisation listing is denied. Under the current Spark-only constraints, there is no trusted server component available to return tenant claims.

This is a genuine integration blocker. The application must not infer a tenant or role from localStorage, a profile document, an email address, an email-verification flag, UI state, or user-supplied role data.

## Decision proposed

Permit an authenticated user to **get exactly their own membership document**, but only when all of these conditions hold:

1. `request.auth.uid == uid`, where `uid` is the membership document ID.
2. The stored `uid` equals that path UID.
3. The stored `orgId` equals the parent organisation path.
4. The membership status is exactly `active`.
5. The membership role is one of the explicitly supported application roles: `owner`, `admin`, `manager`, or `viewer`.
6. The parent organisation exists, its stored `orgId` matches the path, and its status is exactly `active`.

The rule must grant **get only**. It must continue to deny membership list/query, create, update, and delete. A user cannot read another user's membership, enumerate members, or assign/change their own role.

The user supplies the opaque organisation ID through a controlled onboarding step (for example, an organisation administrator provides it out-of-band). The application performs a single document get at the exact path `/organisations/{suppliedOrgId}/members/{authenticatedUid}`. It must not perform a collection query or search across tenants. The opaque ID is a locator, not a credential: the membership rule remains the authorization boundary.

## Why this is the least-privilege option

- No tenant discovery or membership enumeration.
- No client-controlled provisioning or role lifecycle.
- No reliance on email matching or email verification as organisational authority.
- No server, Functions, Admin SDK, custom claims, or additional billing.
- The authenticated user sees only their own membership metadata.
- Operational reads and writes continue to be independently authorized by the existing tenant rules, which re-check membership and organisation state.

The membership document should contain only the minimum fields required for authorization and display: `uid`, `orgId`, `role`, and `status`. Do not add personal details, invitation secrets, credentials, or unnecessary profile data.

## Required emulator tests before implementation is accepted

Positive:
- Active authenticated user can get their own valid membership using the exact known organisation ID.
- Each supported role can read its own membership.
- Existing owner/admin operational permissions remain unchanged.

Negative:
- Unauthenticated user cannot get membership.
- Authenticated user cannot get another UID's membership.
- User cannot get a membership under a different tenant unless that exact membership exists for their UID.
- Membership list/query is denied, including when the caller knows the collection path.
- Membership create, update, and delete are denied, including self-role escalation.
- Missing, inactive, or mismatched parent organisation denies the get.
- Mismatched stored UID, mismatched orgId, inactive/revoked membership, or unsupported role denies the get.
- No role or tenant data is accepted from client-supplied profile fields or localStorage.

Tests must use synthetic fixtures and the Firestore Emulator. Do not weaken existing tests or production rules.

## Application integration boundary

A later, separately reviewed implementation may add a small tenant-resolution service that:
- requires a currently authenticated Firebase user;
- accepts an explicitly supplied opaque organisation ID;
- performs one exact membership `getDoc` for that user's UID;
- returns a typed, minimal membership result only after the read succeeds and fields are validated;
- clears in-memory tenant context on sign-out, auth-user change, failed lookup, or membership denial;
- never caches authoritative roles in localStorage or treats a cached role as authorization;
- never reads/writes personnel, incidents, evidence, or other operational data as part of this bootstrap step.

A successful membership read is not permission to bypass Firestore Security Rules. Every operational request must still be authorized by the rules. The application must fail closed when Firebase is unconfigured, the user is signed out, the org ID is absent, or membership resolution fails.

## Explicit non-goals

This ADR does not implement invitations, organisation discovery, owner bootstrap, membership lifecycle, role changes, owner transfer, account recovery, client provisioning, operational data repositories, localStorage migration, background sync, or production rules deployment.

## Release boundary

This proposal changes no rules and enables no production access. Before implementation:
1. Review this design against the current candidate rules and Firestore Rules get/list semantics.
2. Implement the narrow `get` rule and the full positive/negative emulator test matrix in a dedicated change.
3. Confirm the emulator suite, dependency audit, typecheck, production build, and Vercel preview pass on the final commit.
4. Independently review the exact diff.
5. Keep production rules deny-all until a separate, explicit production rules release is approved.

If a safe exact-document self-read cannot be demonstrated by emulator tests, do not proceed with browser-side tenant resolution under the current Spark-only architecture. Keep Firestore operational integration deferred rather than adding a weaker trust mechanism.
