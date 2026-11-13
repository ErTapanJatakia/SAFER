# SAFER Remix → SAFER Migration Inventory

**Destination:** `ErTapanJatakia/SAFER` (canonical product)
**Reference only:** `ErTapanJatakia/SAFER-Remix`
**Audit baseline:** SAFER-Remix `17c1dfa904f3b32144fb27cdcd0c5ec07afb1bca`; SAFER `e6e1ba07f06fd526e497c079cb2652675c1055fd`.
**Policy:** INR 0 only; no paid services; no production Firebase changes or real-record migration under this inventory.

## Purpose

This document tracks capabilities present in SAFER-Remix that are not represented by matching paths in the current SAFER main tree. A path difference is a discovery signal, not proof that a feature is safe, complete, or absent from SAFER. Each capability must be functionally compared before porting.

## Candidate migration inventory

| Capability | Remix reference | Initial assessment | Migration gate |
|---|---|---|---|
| Strict INR 0 budget policy and cost inspector | `BUDGET_POLICY.md`, `src/utils/budgetPolicy.ts`, `src/utils/budgetPolicy.test.ts`, `src/components/BudgetPolicyModal.tsx` | Already represented by canonical SAFER's fail-closed INR 0 budget policy inspector and provider allowlist; do not duplicate it. | Keep the canonical advisory-only model; no claim of billing enforcement or live price/quota inspection. |
| Authentication gateway and account lifecycle | `src/components/AuthGatewayView.tsx`, `src/utils/firebaseAuth.ts`, `src/utils/authValidation.ts`, `src/utils/authValidation.test.ts` | Core lifecycle already represented by canonical AuthGate, Firebase Auth integration, verified-email gate, Account Security panel, and session invalidation. Remix has weaker password validation and unsafe demo/acknowledgement coupling. | Retain canonical implementation; do not port the Remix gateway or Firebase configuration. Any additional provider/UI changes require a separate review and Firebase configuration gate. |
| Account profile and settings | `src/components/MyAccountSettingsView.tsx`, `src/components/AccountMenuDropdown.tsx`, `src/utils/accountSettingsHelpers.ts`, `src/utils/userSettingsService.ts`, related tests and `src/types/settings.ts` | Candidate; theme/accessibility preferences already exist in SAFER and must remain the source of truth. | Merge only missing capabilities; preserve SAFER's 20-theme system, accessibility behavior, and local Demo Guest boundary. Validate all persisted settings at runtime. |
| Organisation administration and multi-organisation RBAC | `src/components/OrganisationModal.tsx`, `src/types/multiorg.ts`, `src/utils/multiOrgRbac.test.ts` | High-value but security-sensitive; current test file includes mock rule evaluation and does not by itself prove Firestore enforcement. | Design tenant model independently; add emulator-backed Firestore rules tests for default-deny, cross-tenant isolation, self-promotion, revoked membership, read-only auditor, Demo Guest isolation, and immutable audit events. No operational collection migration. |
| Privacy console, notice and rights-request workflow | `src/components/PrivacyConsoleModal.tsx`, `src/components/PrivacyNoticeModal.tsx`, `src/utils/privacyService.ts`, `src/utils/privacyService.test.ts`, `src/types/privacy.ts` | Core synthetic workflows already exist in canonical SAFER; Remix notice and service contain fictional identities, unsupported legal assertions, and unsafe persistence/deletion semantics. | Reconcile existing capabilities; migrate only safe workflow concepts and explicit legal-boundary wording. Keep real notices, submissions, consent, deadlines, and deletion out of scope until separately reviewed and authorized. |
| Firestore service and rules foundation | `src/utils/firestoreService.ts`, `firestore.rules`, `firebase-blueprint.json`, `firebase-applet-config.json` | Do not transplant configuration. Existing SAFER Firebase foundation is authoritative. | Independently design and test rules against SAFER's current schema. Do not reuse the Remix Firebase project ID, app config, credentials, or old rules. |
| Provisioning and security documentation | `ADMIN_PROVISIONING.md`, `security_spec.md` | Useful design references, not operational instructions to execute as written. | Rewrite for SAFER's current architecture; remove personal/sample identifiers; verify every claimed security invariant with executable tests. |

