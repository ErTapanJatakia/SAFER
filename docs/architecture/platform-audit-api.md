# Platform Owner audit API

The Owner-only `GET /api/owner/audit` endpoint returns the latest 100 records from
`platformAuditEvents`, ordered by `occurredAt` descending. It uses the shared
Platform Owner verifier, including Firebase token revocation checks and current
administrator/settings records.

The response is deliberately metadata-only: event ID, action, actor UID or
out-of-band actor reference, target organisation, target UID and timestamp.
It never returns free-form `details`, reasons, invitation identifiers,
support-session references, or other event payloads.

Initial bootstrap events use an operator/change reference because bootstrap is
an out-of-band operation; they are not represented as authenticated Firebase
actor UIDs. The UI labels that field as the actor reference.

The query is capped at 100 records. `hasMore` indicates that additional records
exist; cursor pagination and export are not implemented. No client Firestore
read permission is granted. Production Firestore Rules remain deny-all.
