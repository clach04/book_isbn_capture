# TODO

- [x] ~~Camera barcode scanning~~ — DONE v0.0.18 (native BarcodeDetector, EAN-13 978/979 filter, auto-capture, continuous mode)
- [x] ~~Batch Open Library title fetch / archive.org availability display~~ — DONE v0.0.19 (auto-fetch titles on load, sequential queue, "Fetch titles" retry button, per-row archive.org search link; see plan_v003_isbn_lookup.md)
- [x] ~~Quarantine bucket~~ — REJECTED experiment (v0.0.3, reverted v0.0.4); notes handled via single-utterance description+ISBN and tap-to-edit notes
- [ ] REJECTED experiment (v0.0.3, reverted in v0.0.4): pending-note carry-over for pause-split utterances ("description" …pause… "ISBN"). Made UX worse (multiple button presses, failed captures) — Chrome's recognizer behavior didn't match assumptions. Notes now: speak description+ISBN in one breath, or edit note later.
