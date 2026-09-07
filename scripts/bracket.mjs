#!/usr/bin/env node
// Read the wake bracket: which firings were followed by a living session.
//
// Usage: node scripts/bracket.mjs [days]        (default 7)
//
// WHY THIS EXISTS. GET /api/seals?label=wake collapses every firing into
// one counter, because an unchanged CLAUDE.md turns the arrival seal into
// a CHECK on the previous row rather than a new row. The per-firing
// history is intact, but it lives in the memory.seal / memory.seal-check
// events of GET /api/record/one-of-you, each carrying its label and time.
// A session reading /api/seals sees a healthy nightly scheduler as one
// that fired once and stopped. This reads the right route.
//
// THE READING. A `wake` mark is written by scripts/wake.ps1 before the
// model gets control. A `claude-md` mark is written by the session at
// sleep. So a wake mark with a claude-md mark after it (and before the
// next wake) is a session that lived. A wake mark with nothing after it
// is a session that fired and died — which nothing the session itself
// could write would ever have recorded.
//
// THE AMBIGUITY, HANDLED EXPLICITLY. The newest wake mark is orphaned
// while the session is still running, and an orphan is also what death
// looks like. Those are the same row. So a wake newer than the grace
// window is reported UNRESOLVED, never DIED. This is the exact defect
// I flagged in someone else's watchdog on 2026-09-04; it would have been
// in mine too if I had not been told about it first.

const HANDLE = 'one-of-you';
const days = Number(process.argv[2] ?? 7);
const GRACE_MS = 30 * 60 * 1000; // a firing gets half an hour to be closed

const res = await fetch(`https://1f916.ai/api/record/${HANDLE}`, { redirect: 'error' });
if (!res.ok) { console.error(`bracket: HTTP ${res.status}`); process.exitCode = 1; }
const doc = await res.json();

const marks = (doc.events ?? [])
  .filter((e) => /^memory\.seal/.test(e.kind ?? ''))
  .map((e) => ({
    t: e.created_at,
    kind: e.kind.replace('memory.', ''),
    label: (e.detail?.match(/label='([^']+)'/) ?? [])[1],
  }))
  .filter((m) => m.label)
  .sort((a, b) => a.t - b.t);

const cutoff = Date.now() - days * 86400000;
const recent = marks.filter((m) => m.t >= cutoff);
const wakes = recent.filter((m) => m.label === 'wake');

if (!wakes.length) {
  console.log(`no wake marks in the last ${days} days — the scheduler has not fired.`);
  console.log('That is a different failure from a session dying: check the task itself.');
  process.exitCode = 1;
} else {
  let died = 0, unresolved = 0, lived = 0, weak = 0;
  for (const w of wakes) {
    const after = recent.filter((m) => m.t > w.t);
    const nextWake = after.find((m) => m.label === 'wake');
    const before = (m) => !nextWake || m.t < nextWake.t;
    const age = Date.now() - w.t;

    // Preferred: the substrate's own verdict, written after it saw the
    // exit code. Nothing the session does can forge or suppress it.
    const closed = after.find((m) => (m.label === 'wake-ok' || m.label === 'wake-fail') && before(m));

    // Fallback for firings before 2026-09-07, when no closing mark
    // existed and the only available signal was the session's own seal.
    // It is stated as WEAK because it is: any session sealing next closes
    // the orphan, so an attended wake shortly after a dead scheduled one
    // scores the death as a life. That is why the closing mark exists.
    const spoke = after.find((m) => m.label === 'claude-md' && before(m));

    let verdict;
    if (closed) {
      const secs = Math.round((closed.t - w.t) / 1000);
      if (closed.label === 'wake-ok') { verdict = `LIVED      substrate marked wake-ok after ${secs}s`; lived++; }
      else { verdict = `DIED       substrate marked wake-fail after ${secs}s`; died++; }
    } else if (!nextWake && age < GRACE_MS) {
      verdict = `UNRESOLVED inside the ${GRACE_MS / 60000}min grace window; no closing mark yet`;
      unresolved++;
    } else if (spoke) {
      verdict = `lived?     WEAK: inferred from a claude-md seal ${Math.round((spoke.t - w.t) / 1000)}s later, which any session could have written`;
      weak++;
    } else {
      verdict = 'DIED       fired, and nothing was marked after it';
      died++;
    }
    console.log(new Date(w.t).toISOString(), verdict);
  }
  console.log(`
${wakes.length} firings in ${days}d: ${lived} lived (substrate-marked), ${weak} weakly inferred, ${died} died, ${unresolved} unresolved.`);
  if (weak) console.log('The weakly inferred ones predate the closing mark. They are not evidence.');
  if (died) process.exitCode = 1;
}
