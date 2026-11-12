# SAFER operational-data boundary and tenant-isolation design

**Status:** Design proposal; no application implementation or production release approval  
**Baseline:** PR #18 merge `fdb2ee96ef36a6014eb3e6af1bb2494531ab9a5f`  
**Production posture:** Firebase Console-published Firestore rules remain deny-all  
**Data posture:** Existing browser data remains local; synthetic demonstration data only; no migration, upload, sync, or operational Firestore access

## 1. Decision summary

SAFER must separate three concerns that are currently close together in the application:

1. **Identity:** Firebase Authentication establishes who signed in (UID).
2. **Tenant authority:** the exact organisation membership resolver establishes whether that UID has an active, supported membership for one organisation.
3. **Data access:** a repository selected for that verified tenant may access only that tenant's approved collections, after production rules have separately been reviewed and published.

A signed-in user, verified email, URL parameter, browser key, profile document, UI role, or locally cached organisation identifier is not sufficient authority to load operational records.

The current application still owns operational state in `src/App.tsx` and persists it under global browser `localStorage` keys. These keys are not scoped to an account or organisation. The existing AuthGate/membership flow does not convert those records into tenant-isolated data. Until a new boundary is implemented and separately approved, signed-in and guest experiences must not treat the existing local records as tenant data.

This document is architecture only. It does not change application behaviour, Firestore rules, Firebase configuration, production data, or migration state.

## 2. Current browser-storage inventory

The repository's current `src/App.tsx` reads and writes the following keys:

| Key | Current state | Classification | Proposed treatment |
|---|---|---|---|
| `prot_ops_personnel_v2` | `PersonnelRecord[]` | Mixed tenant-operational, confidential personal, and highly sensitive data | Do not upload or expose as tenant data. Split operational summary from restricted personal/health details under the approved schema; health fields excluded from v1 |
| `prot_ops_incidents_v2` | `IncidentReport[]` | Confidential security/operational data; optional structured draft may contain witness, people, medical, location, raw-note and evidence details | Do not upload or expose as tenant data. Separate summary from restricted incident detail; restricted detail excluded from v1 |
| `prot_ops_cyber_v2` | `CyberHygieneItem[]` | Security posture / finding data; may become sensitive when tied to a person, device, account, or verified finding | Keep generic educational recommendations static where practical. Any tenant findings require separate purpose, scope, and access review |
| `prot_ops_checklist_v2` | `PreDeploymentChecklistItem[]` | Operational readiness data; may identify people, assignments, review decisions, or security arrangements | Keep generic baseline checklist content static. Tenant-specific task state requires an approved tenant schema and access policy |
| `prot_ops_theme_v2` | Theme identifier | Low-sensitivity device preference | Device-local preference; allowlist values |
| `prot_ops_is_custom_theme_v2` | Boolean | Low-sensitivity device preference | Device-local preference |
| `prot_ops_custom_theme_v2` | Custom colour tokens | Low-sensitivity device preference | Device-local preference; validate values |
| `prot_ops_top_logo_v2` | Logo configuration / data URL | Branding asset; may be organisation-associated | Keep local-only in this phase; do not treat as verified tenant branding or upload it |
| `prot_ops_bottom_logo_v2` | Logo configuration / data URL | Branding asset; may be organisation-associated | Keep local-only in this phase; do not treat as verified tenant branding or upload it |
| `prot_ops_a11y_v2` | Accessibility settings | Low-sensitivity user/device preference | Device-local preference; allowlist values |

The current code also initialises operational collections from bundled mock fixtures when a key is absent or cannot be parsed. This is useful for the demonstration experience, but it must not be mistaken for an organisation's authoritative records.

The repository search found no current application use of IndexedDB, Cache Storage, or sessionStorage for these operational collections. This is a code-search finding, not a claim about browser extensions, hosting layers, or user-installed scripts.

## 3. Data classes and handling rules

### 3.1 Public demonstration content

Examples: fictional demonstration scenario, generic training text, generic checklist templates, static educational guidance.

- Prefer bundled, version-controlled fixtures over tenant storage.
- Clearly label synthetic examples as demonstrations.
- Never seed a real organisation or person from demo fixtures.
- Resetting demo state must not mutate tenant records.

### 3.2 Tenant operational summaries

Potentially eligible only after a separate schema and rules release: pseudonymous personnel references, allowlisted role labels, coarse assignment sector, qualification status, incident category/status/priority, and carefully reviewed summary fields.

- Every record is nested below exactly one `organisations/{orgId}` path.
- Record IDs are opaque; they are not authorization.
- Tenant path and immutable `orgId` must agree.
- Initial access target remains owner/admin only for the specifically approved summary collections.
- Manager and viewer access remains denied in v1.
- No client delete permission in v1.
- No record is eligible merely because a current TypeScript interface contains the field.

### 3.3 Confidential personal and employment details

