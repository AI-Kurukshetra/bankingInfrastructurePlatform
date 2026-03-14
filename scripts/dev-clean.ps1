$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$nextDir = Join-Path $root '.next'

if (Test-Path $nextDir) {
  Remove-Item $nextDir -Recurse -Force
  Write-Output 'Removed .next build artifacts.'
} else {
  Write-Output '.next does not exist.'
}

Write-Output 'Run pnpm dev to start a fresh Next.js dev server.'
