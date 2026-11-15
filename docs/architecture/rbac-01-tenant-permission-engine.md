# RBAC-01 — Canonical tenant permission engine

**Status:** Canonical role engine, trusted server authorization boundary, versioned membership resolver, and role-scoped candidate Firestore Rules are implemented in the draft branch; operational tenant API integration and unmodelled resource scopes remain incomplete.  
**Parent:** `feature/iam-01-platform-owner-backend` (IAM-01 must land first).  
**Cost:** Uses the existing Vercel Node.js / Firebase Admin SDK architecture; no new service or paid dependency.

## Governing identity model

- `platform_owner` is a platform principal stored separately in `platformAdministrators/{uid}`.
- Tenant roles are exactly `tenant_super_admin`, `tenant_admin`, `tenant_manager`, `tenant_employee`, and `tenant_auditor`.
- Legacy tenant role strings (`owner`, `admin`, `manager`, `viewer`) are not accepted by this policy engine. They must not be silently mapped to platform authority or the new hierarchy.
- A tenant action requires a verified actor UID, an active authoritative membership for the requested organisation, and an active organisation record. The organisation ID supplied by a caller is only a locator and must be compared with the authoritative membership.
- The module is server-side policy code. It does not verify Firebase tokens or read Firestore. A route must verify the ID token, load the membership and organisation from fixed Firestore paths, then invoke the policy engine. Never pass browser-supplied membership or role data as authoritative input.

## Permission baseline

| Capability | Super Admin | Admin | Manager | Employee | Auditor |
|---|---:|---:|---:|---:|---:|
| Read organisation profile | Yes | Yes | Yes | Yes | Yes |
| Update organisation settings | Yes | No | No | No | No |
| Read/manage memberships | Yes | Delegated | No | No | Read-only |
| Invite lower roles | Yes | Yes, lower roles only | No | No | No |
| Suspend/manage lower roles | Yes | Yes, lower roles only | No | No | No |
| Personnel records | Full tenant scope | Full tenant scope | Read | Own only | Read-only |
| Incidents | Full tenant scope | Full tenant scope | Read/create/update | Create/read own | Read-only |
| Evidence metadata | Read/register | Read/register | Read/register | No | Read-only |
| Checklists | Read/update | Read/update | Read/update | Assigned only | Read-only |
| Audit events | Read | Read | No | No | Read |
| Reports | Read/export | Read/export | Read | No | Read only; no export |

This is the initial conservative permission catalogue. Record ownership and assignment checks are required for employee-scoped actions. Module-level and record-level assignment enforcement must also be applied by the eventual data API and Firestore Rules; a UI capability map is never authorization.

## Delegation ceiling

- Only the Platform Owner may create or change platform principals.
- A PMC Super Admin may delegate tenant Admin, Manager, Employee and Auditor roles, but cannot create another Super Admin through ordinary tenant membership management.
- A PMC Admin may delegate Manager, Employee and Auditor roles only.
- A Manager, Employee or Auditor cannot manage tenant memberships.
- No tenant role can promote itself, change its organisation ID, manage a peer/higher role, or assign `platform_owner`.

## Platform Owner access

The separate platform policy evaluator accepts only an active `platform_owner` principal whose UID matches the verified actor UID. Cross-tenant operational data reads, writes and exports require a purpose-bound, time-limited support session, scoped to one active PMC and an explicit action set. Session activation, revocation and each authorized action are appended to the platform audit trail. Future data endpoints must call `authorizePlatformSupportAccess()` before touching tenant records; the session lifecycle alone does not expose those records.

## Current integration boundary

This milestone includes the canonical policy engine, trusted server authorization boundary, versioned membership validation, candidate Firestore Rules, and server API integration. The development chain now includes APIs for tenant membership administration and invitations, incidents, personnel, evidence metadata, checklists, tenant audit and aggregate reports, as well as Owner organisation provisioning and registry operations.

It does **not** yet:
- publish the candidate Firestore Rules to production;
- release an authenticated operational tenant workspace UI;
- release a full Owner Control Centre UI;
- expose cross-tenant tenant-record browsing or mutation endpoints;
- complete Firestore emulator and production security validation.

The AuthGate intentionally keeps the authenticated operational workspace unavailable until the candidate rules and API-backed UI are reviewed and released. Demo Guest remains isolated and is not an authenticated tenant workspace.

The resolver and candidate Rules accept only the exact canonical five-role version-1 membership schema. Candidate Rules grant Manager and Auditor only their documented read scopes, Employee only own-reported incident reads plus incident creation, and retain stricter denial for Employee personnel and unmodelled checklist/report resources. The trusted server boundary is integrated with the tenant API handlers; each API re-checks the relevant permission at the server boundary. Production rules remain separately published deny-all.

## Regression coverage

`tests/tenant-rbac-policy.test.mjs` verifies role catalogue separation, role capabilities, own-record and assigned-task boundaries, inactive membership/organisation denial, delegation ceilings, Platform Owner principal verification, and purpose-bound/audit-marked cross-tenant access decisions.
