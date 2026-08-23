# Plan v0.04 — archive.org Donation-Want Lookup (as-built + findings)

> Implemented 2026-08-23 as v0.0.23. This document records the API
> investigation, live examples with expected page text, and the batch/CLI
> outlook.

## Goal
For each captured ISBN, determine whether the Internet Archive wants the book
as a donation, using `https://archive.org/want/?id=<isbn>&mode=donation_book`.
Show ❌ (unwanted) / ✅ (wanted) / ❓ (unknown) per row; export a `want`
column (`yes`/`no`/`?`) in the CSV.

## The endpoint (undocumented; screen-scraped)
`GET https://archive.org/want/?id=<ISBN or LCCN or SBN>&mode=donation_book`

- **No REST/JSON form exists.** `&output=json`, `&format=json`, `&callback=`
  are all ignored (still returns HTML). `OPTIONS` gives no CORS headers.
- Server-rendered HTML. The verdict is inside:
  `<strong id='response' class='...'>VERDICT TEXT</strong>`
  - `class='text-success'` → they need it (wanted)
  - `class='text-danger'` → they don't need it (unwanted) **and** error
    messages ("Encountered an error with the API:") share this class, so the
    TEXT must be parsed, not just the class.
- Same page also echoes `OpenLibrary Title:` for cross-checking.
- One ID per request. There is also a JSON-ish internal helper
  `https://archive.org/book/marc/ol_dedupe.php` but probing showed only
  `{"status":"ok","response":-1,"message":"invalid query",...}` for every
  parameter spelling tried (id/isbn/query/field+value, single or comma-
  separated). Treat as unusable.

## Live examples (2026-08-23) and expected verdicts
| ISBN-13 | Page text at `id='response'` | Class | Meaning |
|---|---|---|---|
| 9781565925854 (Linux in a Nutshell) | `we don't need this book` | text-danger | unwanted |
| 9780131101630 (The C Programming Language) | `we don't need this book` | text-danger | unwanted |
| 9781559582445 (entered by user as ISBN-10 1559582448) | `we need to scan this book` | text-success | wanted |

Verdict parsing (implemented in `lookupWant`):
1. `/don.?t need|do not need/i` on the response text → `'no'`
2. else `/\bneed\b/i` (covers "we need to scan this book") → `'yes'`
3. else → `'?'` (unknown; e.g. error text shares text-danger)

## CORS constraint and proxy strategy
Browser fetch of archive.org is blocked (no `Access-Control-Allow-Origin`).
Implemented via public CORS proxies, tried in order ×2 rounds:
1. `https://api.allorigins.win/raw?url=<encoded>`
2. `https://api.codetabs.com/v1/proxy?quest=<encoded>`

Measured reliability (2026-08-23): allorigins succeeds ~1-in-3 attempts on
this slow page (~10 s when it works, ~20 s timeout otherwise); codetabs
timed out consistently. Failures leave `want` undefined/pending (❓) for the
next queue run or the "Fetch titles" button (which also re-checks '?').

## App integration (v0.0.23, all in index.html)
- Record gains `want`: `'yes' | 'no' | '?' (checked-unknown) | undefined
  (pending)`. Old records migrate implicitly.
- `lookupWant(isbn13)` runs inside the existing sequential lookup queue
  (300 ms politeness delay), alongside the Open Library title fetch;
  new captures kick the queue automatically.
- UI: emoji badge per row (❌/✅/❓) with hover/tap title text.
- CSV columns now: `isbn_entered,isbn10,isbn13,title,authors,want,lookup,
  note,timestamp`.

## Q3: batch API?
**No.** `/want/` takes exactly one id per request; `ol_dedupe.php` rejects
multi-id queries; no other known endpoint exposes donation-wantedness in
bulk. Only the Open Library *title* API batches (comma-separated bibkeys),
which we already use per-record anyway.

## Q4: command-line tool (future work, not yet built)
Since there is no batch API, a CLI tool would still loop one-by-one — but
from a shell there is **no CORS restriction**, so it can hit
`archive.org/want/` directly with curl/node-fetch (fast, reliable, no
proxies). Sketch:
- Input: CSV with an `isbn13` column (our own export qualifies).
- Sequential requests, ~1–2 s delay, retry-on-timeout ×3; parse the same
  `id='response'>…</strong>` snippet; write `want` column back to the CSV.
- Node stdlib only (`fetch` built in), consistent with the project's
  no-dependency ethos. Suggested name: `want_lookup.js`, usage:
  `node want_lookup.js isbn-captures-2026-08-23.csv`.
Could also serve as the authoritative checker when proxies misbehave in the
browser app.

## Status
Implemented v0.0.23 (commit b6f294a). Open items:
- [ ] Optional CLI tool (see above) — pending user decision
- [ ] Watch for archive.org exposing a real API (re-check periodically)
