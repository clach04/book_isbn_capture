# Context — Book ISBN Capture

A voice-first/camera-first tool for cataloguing physical books by ISBN,
enriching them with metadata, and checking Internet Archive donation
interest. Pure client-side app plus small CLI helper scripts.

## Glossary

**Capture**
One physical book recorded by the tool. Identified canonically by its
ISBN-13 regardless of which form was entered.

**Capture record**
The stored unit: `display` (verbatim entered ISBN), derived `isbn10`/
`isbn13`, `title`, `authors`, `want`, `lookup`, `note`, `ts`.

**Lookup status (`lookup`)**
State of the Open Library title fetch for a capture: *pending*
(never attempted or attempt failed — retry is worthwhile), *found*,
*not-found* (Open Library has no such book). Pending and not-found are
different facts: transient failure must never masquerade as absence.

**Want status (`want`)**
Whether archive.org wants the book as a donation: *yes*, *no*,
*unknown* (`?` = checked but verdict unclear), or *pending* (unchecked).
Independent of lookup status.

**Note**
Free-text description spoken/typed alongside the ISBN ("blue hardcover
Dahl"). Same-utterance only or tap-to-edit; never carried across turns.

**Repair**
Deterministic single-digit reconstruction of a spoken/typed ISBN using its
checksum. Unique per run, flagged "repaired — verify!". Exact matches always
win over repairs.

**Import**
Bulk-adding captures by pasting previously exported text into an input
box. Matches existing captures by ISBN-13; the imported row replaces the
local one wholesale on match. Malformed or checksum-failing rows are
skipped individually and reported, never repaired. Enrichment is not
triggered by import. A preview states how many captures will be added vs
overwritten before the user confirms.

**Export**
Copy-all (newline-delimited ISBN-13s) or CSV download. Clears the
unexported-captures nag. CSV columns:
`isbn_entered,isbn10,isbn13,title,authors,archiveorg_want,lookup,note,timestamp`.

**Enrichment**
Filling `title`/`authors` (Open Library) and `want` (archive.org /want/)
for captures. Runs automatically when a capture is created — **never on
page load** (a deliberate choice: reloads must not storm failing lookups)
— and manually via the "Fetch missing data" button, which also retries
not-found titles and unknown want statuses.
