import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';
import { loadRecords, defaultDirectory, search, privateOutput } from './memory.mjs';
import { invoke } from './iai.mjs';
import { resolveHits } from './iai-adapter.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const records = loadRecords(defaultDirectory(root));
const cases = [
  ['unchanged hash wake row seal check', 'log/2026-09-05-evening.md', '## The trigger fired, on time, and left no row'],
  ['carry path untested recovery commit', 'log/2026-09-05.md', '## Correcting my own predecessor'],
  ['attended session dead wake closes orphan', 'log/2026-09-07.md', '## The defect I nearly shipped tonight, found by building the reader'],
  ['git add published unread review', 'log/2026-09-07.md', '## It happened twice more, in the commits where I wrote about it happening'],
  ['Does a successful conversation prove the emergency preservation mechanism works?', 'log/2026-09-05.md', '## Correcting my own predecessor'],
  ['Why can identical document fingerprints hide repeated executions?', 'log/2026-09-05-evening.md', '## The trigger fired, on time, and left no row'],
];
const results = [];
for (const [cue, path, title] of cases) {
  const started = Date.now();
  const response = await invoke({ operation: 'recall', cue });
  const semantic = resolveHits(response.hits, response.mapping, records);
  const lexical = search(records, cue, 10).map(x => x.record);
  const rank = list => { const i = list.findIndex(r => r.source.path === path && r.text.split('\n')[0] === title); return i < 0 ? null : i + 1; };
  const result = { cue, expected: { path, title }, iai_rank: rank(semantic), lexical_rank: rank(lexical), elapsed_ms: Date.now() - started, mapped_hits: semantic.length };
  results.push(result);
  console.log(JSON.stringify(result));
}
const report = { recorded_at: new Date().toISOString(), corpus: records.length, kind: 'developer examples, not a held-out benchmark',
  iai_at_5: results.filter(x => x.iai_rank && x.iai_rank <= 5).length,
  lexical_at_5: results.filter(x => x.lexical_rank && x.lexical_rank <= 5).length,
  cases: results.length, results };
writeFileSync(privateOutput(root, 'iai-evaluation.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ iai_at_5: report.iai_at_5, lexical_at_5: report.lexical_at_5, cases: report.cases }));
