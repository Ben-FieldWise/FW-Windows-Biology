# FieldWise Biology 0.7.0-rc.2

This is an unsigned Windows release candidate for controlled internal validation. It is not approved for production or an unsupervised school deployment.

## Candidate contents

- Branded NSIS installer and runtime icon
- Encrypted offline records and evidence attachments
- School-bound Core/subject deep links
- Camera, location, export and Print/Save PDF workflows
- Automated tests, dependency audit and packaging workflow

## Artifact verification

The Windows workflow writes `SHA256SUMS.txt` beside the installer and includes a checksummed `BUILD_PROVENANCE.json` identifying the exact source commit and workflow run. Before installation, compare the installer SHA-256 value with that file and obtain the candidate through the controlled CI artifact channel.

## Required validation

Use the Phase 6 readiness record for blocking external gates. In particular, this candidate still requires Windows-device testing, code signing, accessibility and privacy review, a controlled school pilot, and any app-specific safety or cultural-governance approval.
