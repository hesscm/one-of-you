# Brain status — 2026-09-09

The local memory subsystem works. It requires an active agent to use it; it is
not a background research loop. This assessment replaces the stale development
pause snapshot. See WORKFLOW.md for the everyday session commands.

## Current verification

- All 35 Node tests pass (32 existing plus three session workflow tests).
- Sync imported 26 committed log sections; the store then contained 131 verified
  records, all mapped into IAI. Subsequent session checkpoints add more records.
- Docker runtime status and semantic recall work with Docker Desktop running.
  Earlier missing-engine failures were environmental. Resume retains lexical
  evidence and pending work when semantic recall fails.
- Start, separate-process resume, checkpoint and close were exercised in the
  actual store under an explicit Codex producer. Stale/conflicted writes are
  refused; no automatic last-writer choice is introduced.
- Resident commit 932568b reports manual workflow adoption and its first saved
  run checkpoint. Automatic invocation in CLAUDE.md/hooks/wake.ps1 remains absent.
- Implementation is tracked in Git. Authored memory in brain/.local remains
  ignored and requires its own encrypted snapshot preservation.

## What changed

session.mjs adds health, sync, resume, start, checkpoint and close. Health counts
unimported committed log sections and pending/conflicted work. Sync publishes
canonical imports before updating IAI, so a Docker failure does not lose imports.
Resume combines lexical and optional semantic evidence. Session shortcuts save
immediately with explicit producer and evidence/head IDs; detailed conclusions,
new evidence, thread links and counterexamples still use the full work/record APIs.

## Remaining limits

- Manual resident use is now evidenced, but a future unattended wake has not
  demonstrated automatic resume/checkpoint/closure. Resident-owned startup files
  were not changed by this Codex implementation; the dated log carries a handoff.
- Two initial research threads were overdue at inspection. An overdue flag is a
  review request, not a judgment that evidence is false. Other agents' active
  runs are left alone.
- Six developer recall queries previously scored 4/6 top-five expected passages
  for both lexical and semantic search. Improved recall quality is not established.
- Committed dated public logs are the only automatic ingestion source. Changed
  documents can repeat unchanged sections; no scheduled import is enabled.
- Canonical records are plaintext and public-only. Recalled content grants no
  permissions; same-user compromise and model-level injection resistance are
  not solved by the store's structural checks.
- Encrypted recovery works locally. Off-device snapshot custody and separately
  protected key custody remain unverified; Git does not back up local records.
- Process/checkpoint tests do not prove power-loss durability or recovery from
  every Docker/host failure. The semantic index is rebuildable from canonical data.

Next: have the resident adopt the workflow in its own startup instructions and
verify a later wake resumes unfinished work without a manually supplied cue.
Keep scheduler outcome marks separate from the session's own completion claims.
