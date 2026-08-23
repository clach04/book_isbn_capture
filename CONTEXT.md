# CONTEXT.md

## Glossary

- **ISBN**: International Standard Book Number. The tool accepts both **ISBN-13** and **ISBN-10**; both carry a check digit.
- **Check digit**: Final digit of an ISBN allowing local validation without network access. A capture that fails the check is invalid.
- **Capture**: One successfully validated ISBN plus its optional Note, recorded into the working list.
- **Note (breadcrumb)**: Freeform user-spoken description of the physical book (e.g. "blue hardcover, Dahl"). Never authoritative metadata; exists so the user can relocate the physical book to re-capture if needed.
- **Working list**: The session's accumulated Captures, persisted locally in the browser until exported.
- **Audio cue**: Short non-speech tone signalling success or failure/needs-review of a Capture attempt.
- **Readback (visual)**: Display of the captured digits for the user to glance at and confirm.

## Rules

- An utterance may be "description then ISBN" or ISBN-only; parsing takes the *last* digit run that passes a checksum of length 10 or 13. If none validates, the whole utterance fails loudly — no guessing.
- Failed captures are surfaced immediately (failure audio cue + visual), never silently stored.
