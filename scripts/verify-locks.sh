#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="$ROOT_DIR/api"

missing=0
if [[ ! -f "$API_DIR/package.json" ]]; then
  echo "ERROR: Missing $API_DIR/package.json" >&2
  missing=1
fi
if [[ ! -f "$API_DIR/package-lock.json" ]]; then
  echo "ERROR: Missing $API_DIR/package-lock.json" >&2
  missing=1
fi
if [[ $missing -eq 1 ]]; then
  exit 1
fi

if [[ ! -s "$API_DIR/package-lock.json" ]]; then
  echo "ERROR: $API_DIR/package-lock.json is empty" >&2
  exit 1
fi

API_DIR="$API_DIR" node <<'NODE'
const fs = require('fs');
const path = require('path');
const apiDir = process.env.API_DIR;
const pkgPath = path.join(apiDir, 'package.json');
const lockPath = path.join(apiDir, 'package-lock.json');
let pkg;
let lock;
try {
  pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
} catch (err) {
  console.error(`ERROR: Failed to parse ${pkgPath}:`, err.message);
  process.exit(1);
}
try {
  lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
} catch (err) {
  console.error(`ERROR: Failed to parse ${lockPath}:`, err.message);
  process.exit(1);
}
if (!lock.packages || !lock.packages['']) {
  console.error(`ERROR: ${lockPath} does not contain the root package entry.`);
  process.exit(1);
}
const lockName = lock.packages[''].name || lock.name;
if (pkg.name && lockName && pkg.name !== lockName) {
  console.error(`ERROR: Package name mismatch between package.json (${pkg.name}) and package-lock.json (${lockName}).`);
  process.exit(1);
}
console.log('Lockfile verification succeeded.');
NODE
