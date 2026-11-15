# ORG-02 — Platform Owner organisation registry and lifecycle

**Status:** Implementation in progress; draft PoC backend  
**Runtime:** Existing Vercel Node Functions + Firebase Admin SDK  
**Cost target:** INR 0 recurring infrastructure spend, subject to provider quotas

## API

### List organisations

`GET /api/owner/organisations`

Requires a Firebase ID token in the Authorization Bearer header. The endpoint verifies revocation and checks both the active `platformAdministrators/{uid}` record and the singleton `platform/settings` Owner pointer. It returns at most 100 organisation summaries, ordered by creation time. It does not return tenant personnel, incidents, documents or other operational records.

### Change lifecycle status

`PATCH /api/owner/organisations`

Example body:

```json
{ "orgId": "org_<32 lowercase hex characters>", "status": "suspended" }
```

Allowed transitions:

- `active → suspended`
- `suspended → active`
- `active → closed`
- `suspended → closed`
- `provisioning → suspended`

A provisioning organisation cannot be activated through this API. Activation requires a completed invitation-acceptance and canonical membership workflow in a later slice. Closed organisations cannot be reactivated through this endpoint.

Each change and its append-only platform audit event are committed in one Firestore transaction.

## Security boundaries

- No client-supplied actor UID or role is accepted.
- No Firestore client Rules are modified.
- No tenant membership or tenant data permissions are granted.
- No bulk tenant data is returned.
- Lifecycle transitions are allow-listed and cannot be skipped.
- The list endpoint is bounded to 100 records per request; pagination is a follow-up before a large production registry is expected.
- No CI was triggered for this slice at the user's request; this code is unvalidated and must remain draft.
