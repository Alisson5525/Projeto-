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
| Curvas suaves | ~860 keyframes de rotação/posição em 37 arquivos convertidos para interpolação **catmull-rom** (sem "trancos" entre poses). Keyframes de "pausa" e de escala (liga/desliga de partes) foram preservados, e canais em que a curva "passaria do ponto" ficaram lineares (verificado por `ferramentas/animacoes.js`). |
| Transições com blend | Todos os estados dos controladores de animação agora fazem *blend* (0,2–0,3 s). |
| Fim das animações de jutsu | 61 comandos `playanimation` e todas as `playAnimation()` dos scripts ganharam *blend out* suave. |
| Estilo ninja dos mobs (26 mobs) | Respiração em idle, **corrida ninja** inclinada com braços para trás quando perseguem um alvo, pose de salto, giro do tronco no golpe e reação ao levar dano. |
| Morte e chegada | Mobs ninja desabam (joelhos cedem, tronco tomba) ao morrer; ninjas do mundo chegam numa nuvem de fumaça (*shunshin*). |
| NPCs | Respiração e olhar leve (Guy, Iruka, Jiraiya, Teuchi, Tsunade). |
| Jogador | Corrida ninja ao correr (3ª pessoa, sem modo ativo, mão vazia/menus) e reação de cabeça ao levar dano. |
| Kurama / Shukaku | Caudas com **onda propagada** (cada segmento atrasa em relação ao anterior → movimento de chicote, cada cauda em fase diferente). |

## 2. Combate

- **Golpes críticos** (só corpo a corpo de verdade): +60% de dano, faíscas douradas, raio, anel de impacto e tremor de câmera. Chance de 8% que sobe com o nível (até 22%).
- **Jutsus escalam com o nível ninja**: +0,5% de dano por nível (até +50% no nível 100), com números em ciano — a progressão fortalece os poderes do add-on original.
- **Modos duram mais com o nível**: +0,5% de duração por nível (até +50%); efeitos do modo acompanham a duração.
- **Combos**: golpes seguidos (janela de 2 s) mostram `3 HITS!`, `10 HITS!`… e aumentam o XP do abate.
- **Medidor de DPS** no boneco de treino (`tnt:dummy`): mostra o dano por segundo dos últimos 5 s acima dele; o boneco se regenera abaixo de 30% de vida (treino contínuo, sem virar fazenda de XP).
- **Impacto físico**: críticos e cada 5º golpe do combo (finalizador) empurram o inimigo para trás com leve elevação, com onda de choque no finalizador.
- **Números de dano flutuantes** coloridos pela força do golpe, subindo com desaceleração suave.
- **Arco de corte** brilhante ao golpear com as espadas ninja (Samehada, Kubikiribocho, Kiba, Shibuki, Hiramekarei, Foice do Hidan…), alternando direção a cada golpe (ajuste "Rastro de velocidade").
- **Faíscas de impacto** em todo acerto, onda de choque em golpes pesados.
- **"Puf" de fumaça ninja** quando um ninja é derrotado.
- **Kawarimi no Jutsu**: ninjas do mundo (Folha, Areia, Uchiha, Espadachins, ANBU) podem se substituir e reaparecer **atrás do jogador** (12% de chance, recarga de 10 s, só em local seguro).
- **Falas de combate**: cada facção (Folha, Areia, Uchiha, Espadachins, ANBU, Bandidos, Zetsu) tem gritos de batalha ao começar a luta e últimas palavras ao ser derrotada, flutuando acima da cabeça.
- **NPCs da vila falam** quando você se aproxima (Teuchi, Iruka, Tsunade, Guy, Jiraiya, Orochimaru), com recarga de 30 s por NPC.
- **Ninjas de elite**: 8% dos ninjas do mundo nascem como `[ELITE]` (nome dourado, aura dourada, +20 de vida, força e resistência) e valem **3× XP**.
- **Fúria dos chefes**: inimigos com 500+ de vida ficam **ENFURECIDOS** abaixo de 50%: rugido, onda de choque, aura vermelha pulsante, força/velocidade/resistência temporárias.
- Barras de vida dos inimigos agora são **barras coloridas** (verde → amarelo → vermelho) e atualizam na hora do dano.

## 3. Progressão

