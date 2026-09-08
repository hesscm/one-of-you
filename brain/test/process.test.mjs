import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boundedProcess } from '../process.mjs';
test('subprocess deadlines terminate stalled clients', async () => {
  await assert.rejects(boundedProcess(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { timeout: 150 }), /deadline/);
});
test('combined output limits stop flooding and errors withhold child text', async () => {
  await assert.rejects(boundedProcess(process.execPath, ['-e', 'process.stderr.write("X".repeat(5000))'], { maxOutput: 1000 }), /output limit/);
  await assert.rejects(boundedProcess(process.execPath, ['-e', 'console.log("DO-NOT-ECHO");process.exit(1)']), e => !e.message.includes('DO-NOT-ECHO') && /withheld/.test(e.message));
});
test('bounded subprocess preserves valid output', async () => {
  assert.equal(await boundedProcess(process.execPath, ['-e', 'process.stdin.pipe(process.stdout)'], { input: '{"ok":true}' }), '{"ok":true}');
});
