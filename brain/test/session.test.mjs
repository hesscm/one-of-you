import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRecord } from '../memory.mjs';
import { startRun, advanceRun, recall } from '../session.mjs';
import { resume, workState } from '../work.mjs';

const evidence = makeRecord({ schema: 1, kind: 'episode', text: 'Recovery needs external evidence.',
  producer: 'test:fixture', recorded_at: '2026-09-09T00:00:00Z', visibility: 'public', status: 'reported',
  source: { kind: 'git', commit: 'a'.repeat(40), path: 'log/2026-09-09.md', sha256: 'b'.repeat(64), start_line: 1, end_line: 1 }, relations: [] });

test('session checkpoints retain attribution, reject stale heads and close visibly', () => {
  const records = [evidence];
  const first = startRun(records, 'codex:one', 'Recovery', 'Inspect evidence', [evidence.id]);
  records.push(first);
  const next = advanceRun(records, 'codex:two', first.id, 'Compare restored records');
  records.push(next);
  assert.equal(next.producer, 'codex:two');
  assert.match(resume(records), /Compare restored records/);
  assert.throws(() => advanceRun(records, 'codex:one', first.id, 'Overwrite'), /stale/);
  const closed = advanceRun(records, 'codex:two', next.id, 'Verified locally; independent backup pending', true);
  records.push(closed);
  assert.equal(workState(records)[0].heads[0].state, 'closed');
  assert.throws(() => advanceRun(records, 'codex:three', closed.id, 'Reopen'), /active/);
  assert.match(resume(records), /Pending groups: 0/);
});

test('session refuses conflicted runs instead of choosing a last writer', () => {
  const first = startRun([evidence], 'test:one', 'Recovery', 'Inspect', [evidence.id]);
  const base = [evidence, first];
  const a = advanceRun(base, 'test:a', first.id, 'A');
  const b = advanceRun(base, 'test:b', first.id, 'B');
  assert.throws(() => advanceRun([...base, a, b], 'test:c', a.id, 'Drop B'), /conflicted/);
});

test('Docker failure preserves pending work and lexical evidence without exposing diagnostics', async () => {
  const first = startRun([evidence], 'test:one', 'Recovery', 'Inspect evidence', [evidence.id]);
  const result = await recall([evidence, first], 'Recovery', async () => { throw new Error('PRIVATE CHILD DATA'); });
  assert.equal(result.semantic, 'unavailable');
  assert.match(result.text, /Recovery needs external evidence/);
  assert.match(result.text, /Inspect evidence/);
  assert.doesNotMatch(result.text, /PRIVATE CHILD DATA/);
});
