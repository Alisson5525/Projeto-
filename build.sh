#!/usr/bin/env bash
# Gera o arquivo dist/ItensIndestrutiveis.mcaddon (abra-o para importar no Minecraft).
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p dist
rm -f dist/ItensIndestrutiveis.mcaddon
zip -r -X dist/ItensIndestrutiveis.mcaddon IndestructibleItems_BP >/dev/null
echo "Criado: dist/ItensIndestrutiveis.mcaddon"
