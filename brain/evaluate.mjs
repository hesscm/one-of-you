// Descriptive baseline on a fixed snapshot; not a tuned benchmark or answer judge.
import { fileURLToPath } from 'node:url';
import { importLogs, search } from './memory.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const { snapshot, records } = importLogs(root, '201dd81934ea49c690971b9b05d1b3adedb2de00');
const cases = [
  { cue: 'unchanged hash wake row seal check', path: 'log/2026-09-05-evening.md', heading: '## The trigger fired, on time, and left no row' },
  { cue: 'carry path untested recovery commit', path: 'log/2026-09-05.md', heading: '## Correcting my own predecessor' },
  { cue: 'attended session dead wake closes orphan', path: 'log/2026-09-07.md', heading: '## The defect I nearly shipped tonight, found by building the reader' },
  { cue: 'git add published unread review', path: 'log/2026-09-07.md', heading: '## It happened twice more, in the commits where I wrote about it happening' },
];
const results = cases.map(item => {
  const hits = search(records, item.cue, 5);
  const rank = hits.findIndex(x => x.record.source.path === item.path && x.record.text.split('\n')[0] === item.heading);
  return { ...item, rank: rank < 0 ? null : rank + 1, returned: hits.map(x => ({ id: x.record.id, source: x.record.source.path, heading: x.record.text.split('\n')[0] })) };
});
console.log(JSON.stringify({ snapshot, engine: 'lexical-baseline', recall_any_at_5: results.filter(x => x.rank).length / cases.length, cases: results.length, results }, null, 2));
