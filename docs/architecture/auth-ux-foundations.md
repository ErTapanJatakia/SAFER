# SAFER authentication and user-experience foundations

## Authentication

- Firebase Authentication remains the identity provider. Firebase identity does not itself grant a PMC role or tenant access.
- Email/password registration enforces the existing 12–128 character password policy and requires email verification before an authenticated workspace can be entered.
- Google sign-in uses Firebase's Google provider and rejects an unverified account.
- Password reset responses remain generic to avoid confirming whether an email address is registered.
- Authentication observer failures fail closed and revoke local Demo Guest/workspace capabilities.
- Account changes that affect credentials use provider-aware reauthentication; email changes require Firebase verification.
- Google popup diagnostics now identify common configuration and browser failures without exposing raw SDK messages or credentials.
- A per-tab, five-minute OAuth-flow marker is stored in sessionStorage only. Cleanup touches only this marker and never clears Firebase persistence, cookies, preferences, or operational data.
- Account identity transitions invalidate membership lookups and peer-tab session state. Tenant roles remain server-resolved.

## Regional preferences and localisation

Account preferences remain browser-local and are not an identity source or authorisation claim.

Supported language options:
- English
- French
- Polish
- German
- Italian
- Turkish
- Spanish
- Czech
- Russian
- Arabic
- Urdu

Arabic and Urdu set the document direction to RTL. The current translation catalogue covers authentication, primary navigation, and account preference controls. The operational module labels, longer descriptions, validation messages, and generated report content still require full translation before claiming end-to-end localisation.

Regional display preferences:
- Date: DD-MM-YYYY, YYYY-MM-DD, or DD/MM/YYYY
- Time: 12-hour or 24-hour
- Timezone: Asia/Kolkata or UTC
- Number grouping: en-IN or en-US

Canonical stored dates and operational calculations are not rewritten when display preferences change. Regional display helpers are used by personnel, incident, checklist, dashboard, readiness and export presentation paths. A local wall-clock timestamp without an offset is interpreted in the browser's local timezone before display conversion.

## Accessibility

- Existing text scaling, spacing, contrast/border emphasis, browser colour scheme, reduced motion, keyboard focus visibility, large controls, and alternative system font presentation remain available.
- A user-visible Screen-Reader Status Announcements preference now controls the persistent polite live region. It defaults to enabled.
- The setting does not provide a screen reader and does not establish WCAG conformance. Browser and assistive-technology testing remains required.
- Arabic and Urdu receive basic RTL document and control alignment support; full RTL review of every operational component remains required.

## Validation and release boundary

- Regression tests were added for OAuth marker hygiene, safe Firebase error mapping, locale persistence/direction, regional formatting, and live-announcement control.
- No tests, builds, or GitHub Actions workflows were run as part of this implementation because repository Actions are disabled by the owner.
- This branch is not merged or deployed. Firebase provider enablement, authorised domains, and production environment configuration remain separate deployment prerequisites.
