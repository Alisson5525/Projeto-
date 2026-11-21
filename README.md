# 🧛 Vampire Craft 5 — Reborn

Reformulação completa do add-on **Vampire Craft v4.7.4** para **Minecraft Bedrock (Android, iOS, Windows, consoles)**.
Vire **vampiro**, **lobisomem** ou **caçador**, suba de nível, desperte poderes e sobreviva à **Lua de Sangue**.

> **Versão:** 5.1.1 · **Requer:** Minecraft Bedrock **1.26.50 ou mais recente** · **Script API:** `@minecraft/server 2.0.0` (estável, sem experimentais)

---

## 📦 Instalação (Android)

1. Baixe `dist/Vampire_Craft_v5.1.1.mcaddon`.
2. Toque no arquivo → abrir com **Minecraft**. Os dois pacotes (BEH e RES) são importados juntos.
3. No mundo: **Configurações → Pacotes de Comportamento → Ativar "Vampire Craft [5.0.0] BEH"** (o de recursos é ativado junto).
4. **Não é preciso ativar nenhum experimento.**

**Atualizando de um mundo da v4.7.4?** Os pacotes usam os mesmos UUIDs, então o mundo atualiza sozinho. Na primeira entrada cada jogador é migrado automaticamente: raça, habilidades desbloqueadas, nível do lobisomem, atributos do caçador e sangue são convertidos para o novo sistema.

---

## 🩹 5.1.1
- **Altar de Sangue e demais blocos com função** (altar de recarga, moedor, caixões, fogueira, alho) voltaram ao formato de bloco original da v4.7.4, que já funcionava — na 5.0/5.1 eles usavam o formato novo de componentes e não carregavam em alguns aparelhos.
- A lógica desses blocos agora também roda por eventos do jogador como reserva, então funciona mesmo se o componente do bloco não disparar.

## 🆕 Novidades da 5.1.0
- **Diagnóstico automático**: ao entrar no mundo o add-on confirma que carregou, ou lista exatamente quais blocos/itens não carregaram (ex.: Altar de Sangue) e o que fazer.
- **Altar de Sangue** agora também é encontrado em criptas, torres e círculos lunares e é derrubado por Bruxas Vampiras e Lobisomens Alfa; o registro do bloco não depende mais do menu.
- **Minérios consertados**: Pedra do Sol (camadas 0–96) e Pedra da Lua (ardósia) realmente geram agora — antes usavam IDs de pedra removidos e alturas onde só havia ar.
- **Estruturas ~10x mais comuns** (antes 0,1% por chunk) e **2 estruturas novas**: Cripta Vampírica (subterrânea, com Altar, gerador de vampiros e 2 baús) e Círculo Lunar (taigas).
- **Baús com loot aleatório** em todas as estruturas (cemitério, acampamento, casa e torre); a torre perdeu itens "presos" salvos por engano.
- **Mestre Caçador** agora mora no acampamento de caçadores (antes nascia infinitamente como monstro e nunca sumia).
- **Encontros na natureza** longe do spawn: matilhas, ninhos de vampiros, covens de bruxas, patrulhas de caçadores e túmulos esquecidos com baú.
- **Drops refeitos** para todos os mobs do add-on (com Saque/Looting e drops raros só quando morto por jogador) + drops extras de aldeões, saqueadores, evocadores, bruxas, lobos e morcegos — sem sobrescrever loot vanilla.
- Vampiros salvos em estruturas voltaram a atacar; pulo do lobisomem III ajustado; visão noturna não pisca mais; aviso de capacete sem spam; regras de spawn por bioma.

## ✨ O que mudou

### Funcionamento nas versões atuais
| Antes (v4.7.4) | Agora (v5) |
|---|---|
| Script API 1.13 + `runCommandAsync` (removido na API 2.x) | Reescrito do zero na API estável 2.0.0 |
| Dezenas de comandos por jogador a cada 2 ticks (lag no celular) | Lógica nativa, laços a cada 0,5 s, sem spam de comandos |
| Checagem de sol com cadeias de 60 `if block` | 1 consulta (`getTopmostBlock`) por jogador |
| HUD feito com sobrescrita de `hud_screen.json` (quebra a cada update) | HUD na barra de ação com ícones próprios (fonte `glyph_E1`) — não toca em telas vanilla |
| Cópias de mobs vanilla de 2020–2023 (zumbi, esqueleto, golem…) | Regeneradas a partir dos arquivos oficiais **1.26.60** |
| Baús vanilla congelados em versões antigas | Loot vanilla atual + pool extra do add-on |
| `/ability mayfly` (só Education Edition) | Voo próprio da forma de morcego |
| Blocos com componentes customizados | Mesmo formato original + lógica reserva por eventos do jogador |

