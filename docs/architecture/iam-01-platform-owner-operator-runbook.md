# IAM-01 Platform Owner operator and deployment runbook

**Status:** controlled implementation; not a production activation approval  
**Implementation:** dedicated IAM-01 backend branch; merge and deployment remain separately gated  
**Firebase project:** `safer-2026`  
**Vercel project:** `safer-pmc`  
**Runtime:** Vercel Node.js Function (project currently configured for Node.js 24.x)  
**Package manager:** Bun 1.4.4; Vercel install command is pinned to `bun install --frozen-lockfile`  
**Billing target:** retain existing Vercel Hobby and Firebase Spark; do not enable billing. Vercel Hobby is restricted to personal, non-commercial use; PMC commercial/operational use must not be deployed there.

## 1. Security boundary implemented

- `GET /api/owner/status` accepts a Firebase ID token in the Authorization Bearer header.
- The server verifies the token with Firebase Admin SDK and checks revocation/disabled-account state.
- The server then reads only `platformAdministrators/{uid}` and requires matching UID, `role: platform_owner`, and `status: active`.
- Tenant roles, including the legacy tenant `owner`, do not satisfy this check.
- The endpoint returns only an authentication/role result. It does not return a UID, organisation list, client data, or privileged Firestore access.
- No Admin SDK module is placed under the public `api/` route tree except the one status handler.
- Firestore client rules are unchanged. The existing production deny-all posture remains in force.

## 2. Firestore paths

Use valid Firestore document paths:

| Purpose | Document path |
|---|---|
| One-time bootstrap lock and owner UID | `platform/settings` |
| Authoritative Platform Owner record | `platformAdministrators/{uid}` |
| Provision/revoke audit events | `platformAuditEvents/{eventId}` |

The previous architecture sketch used `platform/administrators/{uid}` and `platform/auditEvents/{eventId}`, which are not valid document paths. The architecture baseline is corrected in this implementation branch. No existing production records are migrated.

## 3. Vercel environment configuration

Do not add secrets until the PR has passed review and the service account's permissions have been checked.

Production environment only:

- `FIREBASE_PROJECT_ID` — Config value: `safer-2026`.
- `FIREBASE_SERVICE_ACCOUNT_JSON` — Secret value containing the service-account JSON.

Important controls:

1. Create a dedicated service identity for the status API; do not use a personal Google account credential.
2. Grant only the permissions needed to verify Firebase ID-token revocation state and read the platform administrator record. Prefer read-only Firestore access for this runtime.
3. Do not grant project Owner or Editor merely to make the endpoint work.
4. Do not add the production credential to Preview, Development, GitHub Actions, `VITE_*` variables, source files, or chat.
5. Never print, log, or retrieve the secret value after saving it.
6. If the minimum permissions cannot be established safely, leave the endpoint unconfigured; it returns a generic 503 and remains fail-closed.
7. Do not enable Google Cloud billing or change Firebase billing as part of this work. Confirm that the actual SAFER use is permitted by the selected Vercel plan before deploying any function; if it is commercial or client service use, stop and choose an explicitly approved compliant hosting plan instead of assuming Hobby eligibility.

The runtime service identity is intentionally read-only. Provisioning and revocation are separate operator actions using the operator's approved local Google Application Default Credentials (ADC), not the Vercel runtime identity.

## 4. One-time Platform Owner provisioning

This operation is not public and has no browser endpoint.

Preconditions:

- The intended user's Firebase Auth UID has been independently confirmed in the Firebase Console.
- The account is verified and the appointment is approved.
- A change reference, operator reference, and meaningful reason are recorded in the organisation's external change register.
- The operator is authenticated to the correct Google Cloud project with the minimum required Auth lookup and Firestore write permissions.
- The operator has reviewed the script and the target project before running it.

Example operator sequence (run on a trusted machine):

