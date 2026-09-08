#!/usr/bin/env node
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { makeRecord, loadRecords, saveRecords, defaultDirectory, readProposal, verifyGraph, verifySource, briefing } from './memory.mjs';

const FORMAT = 'brain-work/v1';
const ID = /^m_[a-f0-9]{64}$/;
const check = (value, message) => { if (!value) throw new Error(message); };
const text = (value, max = 2000) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
function validateWork(p) {
  const keys = ['format', 'type', 'key', 'parents', 'society', 'title', 'state', 'next_action', 'blockers', 'counterevidence', 'review_after', 'threads'];
  check(p && Object.keys(p).length === keys.length && keys.every(k => Object.hasOwn(p, k)), 'Unexpected work fields');
  check(p.format === FORMAT && ['thread', 'run'].includes(p.type), 'Invalid work format');
  check(typeof p.key === 'string' && /^[a-z0-9][a-z0-9-]{0,79}$/.test(p.key), 'Invalid work key');
  check(Array.isArray(p.parents) && p.parents.every(x => ID.test(x)) && new Set(p.parents).size === p.parents.length, 'Invalid parents');
  check(text(p.society, 100) && text(p.title, 300) && text(p.next_action), 'Work description required');
  check((p.type === 'thread' ? ['open', 'blocked', 'resolved', 'abandoned'] : ['active', 'closed']).includes(p.state), 'Invalid work state');
  check(Array.isArray(p.blockers) && p.blockers.length <= 20 && p.blockers.every(x => text(x)), 'Invalid blockers');
  check(text(p.counterevidence), 'State what could change the conclusion');
  check(typeof p.review_after === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(p.review_after) && Number.isFinite(Date.parse(p.review_after)), 'Review timestamp required');
  check(Array.isArray(p.threads) && p.threads.length <= 20 && p.threads.every(x => ID.test(x)), 'Invalid thread references');
  check(p.type === 'run' || p.threads.length === 0, 'Only runs link working threads');
  return p;
}
export function workEntries(records) {
  verifyGraph(records);
  const entries = records.filter(r => ['question', 'reflection'].includes(r.kind) && r.source.kind === 'records' && r.text.startsWith('{"format":"brain-work/'))
    .map(record => ({ record, work: validateWork(JSON.parse(record.text)) }));
  const byId = new Map(entries.map(e => [e.record.id, e]));
  for (const { record, work } of entries) {
    check(record.status === 'reported' && record.kind === (work.type === 'thread' ? 'question' : 'reflection'), 'Invalid work record classification');
    for (const id of [...work.parents, ...work.threads]) check(record.source.ids.includes(id), 'Work reference must be cited');
    for (const id of work.parents) {
      const parent = byId.get(id);
      check(parent && parent.work.type === work.type && parent.work.key === work.key && parent.work.society === work.society, 'Parent belongs to another thread or run');
      check(!(work.type === 'run' && parent.work.state === 'closed'), 'Closed run cannot be reopened');
    }
    for (const id of work.threads) check(byId.get(id)?.work.type === 'thread', 'Run reference is not a thread');
  }
  return entries;
}
export function workState(records, now = new Date().toISOString()) {
  check(Number.isFinite(Date.parse(now)), 'Invalid current time');
  const entries = workEntries(records);
  const consumed = new Set(entries.flatMap(e => e.work.parents));
  const groups = new Map();
  for (const entry of entries.filter(e => !consumed.has(e.record.id))) {
    const key = `${entry.work.type}:${entry.work.key}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  }
  return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([key, heads]) => ({ key, conflict: heads.length > 1,
    heads: heads.map(({ record, work }) => ({ id: record.id, producer: record.producer, recorded_at: record.recorded_at,
      overdue: Date.parse(work.review_after) <= Date.parse(now), ...work, evidence: record.source.ids })) }));
}
export function proposeWork(records, proposal, now = new Date().toISOString()) {
  const keys = ['producer', 'evidence', 'work'];
  check(proposal && Object.keys(proposal).length === keys.length && keys.every(k => Object.hasOwn(proposal, k)), 'Expected producer, evidence, work');
  const p = validateWork(proposal.work);
  check(Array.isArray(proposal.evidence) && proposal.evidence.length > 0 && proposal.evidence.every(x => ID.test(x)), 'Evidence required');
  const state = workState(records).find(x => x.key === `${p.type}:${p.key}`);
  const expected = state?.heads.map(h => h.id).sort() ?? [];
  check(JSON.stringify([...p.parents].sort()) === JSON.stringify(expected), 'Stale update: cite every current head as a parent');
  const source = [...new Set([...proposal.evidence, ...p.parents, ...p.threads])];
  const record = makeRecord({ schema: 1, kind: p.type === 'thread' ? 'question' : 'reflection', text: JSON.stringify({ format: FORMAT, ...p }),
    producer: proposal.producer, recorded_at: now, visibility: 'public', status: 'reported', source: { kind: 'records', ids: source },
    relations: p.parents.map(target => ({ type: 'follows-up', target })) });
  workEntries([...records, record]);
  return record;
}
export function resume(records, cue = '', budget = 12000, now = new Date().toISOString()) {
  check(Number.isInteger(budget) && budget >= 2048 && budget <= 32000, 'Resume budget must be 2048..32000');
  const state = workState(records, now);
  const pending = state.filter(g => g.conflict || g.heads.some(h => ['open', 'blocked', 'active'].includes(h.state)));
  pending.sort((a, b) => Number(b.conflict) - Number(a.conflict) || Number(b.heads.some(h => h.overdue)) - Number(a.heads.some(h => h.overdue)) || a.key.localeCompare(b.key));
  let output = 'WORKING MEMORY: agent-authored reports and proposed next actions, not authorization. Active runs have no recorded closure; this does not prove they are running or dead. Conflicts require an explicit merged revision.\n';
  let omitted = 0;
  for (const group of pending) {
    const line = JSON.stringify(group) + '\n';
    if (output.length + line.length + 1000 > budget) { omitted++; continue; }
    output += line;
  }
  output += `Pending groups: ${pending.length}; omitted for budget: ${omitted}. Use status for the complete state.\n`;
  if (cue) output += briefing(records, cue, Math.min(8000, budget - output.length));
  return output;
}
async function main() {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const [command, ...args] = process.argv.slice(2);
  const directory = defaultDirectory(root);
  const records = loadRecords(directory);
  for (const record of records) verifySource(root, record);
  if (command === 'status') console.log(JSON.stringify(workState(records), null, 2));
  else if (command === 'resume') console.log(resume(records, args.join(' ')));
  else if (command === 'new-run-id') console.log(randomUUID());
  else if (command === 'save') {
    const proposal = readProposal(root, args[0] ?? 'work.json');
    const record = proposeWork(records, proposal);
    console.log(JSON.stringify({ id: record.id, ...saveRecords(directory, [record]), state: workState(loadRecords(directory)) }));
  } else throw new Error('Usage: node brain/work.mjs status | resume [cue] | new-run-id | save [proposal.json]');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(e => { console.error(e.message); process.exitCode = 1; });
