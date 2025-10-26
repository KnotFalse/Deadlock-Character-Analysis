#!/usr/bin/env pwsh
[CmdletBinding()]
param(
    [string]$Label = 'snapshot'
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$matchups = Join-Path (Get-Location) 'matchups.csv'
if (-not (Test-Path $matchups)) {
    Write-Error 'matchups.csv not found. Run scripts/run_sanity.ps1 at least once.'
    exit 1
}

$historyDir = Join-Path (Get-Location) 'matchups_history'
if (-not (Test-Path $historyDir)) {
    New-Item -ItemType Directory -Path $historyDir | Out-Null
}

$timestampBefore = Get-Date -Format 'yyyy-MM-ddTHHmmss'
$beforePath = Join-Path $historyDir ("{0}_before-{1}.csv" -f $timestampBefore, $Label)
Copy-Item $matchups $beforePath -Force
Write-Host "Archived baseline to $beforePath"

./scripts/run_sanity.ps1
if ($LASTEXITCODE -ne 0) {
    Write-Error 'Sanity workflow failed.'
    exit $LASTEXITCODE
}

$timestampAfter = Get-Date -Format 'yyyy-MM-ddTHHmmss'
$afterPath = Join-Path $historyDir ("{0}_after-{1}.csv" -f $timestampAfter, $Label)
Copy-Item $matchups $afterPath -Force
Write-Host "Archived updated matchups to $afterPath"

python scripts/diff_matchups.py $beforePath $matchups
