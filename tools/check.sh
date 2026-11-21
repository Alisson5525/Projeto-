#!/usr/bin/env bash
# Run every automated check. Usage: tools/check.sh [path/to/bedrock-samples]
set -euo pipefail
cd "$(dirname "$0")"
SAMPLES="${1:-}"
[ -d node_modules ] || npm install --no-audit --no-fund >/dev/null
echo "== TypeScript check against @minecraft/server 2.0.0 typings"
npx tsc -p tsconfig.json && echo "OK"
echo "== Cross-reference validation"
python3 validate.py ../addon $SAMPLES
echo "== Engine-mock smoke test"
(cd smoke && node --import ./loader.mjs smoke.mjs)
