# Plan v005: Note duplicate cleanup post-processing

Source: dupes.md (session log). Distilled; no code yet.

## Problem

Mobile speech-to-text (Android Chrome cumulative finals) leaves duplicated
phrases and partial ISBN digit runs glued into the `note` field at capture
time. Existing `collapseRepeats` only removes exact immediate repeats, so
prefix-growing repetitions survive.

## Fixtures (3 real samples)

1. `computer networks 0 computer networks 01 computer networks 01316 computer networks`
   -> want: `computer networks`
2. `structured computer organization 0 structured computer organization 0138544 structured computer organization 0 structured computer organization`
   -> want: `structured computer organization`
3. `1984 first edition 01311984 First Edition 01984 first edition 1984 First Edition 01984 First Edition 01311011984 First Edition 013110161984 First Edition 0131101631984 first edition`
   -> want: `1984 first edition` (title itself starts with digits - adversarial)

Garbage blobs in sample 3 are (growing ISBN prefix) + "1984", so they are
NOT prefixes of each other; naive prefix-chain detection fails.

## Rules considered (all rejected or demoted)

- (a) Strip all pure-digit tokens: kills legit "1984" title on sample 3.
- (b) Strip digits in prefix-growing chains only: chain assumption breaks on
      sample 3; also user has no test case motivating it alone.

## Leading approach (user's analysis)

Assumption: if a note is dictated smoothly, the FIRST complete word list is
likely the intended title/description. Cleanup = take the first complete
occurrence of the repeated phrase and compare it against the tail end +
digit blobs; discard later partial/garbled occurrences and stray digits.
Rewrites (user re-dictating differently mid-note) are an edge case to ignore
for now.

Validation target: all 3 fixtures must reduce to their "want" strings.

## Steps

1. Promote the 3 samples to permanent test fixtures (raw note + expected
   cleaned output). Append future messy captures as they accumulate.
2. Implement cleaner per leading approach:
   - tokenize note;
   - detect repeated phrase occurrences (case-insensitive);
   - keep first complete occurrence; drop later partial occurrences and
     adjacent pure-digit bleed tokens;
   - run existing collapseRepeats as final pass.
3. Wire into parseUtterance post-processing after existing collapse.
4. Unit tests against fixtures (incl. non-duplicated notes pass through
   untouched, e.g. "printed 1984 hardcover").
5. Revisit with more real samples before adding complexity (e.g. minimal-
   deletion optimizer idea from session - parked).

## Outstanding decisions

1. Confirm the "first complete occurrence wins" heuristic against all 3
   fixtures (sample 3's first occurrence IS clean, but confirm interpretation).
2. Case sensitivity: collapse case-insensitively ("first edition" vs
   "First Edition")? Samples imply yes.
3. Digit-token removal scope: only digits adjacent to repeated phrases, or
   all bare digits once duplication evidence exists?
4. Silent cleanup vs flagging: alter note silently, or also surface a
   "note may be garbled - tap to edit" hint when repetition density is high?
5. Fallback behavior when heuristic output is empty or suspicious (e.g.
   everything stripped): keep original note instead?
6. Parked: minimal-deletion-for-perfect-collapse optimizer - revisit only if
   heuristic fails on ~10 accumulated real samples.
