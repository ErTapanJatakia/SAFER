# Tenant audit API

## Read endpoint
`GET /api/tenant/audit?orgId=...` is a read-only tenant-scoped endpoint. It requires the `audit:read` permission (Super Admin, Admin, Auditor). Managers and Employees are denied.

## Scope and privacy
The endpoint reads only `organisations/{orgId}/auditEvents`, verifies each event's `orgId`, and returns a minimized metadata view: event ID, action, actor UID, optional target UID/resource ID, and timestamp. It deliberately omits event details, invitation IDs, email addresses, free-form notes, and other payload fields. Results are capped at 100 per request; cursor pagination is a follow-on before large audit volumes.

## Write boundary
All audit writes remain server-side and are coupled transactionally to the business operation. Client create/update/delete is denied by Firestore Rules. Tenant events must include `orgId` so the reviewed tenant-scoped read rule can enforce isolation. Platform-wide events remain in the separate `platformAuditEvents` collection and are never exposed by this endpoint.

## Release boundary
This endpoint does not grant Platform Owner cross-tenant audit access and does not activate direct client Firestore access.
