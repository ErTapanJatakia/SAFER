# Organisation and RBAC implementation baseline

**Status:** Domain/UI contracts only; existing Firestore Rules remain authoritative  
**Parent:** Privacy Console safety hardening  
**Cost boundary:** INR 0; Firebase Spark only  
**Data boundary:** Synthetic development data only

## Current SAFER implementation discovered

SAFER already contains a substantial tenant authorization foundation. This migration must extend that implementation rather than introduce a parallel Remix-shaped model:

- `src/lib/tenantMembership.ts` resolves one exact membership document at `organisations/{orgId}/members/{uid}`.
- Membership parsing requires the exact minimal fields `uid`, `orgId`, `role`, and `status`, and binds UID and tenant ID to the authenticated context.
- Current roles are `owner`, `admin`, `manager`, and `viewer`.
- `firestore.rules` is default-deny and currently grants operational collection access only to active owner/admin memberships.
- Membership list/create/update/delete, evidence writes, private personnel, restricted incidents, and audit event access remain denied.
- Existing emulator-backed suites are registered as `test:firestore-rules` and `test:tenant-membership`.

The current UI capability map in `src/types/organisation.ts` deliberately mirrors only the grants that exist today. It is presentation metadata, not authorization.

## Domain contracts added

- Canonical organisation metadata contract aligned to the current `orgId`, `displayName`, `status`, and `schemaVersion` fields.
- Minimal membership contract aligned exactly to the current Rules schema.
- Role vocabulary and UI capability hints aligned with the existing tenant membership resolver and Rules.
- Runtime role validation and a narrow membership provenance helper.

No Remix sample organisation names, old Firebase IDs, or alternate role vocabulary are carried over.

## Security boundaries retained

1. Firebase Authentication UID is the identity key. Email is not a membership identifier.
2. Membership document ID, `uid`, authenticated UID, and requested tenant must agree.
3. Membership must be active and the organisation must be active.
4. A role shown in the client is never sufficient to authorize a Firestore operation.
5. No client-side membership creation, role assignment, owner transfer, invitation, or revocation.
6. No production rules publication, tenant provisioning, or operational-record migration.
7. No local Demo Guest data is synchronized or uploaded.
8. Firestore rules remain the only authorization authority; any future grants require emulator-backed negative and positive tests.

## Read-only workspace context implemented

- `OrganisationWorkspacePanel` displays the exact verified organisation ID and current role after the existing exact-membership resolver succeeds.
- The panel presents a role capability preview aligned to the existing Rules model. Manager/viewer currently receive no tenant operational capabilities.
- Membership administration and audit-event access are explicitly shown as unavailable for every role.
- The panel states that authenticated operational workspace access is not released and that its capability preview is informational only.
- Owner/admin memberships trigger one exact read of `organisations/{orgId}` for profile metadata. Manager/viewer roles never issue that metadata read.
- The profile reader validates the organisation ID against the verified membership, active status, display-name bounds, and schema version; malformed, missing, and unavailable profiles fail closed without cached/inferred data.
- `AuthGate` renders the panel only for a membership verified in the current in-memory session. Changing the organisation locator or crossing an authentication/session boundary clears the membership result.
- Focused regression suites are registered as `test:organisation-workspace` and `test:organisation-profile`; they have been added but not yet executed.

## Next implementation slices

1. [x] Add a safe, read-only organisation profile view for roles whose current Rules permit the exact organisation document read; do not query metadata for manager/viewer.
2. [x] Define a pure membership lifecycle policy and a structural audit-event contract without enabling writes.
3. [x] Record the trusted provisioning decision in `docs/TRUSTED-ORGANISATION-PROVISIONING-ADR.md`: manual project-owner administration is the only approved Spark-era provisioning path; no client mutations or unassessed third-party backend.
4. [x] Add the organisation security assurance matrix and expand emulator coverage for cross-tenant reads/writes, all-role membership mutation attempts, cross-user role changes, and audit-event read/write denial. See `docs/ORGANISATION-SECURITY-ASSURANCE-MATRIX.md`. Tests are added but intentionally not executed before the consolidated validation milestone.
5. [x] Assess the current execution options against the zero-cost and trust requirements. No alternative provider is approved; retain manual owner-operated provisioning unless a future provider passes every ADR gate.
6. [ ] Only after review and separate approval, consider production rules changes or tenant provisioning.
7. Keep operational localStorage records separate until an explicit, reviewed migration workflow exists.