## Confirmed structural differences

The Remix tree contains the candidate modules listed above. SAFER already contains its own operational modules, accessibility controls, themes, secure Demo Guest repository, cross-tab conflict protection, and CI/browser tests. These existing SAFER implementations must not be replaced by older Remix equivalents.

## Mandatory review findings

1. **No blind 76-commit merge.** The old draft PR is a historical source for comparison, not a migration mechanism.
2. **No old Firebase project reuse.** Remix configuration and project identifiers are reference artifacts only.
3. **RBAC scaffolding is not authorization proof.** Mock unit tests are insufficient; enforce and test authorization at Firestore rules and trusted boundaries.
4. **Fail closed on unknown cost services.** The Remix budget evaluator currently treats every unrecognised service string as safe; this behavior must not be carried forward.
5. **No legal or identity sample-data carryover.** Synthetic organisation, DPO, address, and contact details must remain clearly synthetic or be removed.
6. **No real operational-data migration.** Personnel, incidents, qualifications, or other operational records remain out of scope until tenant isolation and authorization are independently approved and tested.
7. **No paid infrastructure.** Firebase Spark and genuinely free/local capabilities only. No billing enablement, Blaze, paid APIs, Cloud Functions, paid storage, or paid identity tiers.
8. **No production configuration changes.** This inventory does not authorize Firebase rule deployment, tenant provisioning, production sign-in activation, or live-data onboarding.

## Migration order

- [x] Structural feature inventory initiated.
- [x] Corrected INR 0 budget policy inspector (already implemented canonically; fail-closed and advisory-only).
- [x] Authentication/account lifecycle comparison (canonical AuthGate and account-security lifecycle retained; Remix implementation rejected as-is).
- [x] Profile, preferences, accessibility and account-settings reconciliation (existing local-only settings and authenticated security flows retained; global regional-format application remains deferred).
- [x] Privacy notice and privacy-request workflow review and selective port (synthetic console already migrated; legal/compliance boundary added; unsafe Remix defaults rejected).
- [x] Canonical organisation data model and RBAC threat model (aligned to existing four-role Firestore Rules; no unsupported Remix roles).
- [x] Emulator-backed Firestore Rules and tenant-isolation test scenarios authored; execution and CI pass remain pending the consolidated validation milestone.
- [x] Trusted provisioning documentation rewritten for SAFER in `docs/TRUSTED-ORGANISATION-PROVISIONING-ADR.md` (manual owner-operated provisioning only; no client writes or paid backend).
- [ ] End-to-end regression and security review of every migrated capability.
- [ ] Final source-to-destination reconciliation.
- [ ] Archive/delete SAFER-Remix only after all approved features are verified in SAFER and the owner explicitly confirms retirement.

## Definition of complete

A Remix capability is considered migrated only when SAFER contains the reviewed implementation, relevant automated regression/security tests pass, documentation matches actual behavior, and the feature is usable in SAFER without relying on the Remix repository. The Remix repository must remain available until every candidate is classified as **ported**, **already present**, or **explicitly rejected/deferred with rationale**.


## Account menu and settings reconciliation

**Review basis:** Remix `AccountMenuDropdown`, `MyAccountSettingsView`, `accountSettingsHelpers`, and `userSettingsService`, compared with canonical `HeaderBanner`, `AccountSettingsModal`, `accountSettings.ts`, and the authenticated account-security lifecycle already integrated into SAFER.

### Already represented in canonical SAFER

- Account/profile entry point is available from the canonical header; a second dropdown menu is not required to expose the same destination.
- Browser-local profile fields (display name, call sign, bio), bounded regional preferences, JSON export, and scoped reset are already implemented in the canonical Account Settings modal.
- The canonical modal clearly distinguishes local preferences from authenticated identity and credentials.
- Authenticated credential lifecycle is handled by the separately reviewed canonical account-security implementation, including re-authentication for sensitive changes and session invalidation. Do not duplicate that flow inside a second settings screen.

