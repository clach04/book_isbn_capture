# Plan v0.01 — Book ISBN Capture

## Goal
Capture ISBNs from physical books with minimal hassle (voice-first on a phone), validate them locally, and export the list for archive.org/Open Library workflows.

## Decisions (from grilling session 2026-08-23)

| # | Decision |
|---|----------|
| D1 | Pure static HTML+JS, no backend. Working list in `localStorage`, export via clipboard/CSV. No sync. |
| D2 | Prime input: Web Speech API voice (Android/Chrome primary; desktop Chrome works for dev). Typing/paste fallback. |
| D3 | Freeform utterance: "description then ISBN" or ISBN-only. Parser takes the *last* digit run of length 10 or 13 that passes the check digit; everything before it is the Note (breadcrumb). No validating run → whole utterance fails, nothing stored. |
| D4 | Local validation only: ISBN-13 and ISBN-10 check digits. Invalid = loud immediate failure (error tone + transcript shown), retry by re-speaking. |
| D5 | Feedback: non-speech audio cues (success/failure tones) + visual readback of captured digits + note shown in list. TTS readback is a future toggle only. |
| D6 | Storage: `localStorage`; gentle nag banner when unexported captures exist. |
| D7 | Editing in v1: per-row delete (×); tap row to fix digits via keyboard. |
| D8 | Export: copy-to-clipboard + CSV download (`isbn, note, timestamp`). |
| D9 | Hosting: dev on desktop `localhost` (secure context required for mic); deploy to static HTTPS host (GitHub Pages likely). |

## Deferred (see TODO.md)
- Camera barcode scanning (EAN-13) — v2.
- In-app Open Library title fetch / archive.org availability check — near-future v2.
- Utterance quarantine bucket — maybe.
- TTS readback toggle.

## Implementation checklist
1. [ ] `index.html` — single page UI: big talk button, live transcript area, capture list, export controls, unexported-nag banner.
2. [ ] Speech capture module — Web Speech API wrapper, continuous listening off (tap-to-talk per utterance), transcript display.
3. [ ] Parser — digit-run extraction, last-valid-checksum-wins rule (10 or 13), note extraction.
4. [ ] Validators — ISBN-13 and ISBN-10 checksums (+ optional 10→13 conversion helper).
5. [ ] Audio cues — WebAudio success/failure tones.
6. [ ] Storage — localStorage persistence, unexported-tracking nag.
7. [ ] List UI — rows with isbn, note, timestamp; delete; tap-to-edit digits.
8. [ ] Export — clipboard (navigator.clipboard) + CSV download blob.

## Testing notes
- Desktop Chrome over `http://localhost` for mic dev loop.
- Verify parser edge cases: numbers inside descriptions ("1984 edition"), trailing misheard digits, ISBN-10 vs 13 ambiguity.
