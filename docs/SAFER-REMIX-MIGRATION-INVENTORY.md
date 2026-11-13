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
| Strict INR 0 budget policy and cost inspector | `BUDGET_POLICY.md`, `src/utils/budgetPolicy.ts`, `src/utils/budgetPolicy.test.ts`, `src/components/BudgetPolicyModal.tsx` | Strong first candidate; local-only and useful as a visible project guardrail. Existing evaluator is fail-open for unknown service names and must be redesigned; UI must not claim it can inspect or prevent cloud billing. | Port a corrected policy model, conservative unknown-service handling, accurate labels, unit tests and accessible UI. |
| Authentication gateway and account lifecycle | `src/components/AuthGatewayView.tsx`, `src/utils/firebaseAuth.ts`, `src/utils/authValidation.ts`, `src/utils/authValidation.test.ts` | Candidate; SAFER has related authentication/session foundations. | Compare behavior; verify password policy, email verification/reset, session invalidation, error handling, and no credential exposure. Do not enable sign-in or configure production Firebase in this migration PR. |
| Account profile and settings | `src/components/MyAccountSettingsView.tsx`, `src/components/AccountMenuDropdown.tsx`, `src/utils/accountSettingsHelpers.ts`, `src/utils/userSettingsService.ts`, related tests and `src/types/settings.ts` | Candidate; theme/accessibility preferences already exist in SAFER and must remain the source of truth. | Merge only missing capabilities; preserve SAFER's 20-theme system, accessibility behavior, and local Demo Guest boundary. Validate all persisted settings at runtime. |
| Organisation administration and multi-organisation RBAC | `src/components/OrganisationModal.tsx`, `src/types/multiorg.ts`, `src/utils/multiOrgRbac.test.ts` | High-value but security-sensitive; current test file includes mock rule evaluation and does not by itself prove Firestore enforcement. | Design tenant model independently; add emulator-backed Firestore rules tests for default-deny, cross-tenant isolation, self-promotion, revoked membership, read-only auditor, Demo Guest isolation, and immutable audit events. No operational collection migration. |
| Privacy console, notice and rights-request workflow | `src/components/PrivacyConsoleModal.tsx`, `src/components/PrivacyNoticeModal.tsx`, `src/utils/privacyService.ts`, `src/utils/privacyService.test.ts`, `src/types/privacy.ts` | Candidate; useful privacy operations, but includes sample organisation/DPO/contact details and legal-basis assertions that must not be copied as real facts. | Replace sample identities with clearly synthetic placeholders; validate request lifecycle and data minimisation; review DPDP terminology with legal caution; do not claim compliance or automate deletion before verified controls exist. |
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
- [ ] Corrected INR 0 budget policy inspector (first functional port; local-only).
- [ ] Authentication/account lifecycle comparison and isolated implementation plan.
- [ ] Profile, preferences, accessibility and account-settings reconciliation.
- [ ] Privacy notice and privacy-request workflow review and selective port.
- [ ] Multi-organisation data model and RBAC threat model.
- [ ] Emulator-backed Firestore rules and tenant-isolation tests.
- [ ] Trusted provisioning documentation rewritten for SAFER.
- [ ] End-to-end regression and security review of every migrated capability.
- [ ] Final source-to-destination reconciliation.
- [ ] Archive/delete SAFER-Remix only after all approved features are verified in SAFER and the owner explicitly confirms retirement.

## Definition of complete

A Remix capability is considered migrated only when SAFER contains the reviewed implementation, relevant automated regression/security tests pass, documentation matches actual behavior, and the feature is usable in SAFER without relying on the Remix repository. The Remix repository must remain available until every candidate is classified as **ported**, **already present**, or **explicitly rejected/deferred with rationale**.


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
| Organisation workspace context | Partially represented by the verified read-only workspace and organisation profile panels |
| Six-role RBAC hierarchy | Rejected as-is; retain canonical four-role vocabulary until a separate trusted authorization design is approved |
| Platform super-admin | Deferred; no platform-wide privilege exists in current canonical Rules |
| Cross-tenant isolation | Enforced by canonical Rules and expanded emulator tests; do not rely on Remix mock evaluator |
| Membership management UI | Deferred until a trusted provisioning authority is approved |
| Member-created append-only audit events | Rejected as-is; canonical audit path remains fully denied |
| Simulated audit activity | Rejected; no synthetic event should be presented as a real security event |
| Sample organisations and identities | Rejected for production; use clearly labelled emulator fixtures only |
| Manual provisioning runbook | Replaced by canonical ADR and current-schema runbook; old instructions are unsafe for this project |

### Follow-up actions

- [x] Record the incompatibilities and non-portable claims in the canonical migration inventory.
- [ ] Review the reference repository's provisioning documentation for unnecessary personal/project identifiers and redact if appropriate.
- [ ] Finish mapping the remaining genuinely unique Remix organisation UI ideas against the canonical workspace without importing fake tenant data or unsupported permissions.
- [ ] Complete the consolidated emulator and project CI validation milestone before opening a review PR.
