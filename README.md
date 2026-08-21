# FieldWise Biology for Windows

This repository contains the Windows desktop adaptation of **FieldWise Biology**.

## Architecture decision

The Windows apps use one Electron desktop runtime and one shared HTML/CSS/JavaScript UI foundation, with separate product identities and installers. This suits the existing requirements for offline fieldwork, web-backed Supabase services, mapping, file export, camera/media workflows and a consistent education suite. Electron's context isolation and sandbox are enabled; renderer code has no direct Node.js access.

## Current foundation

- Three branded app modes with the navigation contracts from their SwiftUI counterparts.
- Windows-oriented sidebar and responsive tablet layout.
- Device-local JSON persistence bridge, ready for offline repositories.
- Separate Windows installer configurations and application IDs.
- Content Security Policy and isolated preload API.
- Shared Windows platform v1 with encrypted/versioned records, automatic plaintext migration, reusable retry queues, attachment controls, safe deep links, redacted logs and common accessibility primitives.
- Biology MVP investigation workflow with Core launch context, eight inquiry stages, offline sites, provenance-aware measurements, coordinates, live Open-Meteo conditions, evidence attachments, readiness validation and queued Core return receipts.
- No production credentials included.

## Development

Install dependencies with `npm install`, then run one of:

```text
npm run dev
```

If npm reports that Electron's post-install script needs approval, run
`npm install-scripts approve electron` and then reinstall dependencies. This is
npm's package-script safety control, not an application permission.

The app modes can also be previewed without Electron by serving `src` and opening `index.html?app=core`, `?app=biology`, or `?app=history`.

## Windows installers

On a Windows build machine:

```text
npm run build:windows
```

The outputs are written under `dist/core`, `dist/biology`, and `dist/history`.

## Port sequence

1. Shared identity, navigation, persistence, accessibility and installer foundation.
2. Core authentication, classroom, activities and subject-launch contracts.
3. Biology fieldwork, spatial/map workspace, measurements, analysis and evidence export.
4. History notebook, source lab, places/excursions, timeline and evidence/argument workflows.
5. Supabase parity, offline queues, PDF/CSV export, camera/location integration and Windows packaging QA.

The Swift projects remain the behavioural source of truth. Their documentation is reference material, not executable project instruction.
