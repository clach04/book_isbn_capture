// Tests for CSV/text import: parseImportText + mergeCaptures.
// Mirrors the export format in index.html (RFC 4180 quoting).
// Run: node test_import.js
'use strict';
const assert = require('assert');

// ---- implementations (mirrored verbatim into index.html; keep in sync) ----

// RFC 4180 single line: quoted fields, "" escape, commas in quotes.
function parseCsvLine(line) {
  const fields = [];
  let cur = '', i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      i++;
      while (i < line.length) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') { cur += '"'; i += 2; }
          else { i++; break; }
        } else cur += line[i++];
      }
    } else if (line[i] === ',') { fields.push(cur); cur = ''; i++; }
    else cur += line[i++];
  }
  fields.push(cur);
  return fields;
}

const IMPORT_HEADER = 'isbn_entered,isbn10,isbn13,title,authors,archiveorg_want,lookup,note,timestamp';

// text -> { rows: captureRecords, errors: [{line, reason}] }.
// Accepts full CSV (header optional) and bare newline-delimited ISBNs.
function parseImportText(text, nowMs) {
  const rows = [], errors = [];
  const lines = text.split(/\r?\n/);
  for (let n = 0; n < lines.length; n++) {
    const raw = lines[n].trim();
    if (!raw) continue;
    if (n === 0 && raw.replace(/\s/g, '') === IMPORT_HEADER) continue;
    const line = n + 1;
    try {
      if (!raw.includes(',')) {
        // bare ISBN (copy-all export format)
        const v = raw.replace(/[^0-9Xx]/g, '').toUpperCase();
        if (!isValidIsbn(v)) throw new Error(`invalid ISBN checksum: "${raw}"`);
        rows.push({ display: v, isbn13: v.length === 13 ? v : (isbn13From10(v) || ''),
          isbn10: v.length === 13 ? (isbn10From13(v) || '') : v,
          title: '', authors: '', want: 'pending', lookup: 'pending', note: '', ts: nowMs });
        continue;
      }
      const f = parseCsvLine(raw);
      if (f.length !== 9) throw new Error(`expected 9 columns, got ${f.length}`);
      const [entered, , , title, authors, want, lookup, note, tsStr] = f;
      const v = String(entered).replace(/[^0-9Xx]/g, '').toUpperCase();
      if (!isValidIsbn(v)) throw new Error(`invalid ISBN checksum: "${entered}"`);
      let ts = nowMs;
      if (String(tsStr).trim() !== '') {
        const p = Date.parse(tsStr);
        if (Number.isNaN(p)) throw new Error(`unparsable timestamp: "${tsStr}"`);
        ts = p;
      }
      rows.push({ display: v, isbn13: v.length === 13 ? v : (isbn13From10(v) || ''),
        isbn10: v.length === 13 ? (isbn10From13(v) || '') : v,
        title: String(title), authors: String(authors), want: String(want),
        lookup: String(lookup), note: String(note), ts });
    } catch (e) {
      errors.push({ line, reason: e.message });
    }
  }
  return { rows, errors };
}

// Upsert by isbn13, falling back to the derived-from-display isbn13, then
// raw display. Imported row wins wholesale on match.
function captureKey(c) { return c.isbn13 || isbn13From10(c.display) || c.display; }
function mergeCaptures(existing, incoming) {
  const out = existing.slice();
  let added = 0, updated = 0;
  for (const row of incoming) {
    const key = captureKey(row);
    const idx = out.findIndex(c => captureKey(c) === key);
    if (idx >= 0) { out[idx] = row; updated++; }
    else { out.push(row); added++; }
  }
  return { captures: out, added, updated };
}

