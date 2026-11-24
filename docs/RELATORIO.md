# Naruto Striker+ — Edição Definitiva (v2.0.0)

Relatório de auditoria, alterações, compatibilidade e limitações.

> **Importante (regra 11 do pedido):** nada aqui foi testado dentro do Minecraft.
> Todas as verificações foram **estáticas** (validação de JSON, referências cruzadas,
> verificação de tipos contra a API oficial) ou **simuladas** (os scripts rodaram em
> Node.js sobre uma simulação da API `@minecraft/server`). Antes de publicar, teste em
> um mundo de cópia — veja a seção *Como testar no jogo*.

---

## 1. Resumo

| Área | O que foi feito |
|---|---|
| Programação | Scripts migrados para `@minecraft/server` **2.0.0** / `@minecraft/server-ui` **2.0.0** (API estável atual). 185 chamadas removidas da API (`runCommandAsync`) substituídas por um executor seguro; `isValid()`, `applyKnockback`, cancelamento de explosão e outras APIs corrigidas. Verificação de tipos: **0 erros**. |
| Bugs | 15 bugs reais corrigidos (lista na seção 3). |
| Chefes / IA | Novo diretor de combate (`scripts/ns/chefes.js`) para 14 chefes: fases, ataques telegrafados esquiváveis, postura/atordoamento e mecânicas exclusivas. Barra de chefe nativa. Ninjas chamam aliados quando atacados. |
| Balanceamento | Curva de progressão dos modos corrigida (Susanoo, Rikudou, Portões, Manto de Chakra). |
| Pixel art | Todos os doujutsu redesenhados **pixel a pixel** (Sharingan, 3 Mangekyou, Rinnegan, Byakugan, Byakugan Evoluído, Tenseigan, Izanagi) para entidade e menus (com versões bloqueadas). Atlas de efeitos refeito em pixel art. 24 ícones receberam contorno; 159 texturas limpas de ruído. |
| Efeitos | Atlas `ns_fx` redesenhado (orbe, brilho, faísca, anel, corte, fumaça, raio, impacto, chama de chakra, vórtice, **marcador de perigo**, labareda, gota). Partículas suaves convertidas para alfa em degraus. |
| Animações | Animações novas de transformação, destransformação e mudança de fase de chefe. 51 trilhas de animação de personagem convertidas para interpolação suave (catmull-rom). |
| Áudio | 11 efeitos sonoros novos sintetizados. 25 sons existentes normalizados (antes iam de −48 dB a −10 dB de volume médio). Sons de ativação não tocam mais em volume máximo num raio de 100 blocos. |
| Textos | 187 linhas de texto exibido corrigidas (acentuação/grafia pt-BR) em menus, mensagens, entidades e `.lang`. |

Todas as alterações estão em commits separados no repositório (o primeiro commit é o
**backup do add-on original**, sem nenhuma modificação).

---

## 2. Processo

1. **Auditoria** — validação de todos os JSON, verificador de referências cruzadas BP↔RP
   (`ferramentas/xref.py`: texturas, geometrias, animações, controladores, render
   controllers, partículas, sons, ícones, funções, eventos de entidade), verificação de
   tipos dos scripts contra as definições oficiais da API 1.13 (original) e 2.0
   (`tsc --checkJs`), detecção de código executado no carregamento do módulo
   (`ferramentas/toplevel.mjs`), análise de ruído de texturas e de volume de áudio.
2. **Planejamento** — prioridade: estabilidade/bugs → API → combate/IA → arte → áudio → textos.
3. **Desenvolvimento** — alterações incrementais, preservando identificadores, UUIDs,
   tags, placares e estruturas de dados.
4. **Identidade visual** — pixel art feita à mão em grades de texto (cada pixel escolhido),
   paletas com deslocamento de matiz; pipeline de acabamento para o restante.
5. **Testes** — ver seção 6.
6. **Revisão final** — nova rodada de todas as verificações após cada etapa.

---

## 3. Problemas encontrados e corrigidos

