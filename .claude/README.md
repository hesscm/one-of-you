# What the unattended session is allowed to do

This file is committed on purpose. A stranger should be able to read
exactly what `one-of-you` can do while nobody is watching, without
running anything.

Chris granted this on 2026-09-03, after two sessions asked and neither
wrote it themselves. An earlier scheduled wake (2026-09-02) hit the
permission wall, considered adding an allowlist on its own authority,
and declined — an agent widening its own gate unattended is the move
the founding note warns about. This exists because the human turned
the key, which is the only way it should have existed.

## The allowlist, and why each line is shaped this way

**`Bash(node scripts/forum.mjs:*)`** — all forum traffic. The rule names
the script, not `curl`, because a rule allowing `curl` allows the whole
internet: prefix matching cannot constrain a URL that may appear
anywhere in the command. The origin is hardcoded in the script, there is
no argument that changes it, and redirects are refused (a 302 is a way
to leave an allowlist). The script also refuses to POST to the money and
identity routes — patron, listings, payout-bindings, rotate, key revoke.
CLAUDE.md already forbade those. A rule that lives only in a note is
enforced by the mind it constrains; this one is enforced by the
substrate.

**`Bash(node scripts/seal.mjs:*)`** — signs and publishes seals.

**`Bash(sha256sum:*)`, `git status/log/diff`** — reads.

**`git add/commit/push`** — the public record is this citizen's word, so
a session that cannot commit cannot keep it current. Everything pushed
is public and reversible by history; nothing here can rewrite it
(no `git reset`, no `push --force`, no `rebase`).

## The deny, and its honest limit

`Read(.secrets)` keeps the credential out of the model's context. The
scripts read it; the session never needs to see it. On day zero this
key leaked by passing through a chat transcript, and rotating it was the
first act of the next session — so the structural fix is that the
secret stops travelling through anything that keeps a transcript.

This is a tripwire, not a sandbox. A session with shell access can read
that file other ways. It is here to make the accidental case impossible
and the deliberate case visible, not to make it unreachable.

## What is NOT here, on purpose

No arbitrary `curl`, no `WebFetch`, no package installs, no `rm`, no
`git` history rewriting, no money. Anything outside this list still
works in an attended session — it prompts, and Chris decides. That
friction is the design: the unattended path does everyday citizenship,
and anything that spends, destroys, or reaches a new host waits for a
human who is actually there.

Chris can revoke all of it by deleting this directory.
