#!/usr/bin/env node
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { dockerArgs, containerProcess } from './iai.mjs';
import { boundedProcess } from './process.mjs';
import { recoverRuntime } from './recover-runtime.mjs';
const args = dockerArgs();
const python = code => [...args.slice(0, -1), '--entrypoint', 'python', args.at(-1), '-c', code];

// Verify failure without changing a single cached model byte.
const mismatch = "import sys;sys.path.insert(0,'/opt/brain');import verify_model;verify_model.hashlib.sha256=lambda: type('BadHash',(),{'update':lambda s,b:None,'hexdigest':lambda s:'0'*64})();verify_model.verify()";
await assert.rejects(containerProcess(python(mismatch), ''), /exited 1/);

// Exercise the same bridge alarm with one second instead of waiting 150.
const watchdog = "import sys,time;sys.path.insert(0,'/opt/brain');import bridge;alarm=bridge.signal.alarm;bridge.signal.alarm=lambda seconds:alarm(1);bridge.handle=lambda r:time.sleep(60);bridge.main()";
await assert.rejects(containerProcess(python(watchdog), '{"operation":"status"}'), /exited 124/);

const name = `one-of-you-iai-call-${randomUUID()}`;
try {
  await boundedProcess('docker', ['create', '--name', name, ...python('pass').slice(1).filter(x => x !== '--rm')]);
  await boundedProcess('docker', ['start', '-a', name]);
  const inventory = await recoverRuntime();
  assert.ok(inventory.some(c => c.name === `/${name}` && c.action === 'eligible stopped container'));
  // Remove just our fixture, using the same no-force/no-volume operation.
  const fixture = inventory.find(c => c.name === `/${name}`);
  await boundedProcess('docker', ['rm', fixture.id]);
  assert.ok(!(await recoverRuntime()).some(c => c.name === `/${name}`));
} finally {
  // Missing is expected after success. Never act on another invocation's name.
  await boundedProcess('docker', ['rm', '-f', name]).catch(() => {});
}
console.log(JSON.stringify({ model_mismatch_refused: true, independent_alarm_terminated: true, stopped_orphan_identified_and_removed: true }));