### Rejected or deferred Remix behaviour

- The Remix account menu defaults to a `demo_guest` role and displays fallback demo identity text. Do not migrate these defaults into canonical account identity or session UI.
- Remix `userSettingsService` caches authenticated settings in localStorage before remote persistence and can return `success: true` after Firestore persistence fails. This is an unsafe success contract for account settings and is not to be ported.
- The Remix settings document mixes profile/preferences with broader security and privacy workflows. Canonical SAFER keeps local preferences, authenticated credentials, and synthetic privacy operations as separate boundaries.
- Theme and accessibility settings remain in their dedicated canonical controls; do not introduce duplicate preference stores.
- Remix's display-format helpers are not yet evidence that the selected regional preferences are applied consistently across every SAFER screen. Canonical UI correctly labels these preferences as future formatting integration; global application remains a separate implementation slice.

### Disposition

| Capability | Disposition |
|---|---|
| Account menu entry point | Already present as the canonical header Account control |
| Personal profile and call sign | Already implemented in local-only Account Settings |
| Regional date/time/timezone/number preferences | Already stored and exported locally; global formatting integration deferred |
| Settings JSON export and scoped reset | Already implemented with explicit data-boundary messaging |
| Authenticated password/email lifecycle | Already handled by canonical account-security implementation |
| Firestore user-settings sync/cache fallback | Rejected as-is; unsafe cache-first and false-success behavior |
| Duplicate account dropdown / second settings screen | Not needed; avoid duplicate navigation and settings state |

## Authentication gateway and budget inspector reconciliation

**Review basis:** Remix `AuthGatewayView`, `firebaseAuth`, and `authValidation`, compared with canonical SAFER `AuthGate`, Firebase configuration boundary, `AccountSecurityPanel`, session lifecycle/invalidation, and the canonical INR 0 budget inspector.

### Authentication: canonical implementation retained

- Canonical SAFER enforces a 12–128 character password policy with uppercase, lowercase, numeric, and special characters. Remix's gateway accepts passwords from six characters.
- Canonical registration sends verification and signs the newly created user out; an unverified account is not admitted into an authenticated workspace. Remix registers, attempts to record a privacy acknowledgement in localStorage, then immediately invokes the authenticated callback even if email verification is incomplete.
- Canonical sign-in re-checks verified email status, supports password reset and Google sign-in, and fails closed when Firebase session observation is uncertain.
- Canonical session transitions invalidate stale membership lookups and Demo Guest capabilities across tabs. The Remix gateway's callback-driven account handoff does not replace this lifecycle.
- Canonical authenticated sessions remain separated from the local Demo Guest workspace. A demo identity must never be treated as a real Firebase user or assigned a real tenant membership.
- Canonical account security handles sensitive credential changes with re-authentication and session invalidation; do not duplicate it in a second gateway.

### Remix authentication behaviour rejected or not portable

1. The six-character password minimum is below the canonical policy and must not be imported.
2. The registration path treats a localStorage privacy acknowledgement as part of account creation, but the service can return an acknowledgement object even when persistence fails. It is not a reliable consent or notice evidence mechanism.
3. The gateway uses hard-coded synthetic identities and a demo fast-track callback. Canonical Demo Guest is intentionally isolated from Firebase identity and tenant membership.
4. The Remix Firebase helper can fall back to a legacy project ID and imports a separate app configuration. Neither configuration nor fallback is portable to SAFER.
5. Its auth observer warning suggests offline/cache resilience while returning a null user on observer error. Canonical SAFER explicitly revokes local capabilities when account state becomes uncertain.
6. Its success copy says a verification email was dispatched even though the helper catches verification-send failure and continues. Canonical flow reports account creation separately and requires a fresh verified sign-in.

