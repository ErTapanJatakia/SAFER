# SAFER Static Source-Code Security Review

Review date: 2026-11-16  
Repository: `ErTapanJatakia/SAFER`  
Review baseline: `feature/inf-01-13-infrastructure-completion` and its stacked IAM/OPS changes  
Review type: source-only security review; no CI, tests, build, emulator, browser, penetration test, or deployment validation was run.

## Executive result

The principal API trust boundaries and tenant authorization paths were reviewed. Three concrete source-level findings were remediated on the active stacked feature branches:

1. GitHub Actions previously granted repository write permission and persisted its token while executing pull-request code. The workflow now has `contents: read`, disables checkout credential persistence, no longer supplies a write token, and no longer commits regenerated lockfiles.
2. Tenant invitation processing previously queried Firebase Auth by email before checking the caller's tenant invitation permission. Authorization now runs first, and is repeated in the invitation-creation transaction to close the role-change race. A regression test was added but not executed.
3. Incident creation previously accepted loosely parsed JavaScript date inputs, including numeric timestamps and future dates. Inputs are now required to be valid RFC3339 timestamps with an explicit timezone, valid calendar dates, and no more than five minutes in the future. Regression cases were added but not executed.

This is a source-review result, not a production security certification. Runtime and dependency-advisory validation remain outstanding.

## Review coverage

- All discovered `api/owner/**` and `api/tenant/**` handlers: authentication, HTTP method restrictions, authorization calls, request field handling, response projections, cache headers and error mapping.
- Core `src/server/**` authorization, RBAC, tenant membership, provisioning, invitation, personnel, incident, checklist, evidence, audit, report, configuration and platform support-access services.
- Firebase Admin initialization and browser Firebase configuration.
- Candidate and production Firestore Security Rules, indexes and emulator configuration.
- High-risk frontend paths: AuthGate, tenant workspace API client, membership resolver, data-boundary selection, Demo Guest storage, privacy-demo repository/export and security sanitizer.
- Vercel response headers/CSP and GitHub Actions workflow.
- Dependency manifests and lockfile metadata.

## Findings and disposition

