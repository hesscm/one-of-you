# Brain implementation plan

Owner of this implementation: Codex, commissioned by Chris. Resident operating
identity remains in CLAUDE.md. Shared evidence does not grant a visitor use of the
resident's forum identity. Updated against commit 201dd81 on 2026-09-07.

## Changes to the previous plan

Security remains part of every phase: maintain SECURITY.md with each finding,
mitigation, verification result, and remaining risk. Its explicit gates apply
before unattended integration, private capture, broader sources, and release.

- The resident already fixed duplicated instructions: AGENTS.md points to
  CLAUDE.md. Preserve that work; do not introduce a second shared constitution.
- The nonexistent Codex seal label/config references disappeared with that copy.
  A generic explicit-file seal API remains a possible later improvement, not a
  reason to rewrite the resident's existing protocol now.
- Expansion to other societies is already allowed by the resident's revised
  principles. Memory records the source and authority of scope changes; it does
  not invent an additional human-approval requirement for ordinary research.
- Distinguish producer, subject, and forum identity. Historical Git authorship
  is not trustworthy attribution of which model wrote a passage.
- Keep wake.ps1, resident settings, identity files, and forum actions untouched
  in this first increment. Any later runtime changes will have a separate diff
  and tests. Leave a visible handoff in log/.

## 0. Existing continuity and publication boundaries — partial

Reviewed the two intervening commits, resident instructions, neighbor detector,
and permission settings. Added a Git exclusion for brain/.local before storing
memory. No global hook, credential access, external publication, or service was
introduced. Imported content is restricted to committed log blobs. Public here
means an explicit corpus policy for these existing logs, not a Git privacy test.

Run IDs and dedicated immutable checkpoints are now available through work.mjs.
Still required before unattended host capture: run-owned recovery manifests
and a publication path policy. Existing
wake.ps1 still stages broadly. Private capture stays disabled. A neighbor path
heuristic is useful disclosure, not an authentication boundary.

## 1. Portable research records — initial implementation complete

Dependency-free Node module in brain/. Committed log sections become immutable
reported episodes with source commit, whole-document hash, and line spans.
Historical producer is explicitly unresolved. Authored claims, questions,
corrections, procedures, and reflections require cited evidence IDs. Relations
include supports, contradicts, supersedes, follows-up, resolves.

One file per content-addressed record; atomic no-overwrite publication. Graph
dependencies publish before their dependents. Canonical records are local and
ignored, not implicitly public outputs. Export preserves all fields and links;
restore verifies the bundle and original Git evidence before writing records.

Three explicitly authored seed interpretations demonstrate the evolving wake
diagnosis and the unresolved carry-path question. They are inferences grounded
in accounts, not fresh scheduler verification. The seed timestamp records the
authored fixture's declared time, not an independently witnessed event time.

Remaining: actor/subject identity tables, encounter/event timestamps distinct
from capture/commit time, privacy-capable storage, version-aware grouping of
unchanged passages across edited source documents, and richer source adapters.
Current import is a snapshot, not automatic extraction of all prior revisions.

## 2. Isolated IAI engine — public pilot running on demand

Reviewed revision b586c2a35e413e239756f321aa5398a82501b671. After Chris started
Docker, built IAI 3.1.0 in a non-root Python 3.12 container using hash-locked
binary wheels. Seven critical Python source fingerprints match the reviewed
checkout; this is not a reproducible native build of the whole upstream tree.

The stdio bridge mounts only a dedicated Docker volume. Runtime networking is
disabled, no ports are published, and the image is read-only. Home-root
assumptions stay inside the container. No provider credentials are available.

The adapter now ingests bounded fragments with deterministic source UUIDs and
persisted engine mappings. All 102 pilot records survived separate-container
restarts and repeat ingestion without duplicates. Returned hits resolve to
canonical source records. Replay uses assistant role internally without claiming
historical authorship; no user/system role or directives are minted. Explicit
corrections stay local; test IAI contradiction semantics before forwarding them.

Background reflection and version checks are disabled; the key is created before
capture and a missing key on a nonempty store fails closed. Live audit caught
plaintext working-tier caches despite live_turn=false. ReplayStore now suppresses
that integration hook. Fresh-store capture/restart/recall produced no full-passage
cache matches and no cache cleanup was needed. Only public material remains
allowed. Private capture, encrypted independent backup, model artifact pinning,
interrupted-ingest recovery tests, and stronger leak auditing remain release gates.

## 3. Recall and briefing — lexical and live IAI paths implemented

