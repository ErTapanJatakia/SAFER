# DPDP workflow foundation — security and assurance notes

**Scope:** SAFER's browser-local, synthetic demonstration workspace only.
**Cost:** INR 0; no new service, provider, Firebase collection, Cloud Function or paid API.
**Status:** DPDP-01 through DPDP-06 workflow foundations implemented on the feature branch. Automated tests are authored but have not yet been executed.

## DPDP-01 — Privacy governance

- Purpose records capture purpose description, data categories, processing operations, recipient categories, organisation-defined retention rule, review role and review date.
- No lawful ground is preselected. A review marker requires an explicit organisation review note.
- Notice drafts are versioned and linked to reviewed purposes. "Approved for demo" is a local workflow label only; a later approved version supersedes an earlier one.
- Consent history is append-oriented. Withdrawal adds an event; it does not rewrite the grant. Current state is derived from the event list.
- No notice is publicly delivered and no legal consent validity is established.

## DPDP-02 — Data principal rights

- Synthetic case types include access, correction, completion, erasure, grievance and other.
- Case records capture a synthetic subject reference, request scope, identity-check state, status, assigned workflow role, decision note and evidence references.
- Progress/completion requires the synthetic-reference-matched marker. This is not identity verification and must not be used for real requests.
- No identity documents are accepted. No real requests, statutory time limits or external submissions are processed.

## DPDP-03 — Retention and disposition

- Schedules use organisation-defined rules and review dates; the product does not invent statutory retention periods.
- Proposed dispositions include retain, restrict-review, defer and delete-after-approval.
- A disposition requires a separate role marker for approval. The record schema fixes `executed: false`.
- There is no automatic purge, erasure of personnel records or destructive deletion API.

## DPDP-04 — Personal data breach management

- Synthetic breach records track discovery/recording time, affected categories/systems, severity, response state, containment/remediation markers, notification assessment and evidence references.
- Closure is gated on recorded containment, remediation and a non-empty notification assessment state.
- Notification assessment is not a legal reportability determination. No regulator or data-principal notification is sent.

## DPDP-05 — Accountability and assurance

- Responsibilities can be assigned to a workflow role.
- Evidence references record a control description, reference, reviewer role, timestamp and limitations.
- The governance snapshot can be exported as JSON with a warning. It is not encrypted, immutable, independently verified or a statutory filing.
- Hash-chain types and self-entered evidence references do not establish a trusted writer or tamper-proof audit trail.

## DPDP-06 — Security controls and validation

| Control | Implementation |
|---|---|
| Data boundary | Separate key `safer_dpdp_governance_demo_v1`; synthetic-only workspace mode |
| Schema | Required exact top-level collection set; record validators reject unsupported states/roles/fields |
| Uniqueness | Unique IDs checked within each collection |
| Resource bounds | Maximum 500 records per collection; 1 MB serialized workspace |
| Storage behavior | Fail-closed malformed/oversized input; write/read-back verification; stale-snapshot rejection |
| Remote access | No remote writes, new Firestore paths, or tenant provisioning |
| Identity | No document uploads or real identity verification |
| Retention | No destructive execution; disposition records explicitly remain unexecuted |
| Authorization | Role labels are workflow metadata only; not an authenticated authorization mechanism |
| Evidence | References only; no independent verification or immutable audit claim |
| Export | Explicit synthetic-only JSON export; unencrypted warning |
| Validation | Domain and repository tests registered in `test:dpdp-governance`; execution pending consolidated validation |

## Validation plan (not yet executed)

1. Run the DPDP domain/repository suite.
2. Run TypeScript typecheck and production build.
3. Run existing privacy repository and export regression suites.
4. Run the consolidated Firebase emulator Rules suite to ensure no tenant/operational authorization regressions.
5. Review UI keyboard/screen-reader behavior, storage-failure states, and export warning.
6. Review all findings; do not weaken or delete tests to obtain a pass.

## Release boundary

The feature branch is not a production release. Do not merge or deploy until branch reconciliation, consolidated CI, security review and the repository's normal merge gates pass. This implementation is not legal advice and does not certify compliance with the Digital Personal Data Protection Act or Rules.
