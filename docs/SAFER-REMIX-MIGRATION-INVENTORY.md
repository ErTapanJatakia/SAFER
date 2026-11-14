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

## Type and demonstration-data reconciliation

Directory comparison of Remix and canonical SAFER confirms both demonstration data modules (mockData and indianPersonnel) already exist in SAFER. No separate data-file migration is required; retain canonical synthetic-data labels, privacy boundaries, and data validation.

| Remix type module | Canonical disposition |
|---|---|
| types/index.ts | Already represented by canonical operational domain types |
| types/multiorg.ts | Replaced by canonical organisation.ts and tenantMembership.ts; canonical four-role schema follows existing Firestore Rules |
| types/privacy.ts | Replaced by canonical synthetic privacy workspace contracts; do not import Remix legal assumptions or persistence shape |
| types/settings.ts | Replaced by canonical local-only account settings contract and separate authenticated account-security state |
| types/theme.ts | Already represented by canonical theme types and branding configuration |

The current canonical type directory is intentionally smaller because organisation and account-security domain contracts live in their own focused modules. A filename mismatch is not a missing capability.

## Repository-level migration boundary

No Remix Firebase project configuration, Firestore Rules, lockfile, package manifest, environment example, generated metadata, or deployment configuration is copied into canonical SAFER. Canonical SAFER's current project identity, dependency graph, emulator setup, CI workflows, deployment policy, and zero-cost constraints remain authoritative.

Reference screenshots and temporary AI Studio media are not application features or source-of-truth assets. They are not bulk-migrated. Any future asset reuse requires a specific product need, provenance check, accessibility review, and optimization assessment.

## Repository-root documentation and configuration audit

The Remix root was reviewed in addition to its source directories. These files are reference artifacts only; none is copied into canonical SAFER.

| Remix artifact | Finding | Canonical disposition |
|---|---|---|
| README.md | Describes the product's operational workflows and synthetic demonstration purpose; much of the capability inventory is already present in SAFER. Some statements describe older UI/data semantics and must not be treated as current release evidence. | Retain canonical SAFER README and current implementation as source of truth. No README transplant. |
| ADMIN_PROVISIONING.md | Contains a personal email address and fabricated example UID, a legacy Firebase project/database identifier, and instructions for a platform_admins path and six-role model that do not match canonical SAFER. Its assertion that the described document immediately grants privileges is not valid for the current canonical Rules model. | Do not execute or copy. Canonical trusted-organisation provisioning ADR is the only current operating decision. Recommend owner review and removal of personal/sample identifiers from the reference repository; no edit to Remix is authorized by this migration. |
| security_spec.md | Aspirational six-role/platform-super-admin model; claims broad access and append-only audit behavior not proven by the old mock tests and not implemented in canonical SAFER. | Rejected as a security authority. Canonical Firestore Rules, emulator tests, organisation ADR and assurance matrix govern actual claims. |
| BUDGET_POLICY.md | Contains historical service quotas, old AI Studio/Gemini assumptions, and broad Firebase product claims that are not current authoritative pricing or service eligibility evidence. | Do not copy quotas or treat them as current pricing. Canonical INR 0 policy and provider allowlist are advisory; verify provider limits at the point of any future deployment decision. |
| firebase-applet-config.json | Contains a legacy Firebase web-client configuration and project identifiers. A Firebase web API key is a public client identifier, not a service-account secret, but the associated project/app/database are unrelated to canonical SAFER. | Never reuse the old project configuration. Canonical safer-2026 client configuration remains authoritative. No credential rotation claim is made from this review. |
| firebase-blueprint.json | Defines old entity shapes and incompatible field/role/path names, including platform_admins, memberships, and the six-role hierarchy. | Rejected as a schema source. Canonical organisation, membership, tenant resolver and Firestore Rules are authoritative. |
| .env.example | References a Gemini API key and AI Studio/Cloud Run APP_URL assumptions that are not part of the canonical SAFER client architecture. | Do not copy. Canonical environment example is retained; public Firebase web-client variables are separately documented. No secrets are committed by this migration. |
| package.json / package-lock.json / bun.lock | Legacy dependency graph includes server-oriented and AI SDK packages not needed by the canonical static Vite app. Lockfiles are repository-specific. | Do not merge manifests or lockfiles. Canonical package manifest and lockfiles remain authoritative. |
| vercel.json | SPA rewrite is already represented in canonical hosting configuration. | No migration required; canonical deployment policy governs. |
| screenshots and metadata.json | UI snapshots and generated project metadata are not source code or authoritative functional specifications. | Retain only existing canonical assets that are actually used; no bulk asset or metadata migration. |
| .aistudio | AI Studio workspace metadata is tool-specific, not a product capability. | Do not migrate. |

