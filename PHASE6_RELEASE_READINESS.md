# Phase 6 — Pilot and release readiness

Phase 6 engineering is complete for FieldWise Biology. This record does not claim that an unsigned CI artifact has passed a real Windows school pilot or received human approval.

## Pass 1 — Security and reliability hardening

- Core launch and return contracts are bound to a school identity.
- Core local imports are filtered to the signed-in school and, for students, the signed-in student.
- Device-local attachment paths are removed before subject packages cross into Core.
- Encrypted storage, SHA-256 package verification, offline queues, camera limits and safe exports remain covered by automated tests.

## Pass 2 — Release evidence and pilot controls

Automated release gates are defined in `release-readiness.json` and enforced by tests and the Windows CI workflow. The engineering candidate must not be called production-approved until every external gate is supported by recorded evidence.

External evidence still required:

- signed windows installer
- windows 11 device matrix
- school field pilot
- wcag manual audit
- privacy review
- field safety review

## Acceptance rule

A pilot may proceed only after the relevant external reviewers accept the signed installer, supported Windows device matrix, privacy/accessibility controls, curriculum and safety or cultural-governance obligations, and staging service policies. Any critical data-loss, cross-school access, offline, security or navigation defect blocks acceptance.