- **Nível 1–100 com XP** (abates, exploração, contratos).
- **Ranks**: Estudante da Academia → Genin (5) → Chunin (15) → Jounin (30) → ANBU (45) → Sannin (60) → Kage (75) → Lenda Shinobi (90). Promoções são anunciadas para todos.
- Cada nível dá **TP** (a moeda original do add-on, usada no Menu de Status) — integra direto com a evolução existente.
- **Auras de rank**: a partir de **Kage** (nível 75) o jogador emana um brilho dourado; como **Lenda Shinobi** (90+), rubro-dourado com faíscas (ajuste "Aura de chakra").
- **19 conquistas** com recompensa em TP.
- **Pergaminho Ninja** (item entregue na primeira entrada; se perder, receita: 3 papéis + 1 corante vermelho): perfil com nível/XP/estatísticas, conquistas, guia e **ajustes visuais** (ligar/desligar números de dano, aura, tremor de câmera e rastro).
- **Missão do Dia**: na primeira entrada de cada dia, TP de recompensa (75 a 225 TP conforme a sequência de dias seguidos, até 7).
- **Livro Bingo**: 3 contratos de caça ativos (ex.: "derrote 8 Ninjas da Folha #B"), recompensa em TP + XP, novo contrato a cada conclusão, opção de sortear novos por 50 TP.

## 4. Exploração

- O mundo é dividido em **regiões com nomes ninja** gerados (ex.: *Vale da Névoa*, *Pico dos Corvos*). Cada região nova dá XP com folhas de Konoha caindo.
- A cada 4 regiões: **Pergaminho Perdido** com TP.
- **Esconderijos ninja**: ao descobrir uma região (35% de chance) surge um baú por perto, marcado por uma coluna de fumaça dourada por 90 s, com direção e distância no chat. Saque próprio (`loot_tables/ns/esconderijo.json`): comidas do add-on, minérios, pérolas, maçã dourada/diamante raros e chance de roupas/armas ninja.
- **Monte Myoboku** (estrutura 64×64×64 que vinha no pack sem uso): *Invocação Reversa* pelo Pergaminho Ninja a partir do rank **Chunin** (nível 15). A montanha é construída no vazio do End em (-500, -500) — longe de qualquer construção, como o Kamui original —, você chega com queda lenta e um botão te devolve ao ponto exato de onde saiu. Meditar lá rende **chakra triplo e XP** (treino de energia natural).
- **Meditação**: o "agachar para carregar chakra" original ganha partículas de chakra convergindo e, parado por 2 s, um bônus de +2% do chakra máximo por segundo.

## 4.1 Ambiente e eventos do mundo

- **Folhas caindo** sob as copas das árvores e **vagalumes** à noite perto dos jogadores.
- **Noite da Lua Vermelha** (12% das noites): névoa vermelha, partículas carmesim no ar, **XP em dobro** e **3× mais ninjas de elite** até o amanhecer. Admin: `/scriptevent ns:lua_vermelha` liga/desliga.

## 5. Visuais