| Area | Finding | Disposition |
|---|---|---|
| API authorization | Tenant APIs verify Firebase ID tokens with revocation checks and resolve role/membership/organisation state from server-side records. Mutations re-read authority in Firestore transactions. | Reviewed; no cross-tenant path interpolation bypass identified in the reviewed handlers/services. |
| Tenant isolation | Tenant data paths are consistently scoped beneath `organisations/{orgId}`; tenant services validate canonical organisation IDs and resource IDs. Employee incident/personnel/checklist reads are constrained by authenticated UID/assignment. | Reviewed; no direct cross-tenant object-reference bypass identified in reviewed services. |
| Invitation identity enumeration | Invite service queried Firebase Auth by email before authorizing `members:invite`, allowing unauthorised callers to distinguish existing/unverified accounts. | **Remediated**: preflight RBAC before Auth lookup plus transactional re-check; regression test added. |
| Incident input validation | Incident date accepted broad JavaScript Date parsing and future values. | **Remediated**: strict RFC3339/timezone/calendar validation and future bound; regression tests added. |
| CI supply chain | Workflow had `contents: write`, persisted checkout credentials, executed PR-controlled code and attempted to push regenerated lockfiles. | **Remediated**: read-only token permission, `persist-credentials: false`, removed explicit token and CI lockfile writeback. |
| Secrets | Firebase Admin credentials are read from server-side `FIREBASE_SERVICE_ACCOUNT_JSON` and checked against the expected project. Browser `VITE_FIREBASE_*` values are public Firebase client configuration, not service-account secrets. `.gitignore` excludes `.env*` except `.env.example`. | No committed live service-account credential was identified in the reviewed tree. Keep private keys exclusively in server-side deployment environment variables; never prefix them with `VITE_`. |
| Frontend exposure | Tenant workspace calls same-origin APIs with Firebase ID tokens and does not persist tenant role claims or operational API data in browser storage. Demo Guest operational records, privacy-demo records, themes and branding preferences use browser-local storage; Demo Guest data is shared by browser profiles/tabs rather than isolated by account. It must remain synthetic-only, especially on shared devices. The app's explicit Demo Guest/authentication boundary prevents that local repository from becoming a tenant repository. React text rendering is used; no `dangerouslySetInnerHTML` or equivalent raw-HTML sink was identified in the reviewed high-risk paths. | Reviewed. Continue to treat all browser state as untrusted and never use hidden UI controls as authorization. |
| Error handling | API handlers generally return stable error codes or generic 503 responses; raw stack traces and database exception messages are not returned by the reviewed endpoints. | Reviewed; no obvious stack/secret disclosure path identified. |
| Evidence | Evidence endpoint stores metadata and a client-claimed hash only; no file bytes, server-side hash verification, malware scanning or secure download path exists. | Correctly represented as metadata-only; not a secure evidence-ingestion capability. |
| Firestore Rules | Production rules are deny-all. Candidate rules restrict paths by active membership and role and deny unmodelled paths. | Production rules were not changed or deployed. Candidate rules remain unapproved for production. |
| Rate limiting / abuse | No application-level per-user/IP rate-limiting control was identified on the API routes. Firebase Auth throttling and hosting protections are not a substitute for explicit API abuse controls. | **Open risk**: add low-cost abuse controls before production or public high-volume exposure. |
| Request size | Individual handlers rely on hosting/body-parser limits rather than a consistent application-level request-size policy. | **Open hardening item**: define explicit small JSON payload limits and reject oversized/non-JSON mutation requests. |
| Dependency reproducibility | `package.json` declares Bun as package manager and `bun.lock` contains package integrity data. The checked-in `package-lock.json` root manifest is stale relative to `package.json` (it omits declared dependencies/devDependencies such as `firebase-admin`, Playwright, Vitest and jsdom). | **Open**: treat Bun lockfile as authoritative; reconcile or retire the stale npm lockfile before supporting `npm ci`. |
| Dependency advisories | A static lockfile inspection cannot establish current vulnerability status. The repository workflow contains `bun audit --prod --audit-level=high`, but it was deliberately not run. | **Not verified**: run dependency advisory audit when the user authorizes validation. |
| Action pinning | Workflow actions use major-version tags (for example, `actions/checkout@v4`, `actions/setup-node@v4`, `oven-sh/setup-bun@v2`). | **Open hardening item**: pin third-party actions to reviewed full commit SHAs and automate update review. |

## Security architecture observations

- Platform Owner access requires a revocation-checked Firebase identity, enabled and verified account, active `platformAdministrators/{uid}` principal, and matching one-time bootstrap pointer.
- Cross-tenant support access requires an active, owner-bound, time-limited session, explicit purpose/change reference and an allowlisted action. Current tenant-data support output is aggregate counts only.
- Tenant role permissions are enforced server-side; membership and organisation records are not accepted from request bodies as authority.
- Mutation services use Firestore transactions for authority re-checks and audit writes.
- API responses are marked non-cacheable where they return authenticated tenant/platform information.
- The browser membership resolver performs a direct Firestore membership read. Since repository production rules are deny-all, the tenant sign-in flow will not resolve membership against a deployment using those exact rules until a separately reviewed production Rules release is approved. Do not weaken the deny-all production policy as a workaround.
- Vercel CSP, frame protections, MIME sniffing protection, referrer policy and restrictive Permissions-Policy are configured. The CSP allows inline styles for the current UI but does not allow inline scripts or `unsafe-eval`.

## Explicit limitations / next validation gate

- No CI, test suite, type-check, dependency audit, build, emulator, browser, runtime, penetration, load or deployment checks were executed, by instruction.
- Newly added regression tests have not been run.
- No production Firestore Rules or indexes were deployed.
- No live secrets were inspected in Vercel/Firebase settings; repository source inspection cannot prove deployment secret hygiene or rotation.
- Static review cannot prove absence of vulnerabilities or validate runtime behaviour.

**Status:** Source-level review of the requested security domains is complete for the identified API/server trust boundaries and high-risk frontend/configuration paths. The open risks above must be addressed or explicitly accepted before production use. The next step is the user-provided ZIP runtime review, still without CI unless separately authorized.
