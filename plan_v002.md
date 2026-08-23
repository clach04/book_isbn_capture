# Plan v0.02 — Camera Barcode Capture

## Goal
Add camera-based ISBN entry as the least-hassle capture path for a shelf/box of
books, complementing (not replacing) voice input.

## Decisions
- Native `BarcodeDetector` API only, no fallback library. Button is shown when
  the API exists; hidden otherwise. Keeps the app dependency-free. Desktop
  Chrome lacks the API — phone-only feature by design.
- EAN-13 format only, filtered to **978/979** prefixes: an EAN-13 is a book ISBN
  only under those GS1 prefixes. All other barcodes are ignored silently.
- **Auto-capture** on recognized barcode: success chime + dedupe check are the
  safety net; no per-book confirmation step (minimize interaction).
- Scan view stays open after a hit for continuous scanning of a pile of books;
  status line shows the last captured number.
- Detection loop every ~250 ms over live `getUserMedia` video
  (`facingMode: environment`). One capture per frame.
- Duplicates: skipped via canonical ISBN-13 check (same mechanism as voice).

## Implementation notes
- Feature-detect `'BarcodeDetector' in window`; construct with
  `{ formats: ['ean_13'] }`.
- Full-screen overlay `<video autoplay playsinline muted>` + status + Done.
- Stop tracks and clear the timer on close; transient decode errors from
  `.detect()` are normal and swallowed per-frame.
- Chrome Beta note: may need `chrome://flags#enable-barcode-detection`
  depending on version if the button doesn't appear.

## Status
Implemented in v0.0.18 (commit 0c26a61). Tested on desktop (logic) — pending a
real Android scan session.
