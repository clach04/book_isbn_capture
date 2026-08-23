# Plan v0.03 — ISBN Metadata Lookup (Open Library + archive.org links)

## Goal
Enrich captured ISBNs with titles (and authors) via Open Library, and provide
one-tap archive.org availability checks. Pure client-side; Open Library is
free, keyless, and CORS-enabled (it is run by the Internet Archive).

## Design decisions (settled)
- **API**: `https://openlibrary.org/api/books?bibkeys=ISBN:<isbn13>&format=json&jscmd=data`
  — one request per ISBN, or batched by comma-separating bibkeys.
- **Trigger**: fetch automatically on app load for records missing a title,
  throttled (e.g. sequential with small delay) to be polite. Self-limiting:
  records that already have a title (or were looked up and not found) are
  skipped. A manual "Fetch titles" button as fallback/retry.
- **Storage**: add `title` (string), `authors` (string), `lookup` ("found" |
  "not-found" | undefined=pending) to capture records. Old records migrate
  implicitly (missing fields = pending).
- **Display**: title (+ authors, smaller/dimmer) under the ISBN in each list
  row; keep note editable alongside.
- **archive.org link**: per-entry anchor to
  `https://archive.org/search?query=isbn%3A<isbn13>` so one tap shows whether
  the Internet Archive has it / can lend it. No API-driven "have it" state in
  the app itself — the app stays a capture-and-enrich tool; donation workflow
  happens on archive.org.
- **Failures**: network/lookup errors never block capture or export; a failed
  lookup leaves the record pending for the next attempt.

## Implementation sketch
1. Extend capture record shape (`title`, `authors`, `lookup`); no migration
   code needed beyond defaulting missing fields.
2. `lookupTitle(isbn13)` → fetch, parse `jscmd=data` payload
   (`data["ISBN:..."].title`, `.authors[].name` joined), return or mark
   not-found. Handle 404/non-JSON gracefully.
3. Queue runner: on load, collect records with `lookup === undefined`,
   process sequentially with ~300 ms delay, re-render after each.
4. Render: title/authors line in row; archive.org link icon/anchor per row;
   keep tap-to-edit ISBN/note behaviors intact.
5. Manual retry: small "Fetch titles" button next to exports for
   pending/not-found records.

## Conventions to follow
- Version bump in footer (`v0.0.19 …`) + git commit after working state
- Everything inline in `index.html`; no dependencies
- Update README.md (usage) and TODO.md when done

## Status
Planned 2026-08-23; not yet implemented. Suggested kickoff prompt for a fresh
session is in this plan's origin conversation (README.md + plan_v001.md +
this file are sufficient briefing).