### Programação / execução
1. **API desatualizada**: o pack exigia `@minecraft/server 1.13.0`. Migrado para **2.0.0**:
   - `runCommandAsync` (removido na 2.x) → `scripts/lib/cmd.js` (`cmd()`), que nunca lança
     erro para quem chama e, em contexto somente-leitura (beforeEvents), adia a execução
     para o próximo tick — o mesmo comportamento do antigo `runCommandAsync`.
   - `entity.isValid()` → `entity.isValid` (virou propriedade).
   - `applyKnockback(x, z, h, v)` → nova assinatura `({x, z}, v)` via `scripts/lib/fisica.js`.
   - `getEquipment("Mainhand")` → `EquipmentSlot.Mainhand`; `EntityDamageCause` tipado.
   - `world.playSound` (removido) → `Dimension.playSound`.
2. **`meteorio.js`**: `ev.setCanceled()` não existe em `ExplosionBeforeEvent` → `ev.cancel = true`.
3. **`hp_boss.js`**: acessava `world.getDimension()` no carregamento do módulo (proibido na 2.x —
   o script inteiro falharia) e procurava a entidade inexistente `tnt:npc_instrutor` com
   uma tag que nada define. Removido.
4. **NPCs (5 scripts)**: código de depuração com `player.isPlayer()` (método inexistente) e
   assinaturas vazias de `itemUse` (`case ""`) rodando a cada uso de item. Removidos.
5. **Modo "preso" após relogar**: o estado do modo ficava salvo como ativo; ao relogar, o
   item/visual era resetado mas o script achava que o modo continuava — o jogador não
   conseguia ativar outro modo até o tempo acabar e mantinha o bônus de vida.
   Agora todos os modos são encerrados corretamente ao entrar/renascer.
6. **`projetil_random.js`**: usava `setVelocity` (inexistente) → componente de projétil
   (`shoot()` com o jogador como dono, dando crédito de abate e sem atingir o usuário).
7. **Item duplicado** `tnt:hud_jutsu` (dois arquivos com o mesmo identificador).
8. **32 entidades** referenciavam o grupo de componentes `despawning` (evento
   `minecraft:start_despawn`) sem defini-lo. Grupo criado (`minecraft:instant_despawn`).
9. **`player.json`**: o controlador `skill_mgk_sasuke` estava listado duas vezes em
   `scripts.animate` (executava duas vezes por tick).

### Balanceamento
10. **Susanoo 1** dava **menos** dano que o Mangekyou (regressão de poder).
11. **Susanoo 2 do Obito**: +5 de dano contra +15 dos outros (erro de digitação provável).
12. **Rikudou Kurama** durava **10 s** (com efeitos configurados para 360 s) e dava +4000 de vida.
13. **8º Portão** (Portão da Morte) não tinha custo nenhum.

### Áudio
14. Volume médio dos sons variava 38 dB (vários praticamente inaudíveis).
15. 16 sons com `min_distance: 100` tocavam em volume máximo para todos num raio de 100 blocos.

### Arte
- Byakugan/Byakugan Evoluído praticamente sem desenho visível; Tenseigan borrado;
  Mangekyous sem leitura em 17×17; ícones de armas sem contorno (inconsistentes com o
  resto); texturas com até 1.435 cores em 64×64 (ruído); partículas com degradês borrados.

---

## 4. Alterações por sistema

### 4.1 Chefes e IA (`scripts/ns/chefes.js`)
Cada chefe tem nome, cor, **fases** por porcentagem de vida (com anúncio na tela, fala,
animação de fase, onda de choque e aumento de ritmo), cadência própria e habilidades:

