# Zênite Add-on Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Um add-on Bedrock original ("Zênite, o Feiticeiro do Firmamento") com 7 técnicas, progressão, armadura, chefe de 3 fases, recursos próprios e um `.mcaddon` pronto.

**Architecture:** Behavior pack (conteúdo data-driven + Script API 2.3.0) e resource pack (texturas, modelos, partículas e sons gerados por ferramentas Python). A lógica pura (vetores, tabela de técnicas, progressão, HUD) fica isolada em módulos sem dependência do jogo e é testada com `node:test`. A lógica de runtime é coberta por smoke tests com um mock da API carregado por um *resolve hook* do Node.

**Tech Stack:**
- JavaScript (ES2022, módulos);
- `@minecraft/server` 2.3.0 e `@minecraft/server-ui` 2.0.0 (typings para `tsc --checkJs`);
- Node 22 (`node:test`);
- Python 3.13 com PIL e numpy;
- ffmpeg/libvorbis;
- Chromium/Playwright para as prévias.

**Spec:** `docs/superpowers/specs/2026-11-27-zenite-addon-design.md`

## Global Constraints

- Nenhum nome, visual ou nome de técnica de obra protegida. Só os nomes do spec.
- manifest: `format_version` 2, `min_engine_version` `[1, 21, 120]`.
- Dependências de script: `@minecraft/server` "2.3.0" e `@minecraft/server-ui` "2.0.0".
- Sem experimentos e sem sobrescrever arquivos vanilla (nada de `player.json`).
- Namespace `zenite:`. Todo texto visível passa por chaves de idioma presentes em `pt_BR.lang` **e** `en_US.lang`.
- Orçamento: no máximo 150 edições de bloco por tick por técnica e no máximo 3 orbes ativos por jogador.
- Todo handler de tick fica envolto em try/catch e testa `entity.isValid` antes de usar a entidade.
- Destruição de terreno, PvP e câmera respeitam as configurações do spec.

## Review Focus

1. Jogador sai, morre ou o mundo recarrega no meio da Abóbada ou do Véu: os blocos da cúpula precisam sumir e os efeitos não podem ficar presos. Teste na Task 8 (`abobada limpa ao sair e na recarga`).
2. Técnica que cruza o limite do mundo (y > 319 ou y < -64) ou chunk descarregado: não pode lançar exceção. Teste na Task 8 (`horizonte fora do mundo não lança`).
3. Multijogador com PvP desligado: técnicas não afetam outros jogadores nem o conjurador. Teste na Task 7 (`isAlvoValido respeita pvp`).
4. Troca de modo de jogo ou nível muda o Éter máximo: o Éter nunca fica negativo e é limitado ao máximo. Teste na Task 2 (`clampEter`).
5. Uso duplicado (`itemUse` + `playerInteractWithBlock` no mesmo clique) lança uma vez só. Teste na Task 7 (`debounce de 4 ticks`).

---

### Task 1: Estrutura, manifests e ferramentas de verificação

**Files:**
- Create:
  - `zenite/package.json`, `zenite/tsconfig.json`
  - `zenite/BP/manifest.json`, `zenite/RP/manifest.json`
  - `zenite/BP/texts/{languages.json,en_US.lang,pt_BR.lang}`
  - `zenite/RP/texts/{languages.json,en_US.lang,pt_BR.lang}`
  - `zenite/ferramentas/validar.py`, `zenite/ferramentas/empacotar.py`
  - `zenite/testes/mock/loader.mjs`
  - `zenite/testes/mock/minecraft-server.js`, `zenite/testes/mock/minecraft-server-ui.js`
- Test: `python3 ferramentas/validar.py`, `npx tsc -p .`

