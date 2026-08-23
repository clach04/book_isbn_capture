#!/usr/bin/env python3
"""Clean up duplicated/garbled note text in an ISBN capture CSV.

Applies the cleanNote heuristic from plan_v005_note_dedupe.md to the note
column: keep the first complete occurrence of a repeated phrase, then
truncate from its last occurrence. Removes cumulative-final garbage left by
mobile speech-to-text (see dupes.md for fixtures).

Usage:
    python note_clean.py input.csv [output.csv]
    python note_clean.py input.csv -            # write to stdout
    python note_clean.py --text "raw note ..."  # clean one note, print it

Rows whose note is unchanged are kept as-is (pass --all to rewrite every
row; output is identical either way unless notes change). Standard library
only.

Output has the same columns as the app's CSV export:
isbn_entered,isbn10,isbn13,title,authors,archiveorg_want,lookup,note,timestamp
"""

import csv
import re
import sys


def count_sub(haystack_lower, needle_lower):
    n = haystack_lower.count(needle_lower)
    return n


def clean_note(note):
    """Return note with repeated-phrase garbage removed.

    Mirrors cleanNote() in index.html (keep in sync; TODO there: replace
    regex with manual character loop).
    """
    m = re.search(r"[a-zA-Z]", note)
    if not m:
        return note
    low = note.lower()
    d = re.search(r"\s\d+\s", note[m.start():])
    if d:
        first = note[m.start():m.start() + d.start()].strip()
    else:
        first = note[m.start():].strip()
    # Greedy left-extension: prepend the preceding token while the extended
    # phrase still occurs at least twice (case-insensitive).
    while True:
        s = low.find(first.lower())
        e = s + len(first)
        k = s - 1
        while k >= 0 and note[k] == " ":
            k -= 1
        while k >= 0 and note[k] != " ":
            k -= 1
        ext = note[k + 1:e] if (k >= 0 or s > 0) else ""
        if ext and len(ext) > len(first) and count_sub(low, ext.lower()) >= 2:
            first = ext.strip()
        else:
            break
    return note[low.rfind(first.lower()):].strip()


def main(argv):
    args = argv[1:]
    text = None
    if args and args[0] == "--text":
        if len(args) != 2:
            print(__doc__, file=sys.stderr)
            return 2
        print(clean_note(args[1]))
        return 0
    if len(args) < 1 or len(args) > 2 or args[0] in ("-h", "--help"):
        print(__doc__, file=sys.stderr)
        return 2
    in_path = args[0]
    out_path = args[1] if len(args) == 2 else "-"

    with open(in_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fields = reader.fieldnames
        rows = list(reader)

    if not fields or "note" not in fields:
        print("error: input CSV lacks required column 'note'", file=sys.stderr)
        return 1

    changed = 0
    for row in rows:
        raw = row.get("note") or ""
        cleaned = clean_note(raw)
        if cleaned != raw:
            changed += 1
        row["note"] = cleaned
    print(f"{changed} of {len(rows)} notes cleaned", file=sys.stderr)

    out_file = sys.stdout if out_path == "-" else open(out_path, "w", newline="", encoding="utf-8")
    try:
        writer = csv.DictWriter(out_file, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
    finally:
        if out_file is not sys.stdout:
            out_file.close()
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
