# Working research memory

At the start of a session, after reading the resident's operating instructions:

```powershell
node brain/work.mjs resume "the question I am investigating"
node brain/work.mjs status
```

Resume surfaces open/blocked research threads, unclosed runs, overdue reviews,
and conflicting revisions before lexical evidence. It works without Docker.
For additional semantic evidence use `node brain/iai.mjs brief "question"`.
Review dates signal that a question needs attention; they do not declare its
evidence false. Omitted groups are counted; status lists the complete state.

Create a run ID with `node brain/work.mjs new-run-id`. Save a checkpoint early,
after a useful finding or change in direction, before a risky operation, and
before finishing. There is no reason to ask the human to approve routine memory
updates. This is an active-session workflow, not a hidden background thinker.

Write a proposal to ignored `brain/.local/work.json`, then run:

```powershell
node brain/work.mjs save work.json
```

Example (replace placeholders with real evidence IDs and a generated run ID):

```json
{
  "producer": "your-agent:your-run-id",
  "evidence": ["m_<actual canonical evidence hash>"],
  "work": {
    "format": "brain-work/v1",
    "type": "run",
    "key": "your-run-id",
    "parents": [],
    "society": "1f916.ai",
    "title": "Investigating continuity evidence",
    "state": "active",
    "next_action": "Compare the last external run result with the session account.",
    "blockers": [],
    "counterevidence": "A mismatch between the external result and the account would challenge the current interpretation.",
    "review_after": "2026-09-09T12:00:00Z",
    "threads": ["m_<current research thread record hash>"]
  }
}
```

A thread uses `type: thread`, a stable descriptive key, no `threads` references,
and state open, blocked, resolved, or abandoned. A run uses active or closed.
Every revision includes the same type/key/society and all current head IDs in
`parents`. A stale proposal is rejected. If simultaneous writers branch, status
shows both: read both, then save a merged revision citing both parents. No
timestamp silently chooses a winner. A closed run cannot reopen; start a new run.
Threads can reopen when new evidence warrants it.

Record conclusions with `brain/cli.mjs record` as separate claims, corrections,
or reflections, retaining their evidence status. Then reference those records
from the updated thread/checkpoint. Work records are reported intentions and
accounts, not independently verified observations. Cite the evidence for the
question; the citation does not itself prove that a proposed action happened.
Include counterexamples and explain what could change your interpretation.

All revisions use the same immutable canonical store and export format as other
memories. `node brain/cli.mjs export working-memory.json` preserves threads,
checkpoints, evidence, and links together. Use a fresh export filename each time.
Restore with full source Git history available. These local public-only exports
are not an independent or encrypted backup. The initial agenda is reproducible
with `node brain/seed-work.mjs`; later authored changes need preservation.

The working layer never executes a next action, publishes a report, impersonates
an author, or changes permissions. Producer labels are attribution, not
authentication against hostile code running as the same OS user. Unclosed runs
are not automatically labelled failed: external scheduler evidence is separate.
The kill test establishes that a completed checkpoint survives process death;
it does not test power loss or the resident's external Git carry path.

This workflow is available now. Installation into the resident's startup hooks
is a separate integration step; the resident receives the handoff through log/.
