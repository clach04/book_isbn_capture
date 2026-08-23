# TODO

- [ ] v2: Camera barcode scanning (EAN-13 → ISBN) using `BarcodeDetector` API (Chrome/Android), fallback library (e.g. ZXing) if needed. Least-hassle entry method; deferred from v1.
- [ ] v2 (near): In-app metadata + archive.org checking — batch-fetch titles from Open Library for the whole list, show archive.org availability matches per entry.
- [ ] maybe: Quarantine bucket for unvalidated voice utterances (store what was heard so it can be salvaged/reviewed instead of discarded).
- [ ] REJECTED experiment (v0.0.3, reverted in v0.0.4): pending-note carry-over for pause-split utterances ("description" …pause… "ISBN"). Made UX worse (multiple button presses, failed captures) — Chrome's recognizer behavior didn't match assumptions. Notes now: speak description+ISBN in one breath, or edit note later.
