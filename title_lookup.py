#!/usr/bin/env python3
"""Fill in the title/authors columns of an ISBN capture CSV via Open Library.

For each row missing a title, queries
    https://openlibrary.org/api/books?bibkeys=ISBN:<isbn13>&format=json&jscmd=data
and writes `title`, `authors`, and `lookup` (found / not-found).

Usage:
    python title_lookup.py input.csv [output.csv]
    python title_lookup.py input.csv -            # write to stdout
    python title_lookup.py input.csv out.csv --all   # re-fetch titled rows too

Output has the same columns as the app's CSV export:
isbn_entered,isbn10,isbn13,title,authors,archiveorg_want,lookup,note,timestamp
The input must use the canonical `archiveorg_want` column name (edit older
files that say `want`). Rows already having a title are skipped unless --all.
Standard library only.
"""

import csv
import json
import sys
import time
import urllib.request

OL_URL = "https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data"
DELAY_SEC = 0.4          # Open Library is fine with modest rates
RETRIES = 3
TIMEOUT_SEC = 30

FIELDS = ["isbn_entered", "isbn10", "isbn13", "title", "authors",
          "archiveorg_want", "lookup", "note", "timestamp"]


def lookup_title(isbn13):
    """Return (title, authors) or None if Open Library lacks the book.

    Raises on network failure so the caller can retry."""
    url = OL_URL.format(isbn=isbn13)
    req = urllib.request.Request(url, headers={"User-Agent": "isbn-capture-title-lookup/1.0"})
    with urllib.request.urlopen(req, timeout=TIMEOUT_SEC) as res:
        data = json.loads(res.read().decode("utf-8"))
    rec = data.get("ISBN:" + isbn13)
    if not rec or not rec.get("title"):
        return None
    authors = ", ".join(a["name"] for a in rec.get("authors", []))
    return rec["title"], authors


def main(argv):
    args = [a for a in argv[1:] if a != "--all"]
    force = "--all" in argv[1:]
    if len(args) < 1 or len(args) > 2 or "-h" in argv or "--help" in argv:
        print(__doc__, file=sys.stderr)
        return 2
    in_path = args[0]
    out_path = args[1] if len(args) == 2 else "-"

    with open(in_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fields = reader.fieldnames or []
        rows = list(reader)

    if "archiveorg_want" not in fields:
        print("error: input CSV lacks the canonical 'archiveorg_want' column "
              "(older exports used 'want' — rename it)", file=sys.stderr)
        return 1

    todo = [r for r in rows if r.get("isbn13") and (force or not r.get("title"))]
    print(f"{len(todo)} of {len(rows)} rows to look up", file=sys.stderr)

    failures = 0
    for i, row in enumerate(todo, 1):
        isbn = row["isbn13"]
        print(f"[{i}/{len(todo)}] {isbn} ... ", file=sys.stderr, end="", flush=True)
        ok = False
        for attempt in range(1, RETRIES + 1):
            try:
                meta = lookup_title(isbn)
                if meta:
                    row["title"], row["authors"] = meta
                    row["lookup"] = "found"
                    print(f"found: {row['title']}", file=sys.stderr)
                else:
                    row["lookup"] = "not-found"
                    print("not-found", file=sys.stderr)
                ok = True
                break
            except Exception as e:
                print(f"attempt {attempt}/{RETRIES} failed ({e})", file=sys.stderr)
                if attempt < RETRIES:
                    time.sleep(2 * attempt)
        if not ok:
            # leave lookup as-is (pending/blank): transient failure is NOT not-found
            print("  giving up; left pending", file=sys.stderr)
            failures += 1
        if i < len(todo):
            time.sleep(DELAY_SEC)

    out_file = sys.stdout if out_path == "-" else open(out_path, "w", newline="", encoding="utf-8")
    try:
        writer = csv.DictWriter(out_file, fieldnames=fields,
                                extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
    finally:
        if out_file is not sys.stdout:
            out_file.close()

    found_n = sum(1 for r in rows if r.get("lookup") == "found")
    nf_n = sum(1 for r in rows if r.get("lookup") == "not-found")
    print(f"summary: found={found_n}, not-found={nf_n}, still-pending={failures}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