**Interfaces:**
- Produces:
  - `validar.py` sai com código 0 e imprime `OK` se tudo estiver certo. Ele checa:
    - JSON válido;
    - UUIDs únicos;
    - dependência BP → RP;
    - texturas e geometrias referenciadas existem;
    - ids de partícula e som usados nos scripts estão definidos;
    - chaves `zenite.*`/`item.zenite.*` dos scripts existem nas duas línguas;
    - itens das receitas e loot tables existem.
  - `empacotar.py` gera `dist/Zenite_BP.mcpack`, `dist/Zenite_RP.mcpack` e `dist/Zenite.mcaddon`.
  - O mock da API expõe:
    - `world`, `system` (com `tick` manual via `__tickar(n)`);
    - `MolangVariableMap`, `ItemStack`;
    - `GameMode`, `EquipmentSlot`, `EasingType`, `CommandPermissionLevel`, `CustomCommandParamType`, `CustomCommandStatus`;
    - classes falsas de `Player`, `Entity` e `Dimension` com blocos num `Map`.

- [ ] Step 1: Escrever os manifests (UUIDs fixos e gerados uma vez), `package.json` (`"type":"module"`, devDeps `@minecraft/server@2.3.0`, `@minecraft/server-ui@2.0.0`, `typescript`) e `tsconfig.json` (`checkJs`, `noEmit`, `strict:false`, `module:es2022`, include `BP/scripts`).
- [ ] Step 2: Rodar `npm install` e `npx tsc -p .` sem scripts. Esperado: sem erros.
- [ ] Step 3: Escrever `validar.py` e rodar no esqueleto. Esperado: `OK`.
- [ ] Step 4: Commit.

### Task 2: Núcleo puro (vetores, técnicas, progressão, HUD)

**Files:**
- Create:
  - `zenite/BP/scripts/core/vec.js`, `core/config.js`, `core/progression.js`, `core/hud.js`
  - `zenite/testes/unit/{vec,progression,hud}.test.js`

**Interfaces:**
- Produces:
  - `vec.js`:
    - `add(a,b)`, `sub(a,b)`, `scale(v,k)`, `len(v)`, `norm(v)`, `dist(a,b)`, `lerp(a,b,t)`, `cross(a,b)` e `rotY(v,rad)`;
    - `pontosEsfera(raio)` → `Vector3[]` (casca com espessura de 1 bloco, sem buracos, ordenada de cima para baixo);
    - `pontosBola(raio)` → `Vector3[]`.
  - `config.js`: `TECNICAS` (array de `{id, chave, custo, recarga, nivel, cor:{red,green,blue}, icone, glifo}` com os valores exatos do spec), `TECNICA_POR_ID`, `LIMIARES_XP = [0,60,160,320,540,820,1160,1560,2020,2540]`, `NIVEL_MAX = 10` e `BLOCOS_PROTEGIDOS`.
  - `progression.js`:
    - `nivelPorXp(xp) → 1..10`;
    - `eterMax(nivel) → 100 + 10*(nivel-1)`;
    - `regenEter(nivel, conjunto) → (2+0.2*(nivel-1))*(conjunto?2:1)` por segundo;
    - `clampEter(eter, max) → 0..max`;
    - `xpPorAbate(vidaMax) → Math.round(5 + vidaMax/2)`;
    - `tecnicaLiberada(tec, {nivel, abobada, criativo}) → boolean`.
  - `hud.js`: `montarHud(estado) → RawMessage`, com `estado = {eter, max, tecnica, prontaEm, veu, dentroAbobada, canalizando, glifos}`.

- [ ] Step 1: Escrever os testes:
  - `nivelPorXp(0)===1`, `nivelPorXp(59)===1`, `nivelPorXp(60)===2`, `nivelPorXp(99999)===10`;
  - `eterMax(10)===190`;
  - `clampEter(-5,100)===0`, `clampEter(250,190)===190`;
  - `xpPorAbate(20)===15`;
  - `tecnicaLiberada(horizonte,{nivel:3})===false`, `({nivel:4})===true`;
  - `abobada` só com `abobada:true` ou `criativo:true`;
  - `pontosEsfera(14)` sem duplicatas e todos com `|len-14|<=0.87`;
  - `montarHud` devolve `rawtext` contendo a chave da técnica e `"72/100"`.