### Configuration and security caveats

- The Remix Firebase web API key is not equivalent to a private service-account key. Its presence alone is not evidence of credential compromise. The legacy project identifiers and config must nevertheless not be used by canonical SAFER.
- The old provisioning guide includes personal/sample identifiers. This inventory deliberately does not reproduce them. Review and redact them in the reference repository if they are not intentionally public; any historical Git commit may continue to contain prior versions.
- The old security specification's statements about platform-wide administration, employee/auditor access, Demo Guest remote-write denial, and immutable audit events are not accepted as implemented facts. Each must be independently supported by current canonical rules and emulator tests before any future feature claim.
- No Firebase project, Firestore Rules, authentication provider, environment secret, deployment setting, DNS record, billing plan, or live operational dataset was changed during this audit.

## Repository-level reconciliation outcome

The source, type, demo-data, and root-configuration reviews identify no additional feature that warrants a direct transplant. The remaining work is verification, not copying legacy configuration: final source/runtime parity review, one consolidated validation milestone, remediation of any failures, and a final explicit disposition of deferred capabilities. SAFER-Remix remains available until the user separately approves retirement.

## Final source-tree and rules boundary check

The remaining top-level source layout was checked. Remix contains only App.tsx, components, data, index.css, main.tsx, types and utils. Canonical SAFER additionally has dedicated hooks and lib modules for session, tenant, repository, and security boundaries. No unreviewed Remix service/lib directory or additional source module family was found in that tree comparison.

The two Firestore Rules files are materially different, not interchangeable:
- Remix uses the legacy platform_admins collection, memberships path, and platform-super-admin/six-role assumptions.
- Canonical SAFER uses organisations/{orgId}/members/{uid}, validates the UID and org ID in the membership record, checks active organisation state, and intentionally denies client membership mutation and audit-event access.
- The canonical rule model and emulator-backed tests are the sole authority. The Remix Rules file is not merged, copied, deployed, or used as a template.

## Migration closure status

| Workstream | Status |
|---|---|
| Operational component inventory | Classified |
| Utility inventory | Classified |
| Domain type and demo-data inventory | Classified |
| Root documentation and configuration | Classified |
| Legacy Firebase project and rules | Explicitly excluded |
| Organisation RBAC redesign | Implemented on the current feature branch; validation pending |
| Privacy workspace stale-snapshot safeguard | Implemented on the current feature branch; validation pending |
| Consolidated tests / emulator / browser / security validation | Not yet run by design |
| Final human review and merge | Pending validation |
| SAFER-Remix retirement | Not authorized; remains available |

No direct migration candidate remains in the reviewed source, type, data, or root-configuration inventories. The remaining task is to validate the canonical implementation branch as one coherent milestone, review any failures, and obtain the final release decision. This status is an inventory conclusion, not a claim of runtime parity or production readiness.

## Deep second-pass: account settings feature parity

A deeper review of Remix MyAccountSettingsView and its settings schema found several settings concepts that were not captured by the earlier filename-level reconciliation. The earlier statement that no direct migration candidate remains is narrowed accordingly: the old UI itself is not safe to copy, but a few individual preferences are candidates for deliberate canonical integration.

