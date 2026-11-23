# Naruto Striker+ (Shinobi Storm + Edição Melhorada) — v1.1.0

Versão melhorada do add-on **Shinobi Storm / Naruto Striker** (original por *Soldado tnt*).
Tudo do add-on original foi mantido; esta edição corrige bugs e adiciona animações,
sistemas, efeitos visuais e melhorias de aparência.

## Instalação

```bash
./build.sh            # gera dist/naruto_striker_plus.mcaddon
```

Abra o `.mcaddon` no Minecraft Bedrock (1.21.10 ou superior) e ative **os dois packs**
(comportamento + recursos) no mundo. Os packs usam os mesmos UUIDs do original com
versão `1.1.0`, então mundos existentes são atualizados sem perder progresso.

---

## 1. Animações (fluidez)

| O quê | Detalhe |
|---|---|
| Curvas suaves | 866 keyframes de rotação/posição em 37 arquivos convertidos para interpolação **catmull-rom** (sem "trancos" entre poses). Keyframes de "pausa" e de escala (liga/desliga de partes) foram preservados. |
| Transições com blend | Todos os estados dos controladores de animação agora fazem *blend* (0,2–0,3 s). |
| Fim das animações de jutsu | 61 comandos `playanimation` e todas as `playAnimation()` dos scripts ganharam *blend out* suave. |
| Estilo ninja dos mobs (26 mobs) | Respiração em idle, **corrida ninja** inclinada com braços para trás quando perseguem um alvo, pose de salto, giro do tronco no golpe e reação ao levar dano. |
| NPCs | Respiração e olhar leve (Guy, Iruka, Jiraiya, Teuchi, Tsunade). |
| Jogador | Corrida ninja ao correr (3ª pessoa, sem modo ativo, mão vazia/menus) e reação de cabeça ao levar dano. |
| Kurama / Shukaku | Caudas com **onda propagada** (cada segmento atrasa em relação ao anterior → movimento de chicote, cada cauda em fase diferente). |

## 2. Combate

- **Golpes críticos** (só corpo a corpo de verdade): +60% de dano, faíscas douradas, raio, anel de impacto e tremor de câmera. Chance de 8% que sobe com o nível (até 22%).
- **Combos**: golpes seguidos (janela de 2 s) mostram `3 HITS!`, `10 HITS!`… e aumentam o XP do abate.
- **Números de dano flutuantes** coloridos pela força do golpe, subindo com desaceleração suave.
- **Faíscas de impacto** em todo acerto, onda de choque em golpes pesados.
- **"Puf" de fumaça ninja** quando um ninja é derrotado.
- **Kawarimi no Jutsu**: ninjas do mundo (Folha, Areia, Uchiha, Espadachins, ANBU) podem se substituir e reaparecer **atrás do jogador** (12% de chance, recarga de 10 s, só em local seguro).
- **Ninjas de elite**: 8% dos ninjas do mundo nascem como `[ELITE]` (nome dourado, aura dourada, +20 de vida, força e resistência) e valem **3× XP**.
- **Fúria dos chefes**: inimigos com 500+ de vida ficam **ENFURECIDOS** abaixo de 50%: rugido, onda de choque, aura vermelha pulsante, força/velocidade/resistência temporárias.
- Barras de vida dos inimigos agora são **barras coloridas** (verde → amarelo → vermelho) e atualizam na hora do dano.

## 3. Progressão

- **Nível 1–100 com XP** (abates, exploração, contratos).
- **Ranks**: Estudante da Academia → Genin (5) → Chunin (15) → Jounin (30) → ANBU (45) → Sannin (60) → Kage (75) → Lenda Shinobi (90). Promoções são anunciadas para todos.
- Cada nível dá **TP** (a moeda original do add-on, usada no Menu de Status) — integra direto com a evolução existente.
- **16 conquistas** com recompensa em TP.
- **Pergaminho Ninja** (item entregue na primeira entrada): perfil com nível/XP/estatísticas, conquistas, guia e **ajustes visuais** (ligar/desligar números de dano, aura, tremor de câmera e rastro).
- **Livro Bingo**: 3 contratos de caça ativos (ex.: "derrote 8 Ninjas da Folha #B"), recompensa em TP + XP, novo contrato a cada conclusão, opção de sortear novos por 50 TP.

## 4. Exploração

- O mundo é dividido em **regiões com nomes ninja** gerados (ex.: *Vale da Névoa*, *Pico dos Corvos*). Cada região nova dá XP com folhas de Konoha caindo.
- A cada 4 regiões: **Pergaminho Perdido** com TP.
- **Esconderijos ninja**: ao descobrir uma região (35% de chance) surge um baú por perto, marcado por uma coluna de fumaça dourada por 90 s, com direção e distância no chat. Saque próprio (`loot_tables/ns/esconderijo.json`): comidas do add-on, minérios, pérolas, maçã dourada/diamante raros e chance de roupas/armas ninja.
- **Meditação**: agachado e parado por 2 s recupera chakra com partículas de chakra convergindo.

## 5. Visuais

