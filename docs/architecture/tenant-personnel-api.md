# Tenant personnel API

## Routes
- `GET /api/tenant/personnel?orgId=...`: read the minimized operational personnel directory.
- `POST /api/tenant/personnel`: create an operational directory record.
- `PATCH /api/tenant/personnel`: update allowlisted operational directory fields.

## Authorization
The API resolves Firebase identity, active membership and organisation state server-side. Super Admin and Admin can create/update records. Super Admin, Admin, Manager and Auditor can read the minimized directory. Employees do not receive directory access through this endpoint.

## Data minimization
The API stores and returns only the operational directory schema: opaque record ID, PMC employee reference, optional display label, operational roles, specialisations, assignment sector, administrative readiness status, human-review flag, and server-controlled provenance. It does not accept or return legal name, date of birth, home address, personal email, phone, blood group, health particulars, family details, certification evidence, or free-form administrative notes.

## Identity boundary
The existing personnel model does not contain a verified Firebase UID ownership mapping. Employee self-service is therefore not implemented. `employeeRef` is a business identifier only and must never be treated as proof of identity. A future identity-link workflow must be initiated by a privileged administrator, verify the target Firebase identity, and create a separate immutable UID binding with audit history.

## Audit and lifecycle
Create/update and audit append occur in one Firestore transaction. There is no delete operation. Audit event payloads are minimized. Client Firestore writes remain governed by the separate reviewed rules and are not enabled by this API.

## Release boundary
This API does not expose restricted personnel documents or attachments, does not activate tenant repository selection, and does not replace demo data. Cursor pagination is a follow-on before large personnel directories.
