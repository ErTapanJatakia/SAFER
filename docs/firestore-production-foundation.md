# SAFER Firestore production foundation

## Approved project configuration

- Firebase project: `safer-2026`
- Database: default Cloud Firestore database (`(default)`)
- Region: `asia-south1` (Mumbai)
- Database mode: Production
- Billing: remain on Spark; do not attach a billing account
- Scope: Firestore only. Do not enable Storage, Cloud Functions, Analytics,
  phone/SMS authentication, or paid add-ons.

## Create the database

In Firebase Console, open project `safer-2026` and go to
**Build → Firestore Database → Create database**.

1. Select **Standard edition** and create the default database.
2. Select **Production mode** (not test mode).
3. Select **asia-south1 (Mumbai)** as the location.
4. Confirm creation. Do not upgrade the project to Blaze or add billing.

Database location is a one-time decision and cannot be changed after creation.
Confirm the project ID and region carefully before finalising.

## Initial security posture

The repository's `firestore.rules` intentionally denies all client reads and
writes. This is a fail-closed starting point, not the final application policy.
It prevents accidental exposure while SAFER's authoritative UID and
organisation membership model is being designed and tested.

After creating the database, open **Firestore Database → Rules** and publish
the exact contents of the repository's `firestore.rules`. Do not use the
console's permissive test-mode rules. Until tenant-scoped rules and emulator
tests are delivered, the application must not store operational records in
Firestore.

## Data safety boundary

- Existing SAFER operational data remains in browser localStorage.
- No automatic migration or upload is enabled.
- Continue using synthetic demonstration records only.
- Do not store real personnel, health, incident, confidential, or operational
  information until per-user/organisation isolation, validation, audit design,
  retention controls, and security-rule tests are complete.

## No-cost guardrails

Firestore's Spark allowance is quota-limited. Monitor usage in Firebase
Console. On Spark, quota exhaustion can cause service interruption; do not
attach a billing account to avoid interruption. Do not enable products that
require Blaze as part of this foundation.