- **17 partículas novas** com atlas de efeitos próprio (`textures/particle/ns_fx.png`): impacto, crítico, onda de choque, aura de chakra (cor muda com o modo: vermelho Sharingan, roxo Susanoo, laranja Kurama, branco/azul Byakugan/Tenseigan, verde Portões…), rastro de velocidade (dash/raikiri), poeira e detritos de pouso, level up, folhas, meditação, faíscas de raio, fumaça ninja, trilhas de projéteis.
- **Trilhas de energia** nos projéteis: Bijudama (roxo), Tubarão (azul), Terra, Rasen Shuriken (vento) e o projétil do Shukaku.
- Impacto final da **Rasen Shuriken** (`rasen_shuriken_inpact_jt_3`) que estava faltando agora existe.
- **Sharingan brilhante**: os Uchiha do mundo têm os olhos vermelhos emissivos (brilham no escuro), alinhados pixel a pixel com cada variação de skin.
- **Skins**: passe de volume (luz de cima, sombra em mãos/pés, oclusão nas quinas) em 35 skins de mobs e NPCs.
- **Sombreamento guiado pela geometria** (lê a UV de cada face do modelo): Kurama, Shukaku, cabelos (Naruto/Sasuke/Madara), corpo do jogador, manto ANBU, máscaras e as 10 armas (Samehada, Kubikiribocho, Kiba, Shibuki…).
- Novo ícone do Pergaminho Ninja.

## 6. Correções de bugs

| Bug | Correção |
|---|---|
| `hud_slot.js` usava `ItensCooldown` inexistente → erro a cada tick com skills seladas | Tabela criada |
| HUD mostrava `NaN/NaN` e `[clansundefined]` antes dos placares existirem | Placar ausente vira 0, divisão por zero protegida |
| `wg.js`: `playerLeave` usava `ev.player` (não existe) → erro a cada saída | Removido (modos continuam salvos) |
| `jutsus.js`: `/scriptevent` sem entidade quebrava o script | Validação adicionada |
| `dash.js`: `mc.Vector` não existe; varria **todas** as entidades do mundo a cada tick | Corrigido; busca só por entidades marcadas |
| Combos (Kurama/Susanoo) chamavam `getProperty` em qualquer mob que batesse em algo | Só roda para jogadores |
| 2 controladores de animação vazios (`modos.json`) e entrada `""` no animate do jogador | Removidos |
| Jogador referenciava 3 controladores e 2 animações inexistentes | Referências removidas |
| Eventos `tnt:despawn` / `tnt:fim_miss_c` adicionavam grupo inexistente → **Orochimaru, Gaara e dummy nunca sumiam** | Grupos criados |
| ID duplicado `tnt:rasengan_impact` (barion_impact) | Renomeado |
| Texturas inexistentes (borda da Bijudama, frame do Susanoo, Amaterasu) | Criadas/apontadas |
| Formulários com título fora da lista do UI customizado abriam **em branco** | Formulário padrão de fallback |
| Títulos de menu dinâmicos podiam sair do intervalo do UI | Limitados a 0–10 |
| Konoha podia ser gerada duas vezes com 2 jogadores e deixava *tickingarea* ativa para sempre | Trava + remoção da área; não nasce em copa de árvore |
| `item_chakra.js` reescrevia o item a cada segundo (item "piscando") | Só atualiza quando muda |
| `hyuga_critico.js` usava entidades já removidas | Validação |
| `q.all_animation_finished` (nome errado) | `q.all_animations_finished` |
| Hordas de 10–30 Zetsu sem limite (lag) | 3–7 por grupo, limite de densidade |

## Como foi testado

- Validação de **todos os JSON** (0 inválidos) e de referências cruzadas (texturas, modelos, animações, controladores, partículas, sons, funções, entidades, eventos).
- **Simulador da API de scripts** (`@minecraft/server` simulado e estrito) carregando *todos* os scripts do add-on e disparando: entrada de jogadores, uso de todos os 136 itens, clique em cada botão de cada menu, todos os `scriptevent`, combate contra todos os mobs, críticos/combos forçados, Kawarimi, fúria de chefe, modos (Kurama/Susanoo), dash, queda, meditação, vida baixa, exploração de 10 regiões, morte, saída de jogador e navegação completa dos menus → **0 erros**.

Para revalidar tudo depois de qualquer edição: `./ferramentas/validar.sh` (Node.js 20+).

> Observação honesta: o simulador não substitui testar dentro do jogo — ele garante que
> os scripts não quebram e que as referências existem, mas a aparência final das
> animações/partículas deve ser conferida no Minecraft.

## Estrutura

```
behavior_pack/scripts/ns/   novos sistemas (util, progressao, combate, visuais,
                            exploracao, ia_ninja, missoes)
resource_pack/particles/ns/ novas partículas
resource_pack/animations/ninja_estilo.json, ns_trilhas.json
resource_pack/animation_controllers/ninja_estilo.json
build.sh                    gera o .mcaddon
```

Comandos úteis: `/scriptevent ns:perfil` (abre o perfil), `/scriptevent ns:bingo` (abre o Livro Bingo).
