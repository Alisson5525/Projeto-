#!/usr/bin/env bash
# Gera dist/naruto_striker_plus.mcaddon (BP + RP) pronto para importar no Minecraft.
set -euo pipefail
cd "$(dirname "$0")"
OUT="dist/naruto_striker_plus.mcaddon"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p dist
cp -r behavior_pack "$TMP/Naruto Striker+ BP"
cp -r resource_pack "$TMP/Naruto Striker+ RP"
rm -f "$OUT"
(cd "$TMP" && zip -qr -X "$OLDPWD/$OUT" "Naruto Striker+ BP" "Naruto Striker+ RP")
echo "gerado: $OUT ($(du -h "$OUT" | cut -f1))"