### Budget inspector: already migrated

Canonical SAFER already contains the corrected INR 0 budget policy inspector. It uses an explicit allowlist and routes unknown providers/invalid inputs to manual review; it is advisory and does not technically prevent billing or inspect live provider prices/quotas. No Remix budget code or duplicate UI is required.

### Disposition

| Capability | Disposition |
|---|---|
| Email/password, Google sign-in, password reset | Already represented in canonical AuthGate |
| Verified-email admission gate | Canonical implementation retained; Remix early authenticated callback rejected |
| Password strength policy | Canonical 12–128 character complexity policy retained; Remix six-character minimum rejected |
| Account/session invalidation | Canonical cross-tab/session lifecycle retained |
| Demo Guest entry | Canonical isolated local-only path retained; Remix hard-coded demo identity rejected |
| Privacy acknowledgement at registration | Rejected as proof of consent/notice delivery; localStorage acknowledgement is not a trusted record |
| Firebase project/app configuration | Never copy Remix configuration or fallback project ID |
| INR 0 budget inspector | Already migrated in canonical SAFER; no duplicate implementation |

No Firebase configuration, provider settings, authentication rules, production account state, or billing settings were changed in this reconciliation.

## Privacy notice and privacy-request workflow reconciliation

**Review basis:** Remix `PrivacyNoticeModal`, `PrivacyConsoleModal`, `privacyService`, and `types/privacy`, compared with canonical SAFER `PrivacyConsoleModal`, `privacyRepository`, `privacyExport`, and the synthetic privacy workspace contracts.

### Already represented in canonical SAFER

- Synthetic processing-activity register and notice-draft workflow.
- Synthetic rights-request and grievance tracking with manually maintained statuses.
- Consent-event examples that explicitly state they are not proof of legally valid consent.
- Retention review notes rather than automated deletion.
- Synthetic-only acknowledgement, fail-closed storage handling, bounded workspace persistence, and synthetic export.
- Explicit statement that the console does not calculate statutory deadlines, decide legal bases, contact regulators/data subjects, or delete operational records.

### Safe concept retained

The useful part of Remix's prominent legal disclaimer was its separation of technical workflow aids from legal advice or compliance certification. A clear **Legal and compliance boundary** notice has now been added to the canonical Privacy Console overview. It states that SAFER does not determine legal bases, certify DPDP compliance, or guarantee statutory performance, and that responsible organisations must obtain qualified legal review before real-world use. It also clarifies that no organisation identity, DPO contact, deadline, legal basis, or retention period is pre-populated as a verified fact.

### Remix behaviours and claims rejected

1. **Fictional fiduciary and DPO data:** the default notice contains a named company, registration number, office address, named DPO, email addresses and telephone numbers. These are not canonical SAFER facts and must not be copied or presented as real.
2. **Unverified legal bases and retention periods:** preset processing purposes and fixed year-based retention rules make legal and operational assumptions that depend on the actual organisation, processing context, and applicable law. Canonical SAFER leaves assessments explicitly unassessed unless manually reviewed.
3. **Unsupported statutory deadlines:** precomputed request and grievance target dates imply legal timelines and service-level commitments. Canonical SAFER records timestamps/statuses only; it does not calculate deadlines.
4. **False persistence success:** Remix privacy persistence helpers catch localStorage failures and may return an acknowledgement or success-shaped object even when data was not saved. Canonical SAFER's repository throws on failed persistence and the UI reports the failure.
5. **Unsafe retention purge:** Remix includes destructive purge/anonymisation paths that can modify personnel records. No such capability is migrated; canonical retention is a review log only.
6. **Overstated privacy guarantees:** claims such as zero PII transmission, complete client-side redaction, and prevention of AI prompt leakage are not accepted without end-to-end evidence for every data path and integration. SAFER does not claim these guarantees.
7. **AI/Gemini privacy settings:** a configuration object describing masking options is not evidence of an implemented AI integration or effective protection. No external LLM integration or transmission path is introduced by this migration.
8. **External mailbox boundary:** accepted email identifiers do not imply access to third-party mailboxes. Canonical account authentication and email verification remain separate; no mailbox integration is added.

