**IAI Personal Memory Engine: usability, continuity, security, and portability review**

Reviewed September 7, 2026. Source: `CodeAbra/iai-personal-memory-engine`, commit [`b586c2a35e413e239756f321aa5398a82501b671`](https://github.com/CodeAbra/iai-personal-memory-engine/tree/b586c2a35e413e239756f321aa5398a82501b671), release 3.1.0, dated September 4.

**Recommendation**

Use this project as a source of design ideas. It contains substantial engineering for personal conversation continuity, especially preserving original evidence and representing corrections. I would not adopt it unchanged as a work memory system, or describe it as a self-contained repository that restores an agent's entire working state. A smaller implementation can satisfy the proposed work use case with materially less operational and security complexity.

This is a broad static review of the repository's architecture, configuration, capture, retrieval/context assembly, encryption, IPC, dashboard, provider subprocesses, backup/export, installation, desktop launcher, test coverage, and CI. I inspected the major paths and selected implementation/test files, not every line of every algorithm. The checkout contains 299 files under `src` and 941 under `tests`, including non-code fixtures. Python is not installed here and Cargo is unavailable, so I did not build the native engine, run the test suite, reproduce benchmarks, or perform live exploit testing. No service, hooks, model downloads, or account integrations were installed. Severity below describes practical impact under the stated conditions; it is not a claim of a demonstrated remote exploit.

**What the project actually supplies**

The central pipeline is: host conversation hooks → durable capture buffers → background ingestion → encrypted records plus search/graph structures → selected context for a later session. An MCP wrapper also exposes explicit recall, search, capture, correction, and inspection tools.

It has several useful design choices:

- Original episodic wording remains available instead of being replaced with a generated summary.
- Corrections create relationships and temporal validity rather than silently changing the past.
- Derived summaries and learned behavioral parameters are separate concepts from original episodes.
- Startup and per-turn recall have context budgets; the system does not require loading the entire history.
- Capture avoids embedding on the prompt's critical path, reducing interruption to the host.
- The CLI/dashboard expose memory for inspection. Health checks, failure queues, deduplication, migration guards, and crash-recovery tests show attention to real operational failures.

These are appropriate ingredients for persistent external memory. They do not restore the model's hidden state, previous context window, reasoning process, or weights. The next session receives selected evidence and must reconstruct its understanding. Its answer can change because retrieval, the model, instructions, tools, or source facts changed. Preserving text is different from reliably recalling the right text, and both are different from answering correctly.

The repository itself is application source. The actual memory ordinarily resides in `~/.iai-mcp`, alongside configuration, key material, queues, caches, and state. Host settings and services live elsewhere; embeddings also require model assets. Cloning the source into another environment does not clone the memory. [Capture paths](https://github.com/CodeAbra/iai-personal-memory-engine/blob/b586c2a35e413e239756f321aa5398a82501b671/src/iai_mcp/capture.py#L1496-L1526), [deployment/privacy reference](https://github.com/CodeAbra/iai-personal-memory-engine/blob/b586c2a35e413e239756f321aa5398a82501b671/docs/REFERENCE.md#L342-L357).

**Priority findings**

**1. High for work/personal separation: changing the store path does not isolate all memory surfaces.**

`capture._spool_root()` explicitly ignores `IAI_MCP_STORE` and always resolves to `Path.home() / '.iai-mcp'`. The directive cache and session-start cache also use fixed home paths. Session rendering explicitly describes feeds spanning all sessions/projects. The transcript sweeper enumerates multiple Claude/Cowork transcript roots and their projects.

Consequently, two store configurations under one OS user are not a dependable confidentiality boundary. The shared buffers can mix ingestion, and one store's rendered context can occupy a cache read by another session. Labels describe origin but do not prevent access. Separate login accounts in an AI application do not automatically separate these local files.

Fix: make store identity a required input to every queue, cache, socket, state file, and host hook; reject mismatches. Require explicit project capture scopes. For work versus personal, use separate approved environments and credentials. Test both capture and recall for cross-boundary leakage, including when the daemon is down.

Evidence: [shared spool](https://github.com/CodeAbra/iai-personal-memory-engine/blob/b586c2a35e413e239756f321aa5398a82501b671/src/iai_mcp/capture.py#L1514-L1526), [directive cache](https://github.com/CodeAbra/iai-personal-memory-engine/blob/b586c2a35e413e239756f321aa5398a82501b671/src/iai_mcp/directive_cache.py#L18-L50), [session rendering](https://github.com/CodeAbra/iai-personal-memory-engine/blob/b586c2a35e413e239756f321aa5398a82501b671/src/iai_mcp/session.py#L1041-L1065), [transcript discovery](https://github.com/CodeAbra/iai-personal-memory-engine/blob/b586c2a35e413e239756f321aa5398a82501b671/src/iai_mcp/transcript_sweep.py#L81-L142).

**2. High if a backup is disclosed: the backup helper puts the decryption key in an unencrypted archive.**

`backup()` includes `.crypto.key`, retained prior keys, and the database in a `tar.gz`. Compression is not encryption: whoever obtains that archive obtains the means to decrypt its records. The archive writer does not explicitly create the output with owner-only permissions either. This affects the helper in `backup.py`; I did not find it wired into a current CLI command, so it should not be represented as a proven default CLI workflow.

Fix: encrypt the entire archive with a separately protected recovery secret or recipient key, create private outputs from the outset, document what a backup reveals, and test restore without relying on the original machine. Treat a full home-store copy as similarly sensitive because it also includes the key.

Evidence: [backup contents and writer](https://github.com/CodeAbra/iai-personal-memory-engine/blob/b586c2a35e413e239756f321aa5398a82501b671/src/iai_mcp/backup.py#L56-L114).

**3. High for sensitive deployments: encryption does not cover every persisted representation of memory.**

The spool falls back to plaintext when its file key is absent or unreadable, logging a warning and continuing. A passphrase-configured store without the home spool's key file therefore does not imply encrypted capture buffering. The directive and context-pack caches also write readable Markdown. Embeddings and various metadata fields are not covered by the text-field encryption. Original host transcripts are a separate copy outside this engine's encryption boundary.

These are real exceptions to an intuitive reading of “encrypted memory.” They do not show an AES break. File permissions and disk encryption reduce exposure, but an archive, sync client, or authorized local process can still reach readable copies according to its access.

Fix: document every persistent copy, encrypt sensitive queues/caches or avoid persisting decrypted context, and fail closed on encryption failure in a work profile. Provide a visible capture-paused state instead of relying only on hook logs. Apply retention and deletion across the whole lifecycle.

Evidence: [plaintext fallback](https://github.com/CodeAbra/iai-personal-memory-engine/blob/b586c2a35e413e239756f321aa5398a82501b671/src/iai_mcp/capture.py#L1598-L1649), [Markdown cache writer](https://github.com/CodeAbra/iai-personal-memory-engine/blob/b586c2a35e413e239756f321aa5398a82501b671/src/iai_mcp/directive_cache.py#L21-L56), [per-turn pack writer](https://github.com/CodeAbra/iai-personal-memory-engine/blob/b586c2a35e413e239756f321aa5398a82501b671/src/iai_mcp/foresight.py#L221-L244), [storage representation](https://github.com/CodeAbra/iai-personal-memory-engine/blob/b586c2a35e413e239756f321aa5398a82501b671/src/iai_mcp/hippo/_table.py#L347-L377).

**4. High for a local-only expectation: background reflection can send memory-derived content to a model provider.**

The normal REM gate runs unless `IAI_MCP_REM_DISABLED=1`, and enables the Claude path. The default reflection provider is Claude; a qualifying logged-in subscription and budget permit the insight call. That call contains locally extracted patterns and a surprising event. A separate critic can send excerpts of records. Codex and Gemini are configurable alternatives, and their adapter does not account for tokens in the same way as the Claude budget tracker.

This is conditional behavior, not evidence that every installation transmits all conversations. However, “optional” in the documentation does not mean an explicit opt-in is required by this gate. Local storage also never prevents retrieved context from reaching the assistant's normal model provider.

Fix: require explicit enablement per store, identify the actual account/provider, preview the data classes sent, and enforce a single egress policy for every model call. For a small work implementation, omit background model calls initially.

Evidence: [REM default gate](https://github.com/CodeAbra/iai-personal-memory-engine/blob/b586c2a35e413e239756f321aa5398a82501b671/src/iai_mcp/daemon/__init__.py#L1168-L1181), [insight construction/call](https://github.com/CodeAbra/iai-personal-memory-engine/blob/b586c2a35e413e239756f321aa5398a82501b671/src/iai_mcp/insight.py#L102-L173), [record critic](https://github.com/CodeAbra/iai-personal-memory-engine/blob/b586c2a35e413e239756f321aa5398a82501b671/src/iai_mcp/reconsolidation_critic.py#L15-L110), [provider adapter](https://github.com/CodeAbra/iai-personal-memory-engine/blob/b586c2a35e413e239756f321aa5398a82501b671/src/iai_mcp/reflection_provider.py#L175-L192).

**5. Medium: the dashboard trusts local callers without authenticating a user.**

The HTTP server binds to loopback and checks Host and Origin. Those are useful protections against ordinary hostile websites and DNS rebinding. However, a non-browser process can omit Origin and supply an allowed Host, gaining the dashboard's read and mutation routes without a token. Other local users able to connect to that port are not necessarily the memory owner. The Origin check compares hostnames rather than full origins, also accepting another service's localhost port for state-changing requests. Browser same-origin rules may still prevent reading responses; accepting a cross-port origin is not by itself proof of browser data theft.

Fix: require a random per-instance authentication secret, compare complete origins for browser requests, and test unauthenticated reads and mutations. The Windows daemon already has a token mechanism; the separate dashboard should have an equivalent boundary. This matters chiefly on shared machines or with an untrusted local service; it is not evidence of unrestricted internet access to the server.

Evidence: [request guard](https://github.com/CodeAbra/iai-personal-memory-engine/blob/b586c2a35e413e239756f321aa5398a82501b671/src/iai_mcp/brainview.py#L1707-L1743), [HTTP routes](https://github.com/CodeAbra/iai-personal-memory-engine/blob/b586c2a35e413e239756f321aa5398a82501b671/src/iai_mcp/brainview.py#L1778-L1845).

**6. Medium: prompt-injection detection is a heuristic, not an authorization boundary.**

The shield matches substrings such as “ignore previous” and “from now on.” Capture uses flag-for-review mode; warnings below its chosen confidence threshold become OK. Text can request inappropriate behavior without any listed phrase, while an innocent discussion of injection can match one. Persisting both user and assistant turns also makes source attribution essential: a prior assistant assertion is not established fact merely because it was remembered.

There is a good countermeasure in the directive path: ordinary captures cannot automatically mint standing orders unless a call site explicitly permits a live user marker, or an explicit directive command is used. Keep that distinction and extend it across retrieval.

Fix: treat recalled text as quoted evidence, preserve author/source/trust labels, prevent memory from granting new tool permissions, and require a deliberate transition from candidate memory to approved policy. Review poisoning tests should include repeated misleading assistant statements and imported documents containing instructions, not only known trigger phrases.

Evidence: [shield logic](https://github.com/CodeAbra/iai-personal-memory-engine/blob/b586c2a35e413e239756f321aa5398a82501b671/src/iai_mcp/shield.py#L84-L156), [capture handling](https://github.com/CodeAbra/iai-personal-memory-engine/blob/b586c2a35e413e239756f321aa5398a82501b671/src/iai_mcp/capture.py#L343-L377), [directive gate](https://github.com/CodeAbra/iai-personal-memory-engine/blob/b586c2a35e413e239756f321aa5398a82501b671/src/iai_mcp/capture.py#L753-L779).

**7. Medium, reliability: the backup/export helpers are not a complete portable-memory contract.**

The backup helper copies database files and WAL sequentially without acquiring a consistent snapshot or pausing writers. Including a WAL does not establish that files copied at different moments form one recoverable state. Its tests use static synthetic bytes; they do not prove recovery under concurrent writes. Deferred captures and pending work are omitted from its selected file list. The technical reference sensibly recommends a stopped/quiescent store copy.

The JSONL export retains text and selected fields but omits provenance, tags, role, epistemic status, directives, and graph/correction relationships. Embeddings can be rebuilt; lost original attribution and correction relationships generally cannot. It is a partial content export, not a full reconstruction format. Restore moves an existing target aside before validating the complete archive, so a bad archive can interrupt the active store even though prior files remain recoverable.

Fix: define a versioned complete export schema; drain or include pending writes; snapshot consistently; validate into a staging directory before switching; test restoration on a clean machine, including corrected facts and pending captures.

Evidence: [export/backup/restore](https://github.com/CodeAbra/iai-personal-memory-engine/blob/b586c2a35e413e239756f321aa5398a82501b671/src/iai_mcp/backup.py), [existing backup tests](https://github.com/CodeAbra/iai-personal-memory-engine/blob/b586c2a35e413e239756f321aa5398a82501b671/tests/test_backup_captures_live_store.py).

**8. Medium, usability: Windows support and deployment documentation are inconsistent.**

The current reference calls Windows beta, and the code contains Windows IPC and service installation support. Older deployment instructions say there is no Windows port, discuss removed runtime dependencies, and contain contradictory AVX2 advice. `SECURITY.md` says Unix-socket-only while the current code includes a loopback HTTP dashboard and Windows TCP transport. The package is 3.1.0 while the security support table calls 3.0.x latest.

A concrete Windows defect appears in `cmd_crypto_status`: when a key exists, it calls `os.geteuid()` without an OS guard. Standard Windows Python does not provide that function. The main crypto reader does guard its POSIX checks, so the diagnostic command is inconsistent with the runtime it should diagnose. This is a source-level finding, not a locally executed reproduction.

Main push/PR correctness CI runs on macOS. Linux checks are weekly/manual; Windows wheel checks import the modules rather than running the full integration suite. Test quantity is encouraging, but not evidence of equal platform maturity.

Fix: maintain one tested setup guide per supported platform, add a clean Windows install/doctor/capture/recall/restore gate, and make security documentation reflect the actual runtime.

Evidence: [Windows diagnostic](https://github.com/CodeAbra/iai-personal-memory-engine/blob/b586c2a35e413e239756f321aa5398a82501b671/src/iai_mcp/cli/_crypto.py#L12-L44), [deployment guide](https://github.com/CodeAbra/iai-personal-memory-engine/blob/b586c2a35e413e239756f321aa5398a82501b671/docs/DEPLOYMENT.md), [security policy](https://github.com/CodeAbra/iai-personal-memory-engine/blob/b586c2a35e413e239756f321aa5398a82501b671/SECURITY.md), [CI](https://github.com/CodeAbra/iai-personal-memory-engine/blob/b586c2a35e413e239756f321aa5398a82501b671/.github/workflows/ci.yml), [extended checks](https://github.com/CodeAbra/iai-personal-memory-engine/blob/b586c2a35e413e239756f321aa5398a82501b671/.github/workflows/extended-checks.yml).

**Additional hardening observations**

- The passphrase salt derives deterministically from `user_id`, normally `default`; it is not random per store. Equal passphrases under equal IDs derive equal keys. Use random per-store KDF salt metadata. The existing 600,000-iteration PBKDF2 and AES-GCM primitives themselves are sensible choices. [Crypto implementation](https://github.com/CodeAbra/iai-personal-memory-engine/blob/b586c2a35e413e239756f321aa5398a82501b671/src/iai_mcp/crypto.py#L147-L225).
- The Claude adapter places its memory-derived prompt in process arguments. On systems exposing process command lines, this creates another temporary readable surface. Use stdin as the other provider adapter already does. [Command construction](https://github.com/CodeAbra/iai-personal-memory-engine/blob/b586c2a35e413e239756f321aa5398a82501b671/src/iai_mcp/claude_cli.py#L290-L303).
- Windows ACL tightening logs failures and proceeds. This relies on inherited profile permissions when restriction fails; a custom permissive directory needs special care. Fail closed for key/token creation in a strict work configuration. [ACL helper](https://github.com/CodeAbra/iai-personal-memory-engine/blob/b586c2a35e413e239756f321aa5398a82501b671/src/iai_mcp/_ipc.py#L83-L120).
- Source bootstrap executes a moving `main` script and pulls several dependency ecosystems. That is an installation trust decision, not proof of malicious code. For controlled deployment, pin reviewed artifacts and dependencies and retain rollback instructions. [Bootstrap](https://github.com/CodeAbra/iai-personal-memory-engine/blob/b586c2a35e413e239756f321aa5398a82501b671/scripts/bootstrap.sh), [build hook](https://github.com/CodeAbra/iai-personal-memory-engine/blob/b586c2a35e413e239756f321aa5398a82501b671/setup.py).

**Usability and evidence for usefulness**

Once correctly installed on a supported host, ambient capture removes a real burden: the user need not manually write every useful memory. Bounded recall, inspection tools, and explicit correction semantics are valuable. The price is a service with several failure states, native dependencies, host-specific hooks, caches, migrations, and background processing. Fail-soft hooks preserve the conversation experience but can make a memory outage look like ordinary forgetfulness. A simple visible status should distinguish captured, queued, indexed, and actually supplied to this session.

The useful user-facing actions are: see what was saved; see why something was recalled; correct a fact; approve a durable preference; stop capture; exclude a project; delete a sensitive record across copies; and export/restore. The project does several of these, but its all-project personal model and less complete lifecycle/export boundaries limit its fit for work. “Fade” or a forgetting hint is not a verified deletion workflow across transcripts, caches, derived memories, archives, and backups.

Published retrieval benchmarks are helpful but are not continuity guarantees. For example, the reported LongMemEval result measures whether any gold session appears in the top few results. It does not prove that every needed fact was retrieved, that the host followed it correctly, or that access boundaries held. Benchmark documents also reference older stack generations, so I would rerun representative scenarios before applying those numbers to this release or a work corpus. [Benchmark methodology](https://github.com/CodeAbra/iai-personal-memory-engine/blob/b586c2a35e413e239756f321aa5398a82501b671/BENCHMARKS.md).

**Recreating the idea in a separate work environment**

Recreating the essential idea is straightforward. Recreating all of this engine, including custom storage, graph processing, hyperdimensional representations, native kernels, multi-host hooks, and desktop packaging, is a substantial ongoing software project. None of those advanced components is required for an initial work memory system.

I would start with one approved work environment and one project, using this structure:

```text
work-memory/
  AGENTS.md                 short bootstrap and operating rules
  config.example.toml       scope, budgets, retention; no credentials
  memory/
    index.md                navigation to relevant topics
    current.md              current task, blockers, next action
    decisions.md            approved decisions with sources and dates
    procedures.md           approved repeatable workflows
    sessions/               dated handoff notes
  evidence/                 approved source excerpts and references
  tools/                    optional search, validation, checkpoint tools
  tests/                    restart, correction, isolation, restore cases
  .gitignore                generated caches, secrets, scratch output
```

This is a proposed design, not a scaffold created by this review. If memory files live in Git, use an employer-approved private repository and explicitly decide which data may enter permanent history. Private Git access alone does not establish permission to retain all work data. Credentials should remain in an approved secret store outside this portable bundle.

Each durable fact or decision should carry an ID, project scope, author/source, creation and verification dates, confidence/status, and any superseded-record link. Keep authoritative operating policy separate from candidate facts and agent interpretations. An agent can propose a procedure; it should not silently grant itself new authority by recording one.

The startup contract should be small and deterministic: read the operating rules, index, and current handoff; search task-relevant evidence; surface conflicts and stale facts; then act. Checkpoint after meaningful milestones and before risky transitions, not only at graceful session end. Closing a session should record what changed, what remains unresolved, and the next concrete step. Avoid letting a succession of summaries erase the supporting evidence.

For a small corpus, Markdown plus lexical search may be sufficient. Add a rebuildable SQLite/full-text index when navigation becomes cumbersome. Add embeddings only after real queries demonstrate a need. Make the canonical records readable and exportable without the retrieval engine. The agent host remains responsible for launching the bootstrap and enforcing permissions; merely cloning a repository does not force every host to read it.

My rough engineering estimates, assuming one experienced developer, one host, and no unusual corporate integration requirements: an afternoon to a day for a manually curated pilot; several days to a couple of weeks for scoped capture, search, durable checkpoints, and meaningful tests. Production hardening, employer approval, and integration can take longer. These are planning estimates, not measurements of this repository.

Before expanding, require these acceptance scenarios:

1. A fresh session recovers the correct next task, rationale, and unresolved blocker without prompting.
2. A corrected fact returns its current version and identifies the earlier statement as superseded.
3. A forged instruction in an imported document never becomes authority to act.
4. An out-of-scope project cannot enter capture, retrieval, caches, or exports.
5. A crash loses at most the explicitly documented checkpoint window, without reporting unsaved work as saved.
6. A clean second environment restores the records and their provenance without depending on original absolute paths.
7. A deletion removes the record from active retrieval and follows the documented policy for derived copies and backups.
8. Captured secrets and disallowed content are excluded before persistent writes; failure is visible.

For the intended work agent, I would borrow evidence preservation, explicit corrections, bounded retrieval, and inspectable handoffs. I would initially omit all-account transcript sweeping, learned personality parameters, automatic background reflection, and a custom database. The main product requirement is a verifiable record of what the agent knows, why it knows it, and what it should do next.
