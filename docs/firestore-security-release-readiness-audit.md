# Firestore security release-readiness audit

**Audit date:** 2026-11-10  
**Scope:** repository candidate `firestore.rules`, emulator suite, tenant membership resolver, AuthGate integration, and release documentation  
**Baseline commit:** `87b80331f4100f8f253f9aa19f52eead2c5c6e28` (PR #16 squash merge)  
**Disposition:** NOT APPROVED for production rules publication or operational-data onboarding

## Executive assessment

The candidate rules implement a conservative, UID-bound tenant model with explicit grants, strict key allowlists, immutable creator/tenant provenance, restricted collections, and a deny-by-default catch-all. The emulator suite covers a meaningful set of positive and negative cases. The membership resolver and AuthGate now provide a session-only membership check and invalidate stale asynchronous requests.

This is a useful security foundation, but it is **not a production release approval**. Two independent release blockers remain: the candidate rules are not the rules published in production (production remains deny-all), and the application's operational records still reside in browser-local storage without tenant/account isolation. The visible AuthGate warning correctly communicates this boundary; it does not itself create isolation.

No exploitable bypass was confirmed in this static review of the current candidate rules. This is not a penetration test, formal verification, or substitute for a final rules deployment review.

## Findings

### F-01 — Operational browser data is not tenant- or account-isolated

**Severity:** High / release blocker  
**Evidence:** `src/App.tsx` owns operational state and browser-local persistence; `src/components/AuthGate.tsx` renders the data-boundary warning but does not gate operational data by verified membership. Existing localStorage keys are global browser keys rather than UID/organisation-scoped repositories.

**Impact:** Multiple users of the same browser profile may encounter the same persisted demonstration records. A signed-in session or verified membership must not be interpreted as authorisation to view or mutate those records.

**Required action:** Before real records are permitted, design and implement a data-access boundary that prevents operational modules from loading or saving records unless a separately approved tenant context and repository are active. Do not simply namespace existing keys and call that server-side authorization. Until then, retain synthetic-only use and do not migrate or upload localStorage data.

### F-02 — Candidate rules are not production rules

**Severity:** Critical / release blocker  
**Evidence:** The repository's `firestore.rules` contains candidate tenant grants. The Firebase Console production rules were separately published as deny-all and have not been changed by the repository PRs.

**Impact:** Repository merge status does not describe production authorization state. Enabling client data access against the current production rules should fail closed; replacing production rules without a separate review and approval could expose tenant records.

**Required action:** Keep production rules deny-all. Any future publication must be a separate, explicitly approved release operation after final CI, rules review, bootstrap readiness, and application data-boundary verification.

### F-03 — Emulator tests should strengthen update-path negative coverage

**Severity:** Medium  
**Evidence:** `tests/firestore-rules.test.mjs` covers create-time extra fields, immutable creator/tenant provenance, incident reporter provenance, and delete denial. It does not comprehensively attempt unexpected keys and immutable-field changes through partial update payloads for every operational collection, nor does it exercise all malformed timestamp/type cases on update.

**Impact:** The rules currently use full post-update document validation, which should reject these mutations, but the regression suite does not explicitly lock down every important update-path invariant.

**Required action:** Add negative update tests for extra keys, record/tenant ID changes, creator/reporting provenance changes, invalid enums/types, and timestamp spoofing for personnel and incidents. Preserve all existing tests.

### F-04 — Documentation is stale about AuthGate integration

**Severity:** Low  
**Evidence:** `docs/firestore-membership-resolver.md` states UI integration remains separate and says the resolver is not wired into authentication UI. PR #15 integrated the resolver; PR #16 added UI tests and stale-request invalidation.

**Impact:** Operators and reviewers could follow an outdated implementation status.

**Required action:** Correct the status and describe the exact session-only scope, while reiterating that this does not enable operational Firestore access.

## Controls verified in repository

- Tenant operations require a signed-in UID, an active matching membership, an active matching organisation, and owner/admin role.
- Membership documents are exact-self-get only; clients cannot list or mutate memberships.
- Manager and viewer have no operational collection access in this candidate v1.
- User profiles are UID-bound and field-allowlisted; profile role escalation is not accepted.
- Personnel and incident writes use strict key allowlists, bounded values/enums, path-bound tenant/record IDs, and creator/update provenance checks.
- Creator and reporter provenance are preserved on update.
- Evidence metadata is read-only; private personnel, restricted incidents, and audit events deny client access.
- Unmodelled paths have a deny-by-default catch-all.
- Query tests demonstrate that tenant list queries must constrain the organisation field.
- Resolver validates one exact membership document and keeps the result in memory.
- AuthGate invalidates pending membership resolution on organisation-locator changes, account changes, and sign-out.
- No operational Firestore repository or localStorage migration is enabled by the reviewed AuthGate flow.

## Release gates still outstanding

1. Resolve F-01 with a reviewed account/tenant data boundary before real operational data is accepted.
2. Add the update-path negative tests in F-03 and retain the existing test suite.
3. Correct the stale resolver documentation (F-04).
4. Run all required CI on the final PR head and review emulator output.
5. Separately review first-owner bootstrap readiness and operator evidence.
6. Conduct a final production rules diff review and obtain explicit approval before any Firebase Console publication.
7. Keep localStorage migration, background sync, real records, and production rules publication disabled until their separate approvals.

## Explicit non-actions

This audit does not modify `firestore.rules`, publish Firebase rules, create an organisation, provision an owner, enable operational Firestore reads/writes, migrate browser data, add paid services, or change Firebase billing. Production remains deny-all.
