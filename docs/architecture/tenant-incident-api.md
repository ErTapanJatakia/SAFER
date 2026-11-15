# Tenant incident API boundary

## Scope
The incident API is the first operational-record API slice. It is separate from the demo repository and does not activate direct client Firestore access.

## Routes
- `GET /api/tenant/incidents?orgId=...`: authenticated tenant incident listing.
- `POST /api/tenant/incidents`: create an incident.
- `PATCH /api/tenant/incidents`: update a restricted set of administrative fields.

All responses are no-store. Firebase ID tokens are verified with revocation checking. Membership and organisation state are resolved server-side. Create and update operations re-read the actor membership and organisation inside the same transaction that writes the record and tenant audit event.

## Scope and permissions
- Super Admin and Admin: tenant-wide incident read/create/update.
- Manager: tenant-wide incident read/create/update.
- Employee: incident create and own-incident read only. The list query is constrained by `reportedByUid == authenticated UID`.
- Auditor: tenant-wide read only.
- No tenant role can delete an incident through this API.
- Platform Owner access is not routed through tenant endpoints; cross-tenant access remains a separate purpose-bound and audited workflow.

## Stored record
The server persists a version-compatible, minimized record under `organisations/{orgId}/incidents/{incidentId}`: incident ID, tenant ID, reference, type, timestamp, title, status, priority, summary, reporter UID, optional location label, and server-controlled creation/update provenance. The full UI draft object and free-form evidence references are not accepted by this endpoint.

## Audit
Each create/update transaction appends a tenant audit event. Audit event writes are server-only. Audit read API is a separate follow-on and must remain read-only.

## Release boundary
This API does not enable Firestore client rules, tenant operational repository selection, employee personnel self-service, evidence access, checklist assignment access, exports, or production data. Do not publish candidate rules until emulator positive/negative tests have been authorized and completed.
