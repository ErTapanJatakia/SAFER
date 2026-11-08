# SAFER Account Privacy Notice (Prototype)

**Last updated:** 9 November 2026

SAFER is an independent administrative and defensive-security demonstration. This notice describes the account-related processing implemented in this repository; it is not legal advice or a statement of statutory compliance.

## Data handled by the account layer

When Firebase is configured and a person registers, SAFER uses Firebase Authentication for the email address, authentication state, password credentials, and email-verification status. Passwords are handled by Firebase Authentication and are not written into SAFER's Firestore settings documents.

SAFER stores an account profile in users/{uid} containing the Firebase UID, email address, display name, role, status, and optional organization identifier. New accounts begin with the pending role and pending status. A trusted project administrator must approve and assign a role.

Personal preferences are stored separately in userSettings/{uid}. These may include a selected existing SAFER theme, interface density, text size, accessibility preferences, notification preferences, language/date/time-zone preferences, and update timestamp.

A privacy request submitted from the account settings screen is stored under privacyRequests/{uid}/requests/{requestId} with its type, the user's text, a submitted status, and creation timestamp. This is a request-intake record; it does not itself complete access, correction, or deletion.

## Demonstration data

Personnel, employment, qualification, incident, defensive cybersecurity, checklist, branding, and other operational demonstration data remain in the browser's localStorage. These data are not synchronized to Firebase, are not tenant-isolated, and are not protected by account roles. They may remain on a shared device until local browser data is cleared.

Preloaded records are synthetic demonstration records. Do not enter real personal data, health information, confidential business information, evidence, or operational records into this prototype.

## Notifications and external services

Notification switches currently store personal preferences only. This repository does not implement email alerts, SMS alerts, browser push delivery, or background notification services.

The account layer sends authentication and verification requests to Firebase when configured. No application personnel or incident records are sent to an AI model by the current client-side record-processing implementation.

## Security boundaries

Firestore Security Rules restrict account profile and personal-settings access to the signed-in UID. Users cannot use the account profile update interface to change their role, account status, or organization membership. Other Firestore collections are denied until a separately reviewed tenant-scoped data design is implemented.

These controls do not make browser-local operational data secure or establish a production-ready records-management system.

## Requests and contact

The Account Settings → Privacy & Data screen accepts access, correction, or deletion requests concerning the account profile and personal preferences. Submitted requests are available for manual review by the project owner. No automatic account deletion is performed. The current prototype does not yet implement a full request-status dashboard or statutory grievance workflow.

For deployment-specific privacy enquiries, the operator must publish and maintain an actual contact address and update the relevant deployment documentation before real users are invited. No contact address is invented or assumed in this repository.

## Retention and deletion

Account data are retained in the Firebase project until handled through a separately approved administrative process. Privacy request submissions are not editable or deletable by the submitting user under the current Firestore rules. The prototype does not automatically purge records, delete related evidence, or guarantee completion of a deletion request.

## Changes

This notice must be reviewed and updated whenever the data flows, Firebase configuration, operational-record architecture, analytics, notification mechanisms, or retention practices change.
