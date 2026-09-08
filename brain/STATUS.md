# Pause assessment — 2026-09-07

Implementation paused at Chris's request. This records the state reached in
this development session; it does not claim a new resident wake or deployment.

Subsequently resumed at Chris's request: bounded Docker execution/output, exact
per-invocation container cleanup, bounded ingestion batches, and mapping-boundary
fault recovery are implemented and exercised. See SECURITY.md and
runtime/VALIDATION.md. The assessment below remains the pause snapshot; backup,
artifact pinning, baseline commits and real resident integration are still open.

Further progress: model byte hashes and exact runtime image selection are now in
place. Labelled stopped-container recovery and an independent bridge alarm have
passing live tests. Independent backups, commits, dependency review and actual
resident integration remain unfinished. Read the latest validation/security
entries rather than treating the original pause snapshot as current completion.

Encrypted recovery tooling is now implemented and exercised: 104 records and 40
evidence objects restored locally; 32 tests pass. An independent backup still
requires an external snapshot destination and separate recovery-key custody.
Those locations have been requested, and no off-device transfer was performed.

## Assessment

We have a functioning local memory subsystem, with portable evidence, live IAI
retrieval, and working-state records. We do not yet have the minimally supervised
research loop Chris wants. The main missing step is reliable use by the resident:
resume, investigate, record new evidence, revise conclusions, checkpoint, and
leave an attributable report for the next session.

IAI currently acts as a rebuildable retrieval index over our canonical records.
We intentionally have not adopted upstream background reflection or automatic
directive creation. That keeps authority separate from recalled content, but also
means remembering and consolidating still require an active agent to invoke the
workflow. More storage features alone will not close that gap.

## Implemented and exercised

- 104 verified canonical records: 99 reported log episodes, three authored
  interpretations/questions, and two working research threads.
- Immutable source-linked records, explicit corrections, lexical search, bounded
  briefings, export and merge restore with source Git history validation.
- Live isolated IAI ingestion and semantic recall; restart/reimport idempotency;
  mappings back to canonical records; no runtime networking or host secret mounts.
- Working threads and run checkpoints with next actions, blockers, review dates,
  counterevidence, stale-write rejection and visible concurrent branches.
- Latest test run: 23 passed. Includes separate-clone/fresh-process restore,
  process termination after checkpoint publication, and proposal security checks.
- Security fixes: upstream plaintext replay caches suppressed, malformed proposal
  contents withheld from errors, and proposal input capped before parsing.

## Evidence limits

The six-query development comparison gave both IAI and lexical search 4/6 expected
passages in the top five. Semantic improvement is not established. These are
handpicked historical cases, not a held-out society-research evaluation.

The two research threads demonstrate the data/workflow, not completed research.
No real resident session has yet demonstrated automatic resume and checkpoint
use. Process-kill tests cover an already-published checkpoint; they do not prove
mid-write durability, interrupted IAI transaction recovery, power-loss safety,
or the resident's external Git recovery path.

The last live IAI audit found no missing mappings, directives, full-passage cache
matches, or legacy caches needing cleanup. This was a narrow check, not a complete
security audit. Model-level injection resistance and hostile same-user isolation
are not established. SECURITY.md records the unresolved risks.

## Remaining work, in recommended order

1. **Harden and preserve this baseline.** Bound Docker output/time and guarantee
   cleanup; cap restore/ingest growth and batch safely; test interrupted ingestion.
   Pin the model artifact and runtime image identity, review dependencies and
   diagnostics. Review the explicit development paths and commit them when work
   resumes. Establish a recoverable backup independent of the local working tree.
2. **Integrate one real resident session.** Wire resume, run attribution, early
   checkpoints and closure into the actual session lifecycle while preserving
   the external scheduler's independent verdict. Define run-owned publication
   and recovery manifests. Demonstrate a fresh session continuing unfinished work
   without Chris manually supplying the context. Keep rollback/disable simple.
3. **Prove recall usefulness.** Add held-out society questions, compare lexical,
   semantic and combined retrieval, and assess whether corrections survive into
   the final answer. Handle historical/current versions and repeated passages;
   prevent retrieved derivatives from masquerading as independent corroboration.
4. **Complete the research loop.** Add attributed external source snapshots,
   actor/encounter distinctions and event times, hypothesis/counterexample updates,
   and concise longitudinal reports. Run a real question through observation,
   evidence, interpretation, correction and later-session follow-through.
5. **Expand only after those checks.** Add scoped society adapters and practical
   collection limits. Private/work use needs separate storage and credentials,
   privacy-aware selection, encrypted backup/key recovery, and stronger leak tests.

## What remains local

The implementation is not committed: .gitignore is modified; brain/ and the
Codex handoff log are untracked. Generated records/exports are ignored under
brain/.local; IAI uses a local Docker volume. A Git clone alone currently carries
neither these uncommitted implementation files nor later local authored memories.
The model download also prevents a fully reproducible rebuild today.

Resident operating instructions and scheduler were not modified, and no resident
forum identity actions were taken. Implementation is paused; this assessment
does not start services, publish changes, or advance another phase.
