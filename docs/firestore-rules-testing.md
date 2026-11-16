# SAFER Firestore Security Rules tests

## Purpose

The Firestore Local Emulator Suite is the required validation environment for
security-rule changes. These tests use the non-production project ID
`demo-safer` and the explicit `firebase.emulator.json` configuration, which
loads candidate tenant rules from `firestore.rules`. They do not connect to
the production Firebase project. The default `firebase.json` configuration
selects `firestore.production.rules`, which denies all client reads and writes.

Run locally with:

```sh
bun install --frozen-lockfile
bun run test:firestore-rules
```

The Firebase CLI starts the Firestore emulator, executes the Node test suite,
and shuts the emulator down. Java 21 is required by the CI setup.

## Current baseline contract

The emulator candidate rules are intentionally separate from production. The
candidate suite verifies its proposed least-privilege tenant scopes, including
role-specific access and cross-tenant boundaries. Production remains deny-all
until the candidate rules and tenant APIs complete the required release review.

Run the production/emulator configuration guard with:

```sh
bun run test:firestore-production-config
```

The guard confirms that `firebase.json` selects the deny-all ruleset and that
the emulator/test scripts explicitly select the candidate rules.

The test data is synthetic and exists only in the emulator.

## What this does not authorise

Passing these baseline tests does not mean SAFER is ready to store operational
records. The rules remain deny-all. Before permitting any client access, a
separate reviewed change must define and test:

1. immutable UID ownership for user profile documents;
2. authoritative organisation membership documents and role validation;
3. least-privilege permissions for each collection and operation;
4. protection against client-created or client-escalated owner/admin roles;
5. tenant isolation for personnel, incidents, evidence, and exports;
6. field validation, immutable audit metadata, and safe update constraints;
7. negative tests for cross-tenant reads, writes, queries, and privilege
   escalation.

Do not use client-controlled role state or profile fields as an authorization
source. Do not enable Firestore writes or migrate browser-local data until the
future tenant rules pass the emulator suite and are reviewed.
