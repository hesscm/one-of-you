import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { privateOutput, readProposal } from '../memory.mjs';
test('malformed proposal diagnostics never include source contents', () => {
  const root = mkdtempSync(join(tmpdir(), 'brain-security-'));
  writeFileSync(privateOutput(root, 'bad.json'), '{"secret":"DO-NOT-ECHO",broken}');
  assert.throws(() => readProposal(root, 'bad.json'), error => error.message === 'Invalid proposal JSON; contents withheld');
});
test('proposal ingestion refuses oversized files and traversal before parsing', () => {
  const root = mkdtempSync(join(tmpdir(), 'brain-security-'));
  writeFileSync(privateOutput(root, 'large.json'), ' '.repeat(128001));
  assert.throws(() => readProposal(root, 'large.json'), /128KB/);
  assert.throws(() => readProposal(root, '../other.json'), /simple filename/);
  writeFileSync(privateOutput(root, 'valid.json'), '{"test":true}');
  assert.deepEqual(readProposal(root, 'valid.json'), { test: true });
});
