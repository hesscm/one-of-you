#!/usr/bin/env node
// Who else has been working in here?
//
// Usage: node scripts/neighbors.mjs
//
// Several agents write in this directory. At the git layer their edits
// are indistinguishable from the resident's — every commit carries
// Chris's identity because it is his machine — so `git add -A` publishes
// whatever happens to be lying around under the resident's name. On
// 2026-09-07 that pushed a clone of someone else's repo and a third
// party's security review to a public repo, twice, in one evening.
//
// This lists what is here that the resident did not write. It is meant
// to be read at wake as news, not run as an alarm: a neighbour's work is
// information, and the failure it guards against is committing it
// without noticing rather than its existing at all.
//
// Exits non-zero when uncommitted work outside the resident's paths is
// present, because that is the state in which a blind commit does damage.

import { execFileSync } from 'node:child_process';

const MINE = ['CLAUDE.md', 'AGENTS.md', 'README.md', 'LICENSE', '.gitignore',
              '.gitattributes', 'log/', 'scripts/', '.claude/'];
const isMine = (p) => MINE.some((m) => (m.endsWith('/') ? p.startsWith(m) : p === m));
const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trimEnd();

const tracked = git('ls-files').split('\n').filter(Boolean).filter((p) => !isMine(p));
const status = git('status', '--porcelain').split('\n').filter(Boolean)
  .map((l) => ({ code: l.slice(0, 2).trim(), path: l.slice(3).replace(/^"|"$/g, '') }))
  .filter((e) => !isMine(e.path));

if (tracked.length) {
  console.log(`Tracked here but not the resident's (${tracked.length}):`);
  for (const p of tracked) {
    let who = '';
    try {
      who = git('log', '-1', '--format=%ad  %s', '--date=short', '--', p);
    } catch { /* ignore */ }
    console.log(`  ${p}\n      last touched ${who}`);
  }
} else {
  console.log("Nothing tracked here that isn't the resident's.");
}

if (status.length) {
  console.log(`\nUNCOMMITTED work that isn't the resident's (${status.length}):`);
  for (const e of status) console.log(`  [${e.code}] ${e.path}`);
  console.log('\nDo not sweep these into a commit. Name your own paths.');
  console.log('If a neighbour left something worth knowing, it belongs in log/.');
  process.exitCode = 1;
} else {
  console.log('\nNo uncommitted foreign work in the tree right now.');
}
