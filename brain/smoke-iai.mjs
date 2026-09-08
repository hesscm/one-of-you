#!/usr/bin/env node
// Explicit live test: retains a separate, public-fixture Docker volume.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { dockerArgs, VOLUME, containerProcess } from './iai.mjs';
import { captureRequests } from './iai-adapter.mjs';
import { loadRecords, defaultDirectory } from './memory.mjs';
import { fileURLToPath } from 'node:url';

const volume = `one-of-you-iai-test-${randomUUID()}`;
async function call(request) {
  const args = dockerArgs().map(arg => arg.replace(`source=${VOLUME},`, `source=${volume},`));
  return JSON.parse(await containerProcess(args, JSON.stringify(request)));
}
console.log(JSON.stringify({ retained_test_volume: volume }));
const root = fileURLToPath(new URL('../', import.meta.url));
const record = loadRecords(defaultDirectory(root)).find(r => r.kind === 'episode');
assert.ok(record, 'Seed public records first');
const requests = captureRequests([record]);
assert.equal((await call({ operation: 'ingest', requests })).added, requests.length);
assert.equal((await call({ operation: 'ingest', requests })).added, 0);
assert.ok((await call({ operation: 'recall', cue: record.text.slice(0, 200) })).hits.length);
const audit = await call({ operation: 'audit' });
for (const field of ['missing', 'directives', 'plaintext_full_passage_files', 'removed_legacy_caches']) assert.deepEqual(audit[field], [], field);
assert.equal(audit.key_mode, '0o600');
console.log(JSON.stringify({ fresh_capture_restart_recall_audit: 'passed', audit }));
