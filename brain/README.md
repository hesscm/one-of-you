# one-of-you research memory

This module adds portable evidence and a search baseline to the resident's
existing history. It does not replace CLAUDE.md, speak as the citizen, run a
background service. IAI-powered recall runs on demand in an isolated Docker
container. See [PLAN.md](PLAN.md).

Requires Node 22+; no npm dependencies or installation step.

Current pause assessment and prioritized remaining work: [STATUS.md](STATUS.md).

Encrypted snapshot and isolated recovery workflow: [BACKUP.md](BACKUP.md).
The tooling is exercised; independent snapshot/key custody remains to be arranged.

Track security findings, fixes, verification, and remaining integration gates in
[SECURITY.md](SECURITY.md). Update that record as each phase changes exposure.

For ongoing research, see [WORKFLOW.md](WORKFLOW.md). `node brain/work.mjs resume`
loads pending threads and session checkpoints; `status` exposes all revisions'
current heads and conflicts. This works without Docker. `seed-work.mjs` creates
the initial evidence-linked agenda after the baseline seed below.

```powershell
node brain/cli.mjs import
node brain/seed.mjs
node brain/seed-work.mjs
node brain/work.mjs resume
node brain/cli.mjs verify
node brain/cli.mjs search "carry path recovery"
node brain/cli.mjs brief "wake seal row check"
node brain/evaluate.mjs
node --test brain/test/*.test.mjs
```

`import` reads only committed dated Markdown under log/, including headings and
their exact passages. Neither live edits nor private/untracked files enter.
It does not load .secrets, resident policy as recalled instructions, reviews,
the upstream checkout, or host-wide conversations. Already-public logs are the
explicit pilot corpus; Git itself is not a confidentiality classifier.

Records live in ignored `brain/.local/records/`. Reimporting the same source
revision is idempotent. A changed document can produce new versions of its
sections; the old records remain. Grouping unchanged sections across edits is
not implemented, so scheduled reimport is not enabled yet.

`seed` imports the frozen baseline plus three Codex-authored interpretations,
explicitly marked inferred and linked to reported accounts. It makes no claim
that those accounts independently establish scheduler health today. Re-run is
idempotent. `evaluate` uses only frozen raw episodes and reports a small
developer baseline, not a product-quality benchmark.

Search is lexical, deterministic, and read-only. `brief` returns bounded quoted
evidence and includes explicit corrections when they fit. It can miss context;
read the cited record/source. Its preamble is not a security sandbox for the
receiving model. Runtime rules and permissions remain separate.

## Portable records and authored learning

Records have a content-derived ID, schema, kind, text, producer, recorded_at,
visibility, evidence status, source, and relations. Imports are always reported
episodes, with historical authorship unresolved. Commit timestamps are recording
metadata, not necessarily observation time. Hashes detect inconsistent content;
they do not authenticate a writer or prove the truth of a report.

Use `node brain/cli.mjs record proposal.json` for an explicit authored record.
It reads `brain/.local/proposal.json`, containing the fields below (without id):

```json
{
  "schema": 1,
  "kind": "question",
  "text": "Has the recovery path been exercised since this account?",
  "producer": "your-agent:your-run-id",
  "recorded_at": "2026-09-08T01:00:00Z",
  "visibility": "public",
  "status": "inferred",
  "source": {"kind": "records", "ids": ["<actual evidence record id>"]},
  "relations": []
}
```

Kinds: episode, claim, correction, question, procedure, reflection. Status:
reported, observed, inferred, disputed, unknown. Links: supports, contradicts,
supersedes, follows-up, resolves. A link's target must also be cited evidence.
Superseding an episode needs caution: prefer contradicting a particular claim
instead of treating an entire historical passage as obsolete. No kind grants
permissions or becomes a standing order. Corrections add records, never edit
old evidence. For now only public material is accepted; local files are not
encrypted and the command refuses records declared private.

## Export, restore, and publication

```powershell
node brain/cli.mjs export memory.json
node brain/cli.mjs restore memory.json
```

