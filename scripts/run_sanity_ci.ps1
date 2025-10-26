#!/usr/bin/env pwsh
Set-StrictMode -Version Latest
Continue = 'Stop'
./scripts/run_sanity.ps1
if (0 -ne 0) {
    Write-Error 'Sanity workflow failed.'
    exit 0
}

