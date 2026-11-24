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
- `check2.py` — identificadores duplicados, Texture/Geometry/Material dos render controllers,
  animações dos controladores e placares usados sem serem criados.
- `sombra.mjs` — nomes locais que escondem funções importadas (causa do bug dos modos).
- `extrair_cmds.mjs` — extrai os comandos de dentro dos scripts para validação.
- `diagnosticador_blockception.cjs` — roda o `bc-minecraft-bedrock-diagnoser` num projeto
  com `behavior_packs/` e `resource_packs/` (instale o pacote no npm antes).
- `teste_execucao/teste2.mjs` — testes funcionais com asserções (compra de status, modos,
  varredura dos menus): `node --import ./registrar.mjs teste2.mjs "<caminho do BP>"`.