| Remix capability | Current canonical state | Disposition |
|---|---|---|
| Profile display name, call sign, bio | Local-only AccountSettingsModal already stores these fields and exports them separately from operational records. | Already represented. Do not import the older cloud sync. |
| Regional date/time/timezone/number preferences | Canonical account preferences store these values but explicitly state they are not yet applied globally. | Already represented as stored preferences; global formatting integration remains a safe candidate for a future coherent implementation batch. |
| Theme and accessibility controls | Dedicated canonical controls and settings stores already exist. | Already represented; keep separate to avoid duplicate sources of truth. |
| Layout density and camouflage trim | Canonical theme system handles visual themes/trim; density is not established as a global account preference. | Candidate only if implemented consistently across operational screens and responsive breakpoints; otherwise defer. |
| In-app operational/incident/audit alerts, expiry threshold, audio chimes, realtime/batch display | Canonical dashboard has visual status indicators and live announcements, but no equivalent user-configurable notification preference contract was found in the account settings model. Remix describes client-side in-app indicators and Web Audio, not verified push/email/SMS delivery. | Safe candidate for an in-app-only preference layer after verifying each toggle controls actual existing UI behavior. No push, email, SMS, background delivery, or false delivery claims. |
| English/Hindi language preference | Remix exposes only en-IN and hi-IN settings; that does not establish complete translated application coverage. | Defer until canonical localization resources and full-screen translation coverage exist. Do not add a language selector that changes only a stored label. |
| Inactivity timeout | Remix stores a selectable timeout value. Canonical session lifecycle already has its own security behavior. | Compare against canonical session lifecycle before any change; never introduce a second independent timer or weaken current invalidation. |
| Default export redaction level (strict/standard/minimal) | Canonical personnel export already has field-level sensitive defaults and user-controlled selection, but account settings do not yet persist a preferred redaction profile. | Safe candidate: add a local-only default profile only if strict/standard/minimal are precisely mapped to existing field keys and export remains fail-safe. Never make “minimal” the default; retain sensitive redaction by default. |
| Default export format | Canonical PersonnelExportModal currently starts at TXT. Remix stores PDF/XLSX/CSV/DOCX/TXT as a preference. | Safe candidate: persist a validated local preference and use it as the initial format; no automatic export or silent change to output contents. |
| Background analytics consent | Remix defaults analytics consent false but its account settings flow is tied to broader cloud settings and privacy request examples. | Do not import until a specific analytics data flow and consent boundary are documented. Vercel privacy-conscious product analytics remain separate from security/operational records. |
| Privacy/data principal request submission and account deletion request | Remix privacyService uses unsupported deadlines/identities and simulated local request tracking; canonical synthetic privacy console already models example requests. | Keep synthetic-only privacy workflows. Do not present local examples as statutory submissions, actual account erasure, or live DPDPA processing. |

### Settings migration sequencing

1. First candidate batch: local-only default export format and redaction profile, with runtime allowlists and explicit mapping to existing export field keys.
2. Second candidate batch: in-app notification preferences only, but only after each preference is connected to a real status indicator/chime and its limits are stated.
3. Later: regional formatting integration and density only after all affected screens can consume one canonical preference source without breaking date consistency or accessibility.
4. Deferred: language selector until actual translation coverage; analytics consent until a defined analytics data flow; account deletion and statutory request submission until trusted backend and legal process exist.

No settings code was copied during this second-pass review. This correction supersedes the broad "no direct migration candidate remains" statement above for the specific safe candidates listed here.

## Implemented candidate batch: safe local export defaults

The first account-settings candidate has now been implemented on the organisation foundation feature branch:

- Added validated local preferences for default export format (TXT, CSV, XLSX, PDF, DOCX) and default redaction profile (standard or strict).
- Standard mode preserves SAFER's existing sensitive-field redaction defaults.
- Strict mode redacts every field exposed by the current export schema.
- Unsupported or malformed stored values normalize to TXT + standard redaction; the legacy Remix "minimal" profile is deliberately not imported because it could reduce protection ambiguously.
- Personnel Export reads the browser-local preferences only when opened, then still presents the redaction controls and preview for user review before download.
- Account preference export remains limited to local profile/preferences; operational records and credentials are excluded.
- Added normalization, redaction mapping, and UI regression tests. Tests have been authored but intentionally not executed pending the consolidated validation milestone.

This is a local preference only. It does not automatically export data, change source records, bypass per-field review, or upload settings to Firebase. The implementation is on the feature branch and is not merged or deployed.

### Notification settings source validation