### Disposition

| Capability | Disposition |
|---|---|
| Synthetic notice drafting | Already present in canonical Privacy Console |
| Processing-purpose register | Already present as synthetic processing activities; legal assessment defaults to not assessed |
| Rights requests and grievances | Already present as synthetic workflow tracking; no statutory deadline calculation |
| Consent ledger | Already present as manually recorded synthetic events, explicitly not proof of valid consent |
| Retention policy review | Already present as review notes; no automated purge |
| Legal disclaimer | Safe concept migrated into the Privacy Console overview |
| Fictional fiduciary/DPO/contact defaults | Rejected; never represent as canonical or verified identities |
| Preset legal bases and statutory periods | Rejected as defaults; require organisation-specific qualified review |
| AI/Gemini masking configuration | Deferred; no AI processing integration is implied |
| Silent localStorage write failure | Rejected; canonical repository fails closed and surfaces errors |
| Automatic personnel deletion/anonymisation | Rejected; no destructive retention workflow |

The privacy migration review is complete for the currently identified Remix privacy components. Remaining legal, production notice, real-data intake, and statutory workflow capabilities are explicitly deferred rather than implied to be complete.

## Deep review: Remix organisation/RBAC and provisioning artifacts

**Review basis:** Remix OrganisationModal, multiorg types, mock RBAC tests, ADMIN_PROVISIONING.md, and security_spec.md.  
**Disposition:** Do not port these files as implementation. Retain only reviewed concepts and test scenarios.

### Findings

1. **Role model is incompatible with canonical SAFER.** Remix defines platform_super_admin, org_admin, supervisor_manager, personnel_employee, readonly_auditor, and demo_guest. Canonical SAFER's verified membership and Rules model supports only owner, admin, manager, and viewer. Adding the Remix roles to the client without a corresponding trusted membership schema and emulator-tested Rules would create misleading privilege presentation.
2. **The Remix RBAC suite is a mock evaluator, not a Firestore Rules test.** It proves behavior of local helper functions only. Its "admin may update another member" and "member may append an audit event" assertions are not evidence that deployed Firestore Rules permit or safely constrain those operations.
3. **The OrganisationModal overstates security guarantees.** It describes tenant isolation and an immutable audit trail as operational facts while displaying hard-coded sample organisations and simulated audit events. The sample audit events are not retrieved from a trusted audit store.
4. **The proposed audit policy conflicts with the canonical boundary.** Remix's mock policy allows authenticated members to create audit events and denies update/delete. Canonical SAFER currently denies all audit reads and writes. Do not enable member-created audit events or label a hash-chain contract as immutable logging.
5. **The provisioning runbook targets a different Firebase project and schema.** It refers to a legacy project identifier, a platform-admin collection, a different membership path, and fields/roles absent from canonical SAFER. It must never be followed against the canonical project.
6. **The provisioning document contains a personal email address.** Do not copy it into SAFER documentation, examples, tests, or issue discussions. Review the reference repository's exposure and redact it there if it is not intentionally public.
7. **The security specification is aspirational, not verified.** Its six-role hierarchy, cross-tenant super-admin model, employee/auditor data access, demo guest remote-write denial, and append-only audit claims are not implemented by canonical SAFER's current Rules.
8. **Sample organisation data is not tenant provisioning.** The three hard-coded sample organisations are UI fixtures, not canonical Firestore organisation records. Do not import them into the production project.

### Migration disposition

