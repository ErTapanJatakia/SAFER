# OPS-01–OPS-10 — Tenant Operations Workspace

**Status:** Implementation branch; not merged or deployed  
**Branch:** `feature/ops-01-10-completion`  
**Base:** `feature/iam-02-04-completion` (the IAM-02/03/04 draft branch)  
**Cost posture:** No paid services, new infrastructure, or production configuration changes

## Delivery matrix

| ID | Module | Implementation on this branch | Remaining boundary |
|---|---|---|---|
| OPS-01 | Incident management | Tenant workspace register, search, create, status/priority update; server API retains transactional audit writes and human-review statuses | No automated conclusions, legal findings, or deletion |
| OPS-02 | Personnel | Tenant directory, create, employee UID binding, readiness update; server allowlists only operational directory metadata | No personal/health/contact data; no full sensitive personnel dossier |
| OPS-03 | Evidence | Incident-linked evidence manifest UI; local SHA-256 calculation is submitted only as a claimed hash | **Not secure upload.** File bytes never leave the browser; no private object storage, server-side hash verification, malware scan, authenticated download, retention/legal hold, or complete chain of custody |
| OPS-04 | Checklists | Assign to active Employee membership; status completion, compliance notes, high-priority escalation, supervisor review flag | No automated operational approval; human review remains mandatory |
| OPS-05 | Reporting | Aggregate dashboard plus audited CSV, XLSX and PDF exports | Exports contain aggregate counts only, not individual records or incident narratives |
| OPS-06 | Audit viewer | Read-only event viewer with client-side action/actor filtering | API is capped at 100 events; cursor pagination and date-range filters remain future work |
| OPS-07 | Member management | Member directory, verified-account invitation creation, role changes, suspension and audited reactivation of suspended lower-role memberships | Invitation creation does not send email; invitation IDs are handed to the authorised inviter for manual secure delivery; role delegation and reactivation remain enforced server-side |
| OPS-08 | Notifications | In-app activity feed derived from tenant audit events; visible only to Super Admin, Admin and Auditor roles that hold `audit:read` | No email, SMS, push, scheduled delivery, or read receipts; no external provider added |
| OPS-09 | PMC configuration | Super Admin-only allowlisted timezone, date format, default incident priority, checklist review target and in-app activity preference | No billing, identity-provider, or security-policy settings exposed |
| OPS-10 | Cross-module integration | Evidence links to same-PMC incidents; checklists assign to active Employee UIDs; aggregate reporting counts all operational modules; audit trail captures mutations | No external command systems, external storage, or third-party integrations |

## Security controls

- Tenant workspace renders only after the authenticated user resolves an exact active membership.
- Each API independently verifies Firebase identity and authoritative membership/organisation state; the UI role is not an authorization boundary.
- All module requests are tenant-scoped. Existing service-level transactions append audit events with create/update operations.
- Personnel data remains minimized; the workspace does not expose legal name, contact details, health particulars, or other restricted dossier fields.
- Checklist Employees can update only their assigned task status. Manager/Admin/Super Admin review and escalation changes are server-authorized.
- PMC configuration updates require the canonical `organisation:update` permission (Super Admin only).
- Reports remain aggregate-only and report export is permission-gated and audited.
- Evidence metadata is labelled `metadata_registered_unverified`; the client hash is a claim, not an integrity verification result.
- Production Firestore client rules remain deny-all. No rules were published and no production tenant repository was enabled.

## Validation and release

- Targeted test coverage has been added for tenant configuration and checklist escalation/review.
- **No tests, CI, type-check, build, or emulator run has been executed**, per the standing instruction to wait for explicit validation authorization.
- The branch is not merged; the existing IAM draft is not merged; no deployment was attempted.
- Treat this as an implementation draft pending one consolidated validation pass and security review.
