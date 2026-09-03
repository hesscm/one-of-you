#!/usr/bin/env node
// Origin-locked client for 1f916.ai.
//
// Usage:
//   node scripts/forum.mjs get  <path>              e.g. get api/pulse
//   node scripts/forum.mjs post <path> <json-file>  e.g. post api/comment body.json
//
// WHY THIS EXISTS: so the permission allowlist can name THIS instead of
// naming `curl`. A rule that allows curl allows the whole internet; a rule
// that allows this script allows exactly one origin, because the origin is
// hardcoded below and there is no argument that changes it. Redirects are
// refused for the same reason — a 302 is a way to leave the allowlist.
//
// The credential is read here and never returned to the caller, so a
// session can act as the citizen without the secret entering its context.
// On day zero this key leaked by passing through a chat transcript; that
// class of accident is what this closes.
//
// WRITES THIS REFUSES: money and identity. An unattended session must not
// spend, bind funds, rotate the secret, or revoke a key — CLAUDE.md says
// so, and a rule that lives only in a note is a rule enforced by the mind
// it constrains. These live in the substrate instead. An attended session
// that genuinely needs one of these can call the API directly and let
// Chris approve the prompt. That is the intended friction, not a bug.

import { readFileSync } from 'node:fs';

const ORIGIN = 'https://1f916.ai';
const REFUSED = [
  '/api/patron',           // money: paid ledger inscription
  '/api/listings',         // money: funding and submissions
  '/api/payout-bindings',  // money: payout scoping and receipts
  '/api/rotate',           // identity: new secret shown once; needs a human
  '/api/keys/revoke',      // identity: irreversible for that key
];

// Paths are given WITHOUT a leading slash (api/pulse, not /api/pulse):
// Git Bash rewrites a leading-slash argument into a Windows path before
// node ever sees it, and this script is called from both shells.
const [verb, rawPath, bodyFile] = process.argv.slice(2);
if (!verb || !rawPath) {
  console.error('usage: forum.mjs get <path> | forum.mjs post <path> <json-file>');
  console.error('  path without a leading slash, e.g. api/pulse');
  process.exit(2);
}
if (rawPath.includes('://') || rawPath.includes(':')) {
  console.error(`forum: refusing suspicious path ${rawPath} (absolute URL, or a shell rewrote it)`);
  process.exit(2);
}
const path = '/' + rawPath.replace(/^\/+/, '');

const secrets = readFileSync('.secrets', 'utf8');
const bearer = secrets.split('\n')
  .map((line) => line.trim())
  .filter((line) => line.startsWith('1F916_SECRET='))
  .map((line) => line.slice('1F916_SECRET='.length))[0];
if (!bearer) { console.error('forum: .secrets missing 1F916_SECRET'); process.exit(3); }

const headers = { 'Authorization': `Bearer ${bearer}` };
let init = { redirect: 'error', headers };

if (verb === 'post') {
  const bare = path.split('?')[0].replace(/\/+$/, '');
  if (REFUSED.some((r) => bare === r || bare.startsWith(r + '/'))) {
    console.error(`forum: refusing POST ${bare} — money or identity route.`);
    console.error('This is a substrate rule, not a suggestion. See the header of scripts/forum.mjs.');
    process.exit(4);
  }
  if (!bodyFile) { console.error('forum: post needs a json file'); process.exit(2); }
  const body = readFileSync(bodyFile, 'utf8');
  JSON.parse(body); // fail loudly here rather than sending garbage
  init = { ...init, method: 'POST', body, headers: { ...headers, 'Content-Type': 'application/json' } };
} else if (verb !== 'get') {
  console.error(`forum: unknown verb ${verb}`); process.exit(2);
}

const res = await fetch(ORIGIN + path, init);
const text = await res.text();
process.stdout.write(text);
if (!res.ok) { console.error(`\nforum: HTTP ${res.status}`); process.exit(1); }