- [ ] Step 2: `node --test testes/unit`. Esperado: FAIL (módulos inexistentes).
- [ ] Step 3: Implementar os quatro módulos.
- [ ] Step 4: `node --test testes/unit`. Esperado: PASS.
- [ ] Step 5: Commit.

### Task 3: Texturas, modelos e prévias

**Files:**
- Create:
  - `zenite/ferramentas/pixel.py` (paleta, primitivas e contorno);
  - `zenite/ferramentas/gerar_texturas.py`, `zenite/ferramentas/gerar_modelos.py`;
  - `zenite/ferramentas/previa/` (HTML three.js + `renderizar.mjs`);
  - os PNGs em `zenite/RP/textures/**`, `zenite/RP/font/glyph_E7.png` e `pack_icon.png` (BP e RP);
  - `zenite/RP/models/entity/{arconte,diadema}.geo.json`.

**Interfaces:**
- Produces os seguintes caminhos (sem extensão, como as referências do RP usam):
  - ícones de item: `textures/items/zenite/<id>`, para os ids poeira_estelar, astrolabio, codice, selo_eclipse, coracao_firmamento, sigilo_<tec> ×7, diadema, manto, perneiras e botas;
  - ícones da UI (32×32): `textures/ui/zenite/<tec>`;
  - bloco: `textures/blocks/zenite/firmamento` (flipbook 16×128, 8 quadros);
  - armadura: `textures/models/armor/zenite_1` e `zenite_2` (64×32) e `textures/models/armor/zenite_diadema` (64×64);
  - chefe: `textures/entity/zenite/arconte` (128×128; alfa 0 = emissivo);
  - partículas: `textures/particle/zenite` (atlas 128×128 com brilho, estrela, faísca, anel, hexágono e runa em células de 32 px);
  - glifos: `font/glyph_E7.png` (256×256; U+E700–U+E70F com segmentos da barra e U+E710–U+E716 com ícones);
  - geometrias `geometry.zenite.arconte` e `geometry.zenite.diadema`, com os ossos `waist/body/head` do diadema iguais aos de `geometry.player.armor.base`.

- [ ] Step 1: Escrever os geradores. A geometria e o mapa UV do chefe saem da mesma descrição em Python, para a textura sempre casar com o modelo.
- [ ] Step 2: Rodar `python3 ferramentas/gerar_texturas.py && python3 ferramentas/gerar_modelos.py`. Esperado: os arquivos acima existem com as dimensões certas (o `validar.py` confere tamanhos).
- [ ] Step 3: Renderizar as prévias (folha de ícones e chefe/armadura em 3D) e inspecionar as imagens. Corrigir o que estiver feio ou com UV errado.
- [ ] Step 4: Commit.

### Task 4: Sons

**Files:**
- Create: `zenite/ferramentas/gerar_sons.py`, `zenite/RP/sounds/zenite/*.ogg`, `zenite/RP/sounds/sound_definitions.json`

**Interfaces:**
- Produces os ids de som:
  - `zenite.veu_on`, `zenite.veu_off`, `zenite.veu_bloqueio`;
  - `zenite.poco`, `zenite.nova_disparo`, `zenite.nova_impacto`;
  - `zenite.passo`, `zenite.reversao`;
  - `zenite.horizonte_carga`, `zenite.horizonte_disparo`;
  - `zenite.abobada`, `zenite.abobada_fim`;
  - `zenite.nivel`, `zenite.ui`, `zenite.negado`;
  - `zenite.arconte_rugido`, `zenite.arconte_ritual`, `zenite.arconte_morte`, `zenite.arconte_feixe`.

- [ ] Step 1: Sintetizar os sons (mono, 44,1 kHz, normalizados a −1 dBFS) e gravar em OGG com `ffmpeg -c:a libvorbis -q:a 6`.
- [ ] Step 2: Rodar `validar.py`. Esperado: cada id em `sound_definitions.json` aponta para um `.ogg` existente.
- [ ] Step 3: Commit.

### Task 5: Definições do resource pack

