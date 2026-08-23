# Book ISBN Capture

Voice-first ISBN capture tool for cataloguing physical books. Speak the ISBN
(and optionally a description), it validates locally via checksum and builds an
exportable list for archive.org / Open Library workflows.

Pure static HTML+JS — one file, no dependencies, no backend.

## Launch for local testing

Speech recognition requires a secure context: `http://localhost` or `https://`.
Plain `file://` will NOT work.

```bash
# from this directory
python -m http.server 8000
```

Then open <http://localhost:8000> in **Chrome** (desktop or Android) and allow
microphone access. Desktop Chrome's speech recognition routes through Google's
servers, so network access is required.

For phone use, deploy to any static HTTPS host (e.g. GitHub Pages); LAN-IP HTTP
(`http://192.168.x.x`) will not get mic permission.

## Usage

1. Tap the big button → wait for the **beep** (mic is live)
2. Optionally say a short description ("blue hardcover Dahl"), then the digits
   of the ISBN — pauses are fine; a live transcript shows what's heard
3. Stop speaking → after the configured silence (default 3 s, adjustable
   on-screen; 1.5 s works well) the turn ends and the number is validated
4. Success chime + green status = captured. Error buzz = say it again.
   Typing/paste field is always available as fallback.

Tips:

- Both **ISBN-10** and **ISBN-13** accepted. Each capture keeps the form you
  entered (`display`) plus derived `isbn10`/`isbn13` fields. A 978-prefixed
  ISBN-13 converts both ways; **979**-prefixed ones have no ISBN-10 equivalent
  (that column stays empty)
- Capturing a book twice (even once as ISBN-10 and once as ISBN-13) is
  detected via the canonical ISBN-13 and skipped
- A single dropped digit is repaired deterministically via the checksum
  (status warns "repaired — verify!")
- Some older ISBN-10s end in the letter **X** (~1 in 11): say "...six **ex**"
  or type them in the manual field
- Each row can be deleted (×) or have its digits fixed by tapping the ISBN
- **Titles** are fetched automatically from Open Library (free, keyless) for
  captured ISBNs (looked up via canonical ISBN-13, whatever form you spoke or
  typed) and shown under each entry with authors; "not found" entries can be
  retried via the **Fetch titles** button. Each row links to
  <https://isbnsearch.org/isbn/…> for a quick manual detail check
- **Copy all** puts newline-delimited ISBN-13s on the clipboard; **Export CSV**
  downloads `isbn_entered,isbn10,isbn13,note,timestamp`. Both clear the "not
  yet exported" nag.

## Notes

- Captures persist in browser `localStorage` until exported — clear site data
  wipes them, so export regularly
- Chrome's recognizer takes ~0.5–2 s to warm up per turn; tap while reaching
  for the next book
- Version string is at the bottom of the page; check it after reloading if
  behavior seems stale (browser cache)

## Development

- All logic lives inline in `index.html`
- Parser rules: utterance → normalize digit words ("nine"→9, "ex"→X) → rejoin
  split digit groups (spaces/hyphens) → take the LAST 10/13-char run passing
  checksum; text before it is kept as the note. No valid run → whole turn
  fails loudly; nothing invalid is ever stored.
- Every behavior change gets a version bump + git commit; see `git log`

## Test Data


### The C Programming Language

https://isbnsearch.org/isbn/9780131101630

  ISBN-13: 9780131101630
  ISBN-10: 0131101633
  ISBN-10: 01 31 10 16 33


### Linux in a Nutshell (In a Nutshell (O'Reilly))

https://isbnsearch.org/isbn/9781565925854

  ISBN-13: 9781565925854
  ISBN-10: 1565925858
  ISBN-10: 1 56 59 25 85 8

## Notes

This is an experiment with stealth/ox-alpha and pi.dev
using Matt Pocock's grill-with-docs skill:

> I want a tool that can take in ISBN numbers, then look up the title, and/or make it easy to check with archive.org if they have the books in the collection already or want them to be donated. I'm thinking either something that runs on desktop or pure html+js that can be hosted on a webserver then used from a phone. I want an easy way to get ISBN numbers from the book into the app. I'm thinking voice to text might be faster than using a camera phone. Help be figure out least hassle way for a human to enter in ISBN numbers. I want to support typing/copy+paste but thinking voice would likely be the prime way in. I want to minimize button presses on the phone, which is why I'm thinking NOT using the phones built in keyboard with voice-to-text is not a good idea. We could try that out though with version one that takes keyboard input
