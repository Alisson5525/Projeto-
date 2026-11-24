# Ferramentas usadas na Edição Definitiva

Scripts auxiliares (não fazem parte do add-on). Alguns têm caminhos absolutos do
ambiente onde foram executados; ajuste-os antes de reutilizar.

- `jsoncheck.py` — valida todos os JSON dos packs.
- `xref.py <pasta com BP e RP>` — referências cruzadas BP↔RP.
- `migrate.mjs` — migração `runCommandAsync`/`isValid()` para a API 2.x.
- `toplevel.mjs` — encontra acesso ao mundo no carregamento de módulo (proibido na 2.x).
- `olhos*.py`, `sharingan_hand.py`, `obito_hand.py`, `instalar_olhos.py` — pixel art dos doujutsu.
- `fx_atlas.py` — atlas de efeitos em pixel art.
- `acabamento.py` — contorno de ícones e limpeza de ruído de texturas.
- `sintetizar_sons.py` — efeitos sonoros (requer numpy e ffmpeg com libvorbis).
- `ortografia.py` — revisão do texto exibido.
- `sheet.py` — folhas de contato para revisão visual.
- `teste_execucao/` — simulação da API `@minecraft/server` para rodar os scripts em Node:
  `node --import ./registrar.mjs teste.mjs "<caminho do BP>"`.
