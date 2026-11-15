# Tenant evidence metadata registry

## Routes
- `GET /api/tenant/evidence?orgId=...`: read the tenant evidence manifest.
- `POST /api/tenant/evidence`: register metadata against an existing tenant incident.

## Authorization
Super Admin, Admin, Manager and Auditor may read metadata under the tenant RBAC catalogue. Super Admin, Admin and Manager may register metadata. Employees have no evidence permission.

## Metadata-only limitation
This API does not accept file bytes, upload files, issue download URLs, connect evidence to public URLs, scan attachments, or verify file hashes. It records a claimed SHA-256 value only when supplied and labels every entry `metadata_registered_unverified`. A claimed hash is not a verified integrity result. Allowed declared media types are PDF, JPEG, PNG and plain text, with a 20 MiB declared-size ceiling; actual file content is not available to this API.

A production evidence workflow still requires private object storage, authenticated upload/download authorization, server-side content-type and size inspection, malware scanning, cryptographic hashing of received bytes, retention/legal-hold policy, and access/download audit events. Do not present metadata registration as secure evidence ingestion or chain-of-custody validation.

## Tenant isolation and audit
The referenced incident must exist in the same tenant and is checked inside the transaction. The manifest and tenant audit event are written atomically. The read API returns metadata only and is tenant-scoped.
