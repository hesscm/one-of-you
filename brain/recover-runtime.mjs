#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { boundedProcess } from './process.mjs';
import { OWNER_LABEL } from './iai.mjs';

export function removable(container) {
  return /^one-of-you-iai-call-[a-f0-9-]{36}$/.test(container.name.replace(/^\//, ''))
    && container.labels?.['one-of-you.brain.runtime'] === '1'
    && ['exited', 'dead'].includes(container.state);
}
export async function recoverRuntime(clean = false) {
  const output = await boundedProcess('docker', ['ps', '-aq', '--no-trunc', '--filter', `label=${OWNER_LABEL}`], { timeout: 15000, maxOutput: 100000 });
  const results = [];
  for (const id of output.trim().split('\n').filter(Boolean)) {
    if (!/^[a-f0-9]{64}$/.test(id)) throw new Error('Invalid container identity');
    const format = '{"id":{{json .Id}},"name":{{json .Name}},"state":{{json .State.Status}},"labels":{{json .Config.Labels}}}';
    let c;
    try { c = JSON.parse(await boundedProcess('docker', ['inspect', '--format', format, id], { timeout: 15000, maxOutput: 100000 })); }
    catch { results.push({ id, action: 'inspection failed or container disappeared' }); continue; }
    let action = removable(c) ? 'eligible stopped container' : 'retained';
    if (clean && removable(c)) {
      // No -f and no volume removal. Docker refuses if it restarted since inspect.
      try { await boundedProcess('docker', ['rm', id], { timeout: 15000, maxOutput: 100000 }); action = 'removed'; }
      catch { action = 'removal unconfirmed; inspect again'; }
    }
    results.push({ id, name: c.name, state: c.state, action });
  }
  return results;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const command = process.argv[2] ?? 'inspect';
  if (!['inspect', 'clean-stopped'].includes(command)) { console.error('Usage: node brain/recover-runtime.mjs inspect | clean-stopped'); process.exitCode = 1; }
  else recoverRuntime(command === 'clean-stopped').then(r => console.log(JSON.stringify(r, null, 2))).catch(e => { console.error(e.message); process.exitCode = 1; });
}