| Remix capability or claim | Disposition in canonical SAFER |
|---|---|
| Organisation workspace context | Partially represented by the verified read-only workspace and organisation profile panels; Remix's useful role/context presentation is reconciled in an accessible capability matrix |
| Six-role RBAC hierarchy | Rejected as-is; retain canonical four-role vocabulary until a separate trusted authorization design is approved |
| Platform super-admin | Deferred; no platform-wide privilege exists in current canonical Rules |
| Cross-tenant isolation | Enforced by canonical Rules and expanded emulator tests; do not rely on Remix mock evaluator |
| Membership management UI | Deferred until a trusted provisioning authority is approved |
| Member-created append-only audit events | Rejected as-is; canonical audit path remains fully denied |
| Simulated audit activity | Rejected; no synthetic event should be presented as a real security event |
| Sample organisations and identities | Rejected for production; use clearly labelled emulator fixtures only |
| Organisation modal tabs, cards, and status layout | Safely adapted into a verified-session header, semantic capability matrix, release-status panel, and explicit unavailable-controls list; no tab that implies unsupported navigation or audit access |
| Manual provisioning runbook | Replaced by canonical ADR and current-schema runbook; old instructions are unsafe for this project |

### Follow-up actions

- [x] Record the incompatibilities and non-portable claims in the canonical migration inventory.
- [ ] Review the reference repository's provisioning documentation for unnecessary personal/project identifiers and redact if appropriate.
- [x] Reconcile the OrganisationModal presentation patterns into the canonical verified workspace without importing fake tenant data or unsupported permissions.
- [ ] Complete the consolidated emulator and project CI validation milestone before opening a review PR.

## Privacy workspace stale-snapshot protection

The canonical synthetic Privacy Console repository now keeps the exact serialized storage value last loaded or verified by each repository instance. Before a save or clear, it compares the current browser-storage value with that baseline. If another tab/session has already changed the workspace, the stale operation is rejected and the existing bytes are preserved. Successful writes and clears advance the instance baseline only after read-back verification.

Regression cases have been authored for:
- a stale second-instance save after a newer save;
- a stale clear after a newer save;
- successive verified saves by the same repository instance.

The UI directs users to close and reopen the Privacy Console to load the latest saved workspace after a conflict. No automatic merge, overwrite, or destructive recovery is attempted.

**Scope limitation:** this is stale-snapshot detection for sequentially observed changes, not an atomic cross-tab lock or a guarantee against two truly simultaneous read/write races. It remains a browser-local synthetic-data safeguard and does not alter Firebase, operational records, or tenant authorization. Consolidated execution of these regression tests remains pending the agreed validation milestone.

## Full source-to-destination component and utility reconciliation

Comparison basis: current main directory listings for SAFER-Remix and canonical SAFER, followed by direct source comparison of representative operational components. Matching filenames are not treated as proof of equivalent behavior; canonical implementations and their stronger safeguards remain authoritative.

### Component reconciliation

| Remix component | Canonical SAFER disposition |
|---|---|
| AccessibilityMenuModal | Already present; canonical accessibility preferences and assistive behavior retained |
| AccountMenuDropdown | No separate port; canonical HeaderBanner account entry avoids duplicate navigation |
| AuthGatewayView | Rejected as-is; canonical AuthGate has stronger verified-email, password and session boundaries |
| BrandingSettingsModal | Already present; canonical implementation includes modal focus management and existing SVG/image hardening |
| BudgetPolicyModal | Already present; canonical fail-closed advisory-only INR 0 policy |
| CyberHygieneSummaryModal / CyberHygieneView / CyberItemModal | Already present; canonical cyber-hygiene views and summary are retained |
| DashboardView | Already present; canonical dashboard includes its own accessibility and security-claim refinements |
| DemonstrationNoticeModal | Already present; canonical explicit Demo Guest notice and retention boundary |
| HeaderBanner / Navbar | Already present; canonical navigation retained, no duplicate header |
| IncidentDraftModal / IncidentReportsView | Already present; canonical structured incident drafting and incident workflow retained |
| LiveAnnouncer | Already present; canonical live announcements retained |
| MyAccountSettingsView | Replaced by canonical local-only AccountSettingsModal plus separate authenticated Account Security panel |
| OrganisationModal | Selectively reconciled into canonical verified organisation workspace/profile panels; no fake tenants or unsupported controls |
| PersonnelDetailModal / PersonnelExportModal / PersonnelModal | Already present; canonical field-level redaction and export safeguards retained |
| PersonnelReadinessView / ReadinessSummaryModal | Already present; canonical readiness evaluation and summary retained |
| PreDeploymentChecklistView / PreDeploymentSummaryModal | Already present; canonical checklist and summary retained |
| PrivacyConsoleModal | Already present; canonical synthetic-only privacy console retained and hardened |
| PrivacyNoticeModal | No separate modal; safe legal-boundary concept integrated into canonical Privacy Console |
| SaferWordmark | Already present |
| SearchableMultiSelect | Already present; canonical version includes generated accessible IDs, focus-on-open, and stronger keyboard/assistive behavior |
| ThemeSettingsModal | Already present; canonical 20-theme and accessibility-aware theme system retained |

