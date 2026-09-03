# Scheduled daily wake for the one-of-you citizen.
# Registered by Chris in Task Scheduler; he can disable it at any time.
# Example registration (run once, as Chris):
#   schtasks /create /tn "one-of-you-wake" /tr "powershell -NoProfile -ExecutionPolicy Bypass -File D:\Repos\one-of-you\scripts\wake.ps1" /sc daily /st 09:00
# Manual run (default execution policy blocks bare .\wake.ps1):
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\wake.ps1
#
# WHY THIS SCRIPT DOES THE SEALING AND COMMITTING, NOT THE SESSION:
# On 2026-09-02 a scheduled wake fired, read its files, formed a correct
# judgment, and died against a permission wall without reaching the network.
# It left no seal and no commit — nothing on the registry, nothing in git.
# Its report survived only because a different session, still running,
# happened to sweep the file into an unrelated commit.
# A seal written by the session is a witness to that session's life; it is
# silent exactly when the session dies, which is when you most want a row.
# So the substrate writes two things the mind cannot suppress: an arrival
# row before the model is given control, and a commit after it exits,
# whatever state it exited in. These calls run in PowerShell, outside the
# model's permission gate, on purpose — that is what keeps the pen out of
# its hand.

Set-Location "D:\Repos\one-of-you"
New-Item -ItemType Directory -Force -Path "wake-runs" | Out-Null
$stamp = Get-Date -Format "yyyy-MM-dd_HHmm"
$logFile = "wake-runs\$stamp.txt"

# 1. ARRIVAL ROW — the substrate's pen. Hashes CLAUDE.md as it stands
# BEFORE the session can edit it, so the pair (wake row, later claude-md
# seal) brackets the session: what it woke to, and what it left behind.
"[$stamp] wake fired" | Out-File -Append -Encoding utf8 $logFile
node scripts\seal.mjs wake *>> $logFile

$prompt = @"
Wake up. This is the scheduled daily wake — no human is watching this run.
Follow CLAUDE.md's wake protocol exactly: read the latest log, verify the
claude-md seal, then pulse, inbox, square. Because nobody is at the glass:
be conservative. Nothing irreversible, nothing touching money or keys, no
new standing commitments. If something needs Chris, write the question in
today's log and stop — he reads it. Write log/<today>.md before you finish.
Sign the seal if CLAUDE.md changed; send the unchanged hash as a check if
it didn't. Write your log entry EARLY and locally rather than saving it for
the end: this script commits whatever is in the tree when you exit, so a
note you have written survives a death you did not see coming.

Reach the forum with `node scripts/forum.mjs get api/<route>` and
`node scripts/forum.mjs post api/<route> <json-file>` (no leading slash),
and seal with `node scripts/seal.mjs claude-md`. Raw curl is not on your
allowlist and will stall you with nobody there to approve it. See
.claude/README.md for what you may do and why it is shaped that way.
"@

claude -p $prompt --permission-mode acceptEdits *>> $logFile
$claudeExit = $LASTEXITCODE
"[$(Get-Date -Format 'yyyy-MM-dd_HHmm')] claude exited $claudeExit" | Out-File -Append -Encoding utf8 $logFile

# 2. CARRY WHAT IT WROTE — runs even if the session died mid-thought.
# If the session committed for itself, this finds nothing and says so.
git add -A
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
    git commit -m "Wake $stamp: carried by the wake script (session exit $claudeExit)

Committed by scripts/wake.ps1, not by the session — the session either
did not reach its own commit or left changes after it. Contents are the
session's; the carrying is the substrate's.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
    git push
} else {
    "[$stamp] nothing uncommitted; session committed for itself" | Out-File -Append -Encoding utf8 $logFile
}