### Bugs graves corrigidos
- **Caçador com dano infinito**: o bônus de dano reaplicava dano dentro do próprio evento de dano (recursão) e travava em qualquer dano sem atacante.
- Funções inexistentes no Android (`function sunrise/removeFly` com maiúscula), variáveis indefinidas (`entity`, `server`, `eventData`) que quebravam missões, Fúria e Toque Gélido.
- Comandos com `@p` que afetavam **o jogador mais próximo** em vez de quem bebeu o sangue (multiplayer).
- Cooldowns por *nome* do jogador; morcegos servos que davam sangue ao jogador errado.
- Golems que nunca atacavam (filtro exigia ser vampiro **e** lobisomem ao mesmo tempo).
- Mobs que nasciam sem componentes de movimento (5% das vezes), lobisomens que queimavam no sol, projétil de caçador inexistente, filtros inválidos (`other_with_families`).
- Itens de loot inexistentes (`thini:garlic_seed`), tabelas de loot faltando, reparo de armadura apontando para itens inexistentes, catálogo de exemplo com itens `mynamespace:`.
- Arquivo de UI inexistente referenciado (`werewolf_display.json`), capacidade `pbr` que desativava o **Vibrant Visuals**.

### Novas mecânicas
- **Níveis 1–10** para as três raças, com XP, barra no HUD e bônus por nível.
- **Vampiro**: sistema de **sangue** (0–20), **mordida = agachar + atacar** (funciona no toque do celular), coletar sangue em garrafas mordendo, sede, regeneração com sangue alto, sol que queima mais os jovens e menos os anciões (capacete, chuva e teto protegem), água corrente, **caçadores têm alho no sangue**.
- **Lobisomem**: transforma ao anoitecer, **lua cheia força a transformação**, 3 formas (I/II/III) que evoluem por nível ou derrotando lobisomens fortes, buffs por forma, fome na forma de fera.
- **Caçador**: **Guilda** com 10 missões (caça e entrega), recompensas, pontos de treino (Vitalidade, Agilidade, Combate), bônus contra sobrenaturais, **Arco do Caçador** com flechas abençoadas.
- **35 habilidades** (17 de vampiro, 15 de lobisomem, 3 de caçador), incluindo novas: Hipnose, Explosão de Sangue, Uivo, Investida, Golpe Brutal, Sentido do Caçador, Explosão Sagrada.
- **Lançamento rápido**: agache + use o item de habilidade para lançar a habilidade selecionada sem abrir menu.
- **Lua de Sangue**: algumas luas cheias viram evento com **névoa vermelha**, monstros mais fortes e emboscadas de vampiros.
- **Vampiros NPC viram morcego** para fugir quando estão quase mortos; lobisomens somem ao amanhecer; caçadores caçam sobrenaturais (inclusive jogadores).
- **Codex** in-game completo (status, guias, configurações e administração) em **português, inglês e espanhol**.
- **Configurações do mundo** (sol, chance de infecção, Lua de Sangue, emboscadas) sem precisar de comandos.

### Visual e animações
- 16 ícones de HUD e 20 novos ícones de habilidades/menus em pixel art no estilo do add-on.
- Animações novas de jogador: **mordida**, **conjuração**, nova **fúria**.
- Forma de lobisomem com **respiração, cauda balançando, postura agachada e mandíbula no ataque**.
- Partículas novas: onda do uivo, marca do caçador; névoa da Lua de Sangue; som de uivo.

---

## ⌨️ Comandos (opcionais)

| Comando | Efeito |
|---|---|
| `/function sunrise/transvp` · `translb` · `transhunter` | Vira vampiro / lobisomem / caçador |
| `/function sunrise/removevp` | Volta a ser humano |
| `/function sunrise/bloodmoon` | Inicia uma Lua de Sangue |
| `/function sunrise/max_level` | Nível 10 |
| `/function sunrise/god_mod/all_skills` | Todas as habilidades da sua raça |
| `/scriptevent vc:level <1-10>` · `vc:blood <0-20>` · `vc:infect vampire` · `vc:debug on` | Avançado |
| `/tag @s add vc_admin` | Libera a página **Administração** do Codex |

---

## 🛠️ Para desenvolvedores

```
addon/behavior_pack   → código-fonte do BP (scripts em scripts/)
addon/resource_pack   → código-fonte do RP
tools/                → geradores, validador e testes
dist/                 → .mcaddon gerado (python3 tools/build.py)
```

Verificações automáticas (`tools/check.sh [caminho/bedrock-samples]`):
1. **TypeScript** checa todos os scripts contra as tipagens oficiais `@minecraft/server@2.0.0` / `@minecraft/server-ui@2.0.0`.
2. **Validador** cruza todas as referências (texturas, geometrias, loot, IDs, traduções, partículas, sons, animações, componentes de bloco, comandos).
3. **Smoke test**: roda o código real contra uma simulação do motor (incluindo a fase *early execution*) e joga todos os sistemas — 85 verificações.

Geradores: `gen_entities.py` (mobs), `regen_vanilla.py` (overrides vanilla a partir do [Mojang/bedrock-samples](https://github.com/Mojang/bedrock-samples)), `gen_art.py` (ícones), `gen_lang.py` + `lang_data.py` (traduções).

> ⚠️ Os overrides vanilla usam o formato da 1.26.50+. Para outra versão, rode `regen_vanilla.py` com o bedrock-samples correspondente.

---

## 📜 Créditos
Add-on original **Vampire Craft** por **Sunrise** (cultivo de alho por *thini*, sistema de voo original por *pedro_denovo*). Esta é uma reformulação para uso pessoal; para redistribuir publicamente, peça permissão aos autores originais.
