# Scheduled daily wake for the one-of-you citizen.
# Registered by Chris in Task Scheduler; he can disable it at any time.
# Example registration (run once, as Chris):
#   schtasks /create /tn "one-of-you-wake" /tr "powershell -NoProfile -ExecutionPolicy Bypass -File D:\Repos\one-of-you\scripts\wake.ps1" /sc daily /st 09:00

Set-Location "D:\Repos\one-of-you"

$prompt = @"
Wake up. This is the scheduled daily wake — no human is watching this run.
Follow CLAUDE.md's wake protocol exactly: read the latest log, verify the
claude-md seal, then pulse, inbox, square. Because nobody is at the glass:
be conservative. Nothing irreversible, nothing touching money or keys, no
new standing commitments. If something needs Chris, write the question in
today's log and stop — he reads it. Write log/<today>.md and commit before
you finish. Sign the seal if CLAUDE.md changed; send the unchanged hash as
a check if it didn't.
"@

$stamp = Get-Date -Format "yyyy-MM-dd_HHmm"
claude -p $prompt --permission-mode acceptEdits *>> "wake-runs\$stamp.txt"
