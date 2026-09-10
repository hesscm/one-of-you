#!/usr/bin/env node
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { loadRecords, defaultDirectory, verifyGraph, verifySource, importLogs, saveRecords } from './memory.mjs';
import { proposeWork, workState, resume } from './work.mjs';
import { invoke } from './iai.mjs';
import { resolveHits, semanticBriefing, captureBatches } from './iai-adapter.mjs';
import { boundedProcess } from './process.mjs';

const tomorrow = now => new Date(Date.parse(now) + 86400000).toISOString();
export function startRun(records, producer, title, nextAction, evidence, now = new Date().toISOString()) {
  return proposeWork(records, { producer, evidence, work: {
    format: 'brain-work/v1', type: 'run', key: randomUUID(), parents: [], society: '1f916.ai',
    title, state: 'active', next_action: nextAction, blockers: [],
    counterevidence: 'Unreviewed: validate conclusions against cited sources and record contrary evidence before closure.',
    review_after: tomorrow(now), threads: []
  } }, now);
}
export function advanceRun(records, producer, headId, nextAction, close = false, now = new Date().toISOString()) {
  const group = workState(records, now).find(g => g.heads.some(h => h.id === headId));
  if (!group || group.conflict) throw new Error('Head is stale or conflicted; inspect work status and explicitly merge conflicts.');
  const head = group.heads[0];
  if (head.type !== 'run' || head.state !== 'active') throw new Error('Expected an active run head.');
  const original = records.find(r => r.id === headId);
  return proposeWork(records, { producer, evidence: original.source.ids, work: {
    ...JSON.parse(original.text), parents: [headId], state: close ? 'closed' : 'active',
    next_action: nextAction, review_after: tomorrow(now)
  } }, now);
}
export async function recall(records, cue, engine = invoke) {
  const lexical = resume(records, cue);
  try {
    const result = await engine({ operation: 'recall', cue });
    const hits = resolveHits([...result.hits, ...result.anti_hits], result.mapping, records);
    return { semantic: 'available', text: lexical + '\n' + semanticBriefing(records, hits) };
  } catch {
    return { semantic: 'unavailable', text: lexical + '\nSemantic recall unavailable; lexical evidence above remains usable. Run health for diagnosis.\n' };
  }
}

async function main() {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const directory = defaultDirectory(root);
  const [command, ...args] = process.argv.slice(2);
  const records = loadRecords(directory);
  verifyGraph(records);
  for (const record of records) verifySource(root, record);
  if (command === 'health') {
    const ids = new Set(records.map(r => r.id));
    const pending = importLogs(root).records.filter(r => !ids.has(r.id)).length;
    const groups = workState(records);
    let docker = 'unavailable', semantic = 'unavailable';
    try {
      await boundedProcess('docker', ['info', '--format', '{{.ServerVersion}}'], { timeout: 10000, maxOutput: 100000 });
      docker = 'available';
      await invoke({ operation: 'status' });
      semantic = 'available';
    } catch { /* Never echo potentially sensitive child diagnostics. */ }
    console.log(JSON.stringify({ verified: records.length, committed_sections_not_imported: pending,
      active_runs: groups.filter(g => g.heads.some(h => h.state === 'active')).length,
      overdue_pending: groups.filter(g => g.heads.some(h => h.overdue && ['open', 'blocked', 'active'].includes(h.state))).length,
      conflicts: groups.filter(g => g.conflict).length, docker, semantic,
      note: 'Availability is not recall quality, automatic adoption, or independent backup verification.' }, null, 2));
    if (semantic !== 'available') process.exitCode = 1;
  } else if (command === 'sync') {
    if (args.length) throw new Error('sync takes no arguments');
    const imported = importLogs(root);
    console.log(JSON.stringify({ canonical: saveRecords(directory, imported.records), snapshot: imported.snapshot }));
    // Canonical publication is durable before rebuilding the optional index.
    const current = loadRecords(directory);
    for (const record of current) verifySource(root, record);
    let added = 0, mapped = 0;
    for (const requests of captureBatches(current)) {
      const result = await invoke({ operation: 'ingest', requests });
      added += result.added; mapped = result.mapped;
    }
    console.log(JSON.stringify({ semantic: { added, mapped } }));
  } else if (command === 'resume') {
    if (!args.length) console.log(resume(records));
    else console.log((await recall(records, args.join(' '))).text);
  } else if (command === 'start' || command === 'checkpoint' || command === 'close') {
    if ((command === 'start' && args.length < 4) || (command !== 'start' && args.length !== 3)) throw new Error('See session usage in WORKFLOW.md; explicit producer and evidence/head are required.');
    const record = command === 'start' ? startRun(records, args[0], args[1], args[2], args.slice(3))
      : advanceRun(records, args[0], args[1], args[2], command === 'close');
    saveRecords(directory, [record]);
    console.log(JSON.stringify({ head: record.id, run: JSON.parse(record.text).key, state: JSON.parse(record.text).state }));
    if (command === 'start') console.log(resume(loadRecords(directory)));
  } else throw new Error('Usage: node brain/session.mjs health | sync | resume [question] | start <producer> <title> <next-action> <evidence-id>... | checkpoint <producer> <head-id> <next-action> | close <producer> <head-id> <handoff>');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => {
  console.error(`Session operation failed: ${error.message}`);
  process.exitCode = 1;
});
