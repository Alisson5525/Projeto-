#!/usr/bin/env bash
# Valida o add-on inteiro: JSON, referencias cruzadas, entidades/eventos e simulacao dos scripts.
# Uso: ./ferramentas/validar.sh   (precisa de Node.js 20+)
set -uo pipefail
cd "$(dirname "$0")/.."
falhou=0
echo "== 1/4 JSON";            node ferramentas/validar_json.js . | tail -1 | grep -q "bad 0" || falhou=1; node ferramentas/validar_json.js . | tail -1
echo "== 2/4 Referencias (itens 'TEX?', item_sprite, zombie, cape, skeleton, persona sao do vanilla)"
node ferramentas/referencias.js . | head -3
echo "== 3/4 Entidades e eventos"; node ferramentas/entidades.js behavior_pack | grep -v "despawning\|transformation not on player"
echo "== 4/4 Simulacao dos scripts"
(cd ferramentas/sim && node --import ./registrar.mjs simular.mjs "$(cd ../.. && pwd)" | grep -E "^ticks|^ERR|^      |UNKNOWN|^   [a-z]|RESULTADO") || falhou=1
(cd ferramentas/sim && LUCKY=1 node --import ./registrar.mjs simular.mjs "$(cd ../.. && pwd)" | grep -E "RESULTADO") || falhou=1
exit $falhou
