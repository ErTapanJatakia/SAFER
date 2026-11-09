# SAFER first-organisation owner bootstrap runbook

**Status:** controlled manual procedure; requires a separate release decision before production access is enabled  
**Firebase project:** `safer-2026`  
**Database:** `(default)`, region `asia-south1`  
**Billing:** Firebase Spark only; do not attach billing  
**Current production rules:** deny-all, as separately published in Firebase Console

This runbook documents a one-time, trusted-operator process for creating the first organisation and its first owner membership. It is not a self-service workflow, does not grant authority based on email verification, and does not authorize publishing the candidate rules. The Firebase Console's privileged data editor is used; browser clients must never be given a path to create or edit membership records.

## 1. Preconditions — stop if any are missing

- The operator is explicitly authorized by the organisation to establish its SAFER tenant.
- The operator can access the correct Firebase project, `safer-2026`, using a secured Google account with the minimum Firebase Console privileges needed for the operation.
- The intended first owner has completed Firebase Authentication registration and verified the email address through the normal Auth flow. Verification is an identity hygiene check, **not** proof of organisational authority.
- The intended owner's Firebase Authentication UID has been independently checked against the user record in **Authentication → Users**. Do not use an email address as the membership document ID.
- A unique, opaque organisation ID has been agreed and checked for collision. Do not use a company name, email, phone number, registration number, or other personal/business identifier as the ID.
- The organisation's legal/operational authority, intended owner, approval, and retention location for the bootstrap record are documented outside the application.
- The operator has reviewed the current production rules posture and confirms that no client data access is being enabled as part of this procedure.

If the operator cannot independently verify the intended owner's authority or UID, stop. Do not create a provisional owner and do not ask the user to paste credentials, tokens, or service-account keys into chat or source control.

## 2. Record the approved bootstrap request

Before opening the Firestore data editor, record in the organisation's controlled change register:

- request/change reference;
- organisation name and opaque `orgId`;
- intended owner's name and verified Firebase Auth UID;
- the source used to verify the UID (Firebase Console Authentication user record);
- who authorized the appointment and when;
- operator identity, approval reference, date/time, and reason;
- a second-person review reference where the organisation's governance process supports it.

Do not put passwords, email-verification links, access tokens, service-account credentials, or unnecessary personal data in this record. This external register is the operator's bootstrap evidence; it is not represented as a Firestore-generated immutable audit trail.

## 3. Create the organisation document

1. Open Firebase Console and select project `safer-2026`.
2. Navigate to **Build → Firestore Database → Data**.
3. Confirm the database is `(default)` in `asia-south1`.
4. Create the top-level collection `organisations`.
5. Use the approved opaque organisation ID as the document ID.
6. Add these fields with the indicated Firestore types:

| Field | Type | Value |
|---|---|---|
| `orgId` | string | Exact same opaque organisation ID as the document ID |
| `displayName` | string | Approved organisation display name |
| `status` | string | `active` |
| `schemaVersion` | number | `1` |

The candidate rules require `orgId` and `status` to match the path and active state. The additional metadata fields above align with the proposed schema; do not add fictional addresses, DPO details, legal claims, compliance status, or subscription/billing attributes.

## 4. Create the first owner membership

1. Open the organisation document created in the previous step.
2. Create its `members` subcollection.
3. Set the membership document ID to the intended owner's exact Firebase Auth UID.
4. Add these fields:

| Field | Type | Value |
|---|---|---|
| `uid` | string | Exact intended owner's Firebase Auth UID |
| `orgId` | string | Exact parent organisation ID |
| `role` | string | `owner` |
| `status` | string | `active` |

Do not add invitation tokens, passwords, email-based identity keys, arbitrary capabilities, `platform-admin` flags, or client-controlled claims. Do not create additional owners or memberships as part of a test. This procedure establishes one first owner only.

The current candidate rules use the membership path, `uid`, `orgId`, `role`, and `status` as the authorization trust anchor. Membership documents remain unreadable and unwritable to application clients. Any additional provenance fields must be recorded only when their values can be established truthfully; never fabricate an operator UID or timestamp.

## 5. Independent verification

A second authorized operator, or the same operator under a documented two-pass check if no second reviewer exists, must verify all of the following directly in Firebase Console:

- correct project and database;
- organisation document ID equals its `orgId`;
- organisation status is exactly `active`;
- membership document ID equals the intended Firebase Auth UID;
- membership `uid` equals that document ID;
- membership `orgId` equals the parent organisation ID;
- membership role is exactly `owner`;
- membership status is exactly `active`;
- no other documents or memberships were created unintentionally.

Record the verification result, reviewer, and time in the external change register. Do not treat a successful sign-in, a visible UI role label, or email verification as proof that these checks passed.

## 6. Rollback and incident handling

If any value is wrong, do not publish rules and do not attempt to correct it through the client. Keep production deny-all. The authorized Firebase operator must correct or remove the erroneous bootstrap documents through the privileged Console data editor, preserve the before/after details in the change register, and repeat independent verification.

If the intended owner account is compromised, suspended, deleted, or disputed, do not silently transfer ownership. Keep access disabled by changing the organisation status to a non-active value through the trusted operator process, preserve evidence, and escalate for a separately approved ownership recovery decision. A second owner, self-service recovery, invitation acceptance, and automated role lifecycle are not implemented.

## 7. Activation is a separate release gate

Completing this runbook does **not** itself enable client access. Before publishing candidate tenant rules:

1. complete an independent security review of the exact main-branch `firestore.rules` and emulator suite;
2. confirm the bootstrap records have been independently verified;
3. confirm no real operational data is present in browser localStorage that could be accidentally migrated;
4. review all client query patterns and application data models;
5. obtain explicit approval for the production rules release;
6. publish only the reviewed rules and verify the resulting production ruleset.

Until that separate release is approved and completed, production rules remain deny-all and no application operational data is written to Firestore.

## 8. Prohibited shortcuts

- No public organisation creation or self-assigned owner role.
- No client-side writes to `members`, organisation security fields, or audit events.
- No email-only membership matching.
- No Firebase Admin SDK or service-account key in the browser, repository, or CI.
- No Cloud Functions, Cloud Run, paid service, billing upgrade, SMS, Storage, or Analytics.
- No automatic or background localStorage migration.
- No use of real personnel, health, identity, incident, or evidence data in test fixtures.
- No publishing of rules as a side effect of merging this documentation.

## 9. Operator checklist

- [ ] Correct Firebase project and default database confirmed
- [ ] Operator authority and appointment approval recorded
- [ ] Intended owner UID verified in Firebase Authentication
- [ ] Opaque organisation ID checked for collision
- [ ] Organisation document created with exact path-bound values
- [ ] One owner membership created with exact UID and organisation binding
- [ ] Independent verification completed
- [ ] External bootstrap change record completed
- [ ] Production rules remain deny-all pending separate release approval
