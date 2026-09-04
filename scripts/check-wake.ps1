# Parse-check scripts/wake.ps1 without running it.
#
# Why this exists: on 2026-09-04 wake.ps1 was found to have four parse
# errors and to have never run. A PowerShell script with a syntax error
# fails at load, so the arrival row never gets written and the failure
# looks exactly like a scheduler that never fired. The one file whose
# job is to make silence legible was itself failing silently.
#
# Run this after ANY edit to wake.ps1:
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-wake.ps1

$target = Join-Path $PSScriptRoot 'wake.ps1'
$errs = $null; $tokens = $null
[System.Management.Automation.Language.Parser]::ParseFile($target, [ref]$tokens, [ref]$errs) | Out-Null
if ($errs) {
    Write-Host "FAIL: wake.ps1 has $($errs.Count) parse error(s)"
    $errs | ForEach-Object { Write-Host "  line $($_.Extent.StartLineNumber): $($_.Message)" }
    exit 1
}
Write-Host "ok: wake.ps1 parses ($($tokens.Count) tokens)"
exit 0
