#!/usr/bin/env bash
# Regenera todos os arquivos do add-on, valida e empacota em dist/.
# Requisitos: python3 (Pillow, numpy), node 18+. Opcional: npm install em tools/preview e tools/typecheck.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== gerando modelo, skin, animacoes e assets"
python3 tools/gen_model.py
python3 tools/gen_client.py
python3 tools/gen_assets.py

echo "== validando referencias"
node tools/validate.mjs

if [ -d tools/typecheck/node_modules ]; then
  echo "== verificando tipos dos scripts (API @minecraft/server 2.0.0)"
  (cd tools/typecheck && npx tsc -p tsconfig.json)
fi

echo "== simulando os scripts"
(cd tools/simulate && node --import ./loader.mjs run.mjs absolute >/dev/null && node --import ./loader.mjs run.mjs half >/dev/null && echo "simulacao OK")

echo "== empacotando"
rm -rf dist && mkdir -p dist/tmp
cp -r superman_addon/behavior_pack "dist/tmp/Superman_BP"
cp -r superman_addon/resource_pack "dist/tmp/Superman_RP"
(cd dist/tmp && zip -qr ../Superman_Addon.mcaddon Superman_BP Superman_RP)
(cd dist/tmp/Superman_BP && zip -qr ../../Superman_BP.mcpack .)
(cd dist/tmp/Superman_RP && zip -qr ../../Superman_RP.mcpack .)
rm -rf dist/tmp
ls -la dist
