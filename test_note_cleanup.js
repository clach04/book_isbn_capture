// Regression tests for cleanNote + collapseRepeats (note dedupe).
// Fixtures are real samples from dupes.md / plan_v005_note_dedupe.md.
// Run: node test_note_cleanup.js
'use strict';
const assert = require('assert');

// Extracted verbatim from index.html (keep in sync; TODO: manual char loop).
function cleanNote(note) {
  const m = /[a-zA-Z]/.exec(note);
  if (!m) return note;
  const low = note.toLowerCase();
  const d = /\s\d+\s/.exec(note.slice(m.index));
  let first = (d ? note.slice(m.index, m.index + d.index) : note.slice(m.index)).trim();
  while (true) {
    const s = low.indexOf(first.toLowerCase());
    const e = s + first.length;
    let k = s - 1;
    while (k >= 0 && note[k] === ' ') k--;
    while (k >= 0 && note[k] !== ' ') k--;
    const ext = (k >= 0 || s > 0) ? note.slice(k + 1, e) : '';
    if (ext && ext.length > first.length &&
        low.split(ext.toLowerCase()).length - 1 >= 2) {
      first = ext.trim();
    } else {
      break;
    }
  }
  return note.slice(low.lastIndexOf(first.toLowerCase())).trim();
}

const cases = [
  // fixture 1: growing digit suffixes
  ['computer networks 0 computer networks 01 computer networks 01316 computer networks',
   'computer networks'],
  // fixture 2: same pattern, longer title
  ['structured computer organization 0 structured computer organization 0138544 structured computer organization 0 structured computer organization',
   'structured computer organization'],
  // fixture 3: adversarial - title starts with digits
  ['1984 first edition 01311984 First Edition 01984 first edition 1984 First Edition 01984 First Edition 01311011984 First Edition 013110161984 First Edition 0131101631984 first edition',
   '1984 first edition'],
  // non-repeated notes must pass through untouched
  ['printed 1984 hardcover', 'printed 1984 hardcover'],
  ['blue hardcover dahl', 'blue hardcover dahl'],
];

let failed = 0;
for (const [input, want] of cases) {
  let got;
  try {
    got = cleanNote(input);
    assert.strictEqual(got, want);
    console.log('OK   ' + JSON.stringify(got));
  } catch (e) {
    failed++;
    console.log('FAIL input=' + JSON.stringify(input) +
      ' want=' + JSON.stringify(want) + ' got=' + JSON.stringify(got));
  }
}
if (failed) {
  console.error(failed + ' test(s) failed');
  process.exit(1);
}
console.log('all ' + cases.length + ' tests passed');
