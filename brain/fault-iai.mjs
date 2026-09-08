#!/usr/bin/env node
// Fault injection only in fresh test volumes; never alters the main store.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dockerArgs, VOLUME, containerProcess } from './iai.mjs';
import { captureRequests } from './iai-adapter.mjs';
import { loadRecords, defaultDirectory } from './memory.mjs';
const records = loadRecords(defaultDirectory(fileURLToPath(new URL('../', import.meta.url))));
const record = records.find(r => r.kind === 'episode');
const requests = captureRequests([record]);
for (const stage of ['before', 'after']) {
  const volume = `one-of-you-iai-fault-${randomUUID()}`;
  console.log(JSON.stringify({ stage, retained_test_volume: volume }));
  const args = dockerArgs().map(a => a.replace(`source=${VOLUME},`, `source=${volume},`));
  async function call(request, fault = false) {
    let actual = args;
    if (fault) {
      const code = `import sys,os; sys.path.insert(0,'/opt/brain'); import bridge\noriginal=bridge.atomic_json\ndef interrupted(path,value):\n ${stage === 'after' ? 'original(path,value)' : 'pass'}\n os._exit(77)\nbridge.atomic_json=interrupted\nbridge.main()`;
      actual = [...args.slice(0, -1), '--entrypoint', 'python', args.at(-1), '-c', code];
    }
    if (fault) { await assert.rejects(containerProcess(actual, JSON.stringify(request)), /exited 77/); return; }
    return JSON.parse(await containerProcess(actual, JSON.stringify(request)));
  }
  await call({ operation: 'ingest', requests }, true);
  const retry = await call({ operation: 'ingest', requests });
  assert.equal(retry.mapped, requests.length);
  assert.equal((await call({ operation: 'ingest', requests })).added, 0);
  const audit = await call({ operation: 'audit' });
  for (const field of ['missing', 'directives', 'plaintext_full_passage_files', 'removed_legacy_caches']) assert.deepEqual(audit[field], [], field);
  assert.ok((await call({ operation: 'recall', cue: record.text.slice(0, 200) })).hits.length);
  console.log(JSON.stringify({ stage, retry_added: retry.added, mapped: retry.mapped, recovery: 'passed' }));
}
const base = dockerArgs();
const stall = [...base.slice(0, -1), '--entrypoint', 'python', base.at(-1), '-c', 'import time; time.sleep(60)'];
await assert.rejects(containerProcess(stall, '', { timeout: 1000 }), /deadline/);
console.log(JSON.stringify({ live_deadline_and_cleanup: 'passed' }));