```bash
gcloud config set project safer-2026
gcloud auth application-default login

export FIREBASE_PROJECT_ID=safer-2026
export SAFER_OPERATOR_APPROVED=YES

node scripts/platform-owner.mjs provision \
  --uid=VERIFIED_FIREBASE_AUTH_UID \
  --change-ref=CHG-APPROVED-REFERENCE \
  --operator-ref=VERIFIED_OPERATOR_REFERENCE \
  --reason="Approved initial Platform Owner appointment after independent identity verification."
```

The script:
- checks the Firebase Auth user exists and has a verified email;
- requires explicit local operator confirmation and change evidence;
- atomically claims the one-time bootstrap lock in `platform/settings`;
- creates the Platform Owner record in `platformAdministrators/{uid}`;
- creates a provisioning event in `platformAuditEvents/{eventId}`;
- refuses a second bootstrap or an existing administrator record.

Never paste credentials, service-account JSON, access tokens, or passwords into source control or chat. The UID is an identity reference, not a secret.

## 5. Revocation

Use the same trusted operator environment and change controls:

```bash
node scripts/platform-owner.mjs revoke \
  --uid=VERIFIED_FIREBASE_AUTH_UID \
  --change-ref=CHG-APPROVED-REVOCATION \
  --operator-ref=VERIFIED_OPERATOR_REFERENCE \
  --reason="Approved revocation reason with supporting incident or governance reference."
```

Revocation updates the authoritative record to `status: revoked` and appends a platform audit event. The status endpoint checks the record on every request and also asks Firebase Admin SDK to check token revocation. The one-time bootstrap lock is not cleared; automatic replacement-owner provisioning is deliberately unsupported.

Account recovery alone does not restore a revoked Platform Owner role. A replacement or ownership transfer requires a separately designed and approved recovery procedure.

## 6. Verification and release gates

Before adding production credentials:
- pass the dedicated unit tests for forged claims, invalid/revoked tokens, tenant-role separation, missing/revoked principals, bootstrap replay, and revocation;
- pass the repository dependency/build/security CI;
- review the generated `package-lock.json` and Bun lockfile;
- review the final API and server-only credential diff;
- confirm the Vercel Function is included in a preview or controlled test deployment without production credentials.

After separate approval and configuration:
- call `GET /api/owner/status` without a token and confirm 401;
- call with an ordinary tenant identity and confirm 403;
- call with the provisioned Platform Owner identity and confirm only the minimal success response;
- revoke the test principal and confirm subsequent calls are denied;
- inspect logs for absence of tokens, credential values, and sensitive identity data.

No production Owner credential is provisioned by this PR. No production rules are published, no tenant data is accessed, and no Owner Control Centre is released by this PR.


## 7. Purpose-bound Platform Owner support access

The backend now provides a just-in-time support-session lifecycle. It is deliberately separate from ordinary Owner authentication and organisation administration.

- Only the currently authenticated, enabled, email-verified Platform Owner with an active platform administrator record and matching claimed bootstrap pointer may create or revoke a session.
- A session is bound to exactly one active PMC, one Owner UID, and an explicit subset of `platform:tenant-data:read`, `platform:tenant-data:write`, and `platform:tenant-data:export`.
- The purpose must be 20–500 characters and a change/ticket reference is mandatory.
- The default lifetime is 15 minutes; allowed lifetime is 5–30 minutes. Expired and revoked sessions fail closed.
- Activation, revocation, and each authorized support action append a platform audit event in the same Firestore transaction as the session state check/change.
- The session identifier is 256-bit random, is bound to the authenticated Owner UID, and must not be written to logs or shared in URLs.
- `POST /api/owner/support-access` creates a session; `DELETE /api/owner/support-access` revokes one. Both require a fresh Firebase ID token.
- `authorizePlatformSupportAccess()` is the mandatory server helper for future cross-tenant data endpoints. It must be called before the data operation, with the requested PMC and exact action.

**Important release boundary:** this milestone creates and governs support sessions; it does not itself expose tenant-record browsing or mutation endpoints. No cross-tenant data endpoint may be added without consuming this helper and auditing the operation. The Owner's organisation registry remains a platform metadata workflow and does not use a tenant-data support session.