The Remix notification tab was reviewed at implementation level. It stores checkbox/radio preferences and provides a user-triggered audio test, but the inspected code does not establish a complete event-driven notification pipeline for every advertised event. In particular, membership/audit event alerts, dispatch/muster transitions, and a batched digest are not demonstrated by the settings UI itself. Its delivery claims must not be treated as proof of those features.

Canonical SAFER currently exposes live status indicators, navigation badges, toast announcements, and accessibility announcements, but has no equivalent notification preference/event contract. Therefore:
- Do not port the Remix tab or its claims as-is.
- Do not add toggles that appear to control alerts when no corresponding event source or behavior exists.
- Any future notification work must first define real event sources, severity, deduplication, persistence, user-visible delivery, accessibility behavior, and which critical security/session warnings cannot be suppressed.
- Browser Web Audio may be considered only as an optional, user-initiated/in-app enhancement; it must respect browser gesture/autoplay restrictions and never be represented as guaranteed delivery.
- External email, SMS, push, background delivery, and membership/audit events remain out of scope unless their trusted infrastructure and cost boundary are separately approved.


## Implemented candidate batch: regional display preferences (staged rollout)

The next safe account-settings candidate has been implemented on the same feature branch:

- Added pure formatting helpers for account-local date, time, date-time and number preferences.
- Date-only values in the explicitly supported formats (ISO YYYY-MM-DD, DD-MM-YYYY and DD/MM/YYYY) are parsed as calendar dates, not passed through UTC conversion. Invalid or ambiguous strings fail to a neutral fallback instead of being guessed.
- ISO timestamps and Date objects are displayed in the selected supported timezone (Asia/Kolkata or UTC) and selected 12/24-hour clock.
- Number formatting uses the selected en-IN or en-US convention.
- Browser-local preference reads use the existing account-settings schema and fail back to the canonical defaults if storage is unavailable or malformed.
- Applied the preferences to Privacy Console record timestamps and summary counts, plus the personnel-export preview character count. Stored timestamps, sorting, record schemas, date calculations, export payloads, filenames and evidence serialization remain unchanged.
- Added unit coverage for date parsing, timezone display, clock formats, number grouping and unavailable storage. Tests are registered as `test:account-formatting` but have not been run.

This is a staged integration, not a claim that every SAFER screen is localized. Other operational views continue using their established date/number display conventions until each can be audited and migrated without changing stored evidence or date-calculation semantics. The Account Settings description now states the exact current coverage.


### Regional formatting rollout: personnel detail view

The first operational read-only detail surface now consumes the same browser-local regional preferences:
- Personnel birth date, work-history dates, certification completion/expiry dates and last supervisor review date use the selected date format.
- Date labels reflect the active format so the displayed value is not ambiguous.
- Formatting is display-only; personnel form input validation and stored date values remain DD-MM-YYYY as before, and readiness calculations are untouched.
- The feature branch still requires consolidated validation before review or merge.


### Regional display preference rollout: operational views

Extended the display-only integration to the following additional surfaces:

- Personnel readiness certification cards: completion and expiry dates follow the selected date format.
- Pre-deployment checklist: target deadlines and supervisory sign-off dates follow the selected date format.
- Incident report list: reported date/time follows the selected date, time and timezone preferences.
- SAFER's legacy incident timestamp shape (`YYYY-MM-DD HH:mm`) is now parsed explicitly as a local wall-clock timestamp before timezone display conversion; invalid calendar/time values fail to the neutral fallback rather than relying on browser-specific Date string parsing.

The integration does not rewrite records or alter due-date comparisons, readiness calculations, incident chronology, input validation, export evidence, or timestamps generated at record creation. New focused tests cover the local timestamp parser and are registered in the existing regional-formatting suite. No test/CI run was initiated during this implementation batch.


A follow-up source audit also removed the remaining browser-default locale formatting in the Privacy Console (grievance submission timestamps) and personnel export preview character count. The Privacy Console now uses the shared account preference formatter for all visible timestamps in its notices, rights/grievance examples, consent ledger, and retention review sections.


### Consolidated validation preparation: AuthGate UI contract alignment

Review of the earlier automatically triggered run `43443158928` identified five AuthGate test failures. The Firestore Rules emulator (19 tests) and tenant membership resolver emulator (5 tests) passed; the failure was in five UI assertions still expecting the previous plain-text labels ("Verified active membership" and "Role: …") after the verified-membership screen had been replaced with the structured `OrganisationWorkspacePanel`.

