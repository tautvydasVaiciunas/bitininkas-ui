#!/usr/bin/env pwsh
$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Resolve-Path (Join-Path $scriptDir '..')
$apiDir = Join-Path $rootDir 'api'

function Fail($message) {
    Write-Error $message
    exit 1
}

$packageJson = Join-Path $apiDir 'package.json'
$lockFile = Join-Path $apiDir 'package-lock.json'

if (-not (Test-Path $packageJson)) { Fail "Missing $packageJson" }
if (-not (Test-Path $lockFile)) { Fail "Missing $lockFile" }

if ((Get-Item $lockFile).Length -le 0) { Fail "$lockFile is empty" }

try {
    $pkg = Get-Content -Raw -Path $packageJson | ConvertFrom-Json
} catch {
    Fail "Failed to parse $packageJson: $($_.Exception.Message)"
}

try {
    $lock = Get-Content -Raw -Path $lockFile | ConvertFrom-Json
} catch {
    Fail "Failed to parse $lockFile: $($_.Exception.Message)"
}

if (-not $lock.packages -or -not $lock.packages['']) {
    Fail "$lockFile does not contain the root package entry"
}

$lockName = $lock.packages[''].name
if (-not $lockName) {
    $lockName = $lock.name
}

if ($pkg.name -and $lockName -and $pkg.name -ne $lockName) {
    Fail "Package name mismatch between package.json ($($pkg.name)) and package-lock.json ($lockName)"
}

Write-Host 'Lockfile verification succeeded.'
