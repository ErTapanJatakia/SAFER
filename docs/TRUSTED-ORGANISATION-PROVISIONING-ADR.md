# Trusted organisation provisioning — architecture decision record

**Status:** Accepted for the current INR 0 / Firebase Spark release boundary  
**Scope:** Design decision only; no production provisioning or Firebase configuration changes  
**Applies to:** SAFER organisation metadata, owner bootstrap, membership administration, invitations and audit events

## Decision

SAFER will not implement in-app organisation provisioning, invitation acceptance, membership mutation, or audit-event append until a trusted execution authority is available and its cost, identity, secret custody, abuse resistance, and operational limits have been independently verified.

For the current Firebase Spark-only deployment, organisation bootstrap and membership maintenance remain a **manual, project-owner-controlled administrative operation outside the client application**, using the Firebase project administration console. The app remains read-only for membership and organisation metadata. Existing Firestore Security Rules remain authoritative and unchanged.

This is a deliberately limited operating model, not a claim that the app has a complete self-service organisation-management feature.

## Why this fits the current stack

The checked-in Firebase configuration declares Firestore Rules and a local Firestore emulator; it does not configure Cloud Functions, Cloud Run, or another trusted application backend. The existing rules deny client membership list/create/update/delete and deny all audit-event access. The exact membership resolver and organisation profile reader are read-only.

Firebase Spark does not provide a deployable Firebase Cloud Functions execution path. Moving to Blaze, enabling billing, or adopting paid infrastructure is outside the project cost boundary. A browser-only implementation would place privileged operations in an untrusted client and would contradict the current Rules model.

## Options assessed

| Option | Decision | Rationale |
|---|---|---|
| Client-side Firestore writes for invitations or memberships | Rejected | Users can alter client code and request payloads; it would require weakening the existing membership deny rules. |
| Firebase Cloud Functions / Cloud Run | Deferred | Requires a billing-enabled execution path; incompatible with the current Spark-only, INR 0 constraint. |
| GitHub Actions as a privileged provisioning service | Rejected for now | Requires a privileged credential or equivalent trust delegation, secret lifecycle and runner controls; introduces a CI system as a production identity authority and is not a justified security trade-off for this app. |
| Arbitrary third-party free-tier server | Not selected | "Free" alone does not establish durable zero-cost operation, secret protection, availability, data location, abuse controls, or suitable contractual terms. No provider is approved without a separate assessment. |
| Manual project-owner provisioning through Firebase administration console | Selected, limited | Uses the existing project administration plane without exposing privileged credentials to the browser or adding a service. Requires careful operator verification and is not self-service. |

## Current operating procedure (manual, owner-only)

1. Confirm the intended organisation and the operator's authority through an out-of-band process. Do not treat an email address, invitation link, or client-supplied role as proof of authority.
2. Authenticate to the correct Firebase project using the project owner's protected administrator account and verify the project identifier before making changes.
3. Create the organisation document only with the current schema: `orgId`, `displayName`, `status`, and `schemaVersion: 1`. Use a validated identifier, a bounded non-empty display name, and `status: "active"` only when the organisation is approved for activation.
4. Resolve the intended member's Firebase Authentication UID from the authenticated account record. Do not use email as the membership document ID.
5. Create the exact membership document at `organisations/{orgId}/members/{uid}` with only `uid`, `orgId`, `role`, and `status: "active"`. Allowed roles are `owner`, `admin`, `manager`, and `viewer`. Never create an owner role as part of an ordinary invitation.
6. Re-check the document path, UID, organisation ID, role, status, and organisation state before the user attempts sign-in. A wrong UID or tenant locator must fail closed.
7. For removal or suspension, the operator must change the membership status through the trusted administration plane and verify the result. A revoked membership must not be reactivated; use a new, separately reviewed membership lifecycle if reinstatement is ever approved.
8. Keep a separate, access-controlled administrative record of who approved and performed each manual action, when, for which organisation, and why. Do not place personal data, credentials, raw invitation secrets, or operational records in public repositories or issue trackers.

This procedure is an operational design for an authorised project owner, not an app workflow. It does not grant permission to provision a live tenant under this documentation change.

## Owner and role safeguards

- Establish the initial owner only through a separately verified project-owner action.
- Do not expose owner assignment, owner transfer, self-promotion, or last-owner removal through the client.
- Owners may be able to delegate administration only after a trusted backend and complete lifecycle controls exist. The present manual process remains project-owner controlled.
- Do not rely on UI capability hints or the pure membership lifecycle policy as authorization.
- The Firestore Rules currently grant operational collection access only to active owner/admin memberships. Manager/viewer roles can resolve their own minimal membership but do not receive tenant operational access. Do not advertise broader role capabilities until Rules and emulator tests prove them.

## Audit integrity boundary

The TypeScript audit envelope and hash-link checker are structural contracts only. They do not compute canonical hashes, sign events, prevent concurrent writers, or make Firestore documents append-only. The current Rules deny all reads and writes to `auditEvents`.

Manual administration must therefore maintain its separate restricted administrative record. SAFER must not display a tamper-proof audit trail, claim immutable in-app audit logging, or enable client audit writes. A future implementation must specify a trusted writer, canonical event serialization, key custody, append-only enforcement, concurrency strategy, retention, and emulator-backed negative tests before release.

## Security and cost gates before revisiting this decision

A proposed trusted execution provider must pass all of these checks before any implementation:
- Confirmed INR 0 operation at expected volume, with no trial-to-paid transition or surprise billing path.
- Server-side identity verification and strict authorisation for every operation.
- Secrets held only in a server-side secret store; no privileged key in browser bundles, local storage, source control, or public CI logs.
- Invitation secrets generated with a cryptographically secure random source, stored only as digests, short-lived, single-use, tenant-bound, and bound to a verified recipient identity.
- Atomic protection against duplicate acceptance, replay, concurrent owner removal, and last-owner loss.
- Rate limits, abuse controls, operational monitoring, and a documented recovery procedure.
- Clear data location, privacy terms, availability constraints, and a provider exit plan.
- Independent review of the trust boundary and emulator-backed tests for allowed and denied operations.
- Explicit approval before production configuration, rules, or tenant data changes.

If no provider satisfies every gate within the zero-cost boundary, the manual owner-operated model remains in place. Do not relax security controls to obtain self-service functionality.

## Consequences

**Benefits:** preserves the existing deny-by-default model, avoids privileged browser credentials, avoids new cloud spend, and keeps the current Firebase project architecture intact.

**Limitations:** no self-service organisation creation, invitations, membership administration, or in-app immutable audit log. Provisioning requires a trusted project owner and a separate controlled record.

**Non-goals:** no Firebase Rules changes, no Firebase plan change, no Functions/Run deployment, no new provider, no production tenant creation, no live data migration, and no CI execution as part of this documentation-only decision.
