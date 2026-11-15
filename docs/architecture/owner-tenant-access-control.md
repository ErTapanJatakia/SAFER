# SAFER Owner and PMC Tenant Access-Control Architecture

**Status:** Implemented development baseline — production authorization release remains gated by review, emulator validation and controlled deployment  
**Scope:** Platform Owner, PMC Super Admin, PMC Admin, PMC Managers, PMC Employees and authorised read-only users  
**Cost target:** INR 0 recurring infrastructure spend, subject to free-tier quotas and provider terms

## 1. Governing hierarchy

```text
SAFER APPLICATION OWNER (platform_owner)
└── PMC ORGANISATION (tenant)
    └── SUPER ADMIN (tenant_super_admin)
        └── ADMIN (tenant_admin)
            └── PMC MANAGERS / EMPLOYEES (tenant-scoped roles)
```

The Platform Owner is a platform-level principal and is not a member of every PMC by inheritance. The Owner has platform-wide administrative authority and can access records across all onboarded organisations. Every client-side role is scoped to exactly one organisation unless an explicitly reviewed future multi-organisation assignment is introduced.

The tenant hierarchy is not a mechanism for allowing lower roles to inherit platform privileges. No client role may create, promote, impersonate or modify the Platform Owner.

## 2. Security invariants

1. **Deny by default:** no authenticated user receives tenant access merely by signing in.
2. **Server-enforced identity:** role and organisation scope are derived from trusted claims and authoritative membership records, never from editable browser state, URL parameters, local storage, email domain, or user-submitted role fields.
3. **Tenant isolation:** a tenant principal can read or mutate only documents belonging to its own active organisation and only when the permission matrix allows the action.
4. **Owner scope:** the Platform Owner can access all organisations and their data, including cross-tenant records, subject to the audit and support-access controls in this document.
5. **No privilege escalation:** tenant administrators cannot write role claims, alter their organisation ID, create platform principals, or grant permissions beyond their delegation ceiling.
6. **Immutable ownership boundary:** a tenant's organisation ID is immutable after provisioning. Transfer, closure and recovery are controlled workflows.
7. **No client-side security:** hiding navigation items is UX only. Every data read, write, export and privileged operation must be authorised at the trusted data boundary.
8. **Auditable sensitive access:** platform-owner access to client operational records is logged with actor, tenant, action, purpose, timestamp, result and correlation ID. Audit records are append-only to ordinary application roles.
9. **No unsafe bootstrap:** first-owner provisioning must not be an open public registration flow and must not rely on “first user wins”.
10. **Demo separation:** Demo Guest browser-local sample data remains separate from authenticated tenant data. No implicit migration or fallback between repositories.

## 3. Role definitions

| Role key | Scope | Authority |
|---|---|---|
| `platform_owner` | Entire SAFER platform | Global organisation, account, configuration, security and data administration |
| `tenant_super_admin` | One PMC | Full administration of that PMC, including its users, roles, settings and records |
| `tenant_admin` | One PMC | Delegated administration within the Super Admin's permission ceiling |
| `tenant_manager` | One PMC | Assigned operational modules and records |
| `tenant_employee` | One PMC | Own records and explicitly assigned work |
| `tenant_auditor` | One PMC | Read-only access to explicitly authorised records and audit views |

A user may have more than one tenant role only if the organisation's policy explicitly supports it; the default is one active membership per user per organisation. The Platform Owner identity is separately provisioned and cannot be created by a tenant.

## 4. Permission matrix (baseline)

| Capability | Platform Owner | PMC Super Admin | PMC Admin | Manager | Employee | Auditor |
|---|---:|---:|---:|---:|---:|---:|
| View all organisations | Yes | No | No | No | No | No |
| Create / suspend organisation | Yes | No | No | No | No | No |
| Read any tenant's data | Yes, audited | No | No | No | No | No |
| Read own tenant data | Yes | Yes | Permission | Assigned | Assigned | Read-only scope |
| Manage own tenant settings | Yes | Yes | Delegated | No | No | No |
| Invite / deactivate tenant users | Yes | Yes | Delegated | No | No | No |
| Assign tenant roles | Yes | Yes | Delegated, limited | No | No | No |
| Assign platform role | Yes, controlled | No | No | No | No | No |
| Change global security policy | Yes | No | No | No | No | No |
| View platform-wide audit trail | Yes | No | No | No | No | No |
| View tenant audit trail | Yes | Own tenant, permitted | Own tenant, permitted | Assigned | No | Read-only scope |
| Export tenant records | Yes, audited | Policy-controlled | Policy-controlled | Permission-controlled | Explicitly assigned | No by default |

