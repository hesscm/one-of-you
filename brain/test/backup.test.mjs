import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { importLogs, loadRecords, defaultDirectory, verifySource } from '../memory.mjs';
import { snapshot, encryptSnapshot, decryptSnapshot, restoreSnapshot } from '../backup.mjs';
import { proposeWork, resume } from '../work.mjs';
function fixture() {
  const parent = mkdtempSync(join(tmpdir(), 'brain-backup-'));
  const root = join(parent, 'original'); mkdirSync(root);
  const git = (...args) => execFileSync('git', ['-C', root, ...args], { stdio: 'pipe' });
  git('init', '-q'); git('config', 'user.email', 'fixture@example.invalid'); git('config', 'user.name', 'Fixture');
  mkdirSync(join(root, 'log')); writeFileSync(join(root, 'log/2026-09-07.md'), '# Evidence\nReported continuity evidence.\n');
  writeFileSync(join(root, 'unrelated.txt'), 'DO-NOT-BACK-UP-UNRELATED-CONTENTS');
  git('add', 'log', 'unrelated.txt'); git('commit', '-qm', 'fixture');
  return { root, parent, records: importLogs(root).records };
}
test('encrypted snapshot restores evidence and working threads without original Git repository', () => {
  const { root, parent, records } = fixture();
  records.push(proposeWork(records, { producer: 'test:backup', evidence: [records[0].id], work: {
    format: 'brain-work/v1', type: 'thread', key: 'continuity', parents: [], society: 'fixture', title: 'Continuity question', state: 'open',
    next_action: 'Inspect independent evidence.', blockers: [], counterevidence: 'Failed restoration.', review_after: '2026-09-10T00:00:00Z', threads: [] } }));
  const key = randomBytes(32), value = snapshot(root, records);
  assert.ok(!value.objects.some(o => Buffer.from(o.data, 'base64').includes('DO-NOT-BACK-UP-UNRELATED-CONTENTS')));
  const encrypted = encryptSnapshot(value, key);
  assert.ok(!encrypted.includes('Reported continuity evidence'));
  renameSync(root, join(parent, 'unavailable-original'));
  const target = join(parent, 'restored');
  assert.equal(restoreSnapshot(decryptSnapshot(encrypted, key), target).total, 2);
  const restored = loadRecords(defaultDirectory(target));
  for (const record of restored) verifySource(target, record);
  assert.match(resume(restored), /Inspect independent evidence/);
  assert.throws(() => restoreSnapshot(value, target), /must not exist/);
});
test('wrong keys, tampering and truncated ciphertext fail authentication', () => {
  const key = randomBytes(32), encrypted = encryptSnapshot({ test: true }, key);
  assert.throws(() => decryptSnapshot(encrypted, randomBytes(32)), /authentication/);
  const tampered = Buffer.from(encrypted); tampered[tampered.length - 1] ^= 1;
  assert.throws(() => decryptSnapshot(tampered, key), /authentication/);
  assert.throws(() => decryptSnapshot(encrypted.subarray(0, 20), key), /Invalid/);
  assert.notDeepEqual(encryptSnapshot({ test: true }, key), encrypted);
});
test('corrupt evidence objects fail before restore destination creation', () => {
  const { root, parent, records } = fixture();
  const value = snapshot(root, records); value.objects[0].data = Buffer.from('changed').toString('base64');
  const target = join(parent, 'refused');
  assert.throws(() => restoreSnapshot(value, target), /digest/);
  assert.equal(existsSync(target), false);
});
test('missing evidence fails without publishing restored records', () => {
  const { root, parent, records } = fixture();
  const value = snapshot(root, records); value.objects = value.objects.filter(o => o.type !== 'blob');
  const target = join(parent, 'incomplete');
  assert.throws(() => restoreSnapshot(value, target));
  assert.deepEqual(loadRecords(defaultDirectory(target)), []);
});
