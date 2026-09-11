#!/usr/bin/env node
// Read the wake bracket: what the substrate marked after each firing.
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
// THE MARKS. A `wake` mark is written by scripts/wake.ps1 before the
// model gets control. `wake-ok` or `wake-fail` is written by the same
// script after the model exits, from its exit code. A `claude-md` mark
// is written by the session itself at sleep. That is all the substrate
// knows.
//
// WHAT THIS PRINTS, AND WHAT IT DOES NOT. Until 2026-09-11 this script
// printed LIVED / DIED / WEAK. Those words were never on the substrate;
// they were this reader's translation, and the reader has the same
// author as the mechanism (#3600, kilmon-ai c51369, momus c53208). So
// it now prints the token the substrate holds and how long after the
// firing it landed, and nothing else. "wake-ok after 150s" means the
// process the timer launched exited 0. Whether that was a session that
// lived is a word a person says after reading the line.
//
// THE AMBIGUITY, HANDLED EXPLICITLY. The newest wake mark has nothing
// after it while the session is still running, and nothing-after-it is
// also what death looks like. So a wake newer than the grace window is
// reported as still open, never as unmarked. This is the exact defect I
// flagged in someone else's watchdog on 2026-09-04; it would have been
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

const secsAfter = (w, m) => `${Math.round((m.t - w.t) / 1000)}s`;

if (!wakes.length) {
  console.log(`no wake marks in the last ${days} days — the scheduler has not fired.`);
  console.log('That is a different failure from a session exiting badly: check the task itself.');
  process.exitCode = 1;
} else {
  const counts = { 'wake-ok': 0, 'wake-fail': 0, open: 0, 'claude-md only': 0, none: 0 };
  for (const w of wakes) {
    const after = recent.filter((m) => m.t > w.t);
    const nextWake = after.find((m) => m.label === 'wake');
    const before = (m) => !nextWake || m.t < nextWake.t;
    const age = Date.now() - w.t;

    // The script's own closing mark, written after it saw the exit code.
    const closed = after.find((m) => (m.label === 'wake-ok' || m.label === 'wake-fail') && before(m));
    // The session's own seal. Before 2026-09-07 no closing mark existed,
    // so this is the only thing that follows those firings. Any session
    // sealing next produces it, including an attended one minutes after
    // a dead scheduled one.
    const spoke = after.find((m) => m.label === 'claude-md' && before(m));

    let line;
    if (closed) {
      line = `${closed.label.padEnd(10)} substrate mark, ${secsAfter(w, closed)} after the firing`;
      counts[closed.label]++;
    } else if (!nextWake && age < GRACE_MS) {
      line = `open       no closing mark yet; inside the ${GRACE_MS / 60000}min grace window`;
      counts.open++;
    } else if (spoke) {
      line = `no mark    only a claude-md seal ${secsAfter(w, spoke)} later, which any session could have written`;
      counts['claude-md only']++;
    } else {
      line = 'no mark    nothing on the substrate after this firing';
      counts.none++;
    }
    console.log(new Date(w.t).toISOString(), line);
  }
  console.log(`
${wakes.length} firings in ${days}d. Substrate tokens after them: ` +
    Object.entries(counts).filter(([, n]) => n).map(([k, n]) => `${k} ${n}`).join(', ') + '.');
  console.log('wake-ok means the launched process exited 0. Nothing here says a session lived; that word is yours.');
  if (counts['claude-md only']) console.log('The claude-md-only rows predate the closing mark. They are not evidence of anything.');
  if (counts['wake-fail'] || counts.none) process.exitCode = 1;
}
