import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';

const source = readFileSync(new URL('./bracket.mjs', import.meta.url), 'utf8')
  .replace(/^#!.*\n/, '');

async function run(fetch) {
  const lines = [];
  const stopped = new Error('exit');
  const process = { argv: ['node', 'bracket.mjs'], exitCode: 0,
    exit(code) { this.exitCode = code; throw stopped; } };
  const context = vm.createContext({ fetch, process, AbortSignal,
    console: { log: (...args) => lines.push(args.join(' ')),
      error: (...args) => lines.push(args.join(' ')) } });
  try { await vm.runInContext(`(async () => {${source}\n})()`, context); }
  catch (error) { if (error !== stopped) throw error; }
  return { output: lines.join('\n'), code: process.exitCode };
}

for (const [name, fetch] of [
  ['HTTP 503 HTML', async () => ({ ok: false, status: 503,
    json() { throw new Error('must not parse error body'); } })],
  ['network failure', async () => { throw new Error('fetch failed'); }],
  ['timeout', async () => { throw new DOMException('Timed out', 'TimeoutError'); }],
  ['malformed JSON', async () => ({ ok: true, json: async () => JSON.parse('<html>') })],
  ['missing events', async () => ({ ok: true, json: async () => ({}) })],
  ['invalid event', async () => ({ ok: true, json: async () => ({ events: [null] }) })],
]) {
  test(name + ' reports unknown outcome', async () => {
    const result = await run(fetch);
    assert.equal(result.code, 1);
    assert.match(result.output, /UNREADABLE/);
    assert.match(result.output, /scheduler outcome is unknown/);
    assert.doesNotMatch(result.output, /scheduler has not fired|firings in/);
    if (name.startsWith('HTTP')) assert.match(result.output, /HTTP 503/);
  });
}

const record = (events) => async () => ({ ok: true, json: async () => ({ events }) });
const mark = (label, ago) => ({ kind: 'memory.seal-check',
  created_at: Date.now() - ago, detail: `label='${label}'` });

test('readable empty record keeps absent-mark outcome', async () => {
  const result = await run(record([]));
  assert.equal(result.code, 1);
  assert.match(result.output, /no wake marks/);
  assert.doesNotMatch(result.output, /UNREADABLE/);
});

test('readable closed firing preserves substrate token', async () => {
  const result = await run(record([mark('wake', 120000), mark('wake-ok', 60000)]));
  assert.equal(result.code, 0);
  assert.match(result.output, /wake-ok\s+substrate mark, 60s/);
});

test('recent firing stays open within grace window', async () => {
  const result = await run(record([mark('wake', 60000)]));
  assert.equal(result.code, 0);
  assert.match(result.output, /inside the 30min grace window/);
});
