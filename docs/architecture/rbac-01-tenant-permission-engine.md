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
| Evidence | Read | Read | Read | No | Read-only |
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

The separate platform policy evaluator accepts only an active `platform_owner` principal whose UID matches the verified actor UID. Cross-tenant operational data reads, writes and exports require a meaningful purpose string and return an audit-required decision. The consuming route must append the corresponding platform audit event before or atomically with the sensitive operation; the policy result alone is not an audit record.

## Current integration boundary

This milestone includes the canonical policy engine, trusted server authorization boundary, and candidate rules for existing Firestore resources. It does **not** yet:
- expose tenant-management or organisation-registry APIs;
- issue or consume invitations;
- write or mutate tenant memberships;
- publish candidate Firestore Rules to production;
- enable cross-tenant Owner data access;
- release an operational tenant workspace;
- release an operational tenant workspace.

The resolver and candidate Rules accept only the exact canonical five-role version-1 membership schema. Candidate Rules now grant Manager and Auditor only their documented read scopes, Employee only own-reported incident reads plus incident creation, and retain stricter denial for Employee personnel and unmodelled checklist/report resources. The trusted server boundary is ready for use by tenant API handlers, but no tenant operational API routes currently exist. Production rules remain separately published deny-all.

## Regression coverage

`tests/tenant-rbac-policy.test.mjs` verifies role catalogue separation, role capabilities, own-record and assigned-task boundaries, inactive membership/organisation denial, delegation ceilings, Platform Owner principal verification, and purpose-bound/audit-marked cross-tenant access decisions.