“Read any tenant's data” for the Platform Owner is a capability, not a reason to browse client data routinely. Sensitive access must use the implemented purpose-bound, time-limited support-session workflow and generate audit events. Platform-level metadata dashboards may aggregate counts and health indicators without exposing unnecessary personal or operational detail.

## 5. Application views

### 5.1 Owner Control Centre

A separate navigation and dashboard mode, visible only to `platform_owner`, containing:

- Organisation registry: create, inspect, suspend, reactivate and close PMC tenants.
- Tenant overview: organisation status, designated Super Admin, membership counts and onboarding state.
- User and identity governance: account status, membership status, role assignment and recovery workflows.
- Global module catalogue and feature configuration.
- Platform security posture: authentication configuration, rule/deployment status and security events.
- Cross-tenant audit and administrative activity.
- Controlled support access to tenant operational records, with purpose, expiry and explicit activation.
- Platform configuration and release/maintenance notices.

The Owner view must not be a client tenant view with a different label. It is a distinct route and capability set backed by platform-level authorization.

### 5.2 PMC Client Workspace

The same product modules may be reused, but the tenant context is fixed from verified membership:

- Organisation identity and tenant-specific branding/settings.
- Personnel, incidents, readiness, checklists and other enabled modules.
- User and role administration according to the signed-in user's tenant role.
- Tenant-scoped reports, exports and audit history.
- No organisation directory, cross-tenant search or platform configuration.

A user who belongs to no active organisation sees an onboarding/pending state, not an operational workspace.

## 6. Identity, claims and authoritative data model

Suggested Firestore structure (all paths below are valid Firestore document paths; migration requires a separately reviewed schema plan):

```text
platform/settings
platformAdministrators/{uid}
platformAuditEvents/{eventId}
organisations/{orgId}
  profile
  members/{uid}
  invitations/{invitationId}
  personnel/{recordId}
  incidents/{incidentId}
  evidence/{evidenceId}
  auditEvents/{eventId}
```

Suggested authoritative fields:

- Organisation: immutable `orgId`, display name, legal/registration metadata where applicable, status, createdAt, createdByUid, updatedAt.
- Membership: `uid`, `orgId`, `role`, `status`, permission overrides (only if explicitly supported), invitedByUid, createdAt, updatedAt.
- Platform administrator: `uid`, platform role, status, provisionedAt, provisionedBy and recovery metadata.
- Audit event: actor UID, actor role, tenant ID (nullable for platform events), action, resource type/ID, purpose, timestamp, outcome and correlation ID. Avoid copying sensitive record contents into logs.

Firebase custom claims may carry a minimal platform role and tenant context only when it is safe to do so. Tenant membership documents remain authoritative for tenant membership lifecycle. Claims must be set or revoked only by a trusted administrative process; a client must never write its own claims. If users may belong to multiple PMCs, do not place an unbounded tenant list in custom claims; resolve membership server-side and enforce the selected tenant context.

## 7. Trusted authorization architecture

- Firebase Authentication establishes identity only; it does not establish organisation membership or business permissions.
- A trusted backend boundary must validate the Firebase ID token, active account status, platform role, tenant membership, requested action and resource tenant ID.
- Firestore Security Rules must independently enforce the same tenant boundary for direct client SDK access.
- Privileged server operations using the Firebase Admin SDK bypass Firestore Security Rules. Therefore every server endpoint must perform explicit authorization before any Admin SDK read or write.
- Never trust an `orgId`, `role`, `uid`, `isOwner` or permission value supplied by the browser without comparing it to verified claims and authoritative records.
- Use least-privilege service credentials, keep them server-side, rotate them, and never commit service-account JSON or secrets to Git.
- Owner global access must be implemented explicitly and tested against both direct Firestore requests and backend endpoints; it must not be inferred from a tenant role such as `owner`.

## 8. Organisation onboarding and first-owner bootstrap

1. The Platform Owner is provisioned out-of-band through a controlled, documented one-time procedure. No public self-service route can create a platform owner.
2. The Owner creates a PMC organisation and a unique, non-secret Organisation ID.
3. The Owner invites the initial PMC Super Admin to a verified identity.
4. The invite is single-use, expires, is bound to the intended organisation and recipient, and is consumed atomically.
5. The recipient signs in with Firebase Authentication and accepts the invitation; the trusted service verifies recipient identity and creates the membership.
6. The Super Admin invites tenant Admins, Managers, Employees and Auditors within the organisation.
7. Every role assignment is constrained by a permission ceiling and recorded in the tenant audit trail.
8. Membership revocation takes effect promptly; stale claims or sessions must not preserve access.

An Organisation ID is a locator, not a password, bearer token or proof of membership. Knowing one must never grant access.

## 9. Platform Owner access and privacy controls