## Remix organisation UI reconciliation

The Remix `OrganisationModal` was reviewed against the canonical verified workspace panels. The following presentation patterns were retained in a security-aligned form:

- A clear current organisation/session context and role badge, using only the exact verified membership locator and supported four-role vocabulary.
- A structured, accessible capability matrix grouped by organisation, personnel, incidents, evidence, and administration.
- A distinct workspace-release status panel that explains what is and is not currently available.
- Clear separation between identity/profile metadata and operational data access.

The following Remix UI behaviours were intentionally not migrated:

- Sample organisation cards and organisation switching, because no trusted organisation directory or switch workflow is implemented.
- The six-role matrix and its advertised permissions, because it conflicts with canonical Firestore Rules.
- Membership invitations, role editing, and other client-side administration controls.
- Simulated audit events and claims of immutable/append-only audit storage. The current canonical rules deny audit-event reads and writes.
- Unqualified claims that tenant isolation or every listed capability is guaranteed by the UI. Firestore Rules and emulator evidence remain the authority.

The canonical panel now explicitly labels the role matrix as informational, states that operational workspace access is not released, and lists unavailable controls. Regression coverage was updated for the semantic table, all four supported roles, denied membership/audit capabilities, and the absence of simulated activity. These tests are authored but remain pending the consolidated validation milestone.

## Explicitly not implemented

- No Firestore writes, membership mutations, or operational-record reads/writes are added by this slice. The only new Firestore read is the exact organisation metadata `get` for an already-verified active owner/admin membership.
- No changes to `firestore.rules` or Firebase configuration.
- No production tenant creation, role assignment, or membership mutation.
- No operational-record migration or synchronization.
- No claim that every Remix RBAC screen or workflow has been migrated.

## Membership lifecycle policy model (not enabled)

A pure, non-persistent policy model has been added in `src/lib/membershipLifecycle.ts`. It describes safe future transitions without creating invitations, changing membership documents, or granting client write access.

- Invitation states are `draft`, `issued`, `accepted`, `expired`, and `revoked`; terminal states cannot be reused.
- Invitation metadata accepts a SHA-256 token digest only (never a raw token), binds the invitation to an organisation, invited email, inviter UID, and non-owner role, and caps validity at seven days.
- Acceptance requires a separate trusted service to authenticate the recipient and verify the token digest and verified email. The client-side transition helper is not proof of either.
- The advisory membership policy forbids self-modification, client owner assignment, admin management of owners/administrators, reactivation of revoked memberships, and removal/demotion/suspension of the final active owner.
- Owner bootstrap/transfer, invitation issue/accept, membership writes, and append-only audit events are explicitly reserved for a trusted authority. No such authority is implemented in this slice.
- The model is not authorization. Existing Firestore Rules remain unchanged and continue to deny membership writes and audit access.

Regression tests are registered as `test:membership-lifecycle`; they have been added but intentionally not executed before the consolidated validation milestone.

## Immutable audit-event contract (not enabled)

A minimal envelope and chain-link verifier now live in `src/types/organisationAudit.ts`. The contract allowlists membership and organisation-profile event names, rejects unexpected fields, bounds identifiers, requires SHA-256-shaped event digests, and checks previous-hash continuity and non-decreasing timestamps across a supplied sequence.

This is structural validation only: it does not calculate canonical hashes, verify signatures, guarantee ordering under concurrent writers, or make client storage immutable/tamper-proof. A future trusted backend must own append-only writes, canonical serialization, signing/key custody, retention, access controls, and emulator-backed negative tests. Current Firestore rules still deny audit reads and writes. The regression suite is registered as `test:organisation-audit-contract` and has not been executed.


## Trusted provisioning decision

The current Firebase Spark configuration has no trusted application execution service. The approved interim model is manual, project-owner-controlled provisioning through the Firebase administration plane, documented in `docs/TRUSTED-ORGANISATION-PROVISIONING-ADR.md`. The client remains read-only for organisation membership and audit events. No provider, privileged credential, Firebase plan, Rules, or production tenant configuration was changed by this decision.


## Security assurance status

The assurance matrix maps Firestore Rules, tenant membership resolution, lifecycle contracts, audit-envelope validation, and UI capability claims to their evidence. New emulator scenarios cover cross-tenant access and attempted membership mutations by every supported role, including cross-user role changes. This is test coverage authored, not test execution: no result is claimed until the consolidated emulator/CI milestone.