The AuthGate tests now assert the current stable workspace test ID and the role labels rendered by that panel. Negative session-boundary assertions check that the workspace element is absent, rather than relying on obsolete text. This updates the test contract to the actual UI without removing the session lifecycle, stale-response, cross-tab invalidation, or role checks. The updated tests have not yet been executed.


### Dashboard regional-number integration and account export lifecycle

- Dashboard KPI counts, represented-sector counts, review-queue counts, task totals and recent-incident counts now use the saved `en-IN` or `en-US` number convention.
- Progress-bar ARIA values and percentage calculations remain numeric and unchanged; only human-readable labels are formatted.
- Account preference JSON export now defers temporary object-URL revocation briefly after the browser download click, avoiding premature cleanup before the browser consumes the download.
- The Account Settings description now reflects the implemented regional display coverage. It does not claim full-app localization.
- These changes are display/download lifecycle only. They do not modify operational records, metric calculations, evidence exports or account authentication.


### Header regional preferences and stale-date correction

- The header's previously hard-coded prototype date (15 October 2026) has been replaced with the current browser date rendered using the selected account date format and timezone.
- Header expired-certification and human-review counts now use the selected number grouping convention.
- The value remains a display-only current-date indicator; no record timestamps or operational calculations are changed.


### Local profile visibility integration

- Added a defensive reader for the existing browser-local profile settings. It validates through the canonical settings normalizer and returns an empty profile when storage is missing, malformed or unavailable.
- The header now displays the optional display name and call sign only when a non-empty display name is configured. The short bio is not surfaced in the header.
- The visible profile label and accessible name explicitly state that this is browser-local presentation data, not the authenticated Firebase identity. It is not used for authorization, account lookup, audit attribution or operational record ownership.
- Saving Account Settings causes the existing application feedback update to re-render the header and reflect the saved profile; reset removes the local profile and the header returns to its unconfigured state.
- Added focused reader tests for valid, absent, malformed and unavailable browser storage. These tests are authored but remain pending consolidated validation.
- The Remix account-menu concept is therefore selectively represented without copying its identity semantics or creating a duplicate account menu.


### Second-pass account settings audit: remaining candidates and release boundaries

A focused comparison of the remaining Remix account settings against the canonical SAFER runtime has been completed. The following dispositions are deliberate:

| Remix preference | Canonical evidence reviewed | Migration disposition |
| --- | --- | --- |
| Layout density (comfortable / compact) | Remix's compact/comfortable choice is used in its settings preview and persisted model. Canonical SAFER has no global density token or verified density-aware layout contract across dashboard, operational views, forms, dialogs and responsive breakpoints. | Defer. Do not expose a compact switch until a consistent application-wide layout contract can be implemented and checked for keyboard target size, readability, reflow and accessibility. |
| Language (English / Hindi) | Remix exposes two language values, but the selector alone does not provide complete translation resources or prove every screen, validation message, modal, announcement and export label is translated. | Defer. No language preference selector is added until end-to-end translation coverage exists. Existing English interface remains the truthful supported baseline. |
| Analytics consent | Remix's boolean is not tied to a sufficiently documented event inventory, analytics provider boundary, retention statement and consent enforcement contract. Canonical Vercel product analytics are separately configured and are not the operational security-record store. | Defer. Do not add a consent switch that cannot actually gate the relevant collection. Any future work must define exactly which analytics events are collected, what is excluded, how consent is enforced and how withdrawal behaves. |
| Inactivity timeout | Canonical `src/lib/sessionLifecycle.ts` is an in-memory generation gate that invalidates stale asynchronous work on identity, organisation and sign-out transitions. It is not itself an inactivity timer or an authentication lockout mechanism. | Defer. Do not add a second timer or claim that an inactivity preference locks or signs out a user. A future implementation must integrate with the actual AuthGate/session boundary, distinguish warning from sign-out, cover keyboard/pointer activity and multi-tab behavior, and preserve immediate session invalidation. |

The canonical application already provides separate theme and accessibility controls; duplicate settings stores are not warranted. The local profile visibility integration is now implemented as browser-local presentation data and explicitly does not alter Firebase identity or authorization.

