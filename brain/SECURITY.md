# Security record

Owner: Codex implementation agent. Updated 2026-09-07 (local date).
This is a bounded implementation review, not a complete dependency/CVE audit.
For each subsequent phase, record new exposure, mitigation, verification, and
unresolved risk here before describing the phase as ready.

## Current boundary

The pilot accepts public material only. A visibility field cannot detect secrets
mistakenly included in text; Git history is not a privacy classifier. Do not feed
private work data into this personal corpus. Imported paths are restricted to
committed dated logs. Authored proposals are explicit, local, validated inputs.

IAI runs on demand, non-root, offline, with a read-only image, dedicated volume,
temporary storage and resource limits. No host home/repository/credential mounts
or exposed ports. Docker and the host OS remain trusted. Memory text and proposed
next actions are quoted data; this module never executes them. The receiving
model still needs to resist prompt injection.

## Findings and disposition

| Finding | Mitigation and verification | Residual risk |
| --- | --- | --- |
| Upstream capture wrote plaintext working-tier passages despite live_turn=false | Fixed replay hook; fresh-volume smoke and 104-record audit found no full-passage caches or cleanup needed | Audit does not detect every fragment, metadata field, embedding, or deleted disk block |
| Malformed checkpoint JSON could appear in parser errors | Fixed shared proposal reader returns a generic error; regression test includes a secret-shaped sentinel | Other subprocess/upstream diagnostics have not received comprehensive redaction testing |
| Proposal files read without a size bound | Fixed regular-file check and bounded 128KB read before parsing; oversize regression test | Restore bundles, accumulated records and Docker stdout still need resource/timeout limits before broader ingestion |
| Filesystem redirection | Storage/input checks reject symlinks, junctions and traversal; regression tests cover these | Check/use races and malicious same-OS-user replacement remain outside the boundary |
| Concurrent checkpoint loss | Immutable revisions, stale-write rejection and visible racing branches; merge tests | Producer labels and hashes do not authenticate writers; hostile local code can forge records |
| Recalled text mistaken for authority | Quoted evidence, canonical source mapping, explicit evidence status; hostile-text rendering tests | No model-level injection guarantee; repetition is not independent corroboration |
| Accidental public publication | brain/.local ignored; explicit-path development staging policy | Existing resident wake.ps1 stages broadly; misplaced private files could be published. No private capture or auto-publication added |
| Key beside encrypted data | Documented; key mode 0600 in container; missing key on nonempty store fails closed | Docker/host access exposes both. Canonical records/exports are plaintext; no independent encrypted backup |
| Build/dependency substitution | Base digest, 32 artifact-hashed wheels, seven critical Python source fingerprints; model file hashes checked at build/startup and calls use an exact image ID | Local image locks require deliberate updates after rebuilds; native build not independently reproduced; no current CVE scan performed |

## Gates for later integration

### Encrypted recovery increment

backup.mjs now encrypts a bounded canonical/evidence snapshot with AES-256-GCM,
a random 32-byte recovery key and fresh 12-byte nonces. Magic/version is AAD.
Authentication precedes JSON parsing. Restore checks memory and object hashes,
uses a new directory without template hooks, and validates cited passages before
publishing records. It never extracts arbitrary archive paths or imports remotes.
Wrong-key, tampering, missing/corrupt evidence and separate-directory tests pass.
Real recovery reproduced all 104 records using 40 supporting Git objects.

Residual risks: key and snapshot currently remain on this machine; independent
custody awaits destination selection. Restored records are plaintext. Commit
metadata and tree sibling names accompany the public source documents. This is
an intentionally incomplete evidence repository, not a full source-code backup.
No power-loss durability or independent cryptographic audit is claimed. Same-user
access can read local key material; POSIX mode settings do not verify Windows
ACLs. The encrypted snapshot alone does not authorize private capture.

### Artifact and orphan recovery increment

Corrected an earlier assessment: the native embedder already pinned revision
5c38ec7c405ec4b44b94cc5a9bb96e735b38267a. We now additionally verify the actual
model.safetensors, tokenizer.json and config.json bytes against SHA-256 hashes.
Live mismatch injection fails closed. Exact image-ID calls prevent a changed tag
from silently selecting another build; image IDs are local, not a published image.

Added owner labels and inspect/clean-stopped reconciliation. Removal requires a
matching invocation name, label and exited/dead status, and uses no force or volume
removal. Active, paused and created containers are retained. A live fixture was
identified and removed; unit tests cover exclusion of active/foreign containers.
Labels are scoping metadata, not authentication against someone with Docker access.

The first independent alarm test failed: default SIGALRM was ineffective for
container PID 1. Fixed with an explicit handler exiting 124; the accelerated live
test now passes. The bridge sets a 150-second alarm before reading input. Native
code that prevents Python from handling signals, daemon failure, and orphaned
created containers still require diagnosis; do not claim comprehensive host-crash
recovery. There is no host startup reconciliation hook yet.

### Runtime hardening increment

Implemented a 2MB request ceiling, ingestion batches capped at 100 fragments and
1.5MB, a 4MB combined child-output ceiling, and a two-minute attached execution
deadline. Create and remove operations have separate 30/15-second deadlines.
Subprocess failures withhold child diagnostics. Each invocation creates a unique
named container and removes that exact container in finally; cleanup failure is
reported explicitly. Production batch retry mapped 104 records with zero added.

Live fault tests terminate Python immediately before and after mapping publication
in separate public-fixture volumes. Both recover mappings and recall on retry;
a later ingestion adds zero. A deliberately stalled container timed out and its
removal succeeded. Unit tests cover output flooding, deadlines and diagnostic
withholding. This addresses the earlier Docker output/time gate for handled
failures, not abrupt host-process death or an unavailable Docker daemon.

Still open: automatic host-death reconciliation, daemon-loss/late-create races,
mid-native-write and power-loss recovery, aggregate restore/store growth bounds,
dependency review and portable image distribution. Full mapping responses can
eventually exceed the output cap; pagination is needed before large-corpus use.
The output ceiling fails closed rather than silently truncating such responses.

- Before unattended hooks: reconcile containers after host death, broaden fault
  injection beyond mapping boundaries, and preserve independent scheduler
  evidence and run-owned publication boundaries.
- Before private capture: privacy-aware source selection, independent encrypted
  backup/key recovery, diagnostic redaction and broader leak testing.
- Before broader sources: attributed snapshots and source isolation. External
  text must remain evidence, never permission or executable workflow.
- Before a release claim: pin model artifacts, review dependency vulnerabilities,
  verify separate-environment restore, and document residual host trust.

Run `node --test brain/test/*.test.mjs`. Live checks and limitations are in
runtime/VALIDATION.md. Process-kill tests cover completed checkpoint publication,
not power loss or the resident's external Git recovery path.

## 2026-09-09 session convenience commands

session.mjs retains canonical graph/source verification, public-only storage,
explicit producer labels and immutable parent checks. No resident hooks, external
publications, permissions or scheduler marks are changed. Recall failure withholds
child diagnostics and preserves lexical evidence; health separately probes Docker.
Sync commits canonical imports before optional index ingestion; a failure can leave
the index behind and must be retried. Concurrent stale/conflicted updates are
refused by the shortcut rather than implicitly merged. Producer strings remain
attribution, not authentication. Shortcut counterevidence is explicitly unreviewed;
rich evidence updates still require the full proposal workflow. Three new tests
exercise stale/closed/conflicting heads and Docker-failure fallback.