### Utility and domain reconciliation

| Remix utility | Canonical SAFER disposition |
|---|---|
| accountSettingsHelpers | No blind port; canonical accountSettings.ts provides bounded local-only profile/preferences, export and scoped reset. Helper-level behavior is covered by canonical tests |
| authValidation / firebaseAuth | No blind port; canonical AuthGate/account-security lifecycle is authoritative and stronger |
| budgetPolicy | Already present; canonical implementation is fail-closed for unknown providers |
| clipboard | Already present |
| cyberHygieneRules / cyberHygieneSummary | Already present |
| dateUtils | Already present; canonical date handling is used in operational screens |
| firestoreService | Rejected as a client-side service transplant; canonical direct repository boundaries, tenant resolver and Firestore Rules are independently designed |
| incidentDraftGenerator | Already present |
| indianContextAndSafety | Already present |
| multiOrgRbac mock tests | Not migrated as authorization proof; canonical emulator-backed Rules tests and pure policy tests are the authoritative suites |
| personnelExport | Already present; canonical export/redaction implementation has security regression coverage |
| preDeploymentSummary | Already present |
| privacyService | Replaced by canonical privacyRepository, privacyExport, and synthetic workspace contracts; Remix persistence semantics rejected |
| readinessRules | Already present |
| rolesAndSpecialisations | Already present |
| securityAssessment | Already present in canonical security assessment suite |
| securitySanitizer | Already present and hardened; canonical SVG allowlist and data-URL validation remain authoritative |
| themePresets | Already present |
| userSettingsService | Rejected as-is; cache-first Firestore sync and false-success persistence are not imported. Canonical account preferences remain local-only |

### Reconciliation result

- All 29 Remix component filenames have a documented disposition. Components without a same-named canonical file are deliberately replaced by canonical architecture or rejected as duplicates/unsafe.
- All 35 Remix utility filenames have a documented disposition. Missing same-named utilities are not assumed missing features; each has an explicit canonical replacement, rejection, or deferral.
- The unique operational feature families (cyber hygiene, readiness, pre-deployment checklist, incident drafting, personnel export/redaction, branding, themes, accessibility) are present in canonical SAFER.
- No direct file copy is warranted for the reviewed component/utility inventory. Canonical implementations include additional safeguards and should not be overwritten with the older Remix versions.
- This directory-level reconciliation does not yet prove runtime parity or release readiness. The final gate remains the consolidated regression/security run, manual review of any residual UX differences, and confirmation that every deferred capability is explicitly dispositioned.

### Remaining migration closure items

1. Review the reference repository's provisioning documentation for unnecessary personal/project identifiers and redact only with separate repository-owner approval.
2. Execute the consolidated canonical test, browser, Firestore emulator, accessibility, export, and security suites after implementation batch completion.
3. Fix any failures without weakening or deleting tests; apply the three-consecutive-failure redesign rule.
4. Complete final runtime/source reconciliation and update this inventory with actual validation results.
5. Keep SAFER-Remix available until the user explicitly approves retirement after all candidates are classified and validated.
