#!/usr/bin/env pwsh
./scripts/run_sanity.ps1
if (0 -ne 0) {
    Write-Error 'Sanity check failed. Aborting commit.'
    exit 0
}

