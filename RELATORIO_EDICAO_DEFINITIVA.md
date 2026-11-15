# Crônicas de Valdoria — Edição Definitiva (v2.2.0)

Relatório de entrega da reformulação a partir da v1.11.1.

**Pacote:** `dist/Cronicas_de_Valdoria_v2.2.0_Edicao_Definitiva.mcaddon` (Behavior Pack + Resource Pack, 1.241 arquivos).
Os UUIDs dos manifests foram mantidos: a v2.2.0 substitui a v1.11.1 (ou as 2.x anteriores) em mundos existentes sem perder dados.

> **Leia antes:** o pedido original cobre 18 partes (exploração, animações de todas as criaturas, IA, chefes, raças, classes,
> texturas de todos os itens etc.). Este trabalho priorizou, como o próprio pedido determina, **a exploração**, e fez nela
> uma reformulação profunda e testada. Várias partes do pedido **não** foram feitas e estão listadas com honestidade na
> seção "O que não foi feito". Nada foi testado dentro do Minecraft (não há jogo neste ambiente); a seção "Testes" explica
> exatamente o que foi verificado e como.

---

## 1. Auditoria (resumo)

O add-on original é bem estruturado: ~23 mil linhas de JavaScript organizadas por sistemas, geração de estruturas por
script com planos rotacionáveis, construção em lotes, áreas de ticking temporárias e persistência em propriedades
dinâmicas. Os pontos que mais limitavam a exploração eram:

