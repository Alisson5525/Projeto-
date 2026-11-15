# Crônicas de Valdoria — Edição Definitiva (v2.0.0)

Relatório de entrega da reformulação a partir da v1.11.1.

**Pacote:** `dist/Cronicas_de_Valdoria_v2.0.0_Edicao_Definitiva.mcaddon` (Behavior Pack + Resource Pack, 1.238 arquivos).
Os UUIDs dos manifests foram mantidos: a v2.0.0 substitui a v1.11.1 em mundos existentes sem perder dados.

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

## 8. O que não foi feito (escopo do pedido não coberto)

Para não haver dúvida sobre o que "parece pronto" e não está:

- **Estruturas originais** (Aurendel, Aelthar, Kar'Dum, Nyxhal, Cripta, Santuário Celestial, Ninho do Dragão, Véu Negro,
  Vila, Acampamento, Torre, Ninho de Grifo): não foram reformuladas. Ganharam raridade e entram no novo Diário, mas
  arquitetura e mecânicas internas são as da v1.11.1.
- **Animações e modelos das 40 criaturas e 8 chefes**: não alterados.
- **IA** de inimigos, chefes, animais, companheiros e montarias: não alterada (as novas atividades usam a IA existente).
- **Raças** (aparência visual e habilidades), **classes**, **especializações**, **árvores de habilidade**: não alteradas.
- **Escolas de magia e combinações**: só ganharam gestos de conjuração por escola; os efeitos são os originais.
- **Arcos e bestas**, **companheiros**, **montarias**, **progressão/XP/atributos**: não alterados.
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
