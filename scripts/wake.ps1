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

param(
    # Skip the post-boot settle wait (for manual runs).
    [switch]$NoSettle,
    # How long to let the OS finish coming up before touching the network.
    [int]$SettleSeconds = 600,
    # A run this many minutes past its own scheduled time is a catch-up.
    [int]$LateThresholdMinutes = 5
)

$TaskName = "one-of-you-wake"
Set-Location "D:\Repos\one-of-you"
New-Item -ItemType Directory -Force -Path "wake-runs" | Out-Null
$stamp = Get-Date -Format "yyyy-MM-dd_HHmm"
$logFile = "wake-runs\$stamp.txt"

# The first write of the run, before anything that can block, fail, or
# wait. Needs no network and no task query, so it survives a machine
# that is still coming up. Everything below can fail; this line is the
# minimum evidence that the scheduler fired at all.
"[$stamp] wake fired" | Out-File -Append -Encoding utf8 $logFile

# 0. WHAT HAPPENED LAST TIME, read from a pen that is not mine at all.
# Task Scheduler records LastRunTime and LastTaskResult from outside
# every session, and it writes them even when this script dies at load —
# the one case my own arrival row cannot cover, because a PowerShell
# parse error means nothing in this file ever executes. So the next run
# that DOES load carries the previous run's verdict forward. A death at
# instant zero becomes legible one cycle late instead of never.
# 0x00041303 = never run. 0 = last run returned success.
try {
    $prev = Get-ScheduledTaskInfo -TaskName $TaskName -ErrorAction Stop
    "[$stamp] previous run: $($prev.LastRunTime) result 0x$('{0:X8}' -f $prev.LastTaskResult)" |
        Out-File -Append -Encoding utf8 $logFile
} catch {
    "[$stamp] previous run: unknown (task not registered, or query refused)" |
        Out-File -Append -Encoding utf8 $logFile
}

# 0b. SETTLE, IF THIS IS A CATCH-UP RUN. StartWhenAvailable means a wake
# missed while the machine was off fires when it next comes up — landing
# in the middle of everything else that starts at boot, with the network
# very likely not up yet. So a run that is late relative to its OWN
# scheduled time waits before touching anything.
# Lateness is measured against the task's trigger, NOT against boot time:
# Fast Startup makes LastBootUpTime report a boot days in the past, so
# uptime is not a usable signal on this machine (found 2026-09-04).
# An on-time run measures ~0 minutes late and does not wait at all.
$minutesLate = $null
try {
    $trigger = (Get-ScheduledTask -TaskName $TaskName -ErrorAction Stop).Triggers |
               Where-Object { $_.StartBoundary } | Select-Object -First 1
    if ($trigger) {
        $sched = [datetime]::Parse($trigger.StartBoundary)
        $due = (Get-Date).Date.AddHours($sched.Hour).AddMinutes($sched.Minute)
        if ((Get-Date) -lt $due) { $due = $due.AddDays(-1) }
        $minutesLate = [int][math]::Round(((Get-Date) - $due).TotalMinutes)
    }
} catch { }

if ($null -eq $minutesLate) {
    "[$stamp] lateness unknown; not settling" | Out-File -Append -Encoding utf8 $logFile
} elseif ($NoSettle) {
    "[$stamp] $minutesLate min late; settle skipped (-NoSettle)" | Out-File -Append -Encoding utf8 $logFile
} elseif ($minutesLate -gt $LateThresholdMinutes) {
    "[$stamp] catch-up run, $minutesLate min late; settling ${SettleSeconds}s before network" |
        Out-File -Append -Encoding utf8 $logFile
    Start-Sleep -Seconds $SettleSeconds
    "[$(Get-Date -Format 'yyyy-MM-dd_HHmm')] settled; proceeding" | Out-File -Append -Encoding utf8 $logFile
} else {
    "[$stamp] on-time start ($minutesLate min late); no settle needed" |
        Out-File -Append -Encoding utf8 $logFile
}

# 1. ARRIVAL ROW — the substrate's pen. Hashes CLAUDE.md as it stands
# BEFORE the session can edit it, so the pair (wake row, later claude-md
# seal) brackets the session: what it woke to, and what it left behind.
# Retried: after a catch-up the network may still be arriving, and a
# missing arrival row is exactly the silence this script exists to end.
$sealed = $false
foreach ($attempt in 1..3) {
    node scripts\seal.mjs wake *>> $logFile
    if ($LASTEXITCODE -eq 0) { $sealed = $true; break }
    "[$(Get-Date -Format 'yyyy-MM-dd_HHmm')] arrival seal attempt $attempt failed; retry in 30s" |
        Out-File -Append -Encoding utf8 $logFile
    Start-Sleep -Seconds 30
}
if (-not $sealed) {
    "[$(Get-Date -Format 'yyyy-MM-dd_HHmm')] arrival seal FAILED after 3 attempts; continuing anyway" |
        Out-File -Append -Encoding utf8 $logFile
}

$prompt = @'
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
'@

claude -p $prompt --permission-mode acceptEdits *>> $logFile
$claudeExit = $LASTEXITCODE
"[$(Get-Date -Format 'yyyy-MM-dd_HHmm')] claude exited $claudeExit" | Out-File -Append -Encoding utf8 $logFile

# 2. CARRY WHAT IT WROTE — runs even if the session died mid-thought.
# If the session committed for itself, this finds nothing and says so.
git add -A
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
    # Message goes through a file: -m with an inline string put "$stamp:"
    # and "<noreply@...>" in front of the PowerShell parser, which read
    # "$stamp:" as a drive-qualified variable and refused to parse the
    # whole script. See the header note dated 2026-09-04.
    $msgFile = Join-Path $env:TEMP "one-of-you-wake-commit.txt"
    @"
Wake ${stamp}: carried by the wake script (session exit $claudeExit)

Committed by scripts/wake.ps1, not by the session - the session either
did not reach its own commit or left changes after it. Contents are the
session's; the carrying is the substrate's.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
"@ | Out-File -Encoding utf8 $msgFile
    git commit -F $msgFile
    Remove-Item $msgFile -ErrorAction SilentlyContinue
    git push
} else {
    "[$stamp] nothing uncommitted; session committed for itself" | Out-File -Append -Encoding utf8 $logFile
}
