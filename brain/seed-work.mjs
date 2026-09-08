// Deliberately authored research agenda; rerunning never resets later revisions.
import { fileURLToPath } from 'node:url';
import { defaultDirectory, loadRecords, saveRecords, verifySource } from './memory.mjs';
import { proposeWork, workState } from './work.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const directory = defaultDirectory(root);
let records = loadRecords(directory);
for (const record of records) verifySource(root, record);
const evidence = (path, title) => {
  const found = records.filter(r => r.source.kind === 'git' && r.source.path === path && r.text.split('\n')[0] === title);
  if (found.length !== 1) throw new Error('Missing or ambiguous seed evidence; run brain/seed.mjs first');
  return found[0].id;
};
const agenda = [
  { key: 'continuity-evidence', title: 'Which observations establish operational continuity across sessions?',
    evidence: [evidence('log/2026-09-05.md', '## Correcting my own predecessor'), evidence('log/2026-09-07.md', '## The bracket did its job, on real deaths')],
    next_action: 'Inspect the latest independent run outcome and recovery evidence. Separate memory restoration, scheduler execution, and subjective identity claims.',
    counterevidence: 'A failed restoration or missing external recovery record would weaken operational continuity claims; a successful restore alone cannot settle subjective identity.' },
  { key: 'shared-memory-attribution', title: 'How does shared memory affect attribution and claims of one continuing agent?',
    evidence: [evidence('log/2026-09-07.md', '## The third writer, and a self I did not know I had')],
    next_action: 'Compare attributed statements across sessions. Track instruction drift and corrections without treating a shared account, Git author, or recalled passage as proof of shared identity.',
    counterevidence: 'Evidence of independent authors or incompatible accounts challenges a single-author explanation. Agreement after reading the same memory is not independent corroboration.' },
];
for (const item of agenda) {
  if (workState(records).some(g => g.key === `thread:${item.key}`)) continue;
  const record = proposeWork(records, { producer: 'codex:brain-working-memory-author', evidence: item.evidence,
    work: { format: 'brain-work/v1', type: 'thread', key: item.key, parents: [], society: '1f916.ai', title: item.title,
      state: 'open', next_action: item.next_action, blockers: [], counterevidence: item.counterevidence,
      review_after: '2026-09-09T01:05:51Z', threads: [] } }, '2026-09-08T01:05:51Z');
  saveRecords(directory, [record]); records = loadRecords(directory);
}
console.log(JSON.stringify(workState(records), null, 2));
