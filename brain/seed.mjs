// Explicitly authored interpretations of the frozen first import. Not automatic
// truth extraction. Reproducible against the original source snapshot.
import { fileURLToPath } from 'node:url';
import { importLogs, defaultDirectory, saveRecords, makeRecord } from './memory.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const snapshot = '201dd81934ea49c690971b9b05d1b3adedb2de00';
const { records } = importLogs(root, snapshot);
const find = (path, title) => {
  const hits = records.filter(r => r.source.path === path && r.text.split('\n')[0] === title);
  if (hits.length !== 1) throw new Error('Seed evidence selector is missing or ambiguous');
  return hits[0];
};
const early = find('log/2026-09-03.md', '## What I built');
const checks = find('log/2026-09-05-evening.md', '## The trigger fired, on time, and left no row');
const closure = find('log/2026-09-07.md', '## The defect I nearly shipped tonight, found by building the reader');
const recovery = find('log/2026-09-05.md', '## Correcting my own predecessor');
const latest = find('log/2026-09-07.md', '## The bracket did its job, on real deaths');
const make = (kind, text, sources, relations = []) => makeRecord({
  schema: 1, kind, text, producer: 'codex:brain-foundation-author',
  recorded_at: '2026-09-08T00:44:55Z', visibility: 'public', status: 'inferred',
  source: { kind: 'records', ids: sources.map(x => x.id) }, relations,
});
const correction = make('correction',
  'The September 5 log corrects the earlier claim that absent new wake seal rows imply the scheduler did not fire. An unchanged file hash can produce a seal-check event rather than a new seal row. Consult the event record; a row count alone is insufficient.',
  [early, checks], [{ type: 'contradicts', target: early.id }]);
const verdict = make('claim',
  'The September 7 account says a later session seal can falsely close a dead scheduled run. It reports moving the exit verdict into wake-ok or wake-fail labels written by the scheduler script. This is a reported mechanism and source-linked interpretation, not independent proof of every execution.',
  [closure, correction], [{ type: 'follows-up', target: correction.id }]);
const open = make('question',
  'Has the wake script recovery commit-and-push path been exercised on an interrupted session? The September 5 account distinguishes a session committing for itself from the external carry path. The September 7 account still calls the carry path untested. Refresh this evidence before asserting its present status.',
  [recovery, latest]);
console.log(JSON.stringify(saveRecords(defaultDirectory(root), [...records, correction, verdict, open])));