The Platform Owner has the global access requested by the product owner. To reduce accidental or unaccountable exposure:

- Provide a platform overview using aggregate information by default.
- Require a reason/purpose before opening sensitive tenant records in support mode.
- Use a short configurable support-access expiry and explicit tenant selection.
- Log successful and denied access attempts, data exports, role changes and organisation lifecycle operations.
- Provide tenant Super Admins with visibility into support-access events affecting their organisation, subject to security-sensitive redactions.
- Do not create a hidden impersonation feature. If support-as-user is ever needed, design it as a separately approved, visibly labelled and fully audited capability.

## 10. Free-first operating model and cost guardrails

Target INR 0 recurring infrastructure spend using the existing Firebase Spark allowances, GitHub free usage and Vercel Hobby allowances where eligible. No paid service is assumed or approved by this design.

Important constraints:

- Free quotas, storage, reads/writes, bandwidth, build minutes and function limits can change and must be checked before release.
- Firebase Cloud Functions deployment may require a billing-enabled project depending on current product requirements. Do not make it a mandatory dependency without explicit cost review.
- A Vercel serverless API on the existing Hobby project may be evaluated for trusted Admin SDK operations, subject to current Hobby limits and secure secret management.
- A local, owner-controlled provisioning script can be considered for one-time bootstrap, but service-account credentials must remain outside the repository and browser.
- If a required security control cannot be implemented safely within the free tier, defer the feature or ask for explicit approval; do not weaken authorization to preserve a zero-cost target.
- No paid API, database, identity provider, monitoring product or hosting tier may be introduced silently.

## 11. Required security and regression tests

The implementation must add emulator and backend tests for at least:

1. Unauthenticated users cannot read tenant data.
2. Authenticated users without membership cannot read tenant data.
3. A tenant Super Admin can access only their own tenant.
4. A tenant Admin cannot access another tenant or assign a role above their delegation ceiling.
5. Managers, Employees and Auditors cannot exceed their explicit permissions.
6. Changing URL, request body, local storage or query filters cannot change the authorised tenant.
7. A forged client-side `platform_owner` flag or role is ignored.
8. Only the trusted bootstrap process can create the initial Platform Owner.
9. Tenant users cannot create, edit, delete or promote platform administrators.
10. Platform Owner can perform explicitly permitted cross-tenant reads and writes through approved paths.
11. Owner sensitive-access actions generate immutable audit events.
12. Revoked/suspended memberships and organisations fail closed, including stale-token scenarios.
13. Server endpoints enforce authorization even though Admin SDK bypasses Firestore rules.
14. Demo Guest data remains isolated from authenticated tenant repositories.
15. Unknown and future collection paths remain denied by default.

Tests must verify both positive and negative cases. Never delete, skip, loosen or rewrite a security assertion merely to make CI pass.

## 12. Delivery sequence and release gates

| Milestone | Deliverable | Release gate |
|---|---|---|
| ARCH-01 | Approve this architecture and permission matrix | Product/security review |
| IAM-01 | Trusted platform identity and first-owner bootstrap | Forgery and recovery tests |
| ORG-01 | Organisation registry and invitation lifecycle | Tenant creation/invitation tests |
| RBAC-01 | Permission catalogue and delegation ceilings | Role matrix tests |
| OWNER-01 | Owner Control Centre | Cross-tenant access and audit tests |
| TENANT-01 | PMC Super Admin and Client Workspace | Cross-tenant isolation tests |
| DATA-01 | Tenant data repositories and Firestore rules | Emulator + backend authorization tests |
| AUDIT-01 | Append-only audit events and support access | Tamper-resistance and completeness tests |
| RELEASE-01 | Controlled production rollout | Full CI, security review, manual verification |

No production Firestore rule change, live tenant data migration, owner credential provisioning or operational workspace release is authorised by this design document alone. Each requires its own reviewed implementation and release approval.

## 13. Current repository baseline and migration warning

The current README states that tenant operational access is not released, production Firestore rules are default-deny, and there is no privileged backend or production onboarding flow. The current checked-in `firestore.rules` file also contains a candidate tenant membership helper and `ownerOrAdmin` checks for tenant collections. These source rules must not be assumed to be the deployed production rules. Before implementation, reconcile the source rules, emulator tests, deployed rules and README into one verified baseline.

The current tenant role vocabulary (`owner`, `admin`, `manager`, `viewer`) does not yet represent the full requested hierarchy. In particular, a tenant `owner` must not be conflated with the global Platform Owner. The new role keys in this document are proposed names and require a deliberate migration plan.

---

**Decision requested:** approve this architecture as the design baseline before implementation. This document does not itself grant any user access or change production security.
