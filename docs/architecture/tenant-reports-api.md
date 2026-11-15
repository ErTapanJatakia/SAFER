# Tenant reporting API

## Routes
- `GET /api/tenant/reports?orgId=...`: read tenant aggregate counts.
- `POST /api/tenant/reports`: export the same aggregate-only summary and append an audit event.

## Permissions
Super Admin and Admin may read and export. Manager, Employee and Auditor may read only where permitted by the canonical RBAC catalogue; Auditor export is denied.

## Data minimization
The report contains only aggregate counts of membership, personnel directory, incidents, evidence metadata and checklist records. It does not return names, personnel details, incident narratives, evidence files, or individual checklist contents. Firestore server-side aggregation queries are used; if aggregation is unavailable, the API fails closed rather than silently returning partial counts.

## Audit
Every export operation revalidates membership and organisation status inside the audit transaction and writes a tenant audit event. This is an aggregate report export, not a bulk export of personal or operational records.

## Release boundary
This endpoint does not implement PDF/Excel/CSV formatting, does not grant access to raw records, and does not activate tenant repository selection.
