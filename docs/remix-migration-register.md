# SAFER Remix migration register

**Canonical destination:** `ErTapanJatakia/SAFER`  
**Reference source:** private `ErTapanJatakia/SAFER-Remix`  
**Status:** Initial repository-level inventory; implementation decisions require per-feature review  
**Budget constraint:** INR 0; Firebase Spark and free-tier services only

## Objective

Move every useful, unique, approved capability from SAFER-Remix into the canonical SAFER application. SAFER-Remix remains a read-only reference during migration. It is not a second product or a merge target.

The reference repository is to be retired only after the completion gates in this document are met. Do not delete or archive it during feature discovery or implementation.

## Initial feature inventory

This is a first-pass comparison of repository structure and selected source files. “Candidate” does not mean the feature is ready to port; source behavior, dependencies, security boundaries, and overlap must be reviewed before implementation.

| Feature area | SAFER-Remix source | Canonical SAFER baseline | Initial disposition |
|---|---|---|---|
| Authentication gateway | `AuthGatewayView.tsx`, `firebaseAuth.ts`, `authValidation.ts` | `AuthGate.tsx` already provides sign-in, registration, password reset, email verification, Google sign-in and tenant-membership gating | Compare flows and port only genuine UX/validation gaps; do not replace the existing session and tenant boundary |
| Account menu and profile/settings | `AccountMenuDropdown.tsx`, `MyAccountSettingsView.tsx`, `accountSettingsHelpers.ts`, `types/settings.ts` | Theme, accessibility and core navigation exist; a dedicated account/settings experience is not present in the current App shell | Candidate for selective migration: profile/security/preferences/privacy controls, reusing existing theme/accessibility implementations |
| Organisation management and RBAC UI | `OrganisationModal.tsx`, `types/multiorg.ts`, `multiOrgRbac.test.ts` | `AuthGate.tsx`, `tenantMembership.ts`, `sessionLifecycle.ts`, and Firestore architecture docs provide a deliberately narrow membership gate; no equivalent organisation administration UI was found in the current component tree | Candidate; redesign against canonical tenant schema and least-privilege role model. Do not copy the Remix role model or client-side authority assumptions as-is |
| Privacy notice | `PrivacyNoticeModal.tsx`, `types/privacy.ts` | Demonstration notice and data-boundary disclosures exist; no equivalent full privacy notice component was found in the current component tree | Candidate; rewrite claims and notices for actual SAFER behavior and legal review, not a verbatim copy |
| Privacy / data-principal console | `PrivacyConsoleModal.tsx`, `privacyService.ts` | No equivalent privacy console or service was found in the current source tree | High-value candidate; staged migration after data classification, purpose/consent model, access controls, retention semantics and legal review |
| INR 0 budget policy inspector | `BudgetPolicyModal.tsx`, `budgetPolicy.ts`, `BUDGET_POLICY.md` | Zero-cost deployment constraints are project requirements, but no equivalent interactive policy inspector/report was found in the current component tree | Candidate for early migration after validating every provider/quota/tier assertion against current official terms |
| Privacy-safe AI prompt preparation | `privacyService.ts` (Gemini redaction helpers and configuration) | Existing defensive data-boundary and sanitization work; no direct Gemini integration in the current app shell | Review as a standalone offline utility only; no API key, network integration, or transmission of operational data |
| Firestore data service and rules | `firestoreService.ts`, `firestore.rules`, `firebase-applet-config.json`, `firebase-blueprint.json` | Canonical SAFER has its own Firebase config boundary, deny-by-default rules, tenant-membership resolver and security emulator tests | Do not copy. Compare invariants only. Keep canonical Firebase project/configuration and rules authoritative; any future rules change requires separate approval and emulator/security review |
| Readiness, personnel, incident, cyber-hygiene, checklist, branding and exports | Multiple shared component and utility areas | These core product areas already exist in canonical SAFER with regression coverage | Treat as overlap; migrate only demonstrably unique behavior discovered during deeper comparison |

## Explicit exclusions

- Do not reuse the Remix Firebase project, applet configuration, database ID, project identifiers, credentials, or deployment configuration.
- Do not copy `firestoreService.ts` or Remix Firestore rules into canonical SAFER. They are comparison material only.
- Do not migrate hard-coded account identifiers, sample emails, or old provisioning instructions.
- Do not copy localStorage privacy/retention behavior without reviewing its correctness and limitations.
- Do not import, upload, or migrate real personnel, incident, health, identity, or other operational records.
- Do not enable production Firestore reads/writes, publish rules, provision tenants, or change authentication configuration as part of a feature-only migration.
- Do not introduce paid APIs, Firebase Blaze, Cloud Functions, paid storage, billing accounts, or paid infrastructure.

## Proposed implementation sequence

1. **Complete source-to-destination audit.** Inspect every Remix source file, component dependency, route, data model, test and documented feature. Mark each item as unique, overlapping, obsolete, unsafe, or out of scope. Record exact destination files and acceptance criteria.
2. **Low-risk policy and settings capabilities.** Validate and migrate the INR 0 budget inspector/report and selected account preference/settings capabilities, reusing SAFER's current theme and accessibility code.
3. **Organisation and account experience.** Design the UI against canonical SAFER's tenant-membership architecture. Add organisation administration only after schema mapping, role matrix, rules invariants and emulator tests are agreed.
4. **Privacy and DPDP workflows.** Migrate notice, consent, data-principal request, grievance, retention and prompt-redaction capabilities as separately testable slices. Review statutory references and timelines; clearly distinguish workflow assistance from legal compliance. Retention deletion must be explicit, scoped, reviewable and tested; no automatic purge of live data.
5. **Authentication and integration reconciliation.** Close only verified UX/validation gaps between Remix and SAFER's existing AuthGate; preserve current session invalidation, exact membership resolution and Demo Guest isolation.
6. **Parity and retirement review.** Re-run the inventory against both repositories, verify tests and documentation, and obtain an explicit final retirement confirmation before deleting the reference repository.

## Per-feature migration gates

Every migrated capability must have:
- A documented source-to-destination mapping and rationale.
- A clear owner, scope, dependencies and non-goals.
- Unit, component and browser tests appropriate to its risk.
- Accessibility and responsive behavior checks.
- Security review for identity, authorization, privacy, export and persistence boundaries.
- No regression to existing SAFER features.
- A passing required GitHub Actions run before merge.
- No weakening or deletion of tests to obtain a green run.

After the same test/CI strategy fails three consecutive times, stop repeating it and redesign or defer the work.

## SAFER-Remix retirement gates

The reference repository may be retired only when all of the following are true:

1. The source inventory is complete and every source feature/file is classified.
2. Every approved unique feature is implemented in canonical SAFER or has a documented, accepted exclusion rationale.
3. All migrated features pass their required tests and security reviews.
4. Canonical documentation, architecture decisions, setup instructions and deployment references no longer depend on SAFER-Remix.
5. A final source-to-destination parity audit finds no unreviewed unique capability.
6. The canonical SAFER main branch is stable and the user explicitly confirms repository retirement.

Until then, keep SAFER-Remix private and unchanged as a reference. Do not delete it, archive it, or treat a successful code copy as proof of feature parity.
