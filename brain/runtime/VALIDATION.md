# Local runtime validation, 2026-09-07

Environment: Docker Desktop server 28.3.3, Linux x86_64 container, Python 3.12,
IAI 3.1.0. Build completed using the base digest and 32 wheel hashes in this
directory. Seven critical Python files match the LF-normalized reviewed upstream
revision b586c2a35e413e239756f321aa5398a82501b671. Native wheel is artifact-pinned;
its compilation from reviewed source was not reproduced. Embedding model was
downloaded during build and is available offline, but is not artifact-pinned.

- `node --test brain/test/*.test.mjs`: 16 passed.
- Initial ingestion: 102 added, 102 mapped. Separate-container retry: 0 added.
- Production audit: no missing records or directive flags; key mode 0600.
- First audit found plaintext upstream working-tier caches. ReplayStore disables
  that hook and narrowly removes those rebuildable legacy caches.
- Fresh-volume smoke: one public episode captured; retry added zero; recall
  returned hits; audit found no missing records, directives, full-passage files,
  or legacy caches requiring removal. Each operation started a separate container.
- Smoke volume retained: one-of-you-iai-test-7b92776f-ea70-46a0-bb0f-e674f6a3a49f.

Six developer queries against the same 102 canonical records:

| Case | IAI rank | Lexical rank |
| --- | ---: | ---: |
| Unchanged hash / wake / seal | 3 | 1 |
| Carry-path recovery | 2 | 1 |
| Attended session closes orphan | 4 | 1 |
| Unread review publication | 1 | 2 |
| Paraphrased emergency preservation | absent in 10 | 7 |
| Paraphrased identical fingerprints | 10 | absent in 10 |

Both methods: 4/6 within top five. IAI wall time was about 1 second per query,
including cold container startup. These handpicked cases are development checks,
not independent evidence of improved memory. Evaluation output is in ignored
brain/.local/iai-evaluation.json and can be regenerated.

No autonomous resident hook is installed. No private data was ingested. No
model-level prompt-injection guarantee, power-loss guarantee, independent key
recovery, or comprehensive plaintext-fragment audit is claimed. Canonical records
and exports are the portable authority; IAI is a rebuildable retrieval index.

## Working-memory increment

The expanded suite passes 21 tests. Added separate-clone/fresh-process resume,
branch conflict and stale-write checks, closed-run/reference validation, bounded
quoted rendering and overdue reviews, and process termination after checkpoint
publication. The two new research threads were ingested into IAI: 2 added,
104 mapped. Canonical verification passed for all 104; restoring the complete
working-memory export added zero duplicates. Retrieval benchmark results above
describe the earlier 102-record corpus and were not rerun against a changed set.

## Proposal security increment

Latest suite: 23 passed, including generic errors for malformed proposal JSON
and bounded proposal input/traversal checks. These are local regression checks;
the earlier live-runtime audit and retrieval comparison retain their stated scope.

## Bounded runtime and fault recovery

Full suite passed 26 tests after process/lifecycle changes. The subsequent batch
change passed all four runtime tests (27 tests now defined across the suite).
Live create/start/remove status succeeded. Reingestion used two bounded batches:
0 added, 104 mapped. Unicode-heavy batching tests preserve every fragment within
the count/byte limits.

`node brain/fault-iai.mjs` passed process exits before and after mapping publication,
retry, repeat ingestion, audit and recall. It also passed live timeout/removal of
a stalled container. Latest retained public test volumes:

- one-of-you-iai-fault-4ca60580-8925-4045-bad2-89440adb2aa1
- one-of-you-iai-fault-36d5d25e-79f2-4dda-9e62-60fb4f863ccc

These are mapping-boundary crash tests, not comprehensive native-store/power-loss
tests. Engine mappings and retrievability were checked; absence of all possible
unmapped internal artifacts was not established. No fault was injected into the
main store. Host-agent death bypassing finally still requires reconciliation.

## Model integrity and orphan recovery

28 local tests passed. Rebuilt image with three model artifact hashes verified;
recorded its exact local identity in runtime/image-lock.json. Native model source
already used a fixed revision; earlier notes calling it unpinned were incomplete.

The initial default-SIGALRM test failed because PID 1 did not terminate. After an
explicit handler was installed, check-recovery.mjs passed injected digest mismatch
rejection, accelerated bridge alarm exit 124, and stopped-orphan identification
and no-force removal. The full production 150-second wait was not exercised.
Fresh-store capture/restart/recall/audit also passed on the final pinned image;
test volume: one-of-you-iai-test-3bf5acbb-3f70-49b8-ad50-e125cbef28db.

No claim is made about a hung native extension, daemon loss, byte-identical
rebuilds, or a currently published redistributable image.

## Encrypted evidence recovery

Full suite: 32 passed. New checks cover authenticated encryption tampering and
wrong keys, corrupt/missing evidence, and working-thread restoration without the
original fixture Git directory. Real snapshot memory-recovery-20260907.ooy restored
104 records with 40 Git evidence objects into a new local staging directory.
These are Node/Git recovery checks, not new IAI benchmark or off-device custody
results. The independent copy and separate key location remain pending.
