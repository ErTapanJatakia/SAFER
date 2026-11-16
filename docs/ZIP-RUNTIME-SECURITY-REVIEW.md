# SAFER Uploaded ZIP Review — Runtime and Security Notes

Review date: 2026-11-16  
Baseline: user-uploaded `SAFER-main.zip`  
Review mode: isolated local workspace; no production Firebase access, real-data access, deployment, or GitHub Actions execution.

## Validation completed on the reviewed ZIP

- **186 Node-native tests passed, 0 failed** across the selected non-browser, non-Firestore-emulator `.mjs` suites.
- **84 JavaScript/MJS files** passed `node --check`.
- **7 JSON manifests/configuration files** parsed successfully.

This is not a full application runtime sign-off. The following were not completed:
- Vite production build and full TypeScript check (dependencies were not installed; `vite/client` types were unavailable).
- Browser/Playwright tests and Firebase Emulator tests (required dependencies/tooling unavailable).
- Dependency advisory audit (Bun executable unavailable; offline package installation was blocked by uncached packages).

## Security review scope and findings

### Authorization and tenant isolation
- Reviewed the discovered `api/owner/**`, `api/tenant/**` handlers and their server-service dependencies.
- Tenant APIs verify Firebase ID tokens with revocation checks and enforce server-side membership/role authorization.
- Tenant document paths are scoped beneath `organisations/{orgId}`; employee incident listings constrain results to the authenticated reporter.
- Sensitive membership and organisation authority is re-read inside Firestore transactions.
- Browser roles and organisation locators are not treated as server authority; the tenant operational boundary fails closed.
- No obvious cross-tenant path interpolation bypass was identified in the reviewed handlers/services.

### Secrets and frontend exposure
- No live service-account JSON/private key was found in the uploaded archive.
- Firebase Admin credentials are server-side environment values; browser `VITE_FIREBASE_*` settings are public client configuration.
- No obvious `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function` or open-redirect sink was identified in the scanned source.
- Demo Guest operational records and privacy-demo records use browser-local storage and must remain synthetic-only. Do not enter real personnel, incident, identity, health or confidential data.
- Browser state is untrusted and does not grant server-side access.

### Evidence, error handling and operational hardening
- Reviewed API handlers generally return stable error codes or generic service-unavailable responses rather than raw stack traces/database errors.
- Evidence remains metadata-oriented; secure file ingestion, server-side hash verification, malware scanning, secure downloads and full chain of custody are not established.
- Application-level API rate limiting and a uniform request-body size policy were not identified.

### Dependency and supply-chain observations
- The archive declares Bun 1.4.4 and contains a Bun lockfile with Firebase Admin.
- The npm lockfile root is stale relative to `package.json`; it omits `firebase-admin` and several declared development dependencies. npm reproducibility is therefore not established.
- No live dependency advisory audit was completed. The review does not claim the dependency tree is vulnerability-free.
- GitHub Actions references use major tags rather than immutable full commit SHAs; pinning remains recommended.

## Remediation and GitHub alignment

The uploaded ZIP was an older, separate source snapshot. Several remediations identified in that snapshot were already present on the parent GitHub review branch (including invitation authorization preflight, incident date validation, CI write-permission reduction, and the production/emulator Firestore configuration boundary).

This follow-up branch carries the remaining personnel-input allowlisting and additional regression coverage. It also corrects stale test expectations/harnesses for invitation replay, Owner status-route delegation, localized mobile navigation and tenant-report test readability. The personnel allowlist explicitly retains the supported `employeeUid` assignment field while rejecting unknown fields, cross-tenant `orgId`, non-plain input objects and accessor properties. Timestamp regression coverage also includes rejection of a timezone-less date.

The local 186-test result applies to the reviewed ZIP copy, not to this GitHub branch. No CI, browser test, emulator test, build, dependency audit, merge, production Rules publication or deployment has been run for this follow-up.
