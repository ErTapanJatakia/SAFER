# Firestore tenant rules — canonical role alignment

**Status:** candidate rules update; not validated or published  
**Production posture:** separately published production rules remain deny-all  
**Purpose:** align the self-membership read boundary and existing top-level operational grants with the canonical tenant role vocabulary.

## Canonical role separation

- Platform Owner: `platform_owner`, stored separately in `platformAdministrators/{uid}`; never a tenant membership.
- PMC roles: `tenant_super_admin`, `tenant_admin`, `tenant_manager`, `tenant_employee`, `tenant_auditor`.
- Legacy tenant values `owner`, `admin`, `manager`, and `viewer` are not accepted by this ruleset.

## Membership read

A signed-in user may read only their own membership document at `organisations/{orgId}/members/{request.auth.uid}`, and only when:
- the document has the exact version-1 canonical field set;
- UID and organisation ID match the path;
- status is active;
- role is one of the five canonical tenant roles;
- timestamps and provenance fields have the required types; and
- the parent organisation exists and is active.

Client list, create, update and delete of membership records remain denied.

## Existing direct operational rules

The existing personnel, incident and evidence rules are retained with a renamed helper that grants the same conservative direct-client operations only to `tenant_super_admin` and `tenant_admin`. Manager, Employee and Auditor remain denied at this direct Firestore boundary for now. The RBAC policy catalogue is not yet fully implemented in direct Firestore rules or tenant API routes; do not interpret the catalogue as live authorization.

The remaining roles must not be granted broad access merely to make the UI work. Their read/write scopes require query constraints, record ownership/assignment checks, and dedicated positive/negative emulator tests before any access is added.

## Release gate

Do not publish these candidate rules or enable operational tenant data access until:
1. all five roles are reconciled across the resolver, API authorization and Firestore Rules;
2. employee own-record and assigned-task restrictions are enforced;
3. auditor read-only and export denial are verified;
4. emulator tests pass for both allowed and denied operations;
5. a security review and explicit production-release approval are complete.

No CI was run for this update at the user's request.
