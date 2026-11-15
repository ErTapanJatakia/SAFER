# ORG-01–ORG-05 — Organisation lifecycle implementation batch

**Branch:** `feature/org-01-05-organisation-lifecycle`  
**Base:** `main`  
**Status:** Draft implementation; no CI, unit tests, build, Firestore emulator, merge or deployment has been run.

## Scope and current implementation

| ID | Capability | Existing baseline | Added or completed in this batch |
|---|---|---|---|
| ORG-01 | PMC provisioning and activation | Owner-only provisioning creates a provisioning organisation and initial Super Admin invitation; acceptance creates pending-activation membership | Initial acceptance now binds `ownerUid`; new Owner-only activation transaction verifies the canonical pending Super Admin membership, activates organisation and membership atomically, and writes a platform audit event; Owner Control Centre exposes activation only after acceptance |
| ORG-02 | Member invitations | Verified-identity, UID-bound, seven-day invitations and atomic acceptance | Pending invitation revocation with role-delegation recheck and atomic tenant audit event |
| ORG-03 | Tenant role management | Five-role RBAC policy, delegation ceilings, membership suspension and role assignment | Retained and integrated with invitation revocation and the ownership succession boundary; no role can grant `platform_owner` |
| ORG-04 | PMC Super Admin succession | No controlled tenant ownership-transfer workflow | New two-party, 72-hour transfer proposal/acceptance workflow; incumbent remains Super Admin until acceptance; transaction promotes nominee, demotes incumbent to Admin, changes immutable organisation owner pointer and records audit event |
| ORG-05 | Trusted audit trail | Server-side platform and tenant audit writes plus minimized tenant audit reader | New lifecycle events for PMC activation, invitation revocation and ownership transfer; audit details remain excluded from the tenant read response |

## New API contracts

- `POST /api/owner/activate-organisation` — Platform Owner only; activates a PMC only after the initial Super Admin invitation has been accepted and the exact pending-activation membership is present.
- `POST /api/tenant/ownership-transfer` with `action: "propose"` — current active PMC Super Admin nominates an existing, enabled, email-verified Firebase identity.
- `POST /api/tenant/ownership-transfer` with `action: "accept"` — exact verified nominee accepts using their authenticated Firebase identity.
- `PATCH /api/tenant/members` with `action: "members:invitation:revoke"` — authorized Super Admin/Admin revokes a pending invitation within their delegation ceiling.

## Important security invariants

- Platform Owner is not a tenant role and cannot be assigned by any PMC workflow.
- Tenant authority is bound to verified Firebase UID + organisation ID + canonical server-side membership.
- Organisation IDs and transfer/invitation identifiers are validated before document paths are constructed.
- Ownership succession is explicit two-party consent; no silent takeover, no self-transfer and no transfer if incumbent ownership or membership has changed.
- Organisation activation is separate from invitation acceptance and cannot be performed by a tenant client.
- All lifecycle mutations and their corresponding audit events are committed in the same Firestore transaction.
- Tenant audit reads expose minimized metadata only; audit details and invitation secrets are not returned.
- No production Firestore Rules, production data, secrets, Vercel billing or deployment settings are changed by this batch.

## Validation and release gates

Automated validation was intentionally not run, in accordance with the current instruction to run CIs/tests only when explicitly requested. Added test coverage includes organisation activation, ownership transfer and invitation revocation; existing suites cover invitation acceptance, RBAC, membership administration and audit reads.

Before this branch can be considered release-ready, run the agreed complete validation batch, including the Firestore emulator and the existing tenant/auth boundary suites. Review the candidate rules and all server endpoints together. Do not merge or deploy solely because the code has been committed to this feature branch.
