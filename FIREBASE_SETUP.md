# SAFER Firebase Account Setup (₹0 / Spark plan)

This guide configures the **account profile and personal-preferences layer only**. It does not turn SAFER's browser-local demonstration personnel, incident, qualification, cybersecurity, or checklist records into a secure multi-user database.

## 1. Create a Firebase project

1. Open the Firebase Console.
2. Create a Firebase project for SAFER.
3. Keep the project on the **Spark (no-cost) plan**. Do not add a billing account or upgrade to Blaze.
4. In Project settings, register a Web application and copy its web configuration values.

The Firebase web configuration is visible to browsers by design. It is not a server secret. Never put a service-account JSON file, Admin SDK private key, or privileged credential in this repository or in a VITE_ environment variable.

## 2. Enable Email/Password authentication

1. Open Authentication → Sign-in method.
2. Enable Email/Password.
3. Do not enable Phone/SMS authentication for this prototype.
4. Add the production deployment hostname to Firebase Authentication's authorized domains.
5. Configure the email-verification template and sender settings in Firebase Console.

SAFER requires email verification before a registered account can enter the authenticated application. New users receive a pending role and pending status. Registration never grants a role or organization membership.

## 3. Create Firestore and deploy rules

1. Open Firestore Database and create the database in an appropriate region.
2. Keep the Firebase project on Spark.
3. Deploy the included firestore.rules using the Firebase Console Rules editor, or from a trusted workstation with Firebase CLI:

    firebase deploy --only firestore:rules

4. Confirm the deployed rules match this repository's firestore.rules.

The rules currently authorize only:
- A signed-in user reading their own users/{uid} profile.
- A signed-in user changing only their own profile display name.
- A signed-in user reading and writing their own allowlisted userSettings/{uid} document.
- A signed-in user submitting their own privacy request under privacyRequests/{uid}/requests/{requestId}.

Other Firestore paths are denied by default. Operational records are not published to Firestore by this release. Do not loosen the catch-all deny rule to make the demonstration records appear in a database.

## 4. Configure Vercel environment variables

In the Vercel project settings, add the following variables for the Production environment (and Preview only when you have explicitly authorized those preview domains in Firebase):

- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_APP_ID

Use the corresponding values from Firebase Project settings → Your apps → Web app configuration. Redeploy after changing these build-time variables.

For local development, copy .env.example to .env.local and set the same values. Never commit .env.local.

If these values are absent, SAFER remains usable in Demo Guest mode and does not attempt Firebase authentication.

## 5. Bootstrap the first administrator

There is deliberately no self-service role assignment and no in-app role management UI yet.

1. Register your own account through SAFER.
2. Verify your email.
3. In Firebase Console → Authentication, locate the new account and copy its UID.
4. In Firestore, open the users collection and the document whose ID equals that UID.
5. As the trusted project owner, change:
   - role to super_admin
   - status to active
6. Keep uid, email, organizationId, and timestamps consistent with the document.

The project owner makes this change in the trusted Firebase Console. The user's own Firestore rules do not permit role, status, or organization changes. Do not grant administrator roles based only on a registration request.

New accounts remain pending until a trusted administrator assigns a role and activates them. At this stage, roles are displayed in account settings but are not yet used to authorize access to browser-local operational records.

## 6. Cost and privacy guardrails

- Keep the project on Spark; do not enable billing.
- Do not enable Cloud Storage, phone/SMS, Cloud Functions, paid email providers, or third-party notification delivery for this implementation.
- Firebase free quotas are finite. Firestore operations can be unavailable for the remainder of the quota period when Spark limits are exceeded.
- Account profiles, preference documents, and privacy-request submissions are stored in Firestore. The rest of the demonstration application continues to use browser-local storage.
- Do not enter real personnel, health, incident, evidence, or operational data. Browser-local storage is not encrypted application storage or tenant-isolated backend storage.

## 7. Remaining product work

Before SAFER is used for real organizational records, a separate design and implementation phase is required for:
- Organization/tenant creation and membership lifecycle.
- Server-enforced role-based authorization for every operational collection and action.
- Tenant-scoped personnel, incidents, qualifications, employment, audit records, and evidence.
- A trusted administrative role-management workflow.
- Auditing, retention, backup/recovery, breach response, and privacy-request case management.
- Security review and testing of every Firestore query and Security Rule.

Do not interpret the account layer as production authorization for the operational modules or as a legal-compliance certification.
