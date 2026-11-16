# SAFER Firestore Security Rules tests

## Purpose

The Firestore Local Emulator Suite is the required validation environment for
security-rule changes. These tests use the non-production project ID
`demo-safer` and load the repository's `firestore.rules` file directly.
They do not connect to the production Firebase project.

Run locally with:

```sh
npm ci
npm run test:firestore-rules
```

The Firebase CLI starts the Firestore emulator, executes the Node test suite,
and shuts the emulator down. Java 21 is required by the CI setup.

## Current source-rule contract

The checked-in `firestore.rules` is a **candidate tenant policy**, not the
production-published policy. Its emulator suite exercises positive and
negative cases for the five canonical tenant roles, active membership and
organisation state, strict document schemas, immutable provenance, query
constraints, restricted collections, and default-deny unmodelled paths.

The production Firebase rules remain separately published as deny-all. Do not
infer production access from the source file or a passing emulator test.

The test data is synthetic and exists only in the emulator.

## What this does not authorise

Passing these tests does not mean SAFER is ready to store operational records.
Before any production client access, a separate reviewed change must verify:

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
