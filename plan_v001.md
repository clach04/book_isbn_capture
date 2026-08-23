# Plan v0.01 — Book ISBN Capture (as-built)

> Written 2026-08-23 after implementation. Original pre-build decisions are
> preserved where they held; superseded ones are annotated. For camera capture
> see plan_v002.md.

## Architecture
Pure static HTML+JS in a single `index.html` — no dependencies, no backend.
Dev loop: desktop Chrome over `http://localhost` (secure context required for
mic/camera). Production: any static HTTPS host (GitHub Pages). Web Speech and
`BarcodeDetector` both require the secure context; LAN-IP HTTP does not work.

## Input paths
1. **Voice (prime path)** — Web Speech API, tap-to-talk per speaking turn:
   tap → "Starting mic…" → beep (~350 ms, after Chrome's real capture starts)
   → speak description + digits or digits only, pauses fine, live interim
   transcript → turn auto-ends after configurable silence (1–10 s on screen,
   persisted; 1.5 s recommended) or manual tap. Continuous listening mode;
   parse happens once at end of turn.
2. **Camera barcode scan** — native BarcodeDetector, auto-capture, continuous
   (plan_v002.md, v0.0.18).
3. **Manual** — type/paste field, always available; accepts ISBN-10 with
   trailing X (voice can say "ex" for X too).

## Parsing rules (the heart of the app)
- Normalize digit words ("nine"→9, "oh"→0, "ex"/"x"→X); only whole words map
- Rejoin digit groups split by spaces/hyphens
- Take the LAST 10/13-char run passing its checksum (ISBN-10 or ISBN-13);
  everything before it becomes the Note (breadcrumb)
- No valid run → whole turn fails loudly (error tone + transcript shown);
  **nothing invalid is ever stored**
- Deterministic single-digit repair via checksum (9→10, 12→13 digits),
  flagged "repaired — verify!" with the error tone; exact matches always win
  over repairs (an orphaned X must never trigger a wrong-book repair)
- Notes get a repeat-collapse pass (backstop for Android Chrome's cumulative
  final results, which duplicate phrases)

## Storage model
- `localStorage` key `isbn-captures-v1`; records: `display` (verbatim entered
  form), `isbn10`, `isbn13` (derived when mathematically possible; 979-prefixed
  ISBN-13s have no ISBN-10), `note`, `ts`
- Pre-v0.0.14 records auto-migrate on load
- Duplicate detection on canonical ISBN-13 — same book entered as ISBN-10 and
  ISBN-13 is skipped with an error cue
- Gentle nag banner while unexported captures exist; clipboard/CSV export
  clears it

## Feedback
- Non-speech audio cues only: two-tone success chime, low error buzz, short
  "mic is live" beep on voice start
- Visual: live transcript, status line, capture list (newest first)
- Editing: tap ISBN to fix digits (validated, reverted if invalid), tap note to
  edit, × to delete

## Export
- Copy all: newline-delimited ISBN-13s
- CSV: `isbn_entered,isbn10,isbn13,note,timestamp`

## Lessons learned (do not re-learn)
- v0.0.3 pending-note experiment (attaching pause-split description utterances
  to the next capture) made UX worse — reverted; notes are same-utterance or
  tap-to-edit
- Chrome on Android sometimes emits CUMULATIVE final results — replace when a
  final extends the accumulated text, else append
- Chrome hallucinates phrases on silence ("FedEx in a nutshell") — no filter
  needed; checksum validation is the real gate
- Chrome finalizes at the first intra-number pause with continuous=false —
  long spoken ISBNs get truncated; must listen continuously per turn
- Chrome's audio capture lags `onstart`; delay the start beep accordingly
- Commit after every confirmed-working state; version string in the page
  footer to defeat stale-cache confusion

## Version history
- v0.0.4 known-good baseline (voice capture, validation, tones, list, export)
- v0.0.5–0.0.7 no-speech handling, hallucination filter (later removed),
  start beep
- v0.0.8–0.0.9 continuous listening, parse at end of turn, silence timeout
- v0.0.10 hyphen tolerance, instant starting feedback
- v0.0.11 configurable silence timeout
- v0.0.12 removed hallucination filter
- v0.0.13 spoken/typed ISBN-10 check digit X
- v0.0.14 dual ISBN-10/13 columns, 979 handling, dedupe
- v0.0.15 tap-to-edit notes
- v0.0.16 cumulative-result handling (Android)
- v0.0.17 note repeat-collapse
- v0.0.18 camera barcode scanning (plan_v002.md)

## Still open
- Batch Open Library title fetch / archive.org availability display (TODO.md)
