#!/usr/bin/env node
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { writeFileSync, existsSync, mkdirSync, openSync, closeSync, fstatSync, readSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { defaultDirectory, loadRecords, exportBundle, restoreBundle, verifySource, privateOutput } from './memory.mjs';
import { workEntries } from './work.mjs';

const MAGIC = Buffer.from('OOYBACK1');
const LIMIT = 32 * 1024 * 1024;
const check = (condition, message) => { if (!condition) throw new Error(message); };
function git(root, args, input) {
  return execFileSync('git', ['-C', root, ...args], { input, maxBuffer: LIMIT, timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'] });
}
function objectId(type, bytes, algorithm) {
  return createHash(algorithm).update(Buffer.from(`${type} ${bytes.length}\0`)).update(bytes).digest('hex');
}
function trees(bytes, width) {
  const entries = [];
  let pos = 0;
  while (pos < bytes.length) {
    const space = bytes.indexOf(32, pos), zero = bytes.indexOf(0, space + 1);
    check(space > pos && zero > space && zero + 1 + width <= bytes.length, 'Invalid evidence tree');
    entries.push({ mode: bytes.subarray(pos, space).toString(), name: bytes.subarray(space + 1, zero).toString(), id: bytes.subarray(zero + 1, zero + 1 + width).toString('hex') });
    pos = zero + 1 + width;
  }
  return entries;
}
export function snapshot(root, records) {
  workEntries(records);
  const memory = exportBundle(records);
  const algorithm = git(root, ['rev-parse', '--show-object-format']).toString().trim();
  check(['sha1', 'sha256'].includes(algorithm), 'Unsupported Git object format');
  const width = algorithm === 'sha1' ? 20 : 32;
  const objects = new Map();
  let size = Buffer.byteLength(JSON.stringify(memory));
  function add(id, type) {
    if (objects.has(id)) return Buffer.from(objects.get(id).data, 'base64');
    const bytes = git(root, ['cat-file', type, id]);
    check(objectId(type, bytes, algorithm) === id, 'Source Git object mismatch');
    size += Math.ceil(bytes.length / 3) * 4;
    check(size < LIMIT - 100000, 'Snapshot exceeds 32MB pilot limit');
    objects.set(id, { id, type, data: bytes.toString('base64') });
    return bytes;
  }
  for (const record of records) {
    verifySource(root, record);
    if (record.source.kind !== 'git') continue;
    const source = record.source;
    const commit = add(source.commit, 'commit');
    let id = commit.toString().match(/^tree ([a-f0-9]+)\n/)?.[1];
    check(id, 'Missing evidence tree');
    const parts = source.path.split('/');
    for (let i = 0; i < parts.length; i++) {
      const entry = trees(add(id, 'tree'), width).find(e => e.name === parts[i]);
      check(entry, 'Missing source path in Git tree');
      if (i < parts.length - 1) check(entry.mode === '40000', 'Evidence path is not a directory');
      else check(['100644', '100755'].includes(entry.mode), 'Evidence is not a regular Git blob');
      id = entry.id;
    }
    add(id, 'blob');
  }
  return { schema: 1, algorithm, memory, objects: [...objects.values()] };
}
export function encryptSnapshot(value, key) {
  check(Buffer.isBuffer(key) && key.length === 32, 'Recovery key must be 32 bytes');
  const bytes = Buffer.from(JSON.stringify(value));
  check(bytes.length <= LIMIT, 'Snapshot exceeds 32MB');
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  cipher.setAAD(MAGIC);
  const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return Buffer.concat([MAGIC, nonce, cipher.getAuthTag(), ciphertext]);
}
export function decryptSnapshot(bytes, key) {
  check(bytes.length >= 36 && bytes.length <= LIMIT + 36 && bytes.subarray(0, 8).equals(MAGIC), 'Invalid or oversized snapshot');
  check(Buffer.isBuffer(key) && key.length === 32, 'Recovery key must be 32 bytes');
  try {
    const cipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(8, 20));
    cipher.setAAD(MAGIC); cipher.setAuthTag(bytes.subarray(20, 36));
    const plaintext = Buffer.concat([cipher.update(bytes.subarray(36)), cipher.final()]);
    return JSON.parse(plaintext.toString('utf8'));
  } catch { throw new Error('Snapshot authentication or format failed; contents withheld'); }
}
export function restoreSnapshot(value, target) {
  check(value?.schema === 1 && ['sha1', 'sha256'].includes(value.algorithm) && Array.isArray(value.objects) && value.objects.length <= 10000, 'Invalid snapshot schema');
  check(!existsSync(target), 'Restore destination must not exist');
  // Validate all object hashes and memory structure before creating anything.
  check(JSON.stringify(value.memory) === JSON.stringify(exportBundle(value.memory.records)), 'Memory bundle mismatch');
  workEntries(value.memory.records);
  for (const object of value.objects) {
    check(['commit', 'tree', 'blob'].includes(object.type) && typeof object.data === 'string', 'Invalid evidence object');
    check(objectId(object.type, Buffer.from(object.data, 'base64'), value.algorithm) === object.id, 'Evidence object digest mismatch');
  }
  mkdirSync(target, { mode: 0o700 }); // Never merge into a live repo.
  git(target, ['init', '-q', '--template=', `--object-format=${value.algorithm}`]);
  git(target, ['config', 'gc.auto', '0']);
  for (const object of value.objects) git(target, ['hash-object', '-w', '-t', object.type, '--stdin'], Buffer.from(object.data, 'base64'));
  const result = restoreBundle(defaultDirectory(target), value.memory, target);
  return { ...result, evidence_objects: value.objects.length, destination: target };
}
function boundedRead(path, limit) {
  const fd = openSync(path, 'r');
  try {
    const stat = fstatSync(fd);
    check(stat.isFile() && stat.size <= limit, 'Invalid or oversized input file');
    const bytes = Buffer.alloc(limit + 1);
    let size = 0;
    while (size < bytes.length) { const n = readSync(fd, bytes, size, bytes.length - size, null); if (!n) break; size += n; }
    check(size <= limit, 'Input grew beyond limit');
    return bytes.subarray(0, size);
  } finally { closeSync(fd); }
}
function main() {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const [command, name = 'snapshot.ooy', destination = 'restore-check'] = process.argv.slice(2);
  const keyPath = privateOutput(root, 'recovery.key');
  if (command === 'key-init') {
    writeFileSync(keyPath, randomBytes(32), { flag: 'wx', mode: 0o600 });
    console.log('Created local recovery.key. Preserve a separate protected copy; key contents are never printed.'); return;
  }
  check(['create', 'restore-check'].includes(command), 'Usage: node brain/backup.mjs key-init | create [snapshot.ooy] | restore-check [snapshot.ooy] [new-directory-name]');
  const key = boundedRead(keyPath, 32);
  try {
    const path = privateOutput(root, name);
    if (command === 'create') {
      const value = snapshot(root, loadRecords(defaultDirectory(root)));
      writeFileSync(path, encryptSnapshot(value, key), { flag: 'wx', mode: 0o600 });
      console.log(JSON.stringify({ snapshot: path, records: value.memory.records.length, evidence_objects: value.objects.length, independent_copy: false }));
    } else {
      const value = decryptSnapshot(boundedRead(path, LIMIT + 36), key);
      console.log(JSON.stringify(restoreSnapshot(value, privateOutput(root, destination))));
    }
  } finally { key.fill(0); }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch { console.error('Backup operation failed; diagnostics withheld. Check input, key, size limits and unused destination.'); process.exitCode = 1; }
}
