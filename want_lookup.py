#!/usr/bin/env python3
"""Fill in the archiveorg_want column of an ISBN capture CSV.

Queries https://archive.org/want/?id=<isbn13>&mode=donation_book for each
row (no CORS limits from the command line, so archive.org is hit directly —
no proxies needed). Verdict text is parsed from <strong id='response'>:

    "we don't need this book"        -> no
    "we need to scan this book"      -> yes
    anything else / fetch failure    -> ?

Usage:
    python want_lookup.py input.csv [output.csv]
    python want_lookup.py input.csv -            # write to stdout

Output has the same columns as the app's CSV export:
isbn_entered,isbn10,isbn13,title,authors,archiveorg_want,lookup,note,timestamp

Rows whose archiveorg_want already says "yes" or "no" are kept as-is
(pass --all to re-check every row). Standard library only.
"""

import csv
import re
import sys
import time
import urllib.request

WANT_URL = "https://archive.org/want/?id={isbn}&mode=donation_book"
RESPONSE_RE = re.compile(r"id='response'[^>]*>([^<]*)<", re.IGNORECASE)
DELAY_SEC = 1.0          # be polite: one request per second
RETRIES = 3              # per row
TIMEOUT_SEC = 30


def lookup_want(isbn13):
    """Return 'yes' | 'no' | '?' for one ISBN-13 (never raises)."""
    url = WANT_URL.format(isbn=isbn13)
    for attempt in range(1, RETRIES + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "isbn-capture-want-lookup/1.0"})
            with urllib.request.urlopen(req, timeout=TIMEOUT_SEC) as res:
                html = res.read().decode("utf-8", errors="replace")
            m = RESPONSE_RE.search(html)
            if not m:
                return "?"          # unexpected page shape
            text = m.group(1).lower()
            if re.search(r"don.?t need|do not need", text):
                return "no"
            if re.search(r"\bneed\b", text):
                return "yes"
            return "?"
        except Exception as e:
            print(f"  attempt {attempt}/{RETRIES} failed for {isbn13}: {e}", file=sys.stderr)
            if attempt < RETRIES:
                time.sleep(2 * attempt)
    return "?"


def main(argv):
    if len(argv) < 2 or len(argv) > 3 or argv[1] in ("-h", "--help"):
        print(__doc__, file=sys.stderr)
        return 2
    in_path = argv[1]
    out_path = argv[2] if len(argv) == 3 else "-"

    with open(in_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fields = reader.fieldnames
        rows = list(reader)

    for col in ("isbn13", "archiveorg_want"):
        if col not in (fields or []):
            # tolerate a bare list of ISBNs with no header
            if fields and len(fields) == 1:
                fields = ["isbn13"]
                rows = [{ "isbn13": r[fields[0]] } for r in rows]
                break
            print(f"error: input CSV lacks required column '{col}'", file=sys.stderr)
            return 1

    todo = [r for r in rows if r.get("isbn13") and r.get("archiveorg_want", "") not in ("yes", "no")]
    print(f"{len(todo)} of {len(rows)} rows to check", file=sys.stderr)

    for i, row in enumerate(todo, 1):
        isbn = row["isbn13"]
        print(f"[{i}/{len(todo)}] {isbn} ... ", file=sys.stderr, end="", flush=True)
        verdict = lookup_want(isbn)
        row["archiveorg_want"] = verdict
        print(verdict, file=sys.stderr)
        if i < len(todo):
            time.sleep(DELAY_SEC)

    writer_kwargs = dict(fieldnames=fields, extrasaction="ignore")
    out_file = sys.stdout if out_path == "-" else open(out_path, "w", newline="", encoding="utf-8")
    try:
        writer = csv.DictWriter(out_file, **writer_kwargs)
        writer.writeheader()
        writer.writerows(rows)
    finally:
        if out_file is not sys.stdout:
            out_file.close()

    counts = {}
    for r in rows:
        counts[r.get("archiveorg_want") or "?"] = counts.get(r.get("archiveorg_want") or "?", 0) + 1
    print("summary: " + ", ".join(f"{k}={v}" for k, v in sorted(counts.items())), file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