## Membership lifecycle policy hardening

The advisory lifecycle module now performs runtime allowlist validation of actor, target, and proposed membership roles/statuses rather than relying only on TypeScript compile-time types. Malformed values fail closed as invalid-context.

Owner transfer has a separate candidate assessment:
- only an existing owner may initiate the assessment;
- actor and target must be distinct valid UIDs;
- target must be an active non-owner membership;
- a positive assessment is explicitly labelled trusted-authority-required.

This does not implement or authorize transfer. The future trusted operation must atomically promote the target and demote the initiating owner, preserve at least one active owner, prevent replay/concurrent transfer races, and record an independently protected administrative event. No client-side Firestore write or UI action is enabled.

Regression tests have been authored for eligible/ineligible transfer candidates and malformed runtime role/status values. Invitation expiry and digest-only metadata rules remain advisory and require trusted recipient authentication, digest verification, single-use enforcement, and atomic acceptance before any real invitation workflow can ship. Test execution remains deferred to the consolidated validation milestone.


## Membership status freshness disclosure

The authenticated organisation panel labels membership as **verified at check time** and **active when checked**. This is a point-in-time result from the exact membership lookup, not a live subscription or continuous revocation monitor. Any future database operation must rely on Firestore Security Rules, which evaluate authorization for each request; UI state and role labels are never a substitute. If operational workflows are later released, the product must define how stale UI state is refreshed and how permission-denied responses revoke or refresh local presentation state. No background polling or additional reads are introduced by this disclosure.

## Organisation profile request isolation

The read-only organisation profile panel now binds every rendered result to the exact request context: Firestore database instance, authenticated UID, organisation ID, role, and membership status.

- A profile from the previous account or tenant is hidden immediately during a context transition, before the next effect completes.
- Late success or failure from an obsolete request cannot publish profile state after cleanup.
- Suspended/non-active membership never triggers the metadata read; manager/viewer remain excluded.
- Missing Firestore database configuration fails closed with an unavailable message rather than an empty or inferred profile.
- This is presentation/request isolation only. Firestore Rules continue to authorize every read, and no cache, polling, membership mutation, or operational access is added.

Regression cases have been authored for UID changes while retaining the same tenant, stale asynchronous responses, suspended membership, and unavailable database configuration. They remain pending the consolidated validation milestone.

## Membership verification recovery and request ordering

The authenticated membership check remains an explicit, user-initiated exact-document read. The UI exposes an accessible busy status while the lookup is pending and gives generic recovery guidance to check connectivity and the organisation locator before retrying. It does not reveal raw Firebase errors or distinguish permission denial from transient unavailability.

The session lifecycle issues a fresh request token for each lookup. Only the newest token in the unchanged UID/organisation context may publish a result; account, organisation, sign-out, and peer-tab transitions invalidate older tokens. Overlapping duplicate requests are therefore last-request-wins, even if an earlier network response arrives later. The UI does not automatically retry, cache membership, or grant authority from a stale result. Firestore Rules remain authoritative for each database operation.

Regression coverage has been authored for overlapping lookups and the accessible pending state. These tests remain pending the consolidated validation milestone.

## Account security form identity boundary

The authenticated account security panel is keyed by Firebase UID so an identity change immediately remounts the form rather than briefly rendering the previous identity's state. The panel also clears current/new password fields, email-change inputs, pending messages, errors, and busy presentation whenever the Firebase UID changes. This prevents credential material or account-specific feedback entered for one identity from remaining visible in the next identity's form. It does not change Firebase credentials, session tokens, or server-side account state. Sensitive account changes continue to require provider-aware re-authentication; email changes remain pending until Firebase verification completes.

A component-level regression case has been added for switching the panel from one UID to another while credential fields contain values. Validation remains deferred to the consolidated milestone.

## Credential-operation request isolation

Account security actions capture the Firebase UID that initiated the operation. Before a follow-on sensitive mutation or UI update, the component checks that the same UID still owns the mounted panel. A stale re-authentication completion therefore cannot proceed to a password or email mutation after the panel has moved to another identity. If a password update itself has already succeeded remotely, its content-free cross-tab invalidation signal is still published even if the initiating panel was replaced before the response returned. This is a client-side stale-work guard, not server-side cancellation or proof that Firebase revoked other sessions.


## Membership transition and owner-count safeguards