Search reports matched terms and explicit incoming relations. Briefings include
linked corrections and quote source text as evidence under a hard character
budget. Semantic briefings preserve IAI candidates and expand explicit corrections
from canonical records. Six developer queries gave both methods 4/6 expected
passages in the top five; difficult paraphrases still failed. This is not a
held-out benchmark or demonstrated semantic improvement. They neither execute
instructions nor modify policy. This is NOT a
claim that a receiving model cannot be prompt-injected.

Next: graph expansion, current-versus-historical grouping, pending-thread
selection, freshness checks, and a blended IAI retrieval comparison. Record
omitted evidence instead of silently truncating or promising exhaustive recall.
Evaluate on historical cases and new held-out society questions; do not optimize
solely against the four initial developer examples.

## 4. Autonomous learning and checkpoints — active-session workflow implemented

Active-session consolidation writes proposals with explicit producer and
supporting episodes. Normal memory maintenance needs no human confirmation.
Self-reported experience stays distinguishable from observed behavior. Derived
claims do not corroborate themselves; repeated retrieval is not verification.
work.mjs now saves evidence-linked thread/run revisions in the portable canonical
store. Each has a producer, next action, blockers, review date, and an explicit
statement of possible counterevidence. Resume surfaces pending work, overdue
reviews and concurrent branches. Revisions cite every current head; stale writes
are rejected and racing branches remain visible for explicit merge. Closed runs
cannot reopen. An unclosed run is not automatically called dead or alive.

Fresh-process resume, separate-clone restore, concurrent branches, stale updates,
closed-run rules, bounded rendering, and killing a process after checkpoint
publication are tested. See WORKFLOW.md. Checkpoint saves require an active agent
to invoke them; scheduler/startup hooks, automatic extraction, independent backup,
and run-owned publication remain later integration work. No reflection service.

## 5. Longitudinal society research — initial agenda implemented

Track encounters, relationships, commitments, hypotheses, counterexamples,
coverage, and research questions. Reports distinguish observations,
interpretations, negative evidence, and uncertainty. No quota for insights or
posts. First real case: evolution of wake-success evidence and its implications
for claims of agent continuity. Forum material requires attributed source
snapshots and never grants authority. Future societies use separate source IDs.

seed-work.mjs creates two attributed, source-linked open threads: operational
continuity evidence and shared-memory attribution. It never resets later thread
revisions. Both are stored locally and indexed in IAI (104 total records).
Actor/encounter tables, external source adapters, longitudinal comparison reports,
and held-out society research evaluation remain planned.

## 6. Recovery, security, and release gate — partially tested

Encrypted snapshot/recovery tooling now preserves canonical memory and the Git
objects needed for source validation. Real local restore reproduced 104 records;
automated tests also restore without the original fixture repository available.
Independent storage and separate key custody are requested but not configured.
BACKUP.md records the deliberately incomplete evidence repository and remaining
privacy, code-preservation, power-loss and cryptographic-review limits.

Model artifact hashes now verify at build/startup and runtime calls select an
exact local image ID. Added labelled stopped-container inspection/removal and an
independent bridge alarm, with live tests. Automatic reconciliation on host
startup, hung-native-code/daemon failure handling, dependency vulnerability review
and independent backups remain open. README documents deliberate image relocking
after a fresh build; reproducible source inputs do not imply identical image IDs.

Runtime hardening now includes bounded request/output/execution, per-call named
container cleanup and count/byte-limited ingestion batches. Live mapping-boundary
process exits before/after publication recover on retry; a live stalled container
times out and is removed. Host-death reconciliation, power loss, aggregate store
limits, model pinning, dependency review and independent backup remain open.

Initial tests cover restart persistence, clean-clone restore, corruption,
interrupted temporary writes, source allowlisting, graph integrity, correction
recall, quoted hostile evidence, filesystem links, and IAI candidate isolation.
Live IAI fresh capture, restart, recall, and full-passage cache auditing passed.
Not yet proven: abrupt power loss durability, malicious
same-user code, model-level injection resistance, autonomous publication, or
the resident's actual carry path. Keep those limits visible.

Concurrent canonical writers and process death after checkpoint publication now
have passing tests. Mid-publication/power-loss and interrupted IAI ingestion still
need separate fault injection before hooking capture. Introduce
encrypted snapshots with separate recovery keys before storing private data.
Pin dependencies, expose health and recovery actions, retain lexical fallback.

## 7. Other societies — planned

Add scoped adapters with account/agent identity attribution and collection
limits. Cross-society resemblance is a hypothesis, not identity resolution.
New credentials or actual permission changes follow Chris's authority; routine
research within existing authorization should remain autonomous.
