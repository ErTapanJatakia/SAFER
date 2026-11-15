# ORG-01 — PMC organisation provisioning

**Status:** Implementation in progress; draft PoC backend boundary  
**Hosting:** Existing Vercel Node Functions and Firebase Admin SDK  
**Cost target:** INR 0 recurring infrastructure spend, subject to provider quotas

## Delivered in this slice

- Adds an Owner-only `POST /api/owner/organisations` endpoint.
- Verifies Firebase ID tokens with revocation checking.
- Confirms the caller against both `platformAdministrators/{uid}` and the singleton `platform/settings` Owner pointer.
- Creates a server-generated immutable organisation ID and a provisioning-state organisation record.
- Resolves the nominated Super Admin by Firebase Auth email and requires a verified, enabled account.
- Creates a pending invitation record under the organisation and a platform audit event in one Firestore transaction.
- Does not send email, activate membership, enable tenant data access, or change Firestore Rules.

## Request

```http
POST /api/owner/organisations
Authorization: Bearer <Firebase ID token>
Content-Type: application/json

{
  "displayName": "Example PMC",
  "superAdminEmail": "verified-admin@example.com"
}
```

The nominated Super Admin must already have a verified, enabled Firebase Authentication account. This slice records an invitation; it does not claim the invitation has been delivered or accepted.

## Lifecycle boundary

```text
provisioning
  └── super_admin_invitation_pending
        └── invitation acceptance (next slice)
              └── tenant membership activation (after RBAC + Rules review)
                    └── active organisation
```

An organisation remains `provisioning` until a separately authenticated invitation-acceptance flow confirms the intended identity and writes the canonical tenant membership. Existing client-side membership parsing and Firestore Rules are not silently migrated by this endpoint.

## Security and operational notes

- Request-supplied role, UID, organisation ID, status and audit fields are ignored.
- No browser SDK or client-supplied claims can create organisations.
- Platform Owner status is checked against authoritative server-side documents.
- Organisation creation, invitation creation and audit append are atomic.
- Ordinary application roles receive no new Firestore permissions.
- No credentials, Owner UID, Vercel environment variables or production records are provisioned.
- No CI workflow is triggered as requested; this change is unvalidated by automated tests and must remain a draft until the complete batch is validated.