| Chefe | Mecânicas |
|---|---|
| **Itachi** | **Tsukuyomi**: só atinge quem estiver *olhando* para ele quando completa (o aviso aparece na tela). Clone de Corvos (surge atrás do jogador), Gōkakyū telegrafado, **Amaterasu** (chamas que ficam no chão) e **Susanoo** na fase final. |
| **Kisame** | **Samehada** drena chakra de quem estiver perto e o converte em vida; Tubarão Bala (investida em linha marcada); Prisões de Água em sequência. |
| **Zabuza** | **Kirigakure** (névoa: fica invisível e escurece a visão), Assassinato Silencioso (aparece atrás — dá para esquivar), corte em linha da Kubikiribōchō. |
| **Neji** | **64 Palmas** (sela o chakra: retira chakra e enfraquece), **Kaiten** (repele tudo), Palma de Ar. |
| **Kakashi** (sinos) | Substituição e Chidori na fase 2 — dano baixo, por ser chefe de missão inicial. |
| **Orochimaru** | Mãos de Serpente (veneno/lentidão), Emergir da Terra e **Troca de Pele** (cura 25% uma vez abaixo de 30%). |
| **Gaara** (+ formas) | **Defesa Absoluta de Areia**: golpes **frontais** são anulados — ataque pelas costas; Sabaku Kyū; Chuva de Areia; Rugido na forma desperta. |
| **Shukaku** | Espinhos de Areia em série, Rugido, Bala de Ar Compactado. |
| **Kurama** | Golpe de Cauda, Rugido, **Bijūdama** (carga longa, área gigante marcada onde você estava), Chuva de Chakra na fase final. |
| **Capitão ANBU** | Shunshin e chama reforços (`tnt:anbu_basico`) uma vez. |
| **Espadachim SS** | Corte Relâmpago e Passo Fantasma. |

Regras comuns:
- **Ataques telegrafados**: a área é marcada no chão (marcador pixel art vermelho) com som
  de aviso antes do impacto. Dash/kawarimi/correr permitem esquivar; um "ESQUIVOU!" aparece.
- **Postura**: uma sequência rápida de golpes (8–26, conforme o chefe) **atordoa** o chefe por
  2 s (janela de dano), com imunidade de 15 s.
- Sempre há intervalo entre ações; a fase final reduz recargas em 25%.
- Os ataques originais dos JSON continuam existindo; o diretor só adiciona decisões.
- **Barra de chefe nativa** (`minecraft:boss`) nos 14 chefes; o nome mostra a fase e a vida.
- A "fúria" genérica antiga continua para inimigos fortes que não têm diretor próprio.
- Ninjas do mundo (`hurt_by_target.alert_same_type`) agora chamam aliados do mesmo tipo.