#### Account-settings migration completion criteria

- Safe local profile, export format, redaction profile and regional display preferences are implemented.
- Existing theme/accessibility controls remain authoritative.
- Notification settings remain deferred until real event sources, severity, deduplication, persistence, delivery and accessibility behavior are specified.
- Density, language, analytics consent and inactivity timeout remain deferred under the criteria above; they are not represented as implemented features.
- Tests for the account settings/profile reader and all other implementation-batch changes remain pending consolidated validation. No test or CI run is implied by this audit entry.


### Browser-local account preference cross-tab refresh

- Added a narrowly scoped `storage` event listener in the canonical App shell for the exact `safer_account_settings_v1` key (and the browser's clear-all event).
- A change in another same-origin tab triggers a React refresh so header profile presentation and screens consuming regional preferences can re-read the validated current settings.
- Same-tab saves continue to refresh through the existing Account Settings success feedback state; the browser does not emit a storage event back to the writing document.
- The listener ignores unrelated localStorage keys and other storage areas, and unregisters on unmount.
- This is a presentation refresh only. It does not synchronize authenticated identity, alter operational records, or bypass the existing cross-tab operational-record conflict protections.
- Cross-tab refresh behavior is authored but remains pending consolidated validation.


### Organisation governance assurance follow-up

- The organisation capability matrix now uses **“Permitted by current Rules”** rather than “Granted”, and explicitly distinguishes Rules-level permission from a SAFER screen or workflow being released. Authenticated operational workspace access remains unavailable in the current UI.
- The audit-event structural validator now correctly accepts the documented optional `targetUid` field when it is omitted, while continuing to reject unknown fields and malformed values. Regression coverage includes both cases.
- Repaired a missing test-block closure in the membership lifecycle suite discovered during source review. The test remains intact and has not been executed; no assertion was removed or weakened.
- These changes clarify contracts and test readiness only. No Rules, tenant data, Firebase configuration, or trusted execution path changed. Consolidated validation remains pending.


### Authenticated workspace security-copy correction

- Corrected an AuthGate notice that inaccurately described production Firestore Rules as deny-all. The checked-in Rules do permit narrowly defined owner/admin operations on selected tenant paths; they continue to deny membership mutations, audit access, private/restricted records and unmodelled paths.
- The authenticated UI still does not load or expose operational records. Its notice now distinguishes that UI release boundary from the independent Rules-level permissions.
- Added an AuthGate regression assertion for the corrected disclosure. No authorization rule or runtime data-access path was changed.


## Current migration status update (2026-11-14)

This section supersedes earlier provisional wording where later canonical implementation work has changed the disposition. The feature branch contains the following selective migration outcomes; none of the branch-only work is considered released until consolidated validation and merge.

| Remix capability area | Current canonical SAFER status | Remaining work / disposition |
|---|---|---|
| Budget policy inspector | Implemented on canonical main; fail-closed and advisory-only | No further migration. Do not claim technical billing enforcement or live quota inspection. |
| Authentication gateway and account lifecycle | Core flows already represented by canonical AuthGate, verified-email gate, password/Google sign-in, credential re-authentication and session invalidation | No Remix gateway transplant. Complete consolidated regression/security validation of branch changes. |
| Account menu/profile/settings | Local profile, call sign, scoped preferences, JSON export/reset and authenticated account-security lifecycle implemented on branch | No duplicate dropdown or settings store. Branch validation/release remains. |
| Theme and accessibility preferences | Already represented by canonical theme/accessibility controls | No duplicate migration. |
| Default export format and redaction profile | Implemented on branch as validated local preferences; standard preserves existing sensitive-field redaction and strict redacts all exportable fields | Validate export formats, preference fallback and user review/preview behavior; no automatic export. |
| Regional date/time/timezone/number display | Partially integrated on branch across header, dashboard, personnel detail/readiness, pre-deployment, incidents, privacy console and export preview | Remaining screens require per-surface audit; preserve stored timestamps, sorting, date calculations and evidence serialization. |
| Privacy notice and privacy console | Synthetic-only console and safe notice concepts already represented; synthetic acknowledgement/storage safeguards are on the parent branch | No real statutory submissions, legal deadline assertions, real DPO/contact claims, automatic erasure or destructive retention purge. Validate synthetic boundary and storage behavior. |
| Organisation profile and workspace context | Read-only verified organisation context/profile implemented on branch | No organisation directory/switcher or operational workspace release until trusted model and Rules gates are separately approved. |
| Multi-organisation RBAC | Canonical four-role tenant model and Firestore Rules foundation already exist; lifecycle policy and UI/domain mirrors implemented on branch | No Remix six-role model. Membership invites, role changes, suspension/revocation writes, owner transfer and provisioning remain unavailable without trusted execution and emulator-backed gates. |
| Audit log | Strict dormant event envelope and supplied-link continuity checker implemented/hardened on branch | No trusted writer, canonical hash recomputation, signatures/key custody, atomic ordering, append-only storage, audit UI, or client read/write. Firestore Rules deny audit access. |
| Trusted provisioning | SAFER-specific Spark-era manual owner-operated provisioning ADR documented | In-app provisioning and privileged automation deferred; no paid backend or Firebase plan change. |
| In-app notification preferences / alert controls | Not migrated; canonical status indicators/toasts/accessibility announcements exist, but Remix settings do not prove a complete event/delivery pipeline | Defer until real event sources, severity, deduplication, persistence, user-visible and accessible delivery are implemented. No push/email/SMS/background-delivery claims. |
| Layout density (comfortable/compact) | Not migrated | Defer until a consistent app-wide density contract is available and accessibility/reflow/target-size regressions are covered. |
| English/Hindi language preference | Not migrated | Defer until end-to-end translated resources cover screens, validation, dialogs, announcements and exports. |
| Analytics consent | Not migrated | Defer until exact analytics events, provider boundary, exclusions, retention, consent enforcement and withdrawal are defined. Keep product analytics separate from operational security records. |
| Inactivity timeout | Not migrated | Defer until integrated with the actual AuthGate/session lifecycle, multi-tab behavior and warning/sign-out semantics; do not add a second timer. |
| Statutory privacy requests/account deletion | Synthetic examples only | Real submissions, legal deadlines, identity/DPO details and actual erasure require a trusted backend, verified process and separate approval. |
| Legacy Firebase config, rules and services | Rejected as-is; canonical SAFER Firebase project/schema/Rules remain authoritative | Never transplant Remix project IDs, credentials, old rules, cache-first settings service, or mock RBAC as authorization proof. |
| Final repository reconciliation / Remix retirement | Not complete | Complete final source-to-destination review, consolidated tests/security review, classify every item as ported/already present/rejected/deferred, then obtain explicit owner approval before archiving/deleting Remix. |

### Audit validation limitation (reaffirmed)

The hardened audit validator checks exact runtime shape and supplied hash-link continuity only. It does not calculate or authenticate event hashes, verify signatures/writers, or provide immutable/append-only storage. The current client has no audit writer, and Firestore Rules deny audit reads and writes. These limitations are intentional release boundaries, not unfinished UI polish.


## DPDP implementation progress (2026-11-14)

The canonical SAFER branch has implemented the DPDP-01 through DPDP-06 synthetic workflow foundations identified during SAFER-Remix reconciliation. The status below distinguishes workflow scaffolding from real legal/operational processing; it does not assert legal compliance.

| DPDP workstream | Current implementation status | Remaining implementation / release boundary |
|---|---|---|
| DPDP-01 — Privacy governance | Implemented as a synthetic-only workflow foundation on this branch: purpose register and organisation-review marker; versioned notice drafts; demo-only approval gated on reviewed linked purposes; supersession of the prior approved notice; consent grant and append-only withdrawal events; derived current consent state; separate browser-local repository with schema validation, 1 MB bound and stale-write detection. | Consolidated validation and accessibility review remain pending. No public notice delivery, legal approval, determination of lawful grounds, or claim of valid consent. |
| DPDP-02 — Data principal rights | Implemented synthetic casework foundation: access, correction, completion, erasure and grievance case types; identity-check states; synthetic-reference match gate before progress/completion; assigned workflow role, scope, decision and evidence-reference fields. | Real identity verification, statutory timelines, external submissions and actual rights fulfilment remain outside the demo. |
| DPDP-03 — Retention/deletion governance | Implemented organisation-defined retention schedule and review date records; disposition proposals for retain/restrict/defer/delete-after-approval; separate organisation-owner approval role; execution is fixed false. | Real deletion remains manual, external and separately authorised; no automated purge or destructive record mutation. |
| DPDP-04 — Personal data breach management | Implemented synthetic breach register with discovery/record timestamps, affected data/system categories, severity, response state, containment/remediation markers, notification assessment and evidence references. | Actual incident response, reportability decision, regulator/data-principal notification and external evidence ingestion are not provided. |
| DPDP-05 — Accountability and assurance | Implemented responsibility assignments, evidence-reference records with reviewer role/timestamp/limitations, and explicit synthetic JSON governance snapshot export; purpose/notice review metadata retained. | Full approval history, trusted evidence verification and integrity-protected export remain future work; no immutable audit or trusted-writer claim. |
| DPDP-06 — Security and validation | Implemented synthetic-only contracts; exact collection envelope; per-collection unique IDs; cross-record reference checks; 500-record limits; 1 MB bound; fail-closed storage; read-back verification; stale-write detection; no remote writes or identity uploads; explicit role/evidence limitations. Regression suites registered. | Consolidated tests and emulator-backed security assurance remain pending before any authenticated/remote workflow. Workflow role labels do not enforce real RBAC. |

New DPDP governance files on this feature branch:
- `src/types/dpdpGovernance.ts`
- `src/utils/dpdpGovernance.ts`
- `src/utils/dpdpGovernance.test.ts`
- `src/utils/dpdpGovernanceRepository.ts`
- `src/utils/dpdpGovernanceRepository.test.ts`
- `src/utils/dpdpCasework.test.ts`
- `src/components/PrivacyGovernancePanel.tsx`
- `src/components/DpdpCaseworkPanel.tsx`

The existing privacy workspace schema and operational collections have not been migrated or rewritten. The new governance workspace uses its own key, `safer_dpdp_governance_demo_v1`, and accepts synthetic examples only. Its demo approval labels are workflow states, not legal determinations. DPDP-01 through DPDP-06 domain, repository and workflow regression tests have been authored and registered under `test:dpdp-governance`; they have not been executed in this implementation batch.


## Validation and regional-format follow-up — 2026-11-15

This dated update supersedes earlier provisional statements in this inventory that described all DPDP automated validation as pending. It does not erase the historical audit notes above.

- **Verified CI baseline:** On exact commit `63077a145197ebaad29eef7492609d11633c4c1`, the repository `validate` check and independent DPDP governance validation check both passed. This evidence applies to that exact commit only; later commits require fresh checks.
- **DPDP assurance documentation:** The assurance note now records the verified CI baseline and separates it from manual accessibility review and any separately evidenced emulator or end-to-end work.
- **Regional-format integration:** The shared account-formatting utilities are applied across the header, dashboard, personnel details/readiness, pre-deployment, incident lists, privacy console, and personnel export preview. The DPDP casework panel was identified as an additional visible timestamp surface and has now been updated to use the account's regional date/time preferences. Stored ISO timestamps, date calculations, sorting, and formal evidence serialization remain unchanged.
- **Remaining UX-01 gate:** Re-run mandatory checks on the latest branch head, then perform a final source-level scan for any remaining user-visible timestamp/number surfaces before marking regional-format integration complete. Do not count CI on the earlier baseline as validation of the newer casework/documentation commits.
- **Migration gate:** End-to-end regression/security review and final source-to-destination reconciliation remain open. SAFER-Remix remains reference-only and must not be archived or deleted without explicit owner confirmation.
- **Release posture:** PR #138 remains open and draft. No merge, deployment, production authentication/rules change, trusted provisioning, or real operational-data migration is authorized by this update.

- **Additional timestamp surface found during final scan:** the DPDP consent lifecycle ledger also rendered its stored ISO timestamp directly. Both that ledger and DPDP casework timestamps now use the shared account formatter; the Account Settings coverage note has been updated to name the DPDP governance workspace. These latest UI changes are awaiting fresh mandatory CI validation.
