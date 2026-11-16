# INF-01–INF-13 — Infrastructure implementation and release status

**Branch:** `feature/inf-01-13-infrastructure-completion`  
**Base:** `feature/ops-01-10-completion` (stacked above draft PR #152)  
**Cost posture:** retain Firebase + Vercel, INR 0, no paid services or new infrastructure  
**Validation:** no CI, tests, type-check, build, emulator, index deployment, Firebase configuration change or production release was run.

| ID | Agreed deliverable | Repository finding / implementation | Status and remaining work |
|---|---|---|---|
| INF-01 | Firebase Authentication | Existing web SDK configuration and AuthGate flows retained. Added strict canonical project-ID validation: only `safer-2026` can initialise Firebase; incomplete configuration remains optional for synthetic Demo Guest. | Implemented foundation. Actual provider settings, authorised domains, email/Google sign-in and production credentials require console-side verification; not changed here. |
| INF-02 | Firebase Admin SDK | Existing server-only Admin SDK reads `FIREBASE_SERVICE_ACCOUNT_JSON` and `FIREBASE_PROJECT_ID`; hardened validation for service-account type, exact project, service-account email and PEM private key. | Implemented foundation. Vercel secret presence/rotation and live identity verification remain operator checks; no secrets read, printed or changed. |
| INF-03 | Firestore schema redesign | Canonical organisation/member/operational schemas and schema-version checks already exist in server modules, rules candidate and architecture documents. | Partially implemented. Complete schema inventory, migrations/version transitions and final data lifecycle design remain. No live data migration. |
| INF-04 | Firestore Security Rules | Candidate least-privilege tenant rules and emulator suite exist on the stacked branch. Production posture is separately deny-all. | Candidate implemented; review and emulator validation pending. Do not publish or enable client data access without separate explicit approval. |
| INF-05 | Server-side authorization | Trusted Firebase token verification, disabled-user checks, authoritative membership/organisation reads and canonical role/action policy exist. Tenant APIs use the trusted boundary. | Foundation implemented; perform full endpoint-by-endpoint authorization and transaction audit before production. |
| INF-06 | Firestore indexes | Added `firestore.indexes.json` and registered it in `firebase.json`. Includes employee-filtered incident/date and checklist/updatedAt composite indexes. Other observed list queries use single-field ordering, covered by Firestore automatic indexes. | Configuration implemented; emulator/deployment verification pending. No index deployment was performed. Revisit if query shapes change. |
| INF-07 | Security regression coverage | Existing rules, tenant RBAC, role matrix, platform-owner, endpoint and cross-tenant tests provide substantial authored coverage. | Partially implemented. The consolidated test suites have not been run; close any uncovered endpoint/resource cases after review. |
| INF-08 | Dependency and build assurance | Existing dependency/build workflow and package scripts remain in place. | Workflow exists; no dependency audit, lockfile regeneration, build or CI run was executed. GitHub Actions remain under the user's control. |
| INF-09 | Budget Policy Inspector | Existing local-only INR 0 Budget Policy Inspector and evaluator are already integrated. Unknown providers return manual review; paid billing/non-zero cost are rejected. | Implemented. Advisory only: it cannot prevent billing or provide live provider pricing. Keep all provider plan claims subject to current-term review. |
| INF-10 | Infrastructure documentation | Firebase setup, Admin SDK, production Firestore foundation, candidate rules testing, authorization and migration documentation exist. Added this consolidated INF status and index inventory. | Improved; update documentation as validation and deployment decisions are approved. |
| INF-11 | SAFER-Remix reconciliation | Migration inventory and register exist; unique/overlapping/unsafe candidates are classified at a high level. Budget inspector has already been selectively reconciled. | In progress. Complete source-to-destination feature/file parity review; do not bulk merge or reuse old Firebase config/data. |
| INF-12 | Legacy Remix retirement | Existing retirement gates require complete inventory, approved feature disposition, validation, docs reconciliation and explicit user confirmation. | Deliberately not implemented. Keep SAFER-Remix private and unchanged as a reference until every gate is met and the user explicitly approves retirement. |
| INF-13 | Production readiness | Security, privacy, legal, operations, cost and deployment gates are documented across the architecture and runbooks. | Not production-ready. Requires completed validation, independent security review, legal/privacy review, operational runbooks, production configuration verification and explicit release approval. |

## Firestore index inventory

| Collection | Query shape | Composite index |
|---|---|---|
| `incidents` | Employee filter `reportedByUid == uid`, ordered by `dateReported DESC` | `reportedByUid ASC, dateReported DESC` |
| `checklists` | Employee filter `assignedToUid == uid`, ordered by `updatedAt DESC` | `assignedToUid ASC, updatedAt DESC` |

The indexes file is configuration only. It does not create indexes until explicitly deployed. No Firestore index deployment or production database mutation was performed.

## Release and security boundaries

- Firebase project remains `safer-2026`; intended Firestore region remains `asia-south1` (Mumbai).
- Remain on Firebase Spark. Do not attach billing or enable paid Firebase products.
- Keep Vercel Hobby and existing deployment architecture; no paid hosting or new service.
- Service-account credentials must exist only in server-side secret storage. Never commit them, expose them to Vite variables, or log their values.
- Candidate Firestore rules are not production-published rules. Production rules remain deny-all.
- No real personnel, incident, evidence or other operational data migration is authorised.
- No SAFER-Remix repository deletion/archive is authorised.
- No CI, test, type-check, build, emulator or deployment was run for this work.

## Consolidated validation gate (not executed)

1. Run the Firebase web configuration unit tests and verify expected project mismatch fails closed.
2. Run Firebase Admin SDK configuration tests using synthetic credentials only; never use or print live secrets.
3. Run Firestore Rules Emulator tests and tenant authorization suites.
4. Verify both composite query indexes against the exact employee list query shapes in the emulator.
5. Run the complete dependency, type-check and production build assurance batch only when the user re-enables/authorises CI.
6. Review every API route for token revocation, authoritative membership, least privilege, resource ownership, tenant scoping and audited mutations.
7. Complete the SAFER-Remix source-to-destination parity audit.
8. Obtain explicit security, privacy/legal, operational and user release approval before any production rules/index deployment or real-data use.

A successful local test or CI run alone does not authorise production rules publication, billing changes, real-data migration, or legacy repository retirement.