- Só 8 tipos de local geráveis ao acaso (acampamento, torre, cripta, vila, ninho, santuário, ninho de grifo, Kar'Dum);
  fora as masmorras de chefe, a atividade típica era "matar guardas e abrir baú".
- Pesos, níveis e espaçamentos da geração estavam fixos em tabelas no código; não havia noção de raridade.
- Nenhum sistema genérico de enigmas, segredos ou armadilhas: cada masmorra tinha mecânicas escritas à mão.
- O mundo não tinha acontecimentos temporários.
- Animações do jogador: em 1ª pessoa só o eixo X do braço era reduzido a 30%, e o osso `body` girava também em
  1ª pessoa (o braço visível é filho do corpo, então isso o desalinhava).

### Bugs encontrados e corrigidos no código original

| Bug | Efeito | Correção |
|---|---|---|
| `resetData` (Elixir do Renascimento e "Redefinir" do Modo de Teste) recriava os dados sem copiar `locais`, `lidos` e `flags` | Renascer apagava locais descobertos, textos lidos e marcadores da Crônica, embora o próprio menu diga "mantém descobertas" | `core/store.js` preserva locais, textos, flags e o novo progresso de exploração |
| Cercas, grades e vidraças em todas as estruturas usam estados `minecraft:connection_*`, que **só existem a partir do Bedrock 1.26.50** (verificado nos dados oficiais) | Entre 1.26.10 (versão mínima declarada) e 1.26.40, cada um desses blocos falhava e ficava de fora das construções | `structures/builder.js`: se um estado não existe na versão do jogo, o bloco é colocado mantendo só os estados aceitos |
| Animações do jogador giravam o corpo em 1ª pessoa | Movimento do braço deslocado/fora de quadro em 1ª pessoa | Novo `jogador.animation.json` (ver seção 5) |

---

## 2. Exploração (prioridade máxima)

### 2.1 Raridade dos locais — `scripts/exploration/rarity.js`
Comum, Incomum, Raro e Lendário. A raridade afeta a frequência de geração, o XP da descoberta (×1 a ×3), a recompensa de
"exploração completa" (XP, moedas, saque e chance de Fragmento de Mapa) e a cor do título ao descobrir. Os tipos
originais receberam raridades coerentes (ex.: acampamento comum, cripta rara, ninho do dragão lendário).

### 2.2 Gerador — `scripts/structures/generation.js`
- Peso, nível mínimo e espaçamento passam a vir da definição de cada tipo (`peso`, `nivel`, `espaco`), mantendo as
  tabelas originais para os tipos antigos.
- **Variedade regional:** tipos já presentes num raio de 700 blocos pesam menos.
- **Nunca longe demais de algo:** a chance de surgir um local por ciclo é de 25% quando o local mais próximo está a mais
  de 320 blocos, 12% entre 180–320 e 6% perto de vários locais.
- O lendário (Cofre dos Reis) tem peso 0: só surge com o Mapa dos Reis.
- Continua funcionando em mundos existentes (geração dinâmica perto do jogador, mesmo registro persistente).

### 2.3 Motor de mecanismos — `scripts/exploration/mechanisms.js`
Mecanismos declarados por dados em cada estrutura; as posições ficam salvas no registro do local, então tudo continua
funcionando após recarregar o mundo.

| Mecanismo | Como funciona |
|---|---|
| `sequencia` | Enigma de ordem com alavancas, sinos ou botões. Cada entrada fica sobre um bloco colorido (Rubi, Safira, Esmeralda, Âmbar, Ametista, Marfim) e a pista (atril/inscrição) traz versos que indicam a ordem pelo símbolo. A ordem é derivada da semente do local. Erro rearma o enigma e pune (choque, dardos ou mortos despertos). Entradas brilham quando o jogador está perto. |
| `segredo` | Passagem aberta por um botão discreto **ou** quebrando a parede/laje/cascalho marcados. Entrar na sala secreta conta como segredo encontrado (XP, contrato, objetivo). |
| `armadilha` | Placas de pressão **visíveis** disparam dardos (com veneno opcional), chamas, espinhos, desabamento ou gás, com clique e atraso curto para reagir. |
| `ondas` | Sala de desafio com ondas configuráveis (algumas só à noite); reinicia se o jogador abandonar. |
| `guardiao` | Mini-chefe nomeado com bônus de vida/força/resistência que desperta ao entrar na sala; pode exigir outro mecanismo antes (`requer`) e soltar itens (ex.: Chave Antiga). Volta a dormir com vida cheia se o jogador fugir. |
| `chave` | Portão Selado (bloco indestrutível já existente) que consome a Chave Antiga. |
| `altar` | Oferenda que concede uma bênção temporária com modificadores reais de atributo (uma por dia de jogo). |
| `leitura` | Atril/pedra com texto; pistas são anotadas no Diário. |
| `quebrar` | Alvos a destruir (cristais do ritual), cada um chamando defensores. |
| `interagir` | Interação especial (luneta do posto de observação). |

**Exploração completa:** cada local tem objetivos (expulsar ocupantes + mecanismos marcados). Cumprir todos dá título,
XP, moedas e saque por raridade (e chance de Fragmento de Mapa). O progresso aparece no Diário.

### 2.4 Doze novas descobertas
Cada uma com arquitetura própria, atividade própria e pista lógica:

| Local | Raridade | Atividades |
|---|---|---|
| Ruínas do Posto de Vigia | Comum | Relatório do sargento indica a "pedra lisa" sem musgo; botão abre o porão do soldo. Saqueadores goblins. |
| Acampamento de Salteadores | Comum | Salteadores humanos (vindicadores/saqueadores), chefe Varg Caolho, jaula com cativo: a alavanca liberta o mercador, que dá moedas e um **rumor** de local próximo. |
| Santuário à Beira da Estrada | Comum | Capela de peregrinos; pão no altar concede a Bênção da Estrada. Livro dos Peregrinos. |
| Cemitério Abandonado | Comum | Epitáfio do coveiro aponta a lápide com a terceira vela apagada; a terra com raízes cede para o túmulo do tesouro. À noite, três ondas de mortos. |
| Mina Abandonada | Incomum | Poço com escada, galeria escorada, sala de minério, teto podre com placas (armadilha de desabamento), desabamento a leste que cede inteiro ao cavar (veio de mithril escondido), Capataz Espectral. |
| Biblioteca Ancestral | Incomum | Salão de dois andares; enigma de 4 alavancas sobre lãs coloridas guarda o Arquivo Proibido (Tomo Perdido garantido); bibliotecários espectrais; erro desperta espectros. |
| Posto de Observação | Incomum | Atalaia tomada por aranhas; a luneta do topo revela até 3 locais desconhecidos num raio de 800 blocos (uma vez por dia). |
| Campo de Batalha Antigo | Incomum | Crateras, lanças, torre de cerco destruída; à noite os Ecos da Batalha (3 ondas) e depois o Comandante Torvel, que solta o Estandarte do Comandante. |
| Templo Rúnico Subterrâneo | Raro | Escadaria para 4 salões: sinos com enigma, corredor de dardos com caminho seguro em zigue-zague, Guardião Rúnico (solta a Chave Antiga), cofre selado e a passagem secreta dos sacerdotes. |
| Bosque Encantado | Raro | Árvores antigas, fonte lunar (Bênção da Lua Verde), Círculo das Fadas (enigma de botões) que invoca um unicórnio e cervos mágicos e entrega a Lanterna das Fadas; corrupção a expulsar. |
| Altar Corrompido | Raro | Três obeliscos com cristais a destruir (cada um chama defensores); depois a terra é purificada em lotes (grama e musgo voltam) e o Medalhão Purificado aparece. |
| Cofre dos Reis Esquecidos | Lendário | Só surge ao montar o **Mapa dos Reis** (3 Fragmentos). Zigurate, salão das estátuas com enigma de alavancas, Galeria das Chamas, câmara dos sinos com o Salmo do Funeral, o Rei Esquecido (solta a Chave Antiga), Câmara Real com a Coroa dos Reis Esquecidos e um ossário secreto. |

### 2.5 Eventos dinâmicos — `scripts/exploration/events.js`
Patrulha Goblin, Confronto de Facções (guardas × goblins), Caravana Emboscada, Mercador Viajante (raridades por moedas,
estoque único), Grupo de Aventureiros (rumores), Criatura Rara (9 feras de elite por bioma/nível/noite), Estrela Cadente
(cratera com minério de Aetherita), Fenda Corrompida (núcleo a destruir enquanto brotos surgem) e Tesouro Enterrado
(X de terra, baú dois blocos abaixo).
Limites de desempenho: até 3 eventos ativos no mundo, 1 por região, intervalo mínimo de 4 min por jogador; só são
processados com o chunk carregado; NPCs e núcleos são removidos ao expirar e uma varredura periódica remove sobras após
recarregar o mundo. A frequência usa a configuração `eventos` do mundo (padrão 1).

### 2.6 Rumores — `scripts/exploration/rumors.js`
Locais revelados antes da visita (cativo libertado, aventureiros, luneta, Mapa do Explorador, Mapa dos Reis), listados no
Diário com direção e distância até serem descobertos.

---

## 3. Recompensas

- **12 itens novos** com pixel art 16×16 desenhada à mão em código (`tools/gen_exploracao_itens.py`), JSON, atlas e
  nomes em pt_BR/pt_PT/en_US: Fragmento de Mapa Antigo, Mapa dos Reis Esquecidos, Chave Antiga, Tomo Perdido (ensina um
  feitiço do seu nível sem essências) e 8 **relíquias exclusivas de exploração** (Anel da Sentinela, Anel do Bibliotecário,
  Amuleto do Mineiro Anão, Estandarte do Comandante Caído, Sino Rúnico de Bolso, Lanterna das Fadas, Medalhão
  Purificado, Coroa dos Reis Esquecidos).
- As relíquias exclusivas **não entram** nos sorteios genéricos de acessórios: só aparecem nos locais/guardiões próprios
  (e algumas, raramente, nos tesouros da Cripta e de Kar'Dum). A descrição do item diz "Onde obter".
- **26 tabelas de saque novas**: 18 temáticas por local, 4 de eventos e 4 de "exploração completa" por raridade. Locais comuns não
  dão armas elementais; armaduras épicas/lendárias só em locais raros/lendários.
- A lore dos itens mostra os nomes de todos os modificadores (antes alguns apareciam como chave interna) e marca em
  vermelho modificadores negativos.

## 4. Interface

- **Diário > Exploração e Rumores:** resumo por raridade, fragmentos, locais com objetivos (✔/✖, segredos ocultos como
  "???"), rumores, pistas anotadas, eventos próximos e um guia "Como explorar".
- O Códex > Locais Descobertos usa a mesma lista detalhada.
- **6 contratos novos:** Enigmista, Caçador de Segredos, Desbravador, Grande Caçada, Selador de Fendas, Vigília dos Mortos.
- **Modo de Teste:** gerar qualquer descoberta à frente, forçar qualquer evento e reiniciar os mecanismos do local mais
  próximo.

## 5. Animações do jogador (1ª e 3ª pessoa)

`RP/animations/valdoria/jogador.animation.json` agora é gerado por `tools/gen_player_anims.py` com **28 animações**:
- Cada quadro usa `variable.is_first_person ? (1ª pessoa) : (3ª pessoa)`.
- Em 1ª pessoa só o braço direito (o único renderizado, junto com o item) se move, com **rotação e posição próprias** e
  amplitudes calibradas para ficar no campo de visão; corpo, cabeça e braço esquerdo ficam zerados em 1ª pessoa.
- Novas: golpes pesados próprios de **10 categorias de arma** (adaga com estocada dupla, espada curta, espada grande a
  duas mãos, saque de katana, lança, machado diagonal, martelo com pausa e impacto, maça, alabarda, foice) com sons
  próprios, e **4 gestos de conjuração** por escola (arremesso para fogo/arcana/vento, raio para eletricidade, canalizar
  para sagrada/sangue, invocar para invocação).
- Um brilho discreto (nova partícula `mao_brilho`) aparece na posição da mão direita na preparação e no lançamento — é
  visível no canto inferior direito em 1ª pessoa.

**Limitação honesta:** as curvas de 1ª pessoa foram calculadas, não ajustadas vendo o jogo. É provável que algumas
amplitudes precisem de ajuste fino depois de testar (os valores ficam em `tools/gen_player_anims.py`; basta editar e
rodar o script).

---

## 6. Testes realizados (fora do Minecraft)

Todos os scripts ficam em `tools/` e podem ser rodados de novo.

| Teste | Resultado |
|---|---|
| Carga completa do add-on com `@minecraft/server` simulado, `startup`/`worldLoad` e todos os intervalos | 47 intervalos, 66 eventos assinados, 0 erros |
| Checagem de tipos de todos os scripts contra os tipos **oficiais** `@minecraft/server` 2.6.0 e `server-ui` 2.0.0 | Nenhuma API inexistente; 0 erros no código novo (os restantes são de inferência de tuplas no código original) |
| `plan()` das **24** estruturas (originais e novas) em 4 rotações, cada bloco e estado contra os dados oficiais do Bedrock 1.26.60 | 330.087 operações válidas; revelou o problema das conexões de cerca (seção 1) |
| Busca de caminhos em voxels nas 12 descobertas novas | Todas as salas, baús e mecanismos alcançáveis a pé; salas secretas e cofres fechados antes de resolver. Encontrou e levou à correção de 3 bugs (atalaia sem acesso ao topo, entrada do cofre bloqueada, cristais altos demais) |
| Cenário jogado em mundo simulado | 33 verificações: pista no atril, sino errado rearma, ordem certa abre a parede, botão secreto, sala secreta, guardião desperta e solta a chave, portão sem/com chave, dardos, exploração completa 5/5, alavancas em estrutura girada, altar, os 9 eventos começam, patrulha termina e recompensa. Revelou o bug do altar (tentativa sem oferenda bloqueava a seguinte) |
| Integridade cruzada BP×RP | 739 JSON válidos; todas as partículas, animações, ícones e itens citados existem; todos os itens com textura e nome |

**Não testado dentro do Minecraft.** Em especial: aparência das construções, sensação das animações em 1ª pessoa,
equilíbrio de dano/vida dos guardiões e frequência real de eventos precisam de uma partida de teste.

## 7. Compatibilidade

- Mesmos UUIDs, versão 2.0.0 em cabeçalho e módulos; `@minecraft/server` 2.6.0 e `server-ui` 2.0.0 mantidos.
- Versão mínima declarada continua 1.26.10. Recomendado **1.26.50+** para cercas/vidraças conectadas nas construções (em
  versões anteriores elas são colocadas sem conexão, graças ao fallback).
- Dados de mundos antigos preservados: os campos novos do jogador (`expl`, `rumores`, `pistas`) são criados pela migração
  existente; locais antigos continuam funcionando.

---

## 7b. v2.1.0 — segunda etapa

### Estruturas originais com mecanismos (retrofit)
Novo sistema que acrescenta salas e mecanismos a locais **já gerados**, inclusive em mundos antigos: idempotente por
versão, só com o chunk carregado e **sem jogador dentro do local** (nada surge diante dos olhos de alguém).
- **Acampamento Goblin:** *Desafio do Tambor de Guerra* — tocar o tambor (blocos musicais sob um crânio) chama 3 ondas,
  a última com um chefe goblin; vencer deixa um baú de tributo. *Esconderijo do chefe* — os rabiscos no barril da tenda
  vermelha apontam a terra com raízes sob a cama; embaixo há um cofre.
- **Torre do Mago:** *Círculo de Aldric* — quatro pedestais coloridos com botões na biblioteca; o atril traz a pista nas
  margens do diário; resolver materializa o baú de estudos (chance de Tomo Perdido).
- Esses objetivos entram na "exploração completa" dos dois locais. Ondas agora podem ter gatilho por interação.

### Identidade das armas nos golpes comuns
Antes, golpes comuns de qualquer arma só aplicavam efeito de elemento. Agora cada categoria tem um estilo (descrito na
própria arma): adaga (sequência que abre sangramento), espada curta (contra-ataque após bloquear), espada longa (golpe
amplo), espada grande (arco largo e desequilíbrio), katana (crítico sangra, contra-ataque forte), lança (dano na ponta e
+40% montado), machado (rompe-armadura acumulativo), martelo (atordoar, bônus contra constructos), maça (esmagar
mortos-vivos e constructos), alabarda (varredura longa), foice (ceifar vida, execução). Os efeitos em arco atingem só
inimigos hostis (não ferem animais ou aldeões ao lado).

### Inteligência artificial
- `alert_same_type` nativo em goblins, xamãs, chefe goblin, cavaleiro corrompido, fantasma anão e sentinela rúnica:
  atacar um faz o grupo reagir.
- `creatures/tactics.js`, por papel: **apoio** (ferido, o goblin grita e o bando corre até o agressor), **distância**
  (o xamã recua quando o alvo chega a 5 blocos), **guarda** (cavaleiro e sentinela protegem aliados feridos com um brado
  de resistência), **flanco** (o fantasma anão avança quando o jogador está de costas).
- **Guardiões em fases:** aos 50% de vida chamam reforços (com aviso na tela), aos 25% entram em fúria.
- **Criaturas raras** dos eventos entram em fúria aos 50% de vida.
- Correção: mapas de estado da IA original cresciam sem limite com entidades que descarregavam sem morrer.

### Testes da v2.1.0
Os 14 locais com mecanismos (12 novos + Acampamento e Torre com retrofit) passam na busca de caminhos; os planos de
retrofit passam na validação de blocos; o cenário simulado agora tem **43 verificações**, incluindo o retrofit aplicado a
um acampamento antigo, o Desafio do Tambor completo, quatro estilos de arma, a fase de reforços do guardião e o pedido de
apoio dos goblins.

## 7c. v2.2.0 — terceira etapa

### Chefes: Postura (vulnerabilidade comum aos 8 chefes) — `bosses/postura.js`
Por cima das fases e mecânicas próprias de cada chefe (que já eram ricas: ataques marcados, Eclipse, filactérios,
enraizar etc.), todo chefe agora tem uma barra de **postura**. O dano a enche; martelos (×1,8), maças, machados, espadas
grandes e críticos enchem mais; flechas e feitiços menos. Cheia, a postura **quebra**: o chefe fica exposto por 5 s
(+30% de dano recebido, fraqueza e lentidão), com título na tela, tremor e um anel dourado aos pés dele; depois há 25 s de
recuperação. O limite cresce com o número de jogadores, e dano anulado por imunidades (Durgan ajoelhado, Morthil
enraizado etc.) não conta. Avisos aos 50% e 80% para quem está batendo.
**Primeira vitória** contra cada chefe (por jogador, para todos que lutaram por perto): +500 XP e um Fragmento de Mapa;
o Bestiário lista os chefes vencidos.

### Arcos e bestas — `combat/archery.js`
- **Arco:** *Tiro Perfeito* — soltar até 0,5 s após a carga completa dá +35%; a janela é sinalizada por um som agudo e um
  brilho na mão direita (visível em 1ª pessoa). Segurar mais de 3 s além da carga cansa o braço (−15%). **Acerto na
  cabeça:** +25%.
- **Besta:** *Virote Pesado* — rompe a armadura (+12% de dano recebido por 3 s), empurra e causa +20% a menos de 6 blocos.
- Os efeitos especiais das armas raras (tiro duplo, brasas, corrente, raízes, perfurante, leque) continuam e se somam.

### Reações entre escolas mágicas — `magic/reactions.js`
Cada escola marca o alvo e certas combinações reagem: **Frio** (gelo, 3 cargas congelam), **Choque Térmico** (fogo em
alvo gelado), **Estilhaçar** (raio em alvo gelado), **Condução** (raio em alvo na água/chuva), **Labareda** (vento em alvo
em chamas), **Purificação** (sagrado em alvo com Corrupção sombria, cura quem purificou), **Hemorragia** (sangue em alvo
sangrando), **Ressonância** (arcano + outra escola, explosão em área) e **Podridão** (natural em alvo envenenado ou
corrompido). Valem para feitiços, armas com runa e flechas elementais. Explicadas no Diário > Grimório > Reações.

### Testes da v2.2.0
A simulação passou a disparar os eventos de dano como o jogo (antes/depois, com cancelamento), tornando o cenário mais
fiel; nenhum teste anterior quebrou. O cenário tem agora **52 verificações**, incluindo: postura do Titã quebrando em 5
marteladas contra 9 golpes de espada curta, primeira vitória, Tiro Perfeito (9,5 contra 7 de dano), acerto na cabeça,
virote rompendo armadura, Choque Térmico (14 contra 10), Purificação ×2 e Ressonância atingindo o inimigo ao lado.
Durante esta etapa os testes também revelaram que os espectros do templo realmente drenam o jogador parado — a IA
original agindo na simulação — e o teste foi ajustado.

## 8. O que não foi feito (escopo do pedido não coberto)

Para não haver dúvida sobre o que "parece pronto" e não está:

- **Estruturas originais**: Acampamento Goblin e Torre do Mago ganharam mecanismos (v2.1.0). Aurendel, Aelthar,
  Kar'Dum, Nyxhal, Cripta, Santuário Celestial, Ninho do Dragão, Véu Negro, Vila e Ninho de Grifo ganharam raridade e
  entram no Diário, mas arquitetura e mecânicas internas são as da v1.11.1.
- **Animações e modelos das 40 criaturas e 8 chefes**: não alterados.
- **IA**: ganhou táticas por papel e fases de guardiões (v2.1) e a postura dos chefes (v2.2); os padrões de ataque dos
  chefes, e a IA de animais, companheiros e montarias continuam os originais.
- **Raças** (aparência visual e habilidades), **classes**, **especializações**, **árvores de habilidade**: não alteradas.
- **Escolas de magia**: ganharam gestos de conjuração (v2.0) e reações entre escolas (v2.2); os feitiços individuais e
  as combinações do Grimório do Arquimago são os originais.
- **Armas corpo a corpo** (v2.1) e **arcos e bestas** (v2.2) ganharam identidades; **companheiros**, **montarias** e
  **progressão/XP/atributos** não foram alterados.
- **Texturas** existentes de criaturas, armas e armaduras: não alteradas (só os 12 itens novos foram desenhados).
- **Partículas**: só uma nova (`mao_brilho`); as 62 existentes não foram retrabalhadas.
- Vilas/cidades/NPCs/economia: só o gancho de interação para NPCs de eventos e cativos; rotinas e lojas originais.

Essas partes são grandes o bastante para serem etapas próprias; a arquitetura de mecanismos, raridade e eventos criada
aqui foi feita para ser reaproveitada nelas (por exemplo, dar enigmas e segredos à Cripta ou a Kar'Dum é questão de
declarar `mecanismos` no tipo).

## 9. Arquivos novos e alterados (principais)

Novos: `scripts/exploration/{index,rarity,mechanisms,rumors,events,items,menu}.js`,
`scripts/structures/descobertas_{comuns,incomuns,raras}.js`, `scripts/data/items_explore.js`, 12 itens em `BP/items/*`,
12 texturas em `RP/textures/items/valdoria/`, `RP/particles/valdoria/mao_brilho.json`, `tools/*`.

Alterados: `main.js`, `core/store.js`, `structures/{builder,generation,registry,loot,index}.js`, `abilities/registry.js`,
`combat/weapons.js`, `items/{use,equipment}.js`, `npc/dialogue.js`, `quests/quests.js`, `data/lore.js`,
`ui/{menus,codex,teste_estruturas}.js`, `RP/animations/valdoria/jogador.animation.json`, atlas e idiomas, manifests.