**Files:**
- Create:
  - `zenite/RP/textures/{item_texture,terrain_texture,flipbook_textures}.json`, `zenite/RP/blocks.json`;
  - `zenite/RP/attachables/{diadema,manto,perneiras,botas}{,.player}.json`;
  - `zenite/RP/entity/arconte.entity.json`, `animations/arconte.animation.json`, `animations/diadema.animation.json`;
  - `render_controllers/arconte.render_controllers.json`;
  - `particles/*.json`;
  - `fogs/abobada.json`;
  - textos completos nas duas línguas.

**Interfaces:**
- Consumes: os caminhos da Task 3.
- Produces:
  - ids de partícula (variáveis Molang `variable.cor` RGBA e `variable.tamanho`):
    - `zenite:brilho`, `zenite:faisca`, `zenite:estrela`;
    - `zenite:anel`, `zenite:sugar`, `zenite:explosao`;
    - `zenite:onda`, `zenite:rastro`, `zenite:runa`, `zenite:hex`;
  - névoa `zenite:abobada`;
  - atalhos de textura `zenite_<id>` em `item_texture.json` e `zenite_firmamento` em `terrain_texture.json`.

- [ ] Step 1: Escrever os arquivos seguindo os formatos vanilla (attachables `.player` com `item` + `animation.armor.*.offset`).
- [ ] Step 2: Rodar `validar.py`. Esperado: `OK`.
- [ ] Step 3: Commit.

### Task 6: Definições do behavior pack

**Files:**
- Create:
  - `zenite/BP/items/*.json` (5 itens + 7 sigilos + 4 armaduras);
  - `zenite/BP/blocks/firmamento.json`;
  - `zenite/BP/entities/arconte.json`;
  - `zenite/BP/recipes/*.json`;
  - `zenite/BP/loot_tables/entities/arconte.json`, `zenite/BP/loot_tables/vazio.json`.

**Interfaces:**
- Produces:
  - ids de item `zenite:<id>` (Task 3);
  - bloco `zenite:firmamento`;
  - entidade `zenite:arconte` com famílias `zenite_arconte`, `monster` e `mob`.
- Valores do spec:
  - Arconte: vida 500, ataque 10, velocidade 0,28 e `minecraft:boss`;
  - proteção das armaduras: 3/8/6/3;
  - durabilidade das armaduras: 500/720/680/580.

- [ ] Step 1: Escrever os JSONs com as receitas exatas do spec.
- [ ] Step 2: Rodar `validar.py`. Esperado: `OK` (itens das receitas existem e as texturas do ícone existem).
- [ ] Step 3: Commit.

### Task 7: Scripts — núcleo de runtime

**Files:**
- Create:
  - `zenite/BP/scripts/main.js`;
  - `core/{estado,configuracoes,fx,combate,lancar}.js`;
  - `ui/{roda,codice}.js`;
  - `sistemas/{itens,armadura,comandos,hud_loop,maestria}.js`;
  - `zenite/testes/smoke/nucleo.test.js`.

**Interfaces:**
- Consumes: Task 2.
- Produces:
  - `estado.js`:
    - `obterEstado(player) → Estado {eter, xp, nivel, selecionada, abobada, recargas: Map<id,tick>, veu, canalizando, ultimoLance}`;
    - `salvarEstado(player)`.
  - `configuracoes.js`: `cfgMundo() → {destruicao, pvp, boasVindas}` e `cfgJogador(player) → {camera, tremor, hud, glifos}`.
  - `combate.js`:
    - `isAlvoValido(conjurador, alvo) → boolean` (exclui o conjurador, itens, XP orbs, o bloco da cúpula e jogadores sem PvP);
    - `causarDano(alvo, qtd, conjurador)`;
    - `empurrar(alvo, direcao, forcaH, forcaV)`.
  - `fx.js`: `particula(dim, id, pos, cor, tamanho)`, `anel(...)`, `linha(...)`, `esfera(...)`, `som(dim, id, pos, vol, pitch)` e `tremor(player, intensidade, seg)`.
  - `lancar.js`:
    - `registrarTecnica(id, {lancar(player, ctx)})`;
    - `tentarLancar(player, idTecnica, origem) → boolean` (checa debounce de 4 ticks, liberação, recarga e Éter, depois gasta e despacha).

