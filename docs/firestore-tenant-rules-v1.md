# Firestore tenant rules — canonical role alignment

**Status:** candidate rules update; not validated or published  
**Production posture:** separately published production rules remain deny-all  
**Purpose:** enforce the canonical five-role vocabulary and role-scoped access for the currently modelled tenant resources.

## Canonical role separation

- Platform Owner: `platform_owner`, stored separately in `platformAdministrators/{uid}`; never a tenant membership.
- PMC roles: `tenant_super_admin`, `tenant_admin`, `tenant_manager`, `tenant_employee`, `tenant_auditor`.
- Legacy tenant role values are rejected.

## Membership and organisation reads

- Every active tenant role may read its own active organisation metadata.
- Every signed-in user may read only their own active, exact version-1 membership document.
- Super Admin, Admin and Auditor may read/list canonical active membership records within their own active PMC.
- Manager and Employee cannot browse the member directory.
- Client membership writes and organisation writes remain denied.

## Candidate rules for existing resources

| Resource | Super Admin | Admin | Manager | Employee | Auditor |
|---|---|---|---|---|---|
| Organisation metadata | Read | Read | Read | Read | Read |
| Personnel summary | Read/write | Read/write | Read | Denied | Read |
| Incidents | Read/create/update | Read/create/update | Read/create/update | Create + read own | Read |
| Evidence metadata | Read | Read | Read | Denied | Read |
| Tenant audit events | Read | Read | Denied | Denied | Read |

All list operations remain organisation-bound. Employee incident reads are additionally constrained by `reportedByUid == request.auth.uid`; the query must include that constraint. Employee incident creation is allowed, but employee updates are denied. Incident reporter provenance is immutable.

## Deliberate restrictions / incomplete resource models

- Employee personnel self-service remains denied because the current personnel summary schema has no authoritative Firebase UID ownership field. The `employeeRef` string is not treated as identity.
- Checklist documents and assignment fields are not yet represented by a confirmed Firestore collection/schema in this ruleset; no checklist access is granted.
- Reports and exports are not Firestore resources here; no report/export API is enabled by these rules.
- Restricted personnel and incident collections remain denied.
- Evidence metadata is read-only; client create/update/delete remains denied.
- Audit events are read-only; only trusted server processes may create them.

The shared server-side RBAC engine and trusted authorization boundary must also be applied by every future tenant API. A UI permission map is never authorization. Resource-owner and assignment values must come from server-loaded records, not request input.

## Release gate

Do not publish these candidate rules or enable tenant operational access until:
1. focused authorization and Firestore emulator tests pass;
2. tenant API routes use the trusted server authorization boundary;
3. employee personnel and checklist ownership/assignment schemas are defined and tested;
4. reports/export authorization and audit behavior are implemented server-side;
5. a security review and explicit production-release approval are complete.

No CI or emulator test run was initiated for this update, in accordance with the user's instruction.