- **20 partículas novas** com atlas de efeitos próprio (`textures/particle/ns_fx.png`): impacto, crítico, onda de choque, aura de chakra (cor muda com o modo: vermelho Sharingan, roxo Susanoo, laranja Kurama, branco/azul Byakugan/Tenseigan, verde Portões…), rastro de velocidade (dash/raikiri), poeira e detritos de pouso, level up, folhas, meditação, faíscas de raio, fumaça ninja, trilhas de projéteis.
- **Transformação**: ao ativar um modo (Sharingan, Kurama, Portões…) há uma explosão de chakra na cor do modo, onda de choque, detritos e tremor de câmera; ao terminar, um "puf" de fumaça.
- **Trilhas de energia** nos projéteis: Bijudama (roxo), Tubarão (azul), Terra, Rasen Shuriken (vento) e o projétil do Shukaku.
- Impacto final da **Rasen Shuriken** (`rasen_shuriken_inpact_jt_3`) que estava faltando agora existe.
- **Sharingan brilhante**: os Uchiha do mundo têm os olhos vermelhos emissivos (brilham no escuro), alinhados pixel a pixel com cada variação de skin.
- **Skins**: passe de volume (luz de cima, sombra em mãos/pés, oclusão nas quinas) em 35 skins de mobs e NPCs.
- **Sombreamento guiado pela geometria** (lê a UV de cada face do modelo): Kurama, Shukaku, cabelos (Naruto/Sasuke/Madara e variantes de modo), corpo do jogador (2 tons), as 11 roupas (com variantes Kurama/Tenseigan), máscaras e as 10 armas (Samehada, Kubikiribocho, Kiba, Shibuki…).
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
| Sem arquivos de idioma: mensagens mostravam `entity.tnt:uchiha_b.name` | `texts/` com nomes de 84 entidades e ovos (pt_BR, pt_PT, en_US) |
| Funções chamadas mas inexistentes (`remove_jutsu` do Rinnegan, `reset_menu_modos_unlock`) | Criadas |
| Chidori podia atingir o próprio usuário se o nome mudasse | Exclusão por ID |
| Meteoro do Rinnegan alterava blocos dentro de `beforeEvents` (somente leitura): a casca da cratera, a fumaça e o som nunca aconteciam; e apagava 10.000 blocos por tick | Alterações adiadas para o tick seguinte, lotes de 2.500, dimensão correta e blocos especiais protegidos |
| Kamui (Obito): o intervalo que segura o jogador no ar podia rodar para sempre (erro a cada tick se o jogador saísse); `tp "nome"` quebrava com nomes especiais | Limite de 15 s + validação; `tp @s` |
| Selamento de bijuu: divisão 0/0 (posição inválida) com o bijuu a menos de 1 bloco interrompia o laço para todos; estado de carga não era limpo ao sair | Mínimo de 1 passo, erro isolado por jogador, limpeza na saída |
| Combos (Barion, Manto Kurama, Susanoos) geravam erros se o jogador saísse no meio do combo; `items_tags.js` lia o inventário 20× por segundo por jogador | Agendamentos protegidos; leitura única do inventário |
| Placar `dash` nunca era criado: a **recarga do dash duplo nunca funcionava** (assim como `slot_select`, `slot_cooldown_1`, `stamina`, `reset_all`) | Criados ao carregar o mundo (inclusive mundos antigos) |
| 42 entidades apontavam para tabelas de saque inexistentes (`loot_tables/.json`, `ferreiros.json`) → erro a cada morte | `loot_tables/empty.json` do vanilla (mesmo efeito: sem drops) |
| Máscaras (ANBU, Haku, Obito ×2) usavam o ícone de diamante; 11 ícones órfãos de outro add-on apontavam para texturas inexistentes | Ícones renderizados a partir do próprio modelo 3D de cada máscara; órfãos removidos |
| Gaara reutilizava o controlador do Neji: 3 de 4 habilidades apontavam para golpes Hyuga não declarados (Gaara só esquivava) | Gaara ganhou técnicas de areia próprias: Lanças, Caixão e Onda de Areia |
| Seletores com espaço antes dos colchetes (`@e [tag=...]`) na função executada a cada tick — risco de a função inteira não carregar | Normalizados para `@e[...]` (válido em qualquer caso) |
| Missões, NPCs e menus agendavam comandos com o jogador; se ele saísse durante a espera (até 35 s nas missões) gerava erros | Agendamentos protegidos em 20 scripts |
| Nos laços por jogador (HUD, dash, modos, combos), um erro com um jogador interrompia o processamento de todos | Erros isolados por jogador (`ferramentas/isolar_lacos.py`) |
| `hp_boss.js` percorria todas as entidades do overworld a cada segundo e ignorava Nether/End | Busca só pelos tipos com nome, nas 3 dimensões |
| `_ui_defs.json` listava 185 arquivos que não existem no pack (cópia da lista do vanilla + 3 de outro add-on) | Lista reduzida aos 30 arquivos de UI do add-on |
| 67 itens usavam o componente antigo `minecraft:foil` (formato 1.21.10 usa `minecraft:glint`); 3 itens com durabilidade 9.999.999 (fora do limite) | Convertidos para `minecraft:glint`; durabilidade 32767 |
| `infinito.mcfunction` disparava um evento de entidade a cada tick por jogador só para reescrever a mesma propriedade (olhos do Izanagi) | Sincronização em script, só quando o valor muda (mesmo mapeamento) |
| 100 linhas (`dano_stats=1..100`) avaliadas a cada tick por jogador, re-adicionando o grupo de ataque a cada tick | Script dispara `tnt:dano.N` na mudança + 1x/s (mesmo efeito, ~95% menos trabalho) |
| `execute_jutsus` (seletores globais de Amaterasu/Genjutsu/Rasengan) rodava 1x por jogador por tick: em multijogador, efeitos e partículas aplicados N vezes | 1x por tick por dimensão com jogadores |
| `tick.mcfunction` (roda por jogador) usava `@a` para diminuir a recarga do dash: com N jogadores a recarga caía N vezes mais rápido | `@s` (cada jogador cuida da própria recarga) |
| HUD reenviava título e actionbar a cada tick (40 pacotes/s por jogador), o que também apagava a mensagem de distância do instrutor no tick seguinte | Envio só quando muda + renovação a cada 0,5 s |
| `q.all_animation_finished` (nome errado) | `q.all_animations_finished` |
| Hordas de 10–30 Zetsu sem limite (lag) | 3–7 por grupo, limite de densidade |

## Como foi testado

