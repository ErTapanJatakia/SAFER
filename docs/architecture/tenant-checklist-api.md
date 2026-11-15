# Tenant checklist API

## Routes
- `GET /api/tenant/checklists?orgId=...`: tenant checklist directory; Employee queries are constrained to authenticated UID.
- `POST /api/tenant/checklists`: create and assign a checklist to an active tenant Employee.
- `PATCH /api/tenant/checklists`: update status or compliance notes.

## Authorization and assignment
Super Admin, Admin and Manager may create, assign and administer checklist records. Assignment targets must be active `tenant_employee` memberships in the same PMC and are validated inside the creation transaction. Auditors receive read-only access. Employees can read only records queried by their authenticated UID in `assignedToUid`, and can update only the status of their own assigned checklist. They cannot change assignment, priority, task text, compliance notes, review flags, or provenance.

## Record integrity
The service uses an explicit field allowlist, opaque server-generated IDs, tenant-scoped paths, server timestamps and provenance. Create/update and tenant audit append are transactional. There is no delete endpoint. The legacy `assignedRoleOrPerson` string is not treated as an identity binding.

## Release boundary
This is a server-side API slice. It does not activate direct client Firestore access, does not change demo checklist data, and does not imply deployment approval. Pagination is capped at 100 records with a hasMore indicator; cursor pagination is needed before large tenants.