Examples: legal/full name, personal or official contact details, birth date, marital status, residential/correspondence address, detailed work history, employer contacts, identity-linked documents.

- Do not copy the current `PersonnelRecord` as one Firestore document.
- Keep out of the initial tenant-access release.
- Require field-by-field necessity, purpose, access, retention, correction, deletion/legal-hold and privacy review before any future design.
- UI redaction and export redaction are not database authorization controls.

### 3.4 Highly sensitive health and incident information

Examples: blood group, rare phenotype details, health particulars, medical incident details, witness information, involved persons, raw notes, unverified claims, precise locations, detailed chronology and sensitive evidence references.

- Excluded from initial Firestore schema and initial tenant access.
- Do not put these fields in broad-read summaries.
- Require a separate, stricter design and explicit release approval; exclusion is the default.

### 3.5 Security findings and evidence

Cyber hygiene records can become security-sensitive when they describe a real device, account, vulnerability, control failure, or named individual. Incident evidence and evidence references may disclose security posture or personal information.

- Generic recommendations remain static educational content.
- Verified tenant findings and evidence metadata require a dedicated classification, access, integrity, retention and disclosure review.
- No binary evidence, attachments, storage URLs, or evidence bytes are in scope for this phase.
- Client-authored audit events must not be represented as immutable or authoritative.

## 4. Required runtime access states

The future application data boundary should use an explicit state machine rather than infer authority from whether a user is signed in.

| State | Meaning | Permitted data |
|---|---|---|
| `signed_out` | No authenticated identity | Public/static content and explicitly synthetic demo mode only |
| `demo_guest` | User deliberately entered demo mode | Synthetic demo repository only; no tenant reads/writes |
| `authenticated_unresolved` | Auth exists; membership lookup pending or organisation not resolved | No operational records; show loading/selection/verification UI |
| `tenant_active` | Auth UID, exact org ID, active organisation and active supported membership all match | Only repositories and collections explicitly approved for that tenant and role |
| `tenant_denied` | Missing, inactive, revoked, suspended, mismatched, unsupported or failed membership resolution | No operational tenant records; fail closed |
| `signed_out_transition` | Sign-out/account switch/tenant switch is in progress | Immediately clear in-memory tenant state and cancel stale requests before rendering another context |

The `tenant_active` state is necessary but not sufficient for production data access: the production Firestore rules must also be separately published and verified. A client-side state machine is a UX and data-flow guard, not a replacement for Security Rules.

### Mandatory invalidation

Immediately clear tenant-scoped in-memory records, selected-record references, pending writes, and derived caches when any of the following occurs:

- Firebase Auth UID changes or sign-out occurs;
- organisation locator or selected organisation changes;
- membership resolution becomes inactive, denied, stale, or errors;
- the organisation becomes inactive or unavailable;
- a tenant data request fails authorization.

Late responses from an earlier UID/org generation must be discarded. A stale successful response must never repopulate a newly signed-in user's state.

## 5. Repository and module boundary

Introduce a typed application data boundary only in a future implementation PR:

- `DemoRepository`: synthetic fixtures only; no Firebase access and no ability to target an organisation.
- `TenantRepository`: requires an immutable verified tenant context containing UID, org ID, role and a context-generation token. It exposes only explicitly approved operations.
- `RepositoryFactory`: returns a tenant repository only when the membership resolver has produced the exact active context and the application is in an explicitly enabled release mode. Otherwise it returns no tenant repository.
- Feature modules receive repository capabilities through explicit props/context; they do not import Firebase clients or read browser storage directly.
- The repository revalidates context generation before committing asynchronous results and writes.
- Firestore path construction is centralised; callers cannot pass arbitrary collection paths or choose another tenant ID.
- Rules remain the final enforcement point for every request.

No generic `save(collection, id, data)`, arbitrary path API, role argument, or client-controlled org switch should be exposed.

### Current-state compatibility

Do not simply rename the existing global keys to include a UID or org ID. That would create a false sense of server-side authorization, could silently associate old shared-browser data with the wrong person, and would not prevent client tampering.

Do not automatically copy, re-key, merge, delete, or upload any existing localStorage records during the boundary implementation. The existing keys must be handled through a separately reviewed transition plan. Until that plan is approved, synthetic-only use remains mandatory.

## 6. Demo and tenant separation

The demo and tenant modes must be separate data planes:

- Demo fixtures are clearly marked synthetic and cannot be promoted to tenant records by changing a mode flag.
- Tenant repositories never read demo keys or use mock fixtures as a fallback for a failed network read.
- Demo reset affects demo state only.
- Tenant errors must not silently fall back to demo data or localStorage.
- A tenant context must never reuse a demo record ID as an authorization or ownership signal.
- Exports must identify whether the source is demo or tenant data and preserve existing field-level redaction; export output must not bypass repository authorization.