- Validação de **todos os JSON** (0 inválidos, 100% JSON estrito) e de referências cruzadas (texturas, modelos, animações, controladores, partículas, sons, funções, entidades, eventos).
- **Simulador da API de scripts** (`@minecraft/server` simulado e estrito) carregando *todos* os scripts do add-on e disparando: entrada de jogadores, uso de todos os 136 itens, clique em cada botão de cada menu, todos os `scriptevent`, combate contra todos os mobs, críticos/combos forçados, Kawarimi, fúria de chefe, modos (Kurama/Susanoo), dash, queda, meditação, vida baixa, exploração de 10 regiões, esconderijos, Lua Vermelha, configurações de admin, meteoro do Rinnegan, Kamui, selamento de bijuu, morte, saída de jogador e navegação completa dos menus → **0 erros**.
- Auditorias adicionais: placares usados × criados, tags verificadas × adicionadas, funções chamadas × existentes, render controllers × chaves das entidades, estados de controladores, tabelas de saque, ícones, sintaxe de `execute`.

Para revalidar tudo depois de qualquer edição: `./ferramentas/validar.sh` (Node.js 20+).

> Observação honesta: o simulador não substitui testar dentro do jogo — ele garante que
> os scripts não quebram e que as referências existem, mas a aparência final das
> animações/partículas deve ser conferida no Minecraft.

## Roteiro de teste rápido no jogo (5 minutos, mundo com cheats)

1. **Entrar no mundo** → chega o *Pergaminho Ninja* (use-o: perfil, conquistas, ajustes, Livro Bingo).
2. `/summon tnt:dummy` e bata nele → números de dano, `HITS!`, críticos dourados e o **DPS** acima dele.
3. `/summon tnt:ninja_folha_s` → corrida ninja inclinada ao te perseguir, giro do tronco ao golpear, reação ao apanhar; às vezes **Kawarimi** (some em fumaça e reaparece atrás de você); ao morrer, desaba e solta fumaça.
4. `/time set night` + `/summon tnt:uchiha_s` → **Sharingan brilhando** no escuro; vagalumes por perto.
5. `/scriptevent ns:lua_vermelha` → névoa vermelha e anúncio da **Lua Vermelha** (repita para desligar).
6. Ative um modo pelo menu de modos → **explosão de chakra** na cor do modo + aura contínua.
7. Corra (sprint) sem modo ativo e em 3ª pessoa (F5) → **corrida ninja** do jogador; pule de ~8 blocos → poeira/onda de pouso.
8. Agache parado 2 s → partículas de **meditação** e chakra subindo.
9. Ande ~200 blocos em linha reta → **nova região** com nome, folhas caindo e às vezes um **esconderijo** com fumaça dourada.
10. `/summon tnt:kurama_biju` (longe da base) → caudas em **onda**, barra de vida colorida e **fúria** abaixo de 50%.
11. Com nível 15+ use o Pergaminho Ninja (ou `/scriptevent ns:myoboku`) → **Monte Myoboku**; agache parado lá para treinar.
12. `/scriptevent ns:config` → painel de configuração do mundo.

## Estrutura

```
behavior_pack/scripts/ns/        novos sistemas (util, progressao, combate, visuais,
                                 exploracao, ia_ninja, missoes, eventos)
behavior_pack/animations/ns/     técnicas de areia do Gaara
behavior_pack/loot_tables/ns/    saque dos esconderijos
resource_pack/particles/ns/      novas partículas (+ textures/particle/ns_fx.png)
resource_pack/animations/        ninja_estilo.json, ns_trilhas.json
resource_pack/animation_controllers/ninja_estilo.json
resource_pack/fogs/              névoa da Lua Vermelha
resource_pack/texts/             nomes das entidades (pt_BR, pt_PT, en_US)
ferramentas/                     validar.sh, simulador, verificadores e geradores
build.sh                         gera o .mcaddon
```

### Configuração do mundo (admin/servidor)

`/scriptevent ns:config` mostra o estado; `/scriptevent ns:config <opção> <on|off>` liga/desliga:
`kawarimi`, `elite`, `furia`, `esconderijo`, `lua_vermelha`, `ambiente`, `exploracao`.
Cada jogador também tem seus ajustes visuais no Pergaminho Ninja.

### Decisões de segurança

- Críticos e empurrões **não** finalizam nem deslocam chefes/missões/NPCs (ficam com no mínimo 1 de vida), para não pular eventos roteirizados.
- O nome dos jogadores **não** é alterado (o sistema VIP original identifica jogadores por `name=`).
- Esconderijos só são colocados em espaço vazio sobre chão firme (nunca substituem blocos).

Comandos úteis: `/scriptevent ns:perfil` (abre o perfil), `/scriptevent ns:bingo` (abre o Livro Bingo), `/scriptevent ns:myoboku` (vai/volta do Monte Myoboku).
