import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dockerArgs, IMAGE, VOLUME } from '../iai.mjs';
import { semanticBriefing, captureBatches } from '../iai-adapter.mjs';
import { makeRecord } from '../memory.mjs';

test('ingestion batches preserve every fragment within byte and count bounds', () => {
  const records = Array.from({ length: 105 }, (_, i) => makeRecord({ schema: 1, kind: 'episode', text: `${i}:` + '界'.repeat(11000), producer: 'fixture',
    recorded_at: '2026-09-07T00:00:00Z', visibility: 'public', status: 'reported', relations: [],
    source: { kind: 'git', commit: 'a'.repeat(40), path: 'log/2026-09-07.md', sha256: 'b'.repeat(64), start_line: 1, end_line: 1 } }));
  const batches = captureBatches(records);
  assert.ok(batches.length > 2);
  assert.ok(batches.every(requests => requests.length <= 100 && Buffer.byteLength(JSON.stringify({ operation: 'ingest', requests })) <= 1500000));
  for (const record of records) assert.equal(batches.flat().filter(r => r.source_id === record.id).map(r => r.params.text).join(''), record.text);
});

test('runtime has no networking, host bind mount, privileged mode, or credential environment', () => {
  const args = dockerArgs();
  assert.equal(args[args.indexOf('--network') + 1], 'none');
  assert.ok(args.includes('--read-only'));
  assert.equal(args[args.indexOf('--cap-drop') + 1], 'ALL');
  assert.equal(args[args.indexOf('--mount') + 1], `type=volume,source=${VOLUME},target=/home/brain/.iai-mcp`);
  assert.equal(args.at(-1), IMAGE);
  assert.ok(!args.some(x => ['--privileged', '-v', '--env-file', '-e', '-p', '--publish'].includes(x)));
});

test('wheel dependencies are version and artifact pinned', () => {
  const lines = readFileSync(new URL('../runtime/requirements.lock', import.meta.url), 'utf8').trim().split('\n').filter(x => !x.startsWith('#'));
  assert.ok(lines.length > 10);
  assert.ok(lines.every(x => /^[a-zA-Z0-9_.-]+==[^ ]+ --hash=sha256:[a-f0-9]{64}$/.test(x)));
});

test('semantic briefing preserves semantic-only candidates and adds correction context', () => {
  const base = makeRecord({ schema: 1, kind: 'episode', text: 'Recorded encounter.', producer: 'reported-agent',
    recorded_at: '2026-09-07T00:00:00Z', visibility: 'public', status: 'reported', relations: [],
    source: { kind: 'git', commit: 'a'.repeat(40), path: 'log/2026-09-07.md', sha256: 'b'.repeat(64), start_line: 1, end_line: 1 } });
  const correction = makeRecord({ schema: 1, kind: 'correction', text: 'Different evidence disproves that interpretation.', producer: 'second-agent',
    recorded_at: '2026-09-08T00:00:00Z', visibility: 'public', status: 'inferred',
    source: { kind: 'records', ids: [base.id] }, relations: [{ type: 'contradicts', target: base.id }] });
  const text = semanticBriefing([base, correction], [base]);
  assert.ok(text.includes(base.text) && text.includes(correction.text));
  assert.ok(semanticBriefing([base, correction], [base], 512).length <= 512);
});
