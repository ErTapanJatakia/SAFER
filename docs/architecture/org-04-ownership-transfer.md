# ORG-04 — Controlled PMC Super Admin succession

**Status:** Draft implementation on `feature/org-01-05-organisation-lifecycle`  
**Scope:** Transfer of the single `tenant_super_admin` authority within one PMC. This is not a transfer of Platform Owner authority.

## Security model

- Only the current, active PMC Super Admin whose UID matches the organisation's server-side `ownerUid` may propose a transfer.
- The nominee must already have an enabled Firebase Authentication account with a verified email address.
- The transfer is bound to the nominee's Firebase UID and normalized verified email; email alone is never the authorization key.
- The incumbent remains Super Admin until the nominee explicitly accepts.
- The proposal expires after 72 hours and is single-use.
- On acceptance, a single Firestore transaction promotes the nominee to `tenant_super_admin`, demotes the incumbent to `tenant_admin`, updates the organisation's `ownerUid`, marks the transfer accepted, and appends a tenant audit event.
- If the organisation, incumbent, nominee, identity, or ownership pointer has changed, the transaction fails closed.
- A tenant transfer cannot create or modify a `platform_owner` principal.

## API

`POST /api/tenant/ownership-transfer`

Propose:

```json
{
  "action": "propose",
  "orgId": "org_<32 lowercase hex characters>",
  "targetEmail": "verified-nominee@example.com"
}
```

Accept (authenticated as the nominee):

```json
{
  "action": "accept",
  "orgId": "org_<32 lowercase hex characters>",
  "transferId": "<opaque 256-bit identifier>"
}
```

Both operations require a revocation-checked Firebase ID token. Acceptance additionally requires the token and Firebase Admin user record to agree on the verified email.

## Initial owner binding

The initial Super Admin invitation acceptance now writes `ownerUid` to the organisation record in the same transaction that creates the pending-activation membership and accepts the invitation. This establishes the incumbent identity used by the transfer workflow. It does not activate the organisation or grant tenant operational access.

## Release limitations

- No self-service recovery or transfer by Platform Owner is introduced.
- No transfer is possible when the current owner pointer or active Super Admin membership is missing or inconsistent.
- No production Firestore Rules changes are included.
- The endpoint and tests are not CI-validated; do not enable the workflow in production until the complete ORG batch passes the agreed validation and security review.
