# IAM-01: Platform Owner identity and first-owner bootstrap

**Status:** implementation readiness decision; runtime activation blocked pending a trusted server boundary  
**Milestone:** IAM-01  
**Baseline:** `main` after ARCH-01  
**Production posture:** Firebase production Firestore rules remain deny-all  
**Cost constraint:** retain Firebase Spark and existing Vercel Hobby unless a separately approved cost review says otherwise

## 1. Decision

SAFER must not infer Platform Owner authority from Firebase Authentication sign-in, a verified email, a tenant membership, a profile field, browser storage, a route, or a request parameter.

The Platform Owner is a distinct platform principal. A PMC's `tenant_super_admin` is authoritative only inside that PMC. The existing tenant role `owner` is a legacy/candidate tenant role and must never be treated as `platform_owner`.

**IAM-01 will not add a browser-side Owner flag or make Firestore rules trust a client-supplied role.** The repository currently has no trusted application API, no Firebase Admin SDK dependency, and no configured server-side owner identity. Adding a client-only check would create a cosmetic gate, not an authorization boundary.

## 2. Repository facts established by the IAM-01 audit

- `src/lib/firebase.ts` initializes only the Firebase Web SDK (Auth and Firestore).
- `src/components/AuthGate.tsx` verifies Firebase identity and optionally resolves one exact tenant membership. It does not establish platform authority.
- `src/lib/tenantMembership.ts` accepts only the tenant roles `owner`, `admin`, `manager`, and `viewer`; it rejects `platform-admin`.
- `firestore.rules` contains candidate tenant rules and an exact-self membership read. It does not grant a platform-wide Owner path.
- The catch-all Firestore rule denies every unmodelled path, including `/platform/**`.
- The checked-in rules are not evidence of the rules deployed in Firebase Console. Existing release documentation says production rules remain deny-all.
- No `firebase-admin`, `setCustomUserClaims`, API route, or server-side identity verifier was found in the reviewed repository paths.
- The current bootstrap runbook creates a first **organisation owner** membership manually. It does not provision a SAFER Platform Owner.

## 3. Required trust model

The following must be true before any Owner Control Centre or cross-tenant data access is enabled:

1. Firebase Authentication supplies the UID and a verifiable ID token; it does not supply platform authority by itself.
2. A trusted server-side component verifies the ID token using the Firebase Admin SDK.
3. The initial Platform Owner UID is explicitly provisioned out-of-band by the application owner. It is never selected by first-user-wins, email-domain matching, or public registration.
4. The trusted provisioning operation grants the platform role only to that pre-approved UID. No browser client, tenant administrator, or ordinary API request can grant or modify it.
5. Every privileged endpoint independently verifies the token and the active platform principal before performing any privileged operation.
6. Direct Firestore access remains separately controlled by Firestore Security Rules. An Admin SDK endpoint bypasses those rules and must enforce authorization itself.
7. Tenant Super Admin authorization is resolved from the exact tenant membership and cannot satisfy the platform-owner check.
8. Revocation removes the authoritative platform principal and invalidates/revokes sessions or claims as appropriate. Stale tokens must not preserve privileged access beyond the documented revocation window.
9. Recovery requires an out-of-band operator procedure with identity verification and evidence. Account recovery must not recreate a revoked platform principal automatically.
10. All Owner access to client records is purpose-bound, time-limited where applicable, and audited. The global capability does not imply routine access.

## 4. Recommended implementation shape

Subject to the cost and secret-management gate below, the preferred zero-new-hosting-cost candidate is a Vercel Node.js serverless API in the existing Vercel project, using the Firebase Admin SDK with server-only credentials.

Proposed trust inputs (names are design placeholders, not configured environment variables):

- `FIREBASE_SERVICE_ACCOUNT_JSON`: service-account credential held only as a protected Vercel server environment variable; never exposed through `VITE_*`, committed, logged, or returned to the browser.
- `SAFER_PLATFORM_OWNER_UID`: the one explicitly approved Firebase Auth UID used for initial bootstrap; never an email address and never supplied by the browser.

Implementation constraints:

