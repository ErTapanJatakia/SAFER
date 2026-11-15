# Tenant membership administration API

## Endpoints

| Method and path | Purpose | Authorization |
|---|---|---|
| `GET /api/tenant/members?orgId=...` | List up to 100 tenant memberships; returns `hasMore` when another page exists | `members:read` — Super Admin, Admin, Auditor |
| `POST /api/tenant/members` | Create an invitation for an existing verified Firebase user | `members:invite` plus role delegation ceiling |
| `PATCH /api/tenant/members` | Suspend a member or change their tenant role | `members:suspend` or `members:role:assign`; target is re-read in the transaction |
| `POST /api/tenant/invitations/accept-member` | Accept an ordinary PMC invitation | Exact Firebase UID, verified email, active PMC, pending unexpired invitation |

## Invitation lifecycle

1. A Super Admin or Admin submits the invitee's email and requested role.
2. The service resolves an existing Firebase Auth user and requires an enabled account with a verified email that matches the submitted address.
3. The server creates a 256-bit opaque invitation ID, a seven-day expiry, and a pending invitation in the PMC's invitation collection.
4. The invitation and tenant audit event are written in one Firestore transaction after the actor's membership, organisation status, and role-delegation permission are revalidated.
5. The trusted administrator shares the returned invitation ID through an approved channel. This implementation does not send email or disclose invitation IDs to unauthorised users.
6. The invitee signs in and accepts. The endpoint checks the Firebase ID token with revocation enabled, verifies the account and email again, then atomically creates the active membership, accepts the invitation, and writes a tenant audit event.

Super Admin invitations remain separate and use the Owner-controlled organisation provisioning lifecycle. Tenant roles cannot invite or promote another Super Admin.

## Delegation policy

- Super Admin can invite or administer Admin, Manager, Employee, and Auditor; cannot administer another Super Admin or themselves.
- Admin can invite or administer Manager, Employee, and Auditor; cannot administer peers, higher roles, or themselves.
- Manager, Employee, and Auditor cannot administer memberships.
- Role changes and suspensions re-read actor, target, and organisation inside the same transaction. Target records must match the exact canonical version-1 membership shape.
- Every successful invite, acceptance, role change, and suspension creates a tenant-scoped audit event under `organisations/{orgId}/auditEvents`.

## Security and operational boundaries

- Firebase identity is verified server-side; client-supplied roles and claims are not used for authorization.
- Membership, organisation status, and delegation policy are resolved server-side. The mutation transaction revalidates the actor and target to reduce time-of-check/time-of-use risk.
- Invitations are bound to both the invited Firebase UID and normalized verified email, expire after seven days, and cannot create Super Admin membership.
- Suspended members no longer satisfy the active membership resolver.
- The directory response contains only UID, role, status, and timestamps; no email or invitation secrets are returned.
- The current directory endpoint returns up to 100 records and a `hasMore` indicator. Cursor pagination is a follow-on before large tenant directories are supported.
- This is an API foundation; it does not yet wire the membership UI or tenant invitation notifications.

## Release gate

Focused unit tests are included but have not been run. Do not treat this feature as validated until the focused tests and Firestore emulator tests pass. Do not publish candidate rules, enable tenant operational data, merge, or deploy without the separate approval and validation steps.