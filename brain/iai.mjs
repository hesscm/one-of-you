#!/usr/bin/env node
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { boundedProcess } from './process.mjs';
import { fileURLToPath } from 'node:url';
import { loadRecords, defaultDirectory, verifySource } from './memory.mjs';
import { captureBatches, resolveHits, semanticBriefing } from './iai-adapter.mjs';
import { resolve } from 'node:path';

export const IMAGE = JSON.parse(readFileSync(new URL('./runtime/image-lock.json', import.meta.url), 'utf8')).image;
if (!/^sha256:[a-f0-9]{64}$/.test(IMAGE)) throw new Error('Invalid locked image identity');
export const OWNER_LABEL = 'one-of-you.brain.runtime=1';
export const VOLUME = 'one-of-you-iai-store';
export function dockerArgs() {
  return ['run', '--rm', '-i', '--label', OWNER_LABEL, '--network', 'none', '--read-only', '--cap-drop', 'ALL',
    '--security-opt', 'no-new-privileges', '--pids-limit', '128', '--memory', '4g', '--cpus', '2',
    '--tmpfs', '/tmp:rw,noexec,nosuid,size=256m',
    '--mount', `type=volume,source=${VOLUME},target=/home/brain/.iai-mcp`, IMAGE];
}
export async function invoke(request) {
  const input = JSON.stringify(request);
  if (Buffer.byteLength(input) > 2_000_000) throw new Error('IAI request exceeds 2MB; use smaller batches');
  const stdout = await containerProcess(dockerArgs(), input);
  try { return JSON.parse(stdout); } catch { throw new Error('IAI returned invalid JSON; contents withheld'); }
}
// Internal developer API: args are trusted code, never fields from memory.
export async function containerProcess(runArgs, input, { timeout = 120000 } = {}) {
  const name = `one-of-you-iai-call-${randomUUID()}`;
  // Create separately so a deadline on the attached client cannot leave an
  // unnamed running container. Remove only this invocation's generated name.
  const args = runArgs.slice(1).filter(x => x !== '--rm');
  let created = false;
  try {
    await boundedProcess('docker', ['create', '--name', name, ...args], { timeout: 30000, maxOutput: 100000 });
    created = true;
    return await boundedProcess('docker', ['start', '-ai', name], { input, timeout });
  } finally {
    try { await boundedProcess('docker', ['rm', '-f', name], { timeout: 15000, maxOutput: 100000 }); }
    catch { throw new Error(`Container cleanup could not be confirmed for ${name}; Docker may need attention (${created ? 'created' : 'creation unconfirmed'})`); }
  }
}
async function main() {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const [command, ...args] = process.argv.slice(2);
  if (['status', 'audit'].includes(command)) console.log(JSON.stringify(await invoke({ operation: command }), null, 2));
  else if (command === 'ingest') {
    const records = loadRecords(defaultDirectory(root));
    for (const record of records) verifySource(root, record);
    let added = 0, mapped = 0;
    const batches = captureBatches(records);
    for (const requests of batches) {
      const result = await invoke({ operation: 'ingest', requests });
      added += result.added; mapped = result.mapped;
    }
    console.log(JSON.stringify({ added, mapped, batches: batches.length }));
  } else if (command === 'search' || command === 'brief') {
    const records = loadRecords(defaultDirectory(root));
    for (const record of records) verifySource(root, record);
    const cue = args.join(' ');
    const result = await invoke({ operation: 'recall', cue });
    const recalled = resolveHits([...result.hits, ...result.anti_hits], result.mapping, records);
    if (command === 'search') console.log(JSON.stringify({ source: 'iai', records: recalled }, null, 2));
    else console.log(semanticBriefing(records, recalled));
  } else throw new Error('Usage: node brain/iai.mjs status | ingest | audit | search <cue> | brief <cue>');
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
