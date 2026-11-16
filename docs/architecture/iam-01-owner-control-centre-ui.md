# IAM-01 — Owner Control Centre UI

## Scope

The Owner Control Centre is rendered only after the signed-in Firebase user is independently verified by `GET /api/owner/status`. The browser does not inspect custom claims, cached role values, or tenant membership to infer Platform Owner authority.

The component uses the authenticated user's Firebase ID token as a bearer token for the existing Owner APIs. Those APIs repeat the authoritative Platform Owner checks server-side on every request.

## Available controls

- View the platform PMC registry and its lifecycle state.
- Create a PMC provisioning record and invite an existing, verified initial Super Admin.
- Retain the newly issued initial invitation identifier in the Owner session and allow its pending invitation to be revoked with a bounded reason.
- Suspend, reactivate, or close a PMC through the transactional registry endpoint.
- Create a purpose-bound, time-limited support session for one active PMC.
- Revoke the currently displayed support session, recording a reason and change reference.

Registry and lifecycle operations remain server-side and append platform audit events. Support session creation requires a purpose, change/ticket reference, explicit action set and a duration between 5 and 30 minutes. The session identifier is a bearer secret and is displayed only in the authenticated Owner UI.

## Explicit limitations

- This UI does not browse, mutate, or export tenant records.
- The support-session lifecycle is available, but no cross-tenant data endpoint currently consumes `authorizePlatformSupportAccess()`. Do not treat session creation as tenant-data access.
- The UI does not provision the Platform Owner identity or modify Firebase secrets, production rules, or deployment settings.
- A PMC created through the UI remains in provisioning state until the separate invitation acceptance and tenant activation lifecycle completes.
- Revoking the initial invitation suspends the provisioning PMC. A replacement-invitation workflow is not available; a new nomination must use a separately designed lifecycle.
- Authenticated tenant operational workspaces remain unavailable until the tenant repository, backend integration, candidate Firestore Rules, emulator validation and security release review are complete.
- Demo Guest remains isolated from authenticated Owner and tenant sessions.

## Security behavior

- Owner status is rechecked on identity changes.
- Unavailable or denied Owner authority fails closed.
- API responses are requested with `cache: no-store`.
- The UI does not use direct browser Firestore access for platform records.
- The server remains authoritative for authorization, lifecycle transitions and audit writes.
