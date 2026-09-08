# Encrypted memory recovery

The backup command creates a portable recovery snapshot, encrypted with a random
256-bit key using AES-256-GCM. Each snapshot gets a fresh 96-bit nonce. Version
magic is authenticated; wrong keys or modified ciphertext fail before parsing
the plaintext. No passwords, recovery keys or source contents appear in diagnostics.

```powershell
node brain/backup.mjs key-init
node brain/backup.mjs create snapshot-001.ooy
node brain/backup.mjs restore-check snapshot-001.ooy restore-001
```

All names resolve beneath ignored brain/.local. Key initialization is once only:
it refuses to overwrite recovery.key. Snapshot creation also refuses overwrite.
The key file contains 32 random binary bytes, not a password. Preserve it using
a secure file-capable key store or separately protected recovery medium. Do not
paste it into chat, source control, shell arguments, or a public handoff.

An independent backup requires copying the encrypted .ooy file away from this
machine/repository and keeping the recovery key separately. The tool does not
select a cloud provider, transmit files, or delete local key material. While key
and snapshot remain together locally, this is a verified recovery artifact, not
protection against disk loss or compromise of this user account. OS permissions
on Windows depend on inherited ACLs; POSIX mode arguments are not an ACL audit.

## What it preserves

- Canonical memory records, corrections, evidence links, threads and checkpoints.
- The original Git commit/tree/blob objects needed to verify cited public log
  passages. Complete cited log blobs are included, not just selected passages.
- Original commit metadata and tree entry names; sibling file contents, unrelated
  history, hooks, remotes, configuration, credentials and live workspace edits
  are not copied. Source selection remains public-log-only.

This is not a backup of the application code, Docker image, model, secrets, or
resident identity. Keep the reviewed implementation in source control separately.
IAI's index can be rebuilt from the recovered canonical records. This format does
not yet capture every kind of future external source.

## Recovery on another environment

1. Obtain a reviewed copy of brain/ and Node 22+ with Git. No Docker is required
   for evidence verification or lexical working memory.
2. Put the encrypted snapshot and a temporary copy of recovery.key in that
   checkout's ignored brain/.local. Keep the independent master key protected.
3. Run restore-check with an unused destination name. The command decrypts and
   validates object hashes and memory structure, creates a new isolated evidence
   repository with no template hooks, then verifies source passages before
   publishing memory records. It refuses any existing destination.
4. The restored records are in <destination>/brain/.local/records. Treat that
   destination as a recovery staging area: it has no checkout or application code.
   A reviewed brain/ copy placed there can run work.mjs resume and lexical recall.
   Avoid copying another checkout's .local over the recovered data.
5. Rebuild and relock IAI if wanted. Import recovered canonical records into its
   fresh engine volume; never replace the canonical store with engine-only text.

The evidence repository is intentionally incomplete: ancestors and unrelated
objects are omitted. It supports git show for the cited passages, not ordinary
full-history operations, checkout or Git maintenance. Automatic GC is disabled;
do not prune these evidence objects. The encrypted snapshot remains the recovery
authority. A failed source check may leave a diagnostic staging directory with
Git objects but no published memory records; choose a fresh name after correcting
the input rather than overwriting it.

The pilot caps plaintext snapshots at 32MB and evidence objects at 10,000 on
restore. There is no compression or extraction of archive-selected paths. Plaintext
exists in process memory and the restored staging directory. Encryption alone
does not make private ingestion safe. Abrupt power-loss durability, independent
cryptographic review and an off-device custody test are not established.

## Current exercised snapshot

memory-recovery-20260907.ooy contains 104 records and 40 evidence objects. It was
restored to brain/.local/restored-20260907 with source verification. The automated
test also renames the original fixture repository out of the way before restoring,
and checks that working threads survive. Local recovery.key was generated without
printing its contents. Separate storage/key custody is still pending Chris's
destination selection; no off-device backup has been claimed or performed.
