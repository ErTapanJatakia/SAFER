# IAM-04 — Tenant role hierarchy and permission enforcement

**Status:** Canonical five-role backend policy and server integration exist; this batch adds exhaustive role/action regression coverage.

## Canonical hierarchy

1. `platform_owner` — separate platform principal, never a tenant role.
2. `tenant_super_admin` — full authority within exactly one active PMC.
3. `tenant_admin` — delegated authority below Super Admin.
4. `tenant_manager` — assigned operational work, no membership administration or audit access.
5. `tenant_employee` — own-record and assigned-task scope.
6. `tenant_auditor` — read-only tenant scope.

The five tenant roles are the only values accepted by `src/server/tenant-rbac.mjs`. Legacy `owner/admin/manager/viewer` strings are rejected.

## Delegation invariants

- A Super Admin can assign Admin, Manager, Employee and Auditor roles but cannot create another Super Admin through ordinary membership administration.
- An Admin can assign Manager, Employee and Auditor roles only.
- Managers, Employees and Auditors cannot invite, suspend or change member roles.
- No tenant role can assign `platform_owner`, manage the Platform Owner, or grant platform actions.
- A member cannot manage themselves, peers at the same level, or a higher role.
- Employee personnel records must be explicitly linked by a Super Admin/Admin to an active employee membership using `employeeUid`; both server queries and candidate Firestore Rules filter by the verified employee UID. Assigned-checklist and own-incident actions likewise require the resource owner/assignee UID to match the verified actor UID.
- Auditors have no mutation or report-export capability.

## Enforcement layers

- `authorizeTenantAction()` is the canonical server-side permission evaluator.
- `resolveTenantAuthorization()` verifies identity and loads membership/organisation state from fixed server-side Firestore paths.
- Tenant API handlers invoke the trusted resolver; services revalidate resource ownership, assignment and mutable target membership as needed inside their data operations.
- Candidate Firestore Rules independently enforce a conservative subset for direct client SDK access. A rule denial is intentional where the corresponding operation is supported only through a reviewed server API.
- UI visibility is not an authorization control.

## Added coverage

`tests/iam-04-role-matrix.test.mjs` asserts the exact allowed action catalogue for all five tenant roles, evaluates every role/action pair through the policy engine, and locks down delegation, own-record and assignment boundaries.

Existing `tests/tenant-rbac-policy.test.mjs`, `tests/tenant-authorization.test.mjs`, tenant API service tests and Firestore emulator tests remain part of the validation suite.

## Release status

This is implementation-level role enforcement, not a production release. The authenticated operational workspace and production Firestore policy remain gated. The complete test suite has not been run as part of this implementation batch.
