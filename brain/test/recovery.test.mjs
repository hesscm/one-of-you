import { test } from 'node:test';
import assert from 'node:assert/strict';
import { removable } from '../recover-runtime.mjs';
import { IMAGE } from '../iai.mjs';
test('reconciliation never targets active, unknown, or foreign containers', () => {
  const c = { name: '/one-of-you-iai-call-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', labels: { 'one-of-you.brain.runtime': '1' }, state: 'exited' };
  assert.equal(removable(c), true);
  for (const state of ['running', 'created', 'paused', 'restarting']) assert.equal(removable({ ...c, state }), false);
  assert.equal(removable({ ...c, name: '/unrelated' }), false);
  assert.equal(removable({ ...c, labels: {} }), false);
  assert.match(IMAGE, /^sha256:[a-f0-9]{64}$/);
});