The advisory membership policy now treats revocation as terminal: a revoked membership cannot be reactivated, have its role edited, or receive any further lifecycle update. A transition into revoked status must retain the existing role so a role change cannot be bundled into the revocation event. Suspended memberships may be reactivated through the policy model, but only by an otherwise authorised actor; this remains an advisory decision, not a client permission.

For an active owner target, the supplied active-owner count must include at least that target. Demotion or suspension/revocation of an active owner is rejected when the supplied count is one; it may be considered when the count is greater than one. A suspended owner is not counted as active, so reactivation can restore an owner without incorrectly treating the suspended membership as currently active. The count is only a caller-supplied snapshot: a future trusted writer must recompute it and enforce the final-owner invariant in one transaction, otherwise concurrent changes could still remove the last owner.

Invitation role checks, issuance validation, owner-transfer assessment and membership-change evaluation now reject malformed runtime inputs rather than relying on TypeScript types. Regression cases have been authored for suspended/revoked transitions, role-change/revocation separation, owner-count consistency, and malformed inputs. They remain pending consolidated validation; no tests or CI were run for this implementation slice.

## Invitation recipient binding and audit sequence checks

The pure invitation policy now includes `canAcceptInvitationForRecipient`. It checks that the invitation is still issued and unexpired, has a bounded lifetime and digest-shaped token reference, has not already recorded an accepting UID, and that the authenticated UID is well-formed. It compares the invited address with the supplied verified account email after trimming and case-normalising, and rejects malformed runtime input.

This helper is only a local consistency guard. It does not establish that Firebase has verified the email, prove possession of the invitation secret, verify the digest, prevent concurrent replay, or create a membership. A future trusted service must perform those checks and the single-use membership write atomically. No invitation UI or client write has been enabled.

The owner-transfer candidate assessment also validates actor/target roles and membership status against runtime allowlists; malformed values return `invalid-context` rather than being treated as an eligible non-owner target. This remains an advisory check and cannot perform or authorize a transfer.

The audit-chain structural verifier now also rejects duplicate event IDs and sequences that mix organisation IDs. Equal millisecond timestamps remain acceptable because timestamps alone cannot provide a unique total order; the supplied array position and previous-hash links provide the sequence relationship being checked. The verifier still does not recompute hashes, authenticate writers, verify signatures, or establish immutable storage.

Regression cases have been authored for recipient mismatch, whitespace/case normalization, exact expiry boundary, accepted/replayed invitations, malformed digest/context, duplicate audit IDs, cross-organisation chains, and equal-timestamp linked events. They remain pending consolidated validation; no tests or CI were run for this implementation slice.


### Membership response provenance at the UI boundary

After an exact membership lookup resolves, AuthGate independently checks that the returned UID and organisation ID match the request token and that the status remains active before publishing the result. A mismatched response fails closed with generic recovery guidance. This is defense in depth against an incorrectly bound adapter or unexpected result; it does not replace resolver schema validation, Firestore Security Rules, or server-side authorization. The regression test supplies a mismatched UID and organisation and confirms that no workspace is rendered. Validation remains part of the consolidated milestone.


The AuthGate response boundary also validates the returned role against the canonical four-role allowlist before rendering capability guidance. Unsupported runtime values fail closed rather than reaching the role-capability map. This is a UI robustness check only; exact membership parsing and Firestore Rules remain authoritative.


## Exact runtime membership response shape

The AuthGate membership-response guard now accepts an unknown runtime value and requires a plain data object containing exactly the four currently supported fields: `uid`, `orgId`, `role`, and `status`. Nulls, arrays, primitives, missing or unexpected fields, accessor-backed properties, exotic prototypes, unsupported roles, and mismatched identity/organisation context fail closed. The guard catches unusual object-inspection failures rather than allowing malformed adapter output to crash the authentication boundary.

This remains defence in depth for UI publication. The tenant resolver validates the Firestore document shape, and Firestore Security Rules remain the actual authorization boundary. Regression cases are authored for malformed values and exact-shape enforcement; execution remains deferred to consolidated validation.


## Sign-out while membership verification is pending

Beginning sign-out invalidates the session lifecycle request token synchronously, before Firebase sign-out completes. A membership response that arrives during a slow or unresolved sign-out therefore cannot restore the organisation workspace, even while the Firebase identity is still temporarily displayed. If Firebase sign-out later fails while the same identity remains current, the account can explicitly re-verify membership; the old pending result is never reused. A regression case covers the delayed membership response and delayed Firebase sign-out completion. Test execution remains deferred to consolidated validation.