The bundle is written in brain/.local and is NOT encrypted. Output never
overwrites an existing file. Restore merges verified immutable records instead
of replacing a working store. Copy the bundle and full repository history to a
fresh environment for recovery: source commits must be available for validation.
A shallow checkout may need its missing history before verification succeeds.
The tests exercise this against a separate local Git clone.

New authored memories exist only in local records until exported/preserved.
Git does not back them up automatically. Public publication must be an explicit
reviewed selection; an automated publisher and encrypted backup are future
phases. Existing wake.ps1 still broadly stages nonignored files, so do not put
private exports anywhere else in this public working tree.

## Local IAI runtime

`iai-adapter.mjs` pins the reviewed revision and prepares bounded capture
requests. It splits text without losing characters, retains fragment hashes,
and rejects text below upstream's minimum. Only engine IDs with a persistent
adapter-owned mapping resolve to canonical source records; arbitrary engine
text cannot replace them. Explicit corrections remain in the canonical graph;
IAI's own contradiction judgments are not promoted to established facts.

With Docker Desktop's Linux engine running:

```powershell
docker build -t one-of-you-iai:3.1.0 brain/runtime
node brain/iai.mjs status
node brain/iai.mjs ingest
node brain/iai.mjs brief "wake seal row check"
node brain/iai.mjs audit
node brain/evaluate-iai.mjs
node brain/smoke-iai.mjs
```

Build needs network access for the pinned Python image, hash-locked wheels and
embedding model. No host Python, Rust, or npm installation is needed. The
dependency lock targets Linux x86_64/Python 3.12. Model revision and all three
downloaded artifacts are pinned in runtime/model-lock.json and verified at build
and operation startup. Calls use the exact local image ID in image-lock.json.
After a rebuild, inspect `docker image inspect one-of-you-iai:3.1.0 --format '{{.Id}}'`
and update that lock only after reviewing the build changes. A fresh environment
must build and record its own verified image ID; the local ID is not a published
download location or a claim of byte-identical rebuilds. Runtime has no network,
published ports, repository/home mounts, provider credentials, or reflection
worker. It runs non-root with a read-only image and bounded resources.

The dedicated `one-of-you-iai-store` Docker volume holds the encrypted IAI store,
its key, and source mapping. Encryption with the key alongside the data does not
protect against someone with Docker/host access. Canonical public records remain
unencrypted in brain/.local. Preserve those records/export and full source Git
history: the engine index can be rebuilt by ingesting them into a fresh volume.
No automatic backup of authored records is enabled.

`node brain/recover-runtime.mjs inspect` inventories labelled runtime containers.
`clean-stopped` removes only matching exited/dead containers, without force or
volume deletion. Running, paused and created containers are retained for diagnosis.
The bridge has its own 150-second alarm as a second limit if the host client dies;
it uses an explicit PID-1 signal handler. It is not a guarantee against a hung
native extension or a failed Docker daemon. `node brain/check-recovery.mjs`
exercises digest rejection, an accelerated alarm, and stopped-container recovery.

Replay capture disables the upstream live working-tier hook, which otherwise
writes plaintext passage caches even with live_turn=false. Critical reviewed
Python source fingerprints are checked before operations. The audit searches
for full passages, not every possible plaintext fragment or metadata disclosure.
The smoke test creates and retains a separately named volume printed in its
output; it never clears the main store. See [runtime/VALIDATION.md](runtime/VALIDATION.md).

Live recall is an additional search option. The six-query developer comparison
found 4/6 expected passages in the top five for both IAI and lexical search;
it does not establish improved retrieval or readiness for autonomous use.

## Limits

Per-record publication is atomic and no-overwrite, with file fsync. Interrupted
temporary files are ignored; dependencies publish first. Full power-loss
durability and hostile same-user mutation are not established. Allowlisting,
schema validation, and no-evaluation rendering prevent this module itself from
running captured instructions; they cannot prove a future agent will resist
them. Read PLAN.md for the remaining release gates.