- Use a dedicated least-privilege service identity where Firebase supports the required Admin operations; do not casually reuse a broad personal credential.
- Restrict bootstrap to a one-time, authenticated, operator-controlled operation. Require a server-side secret/operational gate in addition to the preconfigured UID; do not expose a public endpoint that accepts an arbitrary UID.
- Set a minimal trusted platform claim (for example, `platformRole: "platform_owner"`) only from the server after checking the approved UID and current provisioning state.
- Verify the claim and current platform-admin record for privileged requests; do not rely on a decoded-but-unverified JWT.
- Keep the authoritative platform administrator record under `/platformAdministrators/{uid}`; clients cannot create, update, list, or delete it.
- Never put tenant IDs, organisation lists, or client-supplied permissions into a global claim.
- Do not expose a generic Admin SDK proxy or arbitrary Firestore path operation.
- Keep the existing client app fail-closed when the trusted API is unavailable or owner identity is unverified.

This design is a candidate only. It is not permission to add a service-account key, change Firebase billing, deploy an API, or publish Firestore rules.

## 5. Cost and deployment gate

Before implementing the server API, confirm that the existing Vercel Hobby project supports the required Node.js function usage within its current limits and that no paid Vercel feature is needed. Firebase Spark does not provide a reason to assume that every server-side Firebase capability is available at zero cost; check the current Firebase product requirements before enabling anything.

If the implementation requires billing, a paid hosting tier, or a broader credential than can be safely managed, stop and present the cost/security trade-off. Do not silently upgrade, enable billing, or move the trust boundary into the browser.

## 6. Required IAM-01 tests

### Identity and forgery
- Unauthenticated request is denied.
- Valid Firebase identity without a platform principal is denied.
- Tenant `owner`, `tenant_super_admin`, `tenant_admin`, manager, employee, and auditor identities are denied platform access.
- A client-supplied `platform_owner`, `isOwner`, `role`, `orgId`, or localStorage value is ignored.
- A modified, expired, malformed, or wrong-project ID token is denied.
- A tenant membership in one or several organisations never implies platform authority.

### Bootstrap
- Only the preconfigured intended UID can receive the platform role.
- A different UID, email-only match, unverified identity, missing bootstrap configuration, or already-consumed bootstrap attempt is denied.
- The client cannot invoke bootstrap for an arbitrary UID or repeat/overwrite the initial owner.
- No credential, bootstrap secret, or service-account material appears in client bundles, logs, errors, Git history, or API responses.

### Revocation and recovery
- Suspended/revoked platform principal is denied even when the user remains Firebase-authenticated.
- Revocation invalidates the documented session/claim path.
- Recovery of Firebase sign-in alone does not restore platform authority.
- Re-provisioning requires the controlled operator process and a recorded reason.
- No ordinary tenant role can appoint a replacement Platform Owner.

### Data boundary
- Owner-only server endpoints verify identity and authorization before every Admin SDK operation.
- Tenant Super Admin is constrained to its own organisation on every tenant endpoint.
- Cross-tenant Owner access is limited to explicit approved operations and produces an audit event.
- Unknown endpoints and unknown resource paths deny by default.

Tests must use synthetic identities and emulator/mocked server credentials. Never add real credentials to fixtures. Never delete or weaken existing security tests.

## 7. Explicitly out of scope for IAM-01

- Publishing candidate Firestore rules to production.
- Granting real cross-tenant data access or loading operational modules.
- Creating live organisations or tenant memberships.
- Owner Control Centre UI.
- Invitation, tenant role lifecycle, owner transfer, and multi-owner governance.
- Data migration from browser localStorage.
- Support impersonation.
- Any billing upgrade or paid infrastructure.

## 8. Acceptance and release gates

IAM-01 is complete only when:

1. The trusted server boundary and first-owner bootstrap are implemented.
2. The exact approved UID is provisioned through the controlled process (not by browser registration).
3. Positive and negative identity, forgery, recovery, revocation, and tenant-separation tests pass.
4. Secret scanning confirms no credential leakage.
5. The server deployment and environment configuration are reviewed without exposing secret values.
6. The final PR CI passes and the diff receives security review.

Production Firestore rule publication, Owner Control Centre release, and cross-tenant operational access remain separate approvals after IAM-01.

**Firestore path correction:** Platform principal and audit records use valid document paths `platformAdministrators/{uid}` and `platformAuditEvents/{eventId}`; `platform/settings` remains the one-time bootstrap lock. The earlier nested three-segment sketches are superseded.