## Authentication observer failure during membership lookup

If Firebase's authentication observer fails while an organisation membership request is pending, AuthGate ends the session lifecycle, clears the account and organisation presentation, and publishes a peer-tab invalidation. The outstanding request token is no longer current, so its eventual response cannot restore the prior workspace. Recovery requires an explicit observer re-subscription and a fresh Firebase identity callback; the previous organisation locator is not carried forward. A regression case covers the delayed membership response, observer failure, and fresh-identity recovery. Test execution remains deferred to consolidated validation.


## Replaced authentication observer callback isolation

AuthGate now marks each Firebase authentication observer inactive during effect cleanup and ignores both queued identity callbacks and queued error callbacks from that replaced observer. This supplements Firebase unsubscribe during observer retry: a delayed callback from the previous subscription cannot overwrite a newly recovered account's UI identity. The regression test retains the previous observer callback, recovers a new identity, then delivers a late old-identity callback and confirms the recovered identity remains displayed. This is client-side callback ordering protection, not a change to Firebase authentication or token validity. Test execution remains deferred to consolidated validation.

## Organisation profile tenant and privilege transition regressions

The profile-panel regression suite now holds an organisation metadata request open while the verified organisation context changes. It confirms that the new tenant's profile is displayed and the late response for the previous tenant cannot overwrite it. A second case holds an owner metadata request open while the membership role changes to manager; the privileged profile remains unavailable and the obsolete response is ignored. A third case replaces the Firestore instance during a pending read and confirms that only the replacement instance's result can be rendered.

These are UI request-lifecycle checks only. The exact membership resolver and Firestore Rules remain authoritative, and no additional metadata reads, polling, caching, or permission grants are introduced. The tests are authored but remain deferred to the consolidated validation milestone.

## Membership re-verification clears prior organisation context

Submitting a fresh membership verification clears the previously displayed membership/workspace result before the new exact-document lookup begins. If the new lookup is pending, denied, malformed, or unavailable, the previous organisation profile and role presentation are not retained or restored. Only a response that still matches the current session request token and exact UID/organisation context can publish a new workspace context.

A regression case now verifies the successful-first-check, pending re-check, and denied re-check sequence. This protects client presentation only; it does not provide continuous membership monitoring or alter Firestore Rules. Test execution remains deferred to the consolidated validation milestone.



## Tenant membership parser runtime-object boundary

The pure membership parser now treats its input as an untrusted runtime value. It accepts only a plain object (or null-prototype data object) with exactly the four enumerable own data fields required by the current Rules schema. It rejects symbol keys, inherited/exotic objects, accessors, invalid UID/organisation context, and proxy inspection failures without invoking getters. All malformed values return the same generic `invalid-membership` error.

The parser still grants no authority: it only validates the result of the exact membership read. Firestore Rules continue to authorize the read and every later database operation. Regression coverage has been authored for getter non-execution, exotic prototypes, unexpected symbol keys, hostile proxy traps, and invalid identity/organisation context. These tests remain pending the consolidated validation milestone; no test or CI run is claimed.


## Explicit tenant operation denials in the role matrix

The role capability contract and read-only workspace matrix now show the important negative grants explicitly. Even active owner/admin memberships cannot delete personnel or incident records, write evidence records, manage memberships, or read/write audit events under the current Rules. Owner/admin may read personnel, incidents and evidence, and create/update personnel and incidents subject to the existing field-level Rules validation. Manager/viewer remain denied all tenant operational capabilities.

This is a presentation/domain mirror of the current `firestore.rules`, not a new permission system. No Rules changed and no operational workflow was released. Type-level and UI regression cases have been authored for the explicit denials; they remain pending consolidated validation.


## Organisation profile parser runtime-object boundary

The exact organisation metadata reader now validates its Firestore adapter result as a plain data object with precisely the four current organisation fields. It rejects accessor-backed values without executing getters, inherited/exotic objects, symbol or extra keys, and proxy inspection failures. Malformed profiles return one generic `invalid-profile` error and are never rendered.

The owner/admin role check, exact organisation document read, active status, bounded display name, and schema version checks remain unchanged. Firestore Rules still authorize the read; this parser does not provision a tenant or grant operational access. Regression coverage is authored for hostile object shapes and remains pending consolidated validation.