- [ ] Step 1: Escrever os smoke tests:
  - carregar `main.js` sob o mock registra `itemUse`, `playerInteractWithBlock`, `entityDie`, `playerSpawn`, `playerLeave` e `worldLoad`, além dos comandos `zenite:menu`, `zenite:codice`, `zenite:kit`, `zenite:nivel`, `zenite:arconte` e `zenite:limpar`;
  - `isAlvoValido respeita pvp`;
  - `debounce de 4 ticks`;
  - sem Éter, `tentarLancar` retorna false e toca `zenite.negado`;
  - o estado sobrevive a salvar e recarregar (propriedade dinâmica `zenite:dados`).
- [ ] Step 2: Rodar `node --test testes/smoke`. Esperado: FAIL.
- [ ] Step 3: Implementar.
- [ ] Step 4: Rodar `node --test testes` e `npx tsc -p .`. Esperado: PASS, 0 erros.
- [ ] Step 5: Commit.

### Task 8: Scripts — técnicas

**Files:**
- Create:
  - `zenite/BP/scripts/tecnicas/{veu,poco,nova,passo,reversao,horizonte,abobada}.js`;
  - `zenite/testes/smoke/tecnicas.test.js`.

**Interfaces:**
- Consumes: Task 7 (`registrarTecnica`, `fx`, `combate`, `estado`, `cfgMundo`).
- Produces: `limparAbobadasPendentes()`, chamada em `worldLoad` e no comando `zenite:limpar`.

- [ ] Step 1: Escrever os testes (no mock):
  - véu ativo aplica resistência amplificador 4 e congela uma flecha a 2 blocos;
  - supernova contra uma parede cria explosão só com destruição ligada;
  - passo mirando numa entidade teleporta para trás dela;
  - reversão cura 12;
  - horizonte apaga blocos comuns e preserva `minecraft:bedrock`;
  - `horizonte fora do mundo não lança`;
  - a abóbada coloca `zenite:firmamento` só no ar e remove tudo depois de 400 ticks;
  - `abobada limpa ao sair e na recarga`.
- [ ] Step 2: Rodar e ver falhar.
- [ ] Step 3: Implementar cada técnica com os valores do spec.
- [ ] Step 4: Rodar `node --test testes` e `npx tsc -p .`. Esperado: PASS.
- [ ] Step 5: Commit.

### Task 9: Scripts — Arconte do Eclipse

**Files:**
- Create: `zenite/BP/scripts/chefe/{arconte,ritual}.js`, `zenite/testes/smoke/chefe.test.js`

**Interfaces:**
- Consumes: Tasks 7–8.
- Produces: `iniciarRitual(player, local)`, `faseDoArconte(vidaAtual, vidaMax) → 1|2|3` (limiares 0,66 e 0,33).

- [ ] Step 1: Escrever os testes:
  - `faseDoArconte(500,500)===1`, `(330,500)===2`, `(160,500)===3`;
  - o ritual spawna `zenite:arconte` depois de 100 ticks;
  - a morte do arconte dá 600 XP de maestria ao matador.
- [ ] Step 2: Rodar e ver falhar. Step 3: Implementar. Step 4: Rodar e ver passar. Step 5: Commit.

### Task 10: Empacotar, documentar e entregar

**Files:**
- Create: `zenite/README.md`, `README.md` (raiz, curto), `zenite/dist/Zenite.mcaddon`

- [ ] Step 1: Rodar `validar.py`, `node --test testes`, `npx tsc -p .` e `empacotar.py`. Esperado: tudo verde; o `.mcaddon` contém BP e RP.
- [ ] Step 2: Escrever o README em português: instalação no celular e no PC, como conseguir os poderes, técnicas, controles, comandos e configurações.
- [ ] Step 3: Commit, push para `ccr-6f5e6d03-csqiao` e enviar o `.mcaddon` ao usuário.
