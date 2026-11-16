# Tenant audit API

## Read endpoint
`GET /api/tenant/audit?orgId=...` is a read-only tenant-scoped endpoint. It requires the `audit:read` permission (Super Admin, Admin, Auditor). Managers and Employees are denied.

## Scope and privacy
The endpoint reads only `organisations/{orgId}/auditEvents`, verifies each event's `orgId`, and returns a minimized metadata view: event ID, action, actor UID, optional target UID/resource ID, and timestamp. It deliberately omits event details, invitation IDs, email addresses, free-form notes, and other payload fields.

Requests accept an optional `limit` (default 50, maximum 100), inclusive UTC calendar-date bounds (`startDate=YYYY-MM-DD`, `endDate=YYYY-MM-DD`), and an opaque `cursor` containing the last event ID from the prior page. Results are ordered by `occurredAt` descending and include `hasMore` and `nextCursor`. The cursor is resolved only within the requested tenant's audit collection. Invalid dates, reversed date ranges, malformed cursors and missing/cross-tenant cursor records fail closed.

The UI's text search filters only events already loaded into the current date-filtered pages; it does not issue broad server-side text searches.

## Write boundary
Audit writes remain server-side and are coupled transactionally to the business operation where implemented. Client create/update/delete is denied by Firestore Rules. Tenant events must include `orgId` so the reviewed tenant-scoped read rule can enforce isolation. Platform-wide events remain in the separate `platformAuditEvents` collection and are never exposed by this endpoint.

These controls do not make the log cryptographically immutable against privileged Firebase Admin credentials, project administrators, backups, or out-of-band database changes. The current audit hash-envelope helper is a dormant shape/linkage contract; it does not recompute hashes, sign events, or provide tamper-proof storage.

## Release boundary
This endpoint does not grant Platform Owner cross-tenant audit access and does not activate direct client Firestore access. It is not a complete legal-grade immutable audit service.
