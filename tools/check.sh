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
if [ -n "${SCHEMAS:-}" ]; then
  echo "== Schema check (Blockception schemas at \$SCHEMAS)"
  [ -d node_modules/ajv ] || npm install --no-save --no-audit --no-fund ajv@8 >/dev/null
  node schema_check.mjs "$SCHEMAS" ../addon | tail -1
fi