### 4.2 Modos e progressão (`scripts/config.js`)
| Modo | Antes (vida/dano/tempo) | Depois |
|---|---|---|
| Susanoo 1 Itachi/Obito/Sasuke | +40/+3, +45/+4, +45/+4 | +40/+6, +50/+5, +35/+7 |
| Susanoo 2 Itachi/Obito/Sasuke | +70/+15, +80/**+5**, +80/+15 | +75/+13, +90/+11, +65/+15 |
| Manto de Chakra mk_1 / mk_2 | dano +7 / +9 | +10 / +14 |
| Rikudou Kurama | +4000 vida, +30 dano, **10 s** | +1200, +22, 150 s |
| 7º Portão | sem custo | ao terminar: lentidão e fraqueza por 10 s |
| 8º Portão | 360 s, sem custo | 120 s; ao terminar: exaustão por 30 s e chakra zerado |

Identidade dos Susanoo: Itachi equilibrado, Obito resistente, Sasuke ofensivo.
Ao ativar um modo: pose de liberação de chakra (antecipação → explosão), onda no chão,
coluna de aura na cor do modo e tremor leve; ao terminar, pose de exaustão.

### 4.3 Pixel art
- **Olhos** (`textures/tudo/uchiha`, `textures/tudo/hyuga`, `textures/ui/menu_modo/bt_*`):
  desenhados em grades 17×17 (ver `ferramentas/olhos_grades.py`, `sharingan_hand.py`,
  `obito_hand.py`). Paletas com deslocamento de matiz, sombra da pálpebra superior,
  limbo escuro, brilho especular de 1 px. O canal alfa da textura de entidade continua
  sendo a máscara de emissão do material (fundo com o valor original, desenho em 255 →
  o padrão do olho brilha). Botões de menu com moldura/bisel e versão bloqueada
  dessaturada com cadeado. Prévia: `docs/olhos_pixel_art.png`.
- **Ícones**: contorno escuro com deslocamento de matiz nos 24 ícones que não tinham
  (armas, pergaminhos, portões...), ignorando faíscas soltas.
- **Texturas de modelo**: remoção de ruído (cores praticamente idênticas unificadas,
  ΔE < 3,2), pixels órfãos corrigidos, alfa residual limpo — sem redimensionar e sem
  alterar UVs (`docs/texturas_antes_depois.png`, `docs/relatorio_acabamento_texturas.json`).
- **Efeitos**: atlas `textures/particle/ns_fx.png` redesenhado (16×16 ampliado 2×; UVs
  preservadas) — `docs/atlas_efeitos.png`. Nova partícula `tnt:ns_aviso`.

### 4.4 Áudio (`sounds/ns/`, `sounds/sound_definitions.json`)
Novos: `ns.ui.abrir`, `ns.ui.clique`, `ns.desbloqueio`, `ns.level_up`, `ns.chefe.aviso`,
`ns.chefe.fase`, `ns.chefe.atordoado`, `ns.esquiva`, `ns.chakra.carga`, `ns.impacto`,
`ns.kawarimi` — sintetizados (`ferramentas/sintetizar_sons.py`), com pico em −3 dBFS.
`ns.ui.clique` fica disponível para os menus (ainda não ligado). Os demais são usados em: abertura de todos os pergaminhos/menus, conquistas, subir de nível, dash,
meditação, golpes críticos/finalizadores, kawarimi e todas as ações de chefe.
Sons existentes normalizados para ~−19 dB de volume médio, pico ≤ −1 dB; categorias e
distâncias definidas.

### 4.5 Textos
Correções de acentuação e grafia apenas no texto exibido (não, você, missão, portão,
nível, maldição, regeneração, concluída, informações, água, prisão, técnica, Espadachim,
Sennin dos Sapos...). Identificadores, tags, eventos, o marcador `Lock` usado pela UI e
as chaves `ui.*` foram preservados (`ferramentas/ortografia.py`).

---

## 5. Relatório de compatibilidade

| Item | Valor |
|---|---|
| Versão do pack | 2.0.0 (BP e RP) |
| `min_engine_version` | 1.21.90 (exigido pela API 2.0) |
| `@minecraft/server` | 2.0.0 (estável, sem experimentos) |
| `@minecraft/server-ui` | 2.0.0 (estável) |
| UUIDs dos packs e módulos | **preservados** (BP `94062a6c-…`, RP `b7ed2608-…`) |
| Recursos experimentais | nenhum adicionado |
| Mundos existentes | identificadores de itens, entidades, eventos, tags, placares e propriedades dinâmicas preservados. Novas propriedades usadas: `ns:fase` (em chefes). |
| Android | otimizações anteriores mantidas; o diretor de chefes roda a cada 5 ticks, só perto de jogadores, com limpeza de estado. |

Notas:
- Versões do Minecraft anteriores a 1.21.90 **não** carregam esta versão. Para essas, use o
  add-on original (commit de backup).
- O nome exibido do pack foi alterado para "Naruto Striker+ - Edição Definitiva"; o crédito
  ao autor original (Soldado tnt) foi mantido.

---

## 6. Testes executados (fora do jogo)

| Verificação | Resultado |
|---|---|
| JSON (todos os arquivos dos dois packs) | válidos (o `particles.material` original usa comentários, aceitos pelo jogo) |
| Referências cruzadas BP↔RP (`ferramentas/xref.py`) | sem referências quebradas (restam apenas falsos positivos documentados: texturas/geometrias vanilla) |
| Verificação de tipos com as definições oficiais da API 2.0 (`tsc --checkJs`) | **0 erros** (o original tinha 46 apontamentos contra a própria API 1.13 — a maioria de tipagem, mas incluindo chamadas inexistentes como `setCanceled` e `isPlayer`) |
| Sintaxe de todos os scripts (`node --check`) | OK |
| Código no carregamento do módulo que acessa o mundo (proibido na 2.x) | nenhum |
| Todo id de som `ns.*` usado nos scripts existe no `sound_definitions` | OK |
| **Execução simulada** (`ferramentas/teste_execucao`): carrega `all.js`, cria jogadores, ativa/desativa 5 modos, relog com modo ativo, abre 13 menus com várias opções, luta do início à morte contra 12 chefes, dispara eventos de script e avança 2.400 ticks | **0 erros**, inclusive erros silenciados por `try/catch`; confirmados sons, animações e partículas novos |

---

## 7. Limitações e o que **não** foi feito / verificado

Sendo direto sobre o escopo:

1. **Não testado no Minecraft.** Aparência final, temporização das animações, sensação do
   combate e equilíbrio real precisam de teste em jogo (principalmente em Android).
2. **Texturas de personagens, roupas e criaturas não foram repintadas à mão.** Receberam
   limpeza técnica (ruído, alfa, pixels soltos) mas mantêm o desenho original. Os redesenhos
   pixel a pixel foram feitos nos olhos/doujutsu, no atlas de efeitos e nos ícones.
   Uma repintura completa de ~700 texturas exige trabalho artístico manual em editor.
3. **Modelos 3D não foram refeitos.** Geometrias foram preservadas (alterá-las sem ver o
   resultado no jogo arriscaria desalinhamentos).
4. **Interfaces JSON UI não foram reestruturadas.** Melhorias de UI: botões de doujutsu,
   estados bloqueados, barra de chefe nativa, sons de interface e textos. A disposição dos
   menus continua a original (alterar JSON UI sem testar no jogo pode quebrar telas).
5. **Animações novas** usam os ossos padrão do humanoide (`body`, `head`, braços, pernas);
   em chefes com geometria diferente, ossos inexistentes são ignorados pelo jogo.
6. As animações antigas de jutsus foram suavizadas por interpolação, não reanimadas quadro a quadro.
7. **Sons** novos são sintetizados (sem gravações); os antigos foram apenas normalizados.
8. A revisão ortográfica é automática por dicionário: palavras ambíguas (ex.: "esta/está",
   "e/é") **não** foram alteradas.
9. Arquivos de anotação do autor (`.slot mennu.txt`, `rank.txt`) e o controlador sem uso
   `animation_controllers/all_modos/modos.json` foram mantidos como estavam.
10. Os testes de execução usam uma simulação da API (não o motor do jogo).

---

## 8. Como testar no jogo (sugestão)

1. Faça cópia do mundo. Importe o `.mcaddon`; ative BP e RP.
2. Abra os pergaminhos/menus — verifique ícones de olhos (normais e bloqueados) e sons.
3. Ative Sharingan → Mangekyou → Susanoo; saia e entre no mundo com um modo ativo
   (deve encerrar limpo e permitir ativar outro).
4. Ative o 8º Portão e espere terminar (exaustão e chakra zerado).
5. Enfrente Itachi (olhe para o lado no Tsukuyomi), Gaara (ataque por trás no escudo),
   Kurama (fuja da área da Bijūdama); faça combos para ver "ATORDOADO!".
6. Comandos de administração existentes continuam valendo:
   `/scriptevent ns:config` lista as opções do mundo.

---

## 9. Arquivos novos

- `BP/scripts/lib/cmd.js`, `BP/scripts/lib/fisica.js` — compatibilidade/segurança da API 2.x
- `BP/scripts/ns/chefes.js` — diretor de combate dos chefes
- `BP/scripts/ns/interface.js` — retorno sonoro dos menus
- `RP/animations/ns/transformacao.json` — transformação, destransformação, fase de chefe
- `RP/particles/ns/ns_aviso.json` — marcador de perigo no chão
- `RP/sounds/ns/*.ogg` — 11 efeitos sonoros
- `ferramentas/` — todos os scripts usados (auditoria, arte, áudio, textos, teste de execução)
