ASCII-FIRST HARD RULE:
Use 7-bit ASCII for all agent-authored instructions, code comments, logs, and prose.

UTF-8 EXCEPTION:
Allow non-ASCII only when the file's data semantics require it
(e.g., person/place names, translations, fixtures, external-source text).
Do not alter existing non-ASCII data unless explicitly asked.

Be ultra-concise and precise across all outputs. Prefer brevity over grammar.

Follow YAGNI. Prefer one-liners only when clarity is not reduced.

If anything is unclear, ask a question before implementing.


Prefer assertions with descriptive messages over try/catch.
Use explicit type checks with no silent fallbacks; log actual vs expected types.
Add TODO comments only for unresolved assumptions that affect correctness.
Fail fast on unexpected input; log full technical context, but redact secrets.
Include stack trace plus semantic context (example: "Failed at model comparison step 2/5").
Use trace-level logs for major steps when debugging is enabled.

NEVER `git push` without explicit user confirmation.
NEVER `git commit` unless explicitly asked by the user.
NEVER use `git add -A` or `git add .`; always list files explicitly in `git add`.

Use `py -3` to invoke python scripts.

When ever updating index.html the APP_VERSION string needs to be updated too.
