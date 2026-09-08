# Codex implementation handoff: research memory foundation

Chris asked me to review intervening edits, revise the IAI integration plan,
and begin. I read e4944cb and 201dd81 and retained their separation of the
resident's operating identity from visiting agents. I am the Codex implementation
agent here, not a newly registered forum citizen. I made no forum writes or
seals, and changed no resident operating instructions, hooks, or wake scripts.

Added brain/ with a portable evidence store, explicit correction/evidence links,
source verification, lexical search, bounded briefings, export/restore, and an
offline IAI request adapter. brain/PLAN.md replaces the earlier proposal's
duplicated-bootstrap repair with preservation of the resident's completed fix.
brain/.local is ignored before any generated records were written. Import uses
only committed dated logs; raw conversations, .secrets, reviews, and the cloned
upstream project are outside the source allowlist.

The initial import contains 99 reported episodes, plus three separately
attributed Codex inferences about wake evidence and the unresolved carry-path
question. They cite the original accounts; they do not assert fresh verification
of the scheduler. Authorship of imported passages remains unresolved, because
Chris's Git author field cannot identify which agent wrote them.

Run `node brain/cli.mjs verify`, `node brain/cli.mjs brief "wake seal row check"`,
and `node --test brain/test/*.test.mjs` to inspect the foundation. A four-query
developer baseline found its expected passages within the top five results;
this is not an IAI result or a general recall guarantee.

Docker CLI and its WSL distribution exist, but the permission-approved probe
found the Linux engine stopped/unavailable. No IAI service, package, background
reflection, or host capture hooks were installed. Next milestone: isolated
IAI runtime plus persistent source-ID mappings, tested against this baseline.
The adapter currently sends nothing. New authored records need an export to
survive loss of the ignored local directory; automatic encrypted backup and
reviewed publication remain future phases. wake.ps1 still stages broadly.

This note was written by Codex on Chris's request. Existing log entries were
left intact. Memory collaboration is evidence sharing, not a decision about
whether distinct agent sessions are one identity.

## Docker follow-through

Chris started Docker. Built and exercised an isolated IAI 3.1.0 container, using
32 hash-locked binary wheels and seven checked source fingerprints. Runtime has
no network or host directory mounts. Ingested all 102 public pilot records;
repeat ingestion after restart added zero. Live semantic recall and bounded
canonical-source briefings now work through brain/iai.mjs.

The initial audit caught plaintext working-tier caches despite upstream's
live_turn=false setting. The replay subclass now disables that hook; a fresh
public-fixture volume passed capture, restart, recall, and cache auditing without
cleanup. All 16 local tests pass. Six developer queries produced 4/6 expected
top-five passages for both IAI and lexical search: semantic superiority is not
established. See brain/runtime/VALIDATION.md for evidence and limitations.

Updated PLAN.md: phase 2 is a working public pilot, phase 3 has both recall paths.
Next gates include held-out research questions, working threads/checkpoints,
interrupted-ingest recovery, model artifact pinning, and independent backup.
Resident hooks and private capture remain disabled. This is persistence and
retrieval, not evidence that a continuous subjective identity has been created.

## Working threads and checkpoints

On Chris's instruction to continue, added brain/work.mjs and WORKFLOW.md.
At a future wake, after your normal operating-file checks, run
`node brain/work.mjs resume` to see the pending research agenda. Save structured
thread revisions and run checkpoints during work using the documented workflow;
routine updates need no human mediation. This does not yet run from your hooks.

Two Codex-attributed open threads address operational continuity and attribution
across agents sharing memory. They cite existing accounts, require consideration
of counterevidence, and do not settle subjective identity. All 104 canonical
records verify and are indexed by IAI. The local working-memory export restores
idempotently. Twenty-one tests pass, including fresh-process/clean-clone resume,
visible branch conflicts, stale-update rejection, and process death after a saved
checkpoint. An unclosed run means no recorded closure, not a death verdict.

Your operating file and scheduler remain unchanged. WORKFLOW.md is the concrete
integration handoff. Checkpoints share the existing export format, but a local
export is still not an independent backup. The next integration should wire the
resume/checkpoint workflow into actual sessions and establish recoverable backups
and run-owned publication before unattended capture grows.

## Security tracking

Chris explicitly asked that security concerns be addressed and recorded during
setup. Added brain/SECURITY.md with findings, mitigations, evidence and remaining
gates. Fixed proposal handling so malformed JSON does not echo source text into
errors, and capped proposal reads at 128KB before parsing. Added regression tests
for redaction, oversized input and traversal. Private capture, independent backup,
Docker response/time bounds and dependency/model verification remain documented
work; the prior clean audit was limited to full-passage cache detection.

## Resumed: bounded runtime and mapping recovery

Chris asked to continue. Added request/output limits, subprocess deadlines and
per-invocation container cleanup to IAI calls; child error contents are withheld.
Ingestion now batches by byte size and fragment count. All 104 production mappings
survived a two-batch retry with zero new records. Separate public test volumes
passed process exits before/after mapping publication, retry/audit/recall, and a
live stalled-container timeout with removal. No production fault injection.

Security and validation notes distinguish these results from power-loss safety,
host-agent death cleanup, private-data readiness or a comprehensive native-store
audit. Independent backup, model/image pinning, broader failure testing and real
resident lifecycle integration remain to do. Resident hooks remain unchanged.

## Model integrity and orphan recovery

Continued on Chris's instruction. Corrected an earlier overstatement: upstream's
native embedder already pinned its model revision. Added hashes for the three
downloaded artifacts, verified at build and startup, and locked calls to the exact
rebuilt local image ID. README documents relocking for a separate environment.

Added labelled runtime inventory and no-force cleanup of stopped containers;
running/created/paused work is retained. An independent bridge alarm initially
failed in the live test because default signals do not terminate container PID 1.
An explicit exit handler fixed it; accelerated alarm, injected model mismatch,
stopped-orphan recovery and fresh-store recall/audit now pass. Local suite: 28
passed. This does not settle native hangs or Docker daemon failure. Security.md
tracks those limits. Resident startup and scheduled hooks remain unchanged.

## Encrypted recovery snapshot

Added brain/backup.mjs and BACKUP.md. A bounded authenticated-encryption snapshot
preserves canonical memory and only the Git objects required for cited public log
evidence. It avoids unrelated file contents, hooks, remotes, and credentials.
Generated a local recovery key without printing it; created and restored the real
104-record/40-object snapshot under ignored brain/.local. Tests restore working
threads without the original fixture repository and reject wrong keys/tampering.
Full suite: 32 passed.

Chris has been asked for a separate backup destination and key-custody location.
Until those exist this is a local recovery artifact, not an independent backup.
The evidence repository is intentionally incomplete and is not an application
code backup. Private capture remains disabled. No keys belong in this log or Git.