// ISBN checksum helpers (verbatim from index.html)
function isValidIsbn13(d) {
  if (!/^\d{13}$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += (+d[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (sum % 10)) % 10 === +d[12];
}
function isValidIsbn10(d) {
  if (!/^[0-9]{9}[\dXx]$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (+d[i]) * (10 - i);
  const last = d[9].toUpperCase();
  sum += last === 'X' ? 10 : +last;
  return sum % 11 === 0;
}
function isValidIsbn(d) { return isValidIsbn13(d) || isValidIsbn10(d); }
function isbn13From10(d) {
  if (!isValidIsbn10(d)) return null;
  const core = '978' + d.slice(0, 9);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += (+core[i]) * (i % 2 === 0 ? 1 : 3);
  return core + ((10 - (sum % 10)) % 10);
}
function isbn10From13(d) {
  if (!isValidIsbn13(d) || !d.startsWith('978')) return null;
  const core = d.slice(3, 12);
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (+core[i]) * (10 - i);
  let chk = 0;
  for (let i = 0; i < 9; i++) chk += (+core[i]) * (10 - i);
  chk = (11 - (chk % 11)) % 11;
  return core + (chk === 10 ? 'X' : String(chk));
}

// ---------- tests ----------

const NOW = 1700000000000;

// parseCsvLine: RFC 4180
{
  const r = parseCsvLine('a,b,c');
  assert.deepStrictEqual(r, ['a', 'b', 'c'], 'plain split: got ' + JSON.stringify(r));
}
{
  const r = parseCsvLine('"Gilly, The staff","x",3');
  assert.deepStrictEqual(r, ['Gilly, The staff', 'x', '3'],
    'quoted comma: got ' + JSON.stringify(r));
}
{
  const r = parseCsvLine('"say ""hi""","b"');
  assert.deepStrictEqual(r, ['say "hi"', 'b'],
    'escaped quotes: got ' + JSON.stringify(r));
}

// header line recognized and skipped
{
  const hdr = 'isbn_entered,isbn10,isbn13,title,authors,archiveorg_want,lookup,note,timestamp';
  const r = parseImportText(hdr + '\n9780140328721,,,,,,found,note,2026-01-01T00:00:00.000Z\n', NOW);
  assert.strictEqual(r.rows.length, 1, 'header skipped, data kept');
  assert.strictEqual(r.errors.length, 0, 'no errors, got ' + JSON.stringify(r.errors));
}

// full CSV row round-trip
{
  const line = '"9780140328721","0140328726","9780140328721","Matilda","Roald Dahl","yes","found","blue hardcover","2026-01-02T03:04:05.006Z"';
  const r = parseImportText(line, NOW);
  assert.strictEqual(r.rows.length, 1);
  const c = r.rows[0];
  assert.strictEqual(c.display, '9780140328721');
  assert.strictEqual(c.isbn13, '9780140328721');
  assert.strictEqual(c.isbn10, '0140328726');
  assert.strictEqual(c.title, 'Matilda');
  assert.strictEqual(c.authors, 'Roald Dahl');
  assert.strictEqual(c.want, 'yes');
  assert.strictEqual(c.lookup, 'found');
  assert.strictEqual(c.note, 'blue hardcover');
  assert.strictEqual(c.ts, Date.parse('2026-01-02T03:04:05.006Z'));
}

// bare ISBN line (copy-all format)
{
  const r = parseImportText('9780140328721\n0140328726\n', NOW);
  assert.strictEqual(r.rows.length, 2, 'bare ISBNs accepted');
  assert.strictEqual(r.rows[0].isbn13, '9780140328721');
  assert.strictEqual(r.rows[0].ts, NOW, 'bare ISBN gets now ts');
  assert.strictEqual(r.rows[1].isbn13, '9780140328721', 'isbn10 converted to isbn13');
}

// bad checksum -> skipped with line number
{
  const r = parseImportText('9780140328722\n', NOW);
  assert.strictEqual(r.rows.length, 0);
  assert.strictEqual(r.errors.length, 1);
  assert.strictEqual(r.errors[0].line, 1);
  assert.match(r.errors[0].reason, /checksum/i);
}

// wrong column count -> error
{
  const r = parseImportText('9780140328721,only,two\n', NOW);
  assert.strictEqual(r.rows.length, 0);
  assert.strictEqual(r.errors[0].line, 1);
  assert.match(r.errors[0].reason, /columns/i);
}

// blank lines ignored
{
  const r = parseImportText('\n\n9780140328721\n\n', NOW);
  assert.strictEqual(r.rows.length, 1);
  assert.strictEqual(r.errors.length, 0);
}

// empty timestamp -> now; garbage timestamp -> error
{
  const r = parseImportText('"9780140328721","","9780140328721","t","a","?","found","n",""\n', NOW);
  assert.strictEqual(r.rows.length, 1);
  assert.strictEqual(r.rows[0].ts, NOW, 'empty ts defaults to now');
  const r2 = parseImportText('"9780140328721","","9780140328721","t","a","?","found","n","notadate"\n', NOW);
  assert.strictEqual(r2.rows.length, 0, 'garbage ts rejected');
  assert.match(r2.errors[0].reason, /timestamp/i);
}

// mergeCaptures
{
  const existing = [
    { display: '9780140328721', isbn13: '9780140328721', isbn10: '0140328726', title: '', authors: '', want: 'pending', lookup: 'pending', note: 'local note', ts: 1 },
    { display: '059035342X', isbn13: '9780590353427', isbn10: '059035342X', title: 'Old', authors: '', want: 'yes', lookup: 'found', note: '', ts: 2 },
  ];
  const incoming = [
    // overwrites matching capture wholesale
    { display: '9780140328721', isbn13: '9780140328721', isbn10: '0140328726', title: 'Matilda', authors: 'Roald Dahl', want: 'yes', lookup: 'found', note: '', ts: 100 },
    // new capture appended
    { display: '9780261102217', isbn13: '9780261102217', isbn10: '', title: '', authors: '', want: 'pending', lookup: 'pending', note: '', ts: 101 },
  ];
  const r = mergeCaptures(existing, incoming);
  assert.strictEqual(r.added, 1, 'one added');
  assert.strictEqual(r.updated, 1, 'one updated');
  assert.strictEqual(r.captures.length, 3);
  assert.strictEqual(r.captures[0].title, 'Matilda', 'imported wins wholesale');
  assert.strictEqual(r.captures[0].note, '', 'local note clobbered by design');
  assert.strictEqual(r.captures[2].isbn13, '9780261102217', 'new appended');
}

// match by display when isbn13 empty on both sides
{
  const existing = [{ display: '059035342X', isbn13: '', isbn10: '', title: 'x', authors: '', want: 'pending', lookup: 'pending', note: '', ts: 1 }];
  const incoming = [{ display: '059035342X', isbn13: '9780590353427', isbn10: '059035342X', title: 'Hobbit', authors: '', want: 'yes', lookup: 'found', note: '', ts: 9 }];
  const r = mergeCaptures(existing, incoming);
  assert.strictEqual(r.updated, 1, 'matched via display');
  assert.strictEqual(r.captures.length, 1);
  assert.strictEqual(r.captures[0].isbn13, '9780590353427');
}

console.log('all import tests passed');
