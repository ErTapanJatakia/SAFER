# SAFER Firebase setup

This document covers the Firebase client foundation and the first
Authentication integration for the dedicated `safer-2026` project. It does
not mean that SAFER's operational records have been migrated to Firestore or
that role-based authorisation is complete.

## Firebase services in scope

- Firebase Authentication: Email/Password and Google providers, configured in
  the Firebase Console.
- Cloud Firestore: the project's default database is initialised by the client
  foundation, but this authentication batch does not read or write Firestore.

The client initialisation uses Firebase App, Authentication, and Firestore SDK
modules. It does not initialise Analytics, Cloud Storage, Cloud Functions,
phone/SMS authentication, or Firebase Admin SDK.

## Authentication behaviour

- Email/password registration creates a Firebase Authentication account and
  requests email verification. The new session is signed out until verification
  is completed.
- Email/password sign-in is allowed only when Firebase reports
  `emailVerified === true`.
- Google sign-in is supported through Firebase's Google provider. SAFER still
  checks the returned user's verified-email state.
- Password reset uses Firebase's built-in email workflow. The UI uses a
  non-enumerating confirmation message.
- Demo Guest remains available independently of Firebase configuration.
- The sign-out control ends the Firebase session or the local Demo Guest
  session.

The Firebase password policy should remain aligned with the console settings:
12–128 characters, uppercase, lowercase, numeric, and special characters.

## Environment variables

Copy `.env.example` to `.env.local` for local development and replace the
Firebase API key placeholder with the Web API key shown under:

**Firebase Console → Project settings → General → Your apps → SAFER**

Required variables:

| Variable | Value |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | Firebase Web app API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | `safer-2026.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `safer-2026` |
| `VITE_FIREBASE_APP_ID` | `1:345562773067:web:2ed2837e97c8950fb5bfce` |

The Firebase Web API key and the other Firebase Web configuration values are
public client configuration. They are not substitutes for Authentication,
Firestore Security Rules, or App Check. Never place a service-account JSON,
private key, or Firebase Admin credential in a `VITE_*` variable or browser
bundle.

If the Firebase variables are absent, account authentication is unavailable
but the synthetic Demo Guest mode remains usable.

## Google AI Studio and Vercel

Configure the four variables above in the hosting platform's environment or
Secrets settings. Use the same Firebase project values in each deployment
environment:

- Google AI Studio app: `safer-pmc.ai.studio`
- Vercel app: `safer-pmc.vercel.app`

For Vercel, add them to the required Development, Preview, and Production
environments, then redeploy after changing values. For local development, use
`.env.local`, which must not be committed.

The domains must also remain listed in Firebase Authentication's authorised
domains. Domain authorisation alone does not configure environment variables
or complete OAuth provider setup.

## Important data boundary

Authentication currently gates access to the existing application interface;
it does **not** yet isolate the browser-local personnel, incident, checklist,
theme, or other operational data by Firebase UID. It also does not assign or
enforce organisational roles. Those records remain in browser storage and may
be visible to another signed-in user on the same browser profile.

Use synthetic demonstration data only. Do not enter real personal, health,
confidential, or operational records until the per-user/tenant data model,
Firestore Security Rules, migration strategy, and access-control tests have
been implemented and reviewed.

## Free-tier and billing guardrails

The application intentionally avoids Firebase products that require a billing
upgrade for the planned basic workflow. Keep the Firebase project on the
no-cost plan and do not attach a billing account as part of this migration.
Before enabling additional products or features, verify their current pricing
and Spark-plan eligibility in the Firebase Console.

Firestore Security Rules and data-model tests must be reviewed before any
personnel or incident data is written to Firestore. Existing browser-stored
operational data is not automatically migrated or uploaded by this change.