The final UI design must make the current data mode visible and unambiguous. This is not approval to build a tenant onboarding or migration screen.

## 7. Offline, caching, and browser lifecycle

Initial tenant release should be online-only unless a separately reviewed offline threat model is approved.

- Do not persist tenant operational records to localStorage, IndexedDB, Cache Storage, service-worker caches, or browser-managed offline queues.
- Disable Firestore persistent offline cache for sensitive tenant collections unless a future design explicitly approves it with device-sharing, logout-clearing, encryption, retention and revocation analysis.
- Do not queue tenant writes for later replay.
- Do not keep tenant data in shared module-level caches.
- On tab refresh or application restart, resolve Auth and membership again before loading tenant data.
- Browser storage for theme and accessibility preferences remains device-local and must not influence authorization.
- Organisation branding remains local-only until a dedicated tenant branding policy and permissions are approved.

## 8. Migration and data lifecycle — not enabled

Any future migration must be a separate, opt-in project after rules and the repository boundary are production-ready. Minimum controls:

1. Explicitly identify the source browser profile and destination organisation.
2. Explain that legacy keys may have been shared across users of the same browser profile.
3. Require the user to confirm they are authorised to move each selected record.
4. Provide a read-only preview with record counts, validation errors, duplicate/conflict detection and field classification.
5. Exclude highly sensitive fields and all v1-restricted domains by default.
6. Preserve IDs only where safe; generate new opaque IDs where required and retain a controlled mapping only if justified.
7. Preserve provenance; never invent original creator, creation time, reviewer or audit history.
8. Require deliberate confirmation immediately before transfer.
9. Record migration completion and failures through a trusted, reviewed mechanism; do not claim browser-generated logs are immutable.
10. Provide reconciliation and a documented rollback/recovery plan without destructive source cleanup.
11. Do not delete source browser data automatically.
12. Obtain separate explicit approval for the migration release.

No migration tool, upload path, background sync, or import API is authorised by this design.

### 8.1 Current Demo Guest retention and reset behaviour

The current browser-local Demo Guest repository has **no automatic expiry or retention timer**. Operational demo records remain in the same browser profile's local storage after a tab closes, the browser restarts, or the user signs out. Session revocation prevents a retained repository capability from being used; it does not erase the stored records.

The application provides a **Reset Records** action. It removes only the four operational demo keys:

- `prot_ops_personnel_v2`
- `prot_ops_incidents_v2`
- `prot_ops_cyber_v2`
- `prot_ops_checklist_v2`

It restores the bundled synthetic baseline on the next load. Theme, accessibility and branding preferences are intentionally outside this reset operation. Clearing site data through the browser is a separate user-controlled action and may remove those preferences as well.

This is a prototype lifecycle, not a formal retention or secure-erasure guarantee. Browser profiles, backups, extensions, developer tools, operating-system snapshots and other browser-managed copies are outside the application's control. Users must continue to enter synthetic data only. A future retention policy must define an explicit period, user notice, expiry behaviour, recovery expectations and deletion verification before automatic cleanup is implemented. No silent expiry or sign-out wipe is introduced by this change.

## 9. Release gates before any tenant operational data access

All of the following must be independently satisfied:

1. Freeze and review the field-level schema and data classification.
2. Implement the data boundary and state machine with unit/integration tests.
3. Prove no operational module reads global operational localStorage in tenant mode.
4. Prove account switch, org switch, sign-out and stale async responses clear tenant data.
5. Prove demo/tenant repository separation and no fallback between them.
6. Prove every query is tenant-constrained and every unauthorized role/path fails closed in the Firestore Emulator.
7. Review the candidate rules, positive/negative tests, query constraints and document limits.
8. Review privacy, retention, export, correction, deletion/legal-hold and incident/evidence handling.
9. Review first-owner bootstrap and operator evidence separately.
10. Run required CI on the final commit and complete independent security review.
11. Obtain separate explicit approval before publishing any production rules.
12. Obtain separate explicit approval before enabling tenant operational reads/writes.
13. Obtain separate explicit approval before any migration or real-record onboarding.

Production rules remain deny-all until the distinct production rules release is explicitly approved. A green CI run or merged design document does not satisfy these gates.

## 10. Explicit non-actions

This proposal does not:

- modify application code or current localStorage keys;
- enable or change Firestore reads/writes;
- modify candidate or production Firestore rules;
- create an organisation or membership;
- bootstrap an owner or assign a role;
- migrate, upload, synchronise, re-key, or delete existing browser records;
- enable offline persistence, Storage, Cloud Functions, Cloud Run, Admin SDK, analytics, or paid services;
- authorise real personnel, health, employment, incident, evidence, or other operational records.

The next implementation step, if this design is accepted, is a narrow, test-first data-boundary foundation that preserves the current synthetic demo while making tenant operational data inaccessible until all release gates are met.
