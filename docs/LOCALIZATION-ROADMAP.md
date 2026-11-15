# SAFER localisation programme

**Status:** Deferred by product-owner decision on 2026-11-15. No language-localisation implementation is authorised in the current UX batch.

## Product decision

SAFER will not ship a partial English/Hindi localisation slice. The former UX-02 English/Hindi task is deferred and superseded by one coordinated, full-localisation programme covering all 11 language families requested:

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

The programme must include regional and country-specific locale variants where relevant. Language names alone are not sufficient to define formatting or translation behavior. Locale identifiers should use standards-based BCP 47 tags (for example, language plus region/script where applicable), with a reviewed supported-locale registry and explicit default/fallback behavior.

## Scope required for a complete release

A localisation release is not complete merely because the language selector or primary navigation is translated. Coverage must include, at minimum:

1. Every user-visible string in navigation, dashboards, headings, forms, buttons, tables, empty states, tooltips, dialogs, settings and account flows.
2. Validation, inline help, loading, success, warning, error, security, privacy, authentication, session-expiry and cross-tab conflict messages.
3. Accessibility names, descriptions, keyboard guidance, screen-reader live-region announcements and spoken-announcement text.
4. Date, time, time-zone, number, decimal, grouping, percentage, measurement and currency formatting using the selected regional locale. Stored timestamps, numeric values, calculations and evidence serialization must remain locale-neutral and unchanged.
5. Bidirectional layout and text handling, including RTL page direction, mixed-direction identifiers, punctuation, numbers, form controls, icons and focus/navigation behavior for Arabic and Urdu.
6. Locale-aware sorting, search, pluralisation, interpolation, long-text expansion and responsive layouts.
7. Correct font/glyph coverage and rendering on supported browsers and mobile viewport sizes.
8. Locale persistence and deterministic behavior when switching locale during an active session, including authenticated and Demo Guest boundaries.

## Engineering and quality gates

- Inventory and centralise translatable strings; prohibit new hard-coded user-facing strings outside the localisation system.
- Use stable translation keys, typed message contracts and a reviewed locale registry.
- Use English as the canonical source language and a deliberate fallback for genuinely unknown/missing locale identifiers. A fallback must not conceal missing translations in a release candidate.
- Require automated key-parity checks across every supported locale, including plural/select variants and interpolation parameters.
- Require tests for locale switching, regional formatting, RTL directionality, mixed-script content, accessibility announcements, overflow/responsive behavior and persistence.
- Require human linguistic review for every locale, with native or qualified reviewers; machine translation alone is not release evidence.
- Require legal/privacy/security terminology review where translations could change the meaning of consent, rights, warnings, security states or legal boundaries.
- Do not claim 100% coverage until every in-scope string and behavior has passed the coverage and review gates.
- Preserve existing security boundaries, data contracts, Firestore rules, Demo Guest isolation and zero-cost policy. Localisation must not introduce paid translation APIs or transmit user data to translation services.

## Delivery approach

Treat this as a dedicated, planned programme after the current non-localisation UX work is complete. First perform a source-string and locale/formatting architecture audit; then establish the locale registry and message contracts; then implement complete language bundles and RTL support; finally complete automated parity/regression checks and human linguistic review across the entire matrix. Do not expose an incomplete language as selectable in production.

## Current disposition

- UX-02 English/Hindi partial implementation: **deferred; do not start or merge as a standalone slice**.
- Regional formatting UX-01: existing integration is tracked separately and must not be confused with translated UI coverage.
- Full 11-language regional/country-aware localisation: **planned, not implemented or validated**.
- This document records product scope only; it does not authorise production configuration changes, authentication/Firestore changes, deployment or release.
