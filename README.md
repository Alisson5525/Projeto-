# Solaris – Herói Voador (Add-on para Minecraft Bedrock)

Add-on que transforma o jogador em **Solaris**, um super-herói original. Ele voa com física suave, tem visão de calor, sopro congelante, super força, super velocidade e um combo de luta completo, e **destrói o cenário** com o voo e os poderes. O foco principal são as **animações**: são 91, com transições suaves entre todos os estados. O personagem tem um **modelo 3D esculpido e articulado** (cotovelos, joelhos, capa em 6 partes), skin em **pixel art detalhada** e uma **camada que brilha no escuro**.

> **Versão 2.3.1:** o super soco (e todas as crateras) não travam mais o jogo, nem no chão nem voando: as crateras são cavadas em ondas, com limite de blocos por tick, sem soltar milhares de itens e sem empurrar o herói.
>
> **Versão 2.3.0, visão de calor.** O raio esquenta em 2 s, ficando mais grosso, mais claro e mais forte; os dois raios saem dos olhos e se encontram no alvo; varrer com o olhar corta uma linha contínua que fica em brasa e esfria aos poucos; a água ferve, a TNT detona e quem morre pelo raio vira cinzas.
>
> **Versão 2.2.1:** o super soco voltou a ser reto, sem mira automática, e ficou muito mais destrutivo: túnel de até 40 blocos, cratera maior e explosão no fim do túnel.
>
> **Versão 2.2.0, combate e pilotagem.** O voo não derrapa mais nas curvas: a direção acompanha a câmera na hora e só a velocidade tem inércia. A freada ficou firme e há uma manobra nova, o **looping** (toque duplo no pulo). No combate, chegaram **agarrar e arremessar** inimigos que se espatifam no cenário, o **golpe final** que vira projétil e o **estilhaçar** de inimigos congelados.
>
> **Versão 2.1.0, destruição e voo.** As partículas de destruição foram refeitas em pixel art e mudam conforme o material: pedaços de pedra que quicam, poeira animada da cor do bloco, grãos de areia, lascas de madeira, cacos de vidro que brilham e folhas que caem balançando. O voo ganhou o **giro de esquiva** (toque duplo para o lado), a barreira de **Mach 2**, rastro de spray na água e de poeira no chão em voo rasante, nuvens que se abrem quando você as atravessa, linhas de velocidade e rastros de condensação.
>
> **Versão 2.0.2:** o sopro congelante usado voando não esconde mais o herói, e a deformação nos impactos não encolhe mais partes do corpo.
>
> **Versão 2.0.1:** correções do sopro congelante (não cria mais gelo dentro do herói), das texturas que piscavam e da capa atravessando o chão.
>
> **Versão 2.0.0, a grande melhoria.** Modelo 3D novo com 72 peças e 29 ossos: peito, ombros e bíceps em relevo, cotovelos e joelhos articulados, botas e braceletes esculpidos e capa em 6 segmentos. Todas as animações foram refeitas usando as articulações, e o herói ficou maior e mais imponente. O emblema, os olhos, os frisos e os braceletes **brilham** e acendem mais forte com os poderes. Os efeitos ganharam clarões, anéis de choque em sequência, paredes de poeira, detritos flutuando, coluna de luz, gotas derretidas e **pilares de gelo**. E há um poder supremo novo: a **Explosão Solar**. Veja o [histórico de mudanças](CHANGELOG.md).

![Visão geral das animações](docs/preview/visao_geral.png)

---

## Instalação

1. Baixe **[`dist/Solaris_Addon.mcaddon`](dist/Solaris_Addon.mcaddon)**.
2. Abra o arquivo:
   - **Windows:** dê dois cliques. O Minecraft abre e importa os dois pacotes.
   - **Android/iOS:** toque no arquivo e escolha abrir com o Minecraft. No iOS, salve em *Arquivos* e toque nele.
3. Crie ou edite um mundo e ative, em **Pacotes de comportamento**, o *Solaris - Herói Voador (Comportamento)*. O pacote de recursos é ativado junto.
4. **Não precisa ativar nenhuma opção experimental.**

> Requer **Minecraft Bedrock 1.26.30 ou mais recente**. Os pacotes também estão separados em `dist/Solaris_BP.mcpack` e `dist/Solaris_RP.mcpack`.
>
> Se você já tinha a versão anterior, os itens do seu mundo continuam funcionando, porque os IDs internos não mudaram.
>
> O add-on modifica a entidade do jogador. Outros add-ons que também alteram o jogador (`player.json` / `player.entity.json`) podem entrar em conflito.

---

## Como jogar

Ao entrar no mundo pela primeira vez você recebe o **Emblema Solar**. Se perder, dá para fabricar:

```
 Redstone | Ouro     | Redstone
 Ouro     | Diamante | Ouro
          | Redstone |
```

**Use o Emblema** para se transformar. Ao se transformar você recebe os 5 itens de poder, e na primeira vez aparece um **guia rápido** no chat. Os itens:

- têm **descrição de uso**: passe o dedo ou o mouse sobre eles;
- **não caem ao morrer**;
- **não aparecem na mão do personagem**: em terceira pessoa ele fica de mãos livres e em primeira pessoa aparece o punho.

### Controles

| Ação | PC | Celular |
|---|---|---|
| **Começar a voar** | pular e pular de novo no ar | pulo duplo |
| **Decolagem carregada** (com cratera) | segurar **agachar** parado, depois **pular** | segurar agachar, tocar pular |
| Subir / descer no voo | segurar pular / agachar | segurar pular / agachar |
| Voar para frente | W (o corpo segue a câmera) | analógico para frente |
| **Voo supersônico** (atravessa montanhas) | correr (Ctrl ou W duplo) voando | botão de correr / analógico todo à frente |
| **Mach 2** | continuar no supersônico por 2,5 s | idem |
| **Giro de esquiva** | voando, tocar duas vezes **A** ou **D** | voando, tocar duas vezes para o lado no analógico |
| **Looping** | voando, tocar duas vezes **pular** | voando, tocar duas vezes o botão de pular |
| **Agarrar** / **arremessar** | segurar **agachar** e bater num inimigo / soltar o agachar | idem |
| Frear e pairar | soltar W | soltar o analógico |
| Pousar | descer até o chão, ou usar **Poder: Voo** | idem |
| **Super velocidade** no chão | correr transformado | correr |
| **Combate** | atacar (no chão: 6 golpes; no ar: 3) | atacar |
| Socar bloco (quebra na hora) | atacar o bloco de mão vazia | idem |
| **Configurações** | agachar + usar o Emblema | idem |

### Combate corpo a corpo

Ao acertar um inimigo, o herói entra em **postura de luta**: guarda alta, gingado e base de lutador. Cada novo acerto em até 1,3 s continua a sequência, e o HUD mostra o **contador de combo** com o nome do golpe:

| No chão | No ar (pairando ou voando) |
|---|---|
| 1. jab de esquerda | 1. **soco aéreo duplo**, com investida na direção do inimigo |
| 2. direto de direita | 2. **chute tornado**: giro completo com a perna estendida |
| 3. gancho de esquerda (empurra para o lado) | 3. **martelo**: crava o inimigo no chão, abrindo uma cratera onde ele cai |
| 4. uppercut (lança o inimigo para cima) | |
| 5. **chute giratório** (360°, com onda de choque) | |
| 6. **golpe final**: investida com soco voador, estrondo sônico e onda que empurra todos em volta; o inimigo sai voando e abre uma cratera onde bater | |

### Visão de calor

- **Esquenta:** em 2 s o raio vai de vermelho-escuro a laranja-branco, fica mais grosso, ganha um brilho em volta e derrete cada vez mais rápido e mais largo (até uma esfera de 2 blocos). O dano nas criaturas sobe junto, e o herói se inclina, firma as pernas e treme mais.
- **Dois raios:** um sai de cada olho e eles se encontram no ponto mirado.
- **Corte contínuo:** varrer com o olhar corta uma linha sem falhas, mesmo virando rápido. O corte fica **em brasa** (branco, amarelo, laranja, vermelho) e esfria aos poucos, deixando marcas de queimado no chão, nas paredes e no teto.
- **Materiais:** pedra vira magma e depois lava, areia vira vidro, terra vira magma, gelo e neve derretem, madeira e folhas pegam fogo, a **água ferve e evapora** com vapor subindo e a **TNT detona**.
- **Criaturas:** o raio atravessa todos os inimigos no caminho e põe fogo neles; quem morre pelo raio **vira cinzas**.
- **Impacto:** faíscas, gotas derretidas, fumaça escura subindo e brilho de lente.
- **Foco:** mirar no mesmo ponto gera uma explosão derretida a cada 1,5 s, maior com o raio no máximo.

### Poderes de combate

- **Agarrar e arremessar:** segure **agachar** e bata num inimigo. O herói o ergue acima da cabeça (dá para voar carregando). Solte o agachar para arremessá-lo para onde estiver olhando. Ele atropela quem estiver no caminho e abre uma cratera quando bate no chão ou numa parede.
- **Inimigos-projétil:** o golpe final do combo e o super soco bem carregado também transformam o inimigo num projétil que se espatifa no cenário.
- **Estilhaçar:** inimigos congelados pelo sopro (ou presos na jaula de gelo) se partem em cacos de gelo no próximo golpe, com dano extra.
- Cada golpe do combo solta faíscas, que aumentam a cada acerto.

### Itens de poder

| Item | Uso |
|---|---|
| **Emblema Solar** | transforma e destransforma (agachado abre as configurações) |
| **Poder: Voo** | no chão faz a decolagem automática; voando faz pousar |
| **Poder: Visão de Calor** | toque para ligar e de novo para desligar (até 15 s). Veja os detalhes abaixo. |
| **Poder: Sopro Congelante** | toque para usar (até 10 s). Ele inspira e sopra um cone de **26 blocos** com vendaval que empurra. Os inimigos ficam congelados (lentidão forte, fraqueza e dano). Quem ficar mais de 1 s no sopro é **preso numa jaula de gelo**. Água vira gelo (e gelo compactado), lava vira obsidiana, plantas viram neve e o chão fica coberto de neve e geada. |
| **Poder: Super Soco** | toque para carregar (até 2 s) e de novo para soltar. O soco vai reto para onde você olha: atinge inimigos a até 40 blocos, abre uma cratera de até 8 blocos de raio, estilhaça vidros e folhas em volta e manda um **túnel de até 5 blocos de raio** que avança em onda pela montanha e **explode no fim**. Inimigos atingidos com o soco carregado voam e se espatifam no cenário. |
| **Poder: Impacto** | no chão é a **palma trovão** (onda de 24 blocos que arremessa inimigos e estilhaça vidros e folhas); agachado é a **pancada no chão** (cratera grande); voando é o **mergulho meteoro**, que termina num **pouso de herói** com cratera na superfície; **agachado voando** é a **Explosão Solar** (veja abaixo). |

### Explosão Solar (supremo)

Voando, **agache e use o Impacto**. O herói para no ar, se encolhe e concentra a energia do sol por 2 segundos: a aura cresce, o chão racha e os detritos começam a flutuar. Então ele se abre em X e libera um **clarão solar** com uma coluna de luz e 4 anéis de choque. Todos os inimigos num raio de 26 blocos levam até 30 de dano, pegam fogo e são arremessados longe. Perto do chão, abre uma cratera, e vidros, folhas e plantas se estilhaçam em onda. A tela de quem está perto fica branca. Ninguém interrompe a carga, e há uma recarga de 12 s.

Enquanto transformado: força VI, regeneração III, resistência total, imunidade a fogo e queda, respiração aquática, super pulo e fome cheia.

### Destruição do cenário

- **Voo rápido e supersônico:** abre um túnel largo através de qualquer bloco (mais largo em Mach 2). Em voo rasante, corta a grama e as flores embaixo.
- **Estrondo sônico:** ao entrar no supersônico, estilhaça vidros, folhas e plantas num raio de 8 blocos.
- **Pouso de herói:** a cratera cresce com a velocidade da queda (até 9 blocos de raio).
- **Decolagem carregada, pancada, soco e palma:** crateras, túneis e ondas de choque.
- **Visão de calor:** derrete, queima e explode; **sopro congelante:** congela, prende em gelo e faz **pilares de gelo** brotarem do chão.
- **Explosão Solar:** cratera embaixo e onda que estilhaça tudo o que é frágil num raio de 12 blocos.

### Partículas de destruição

Cada material quebra de um jeito, sempre em pixel art e com a cor do bloco:

| Material | O que sai |
|---|---|
| pedra, ardósia, minérios, tijolos | pedaços de pedra com luz e sombra que quicam no chão, pedrinhas e poeira cinza; nos impactos fortes, faíscas |
| terra e grama | torrões de terra, pedaços de grama e poeira marrom |
| areia, cascalho, pó de concreto | chuva de grãos e poeira |
| madeira | lascas que giram e um pouco de pó |
| vidro e gelo | cacos translúcidos que brilham enquanto giram |
| folhas, plantas e flores | folhas que caem balançando (inclusive rosa nas cerejeiras) |
| neve | flocos e poeira branca |

As explosões do herói também soltam os pedaços dos blocos que destruíram, e a poeira dos pousos, decolagens e pancadas sai da cor do chão.

![Partículas](docs/preview/particulas.png)

### Efeitos do voo

- **Voo rasante sobre a água:** spray de gotas e espuma na superfície; no supersônico, um rastro de água bem alto.
- **Voo rasante sobre o chão:** poeira da cor do chão e folhas levantadas.
- **Entrar e sair da água voando:** respingo grande com onda; embaixo d'água, bolhas.
- **Nuvens:** na altura das nuvens o herói vai rasgando a nuvem, e ao atravessar a camada ela se abre com um estouro.
- **Supersônico:** linhas de velocidade passando pela tela, dois rastros de condensação atrás das botas e o campo de visão abrindo com a velocidade (se a opção de campo de visão do jogo estiver ligada).
- **Mach 2:** depois de 2,5 s no supersônico, um segundo estrondo, mais 30% de velocidade e túnel mais largo.
- **Giro de esquiva:** um giro de 360° no eixo do corpo com um impulso para o lado; também funciona no supersônico sem perder o Mach 2.
- **Pilotagem sem derrapar:** nas curvas, a direção do voo acompanha a câmera na hora; só a velocidade tem inércia, e curvas muito fechadas custam um pouco de velocidade. Nas curvas fortes saem redemoinhos de ar dos ombros.
- **Freada firme:** soltar o comando para o herói quase na hora; no supersônico, a freada solta um cone de vapor.
- **Looping:** toque duas vezes no pulo voando. O herói faz um círculo vertical completo, deixando um rastro branco no céu, e sai na mesma direção e altura.

Todas as crateras (soco, pousos, pancada, Explosão Solar, arremessos) e a destruição grande (palma trovão, estrondo sônico, túnel do soco) são cavadas em **ondas**, com no máximo 130 blocos por tick (menos com partículas no nível 1). A explosão do jogo só faz o estrondo e a fumaça, sem quebrar blocos de uma vez nem soltar itens. A onda ao longo de alguns ticks. Parece uma onda de choque de verdade e não trava o jogo.

Blocos como bedrock, portais e blocos de comando **nunca** são destruídos. Por padrão, baús e blocos com itens também são protegidos.

### Aliados protegidos

Por padrão, os poderes em área (raios, sopro, palmas, explosões, golpe final) **não atingem** aldeões, golens, animais domesticados nem outros jogadores. Isso pode ser mudado nas configurações.

### Configurações (agachar + usar o Emblema)

- liga/desliga a destruição do cenário
- intensidade (leve / normal / devastador)
- blocos destruídos soltam itens ou não
- visão de calor incendeia e derrete ou não
- velocidade do supersônico (100 a 245 km/h)
- invulnerabilidade, tremor de câmera
- poupar aldeões, golens e animais domesticados / atingir outros jogadores
- quantidade de partículas (use 1 em celular fraco)
- proteção de baús, soco que quebra bloco
- **inverter esquerda/direita** (se o desvio lateral no voo estiver trocado)
- mostrar velocidade, combos e tempo dos poderes na tela
- **restaurar o padrão**

---

## Animações (97)

Todas usam interpolação suave (catmull-rom), transições com mistura (*blend*) entre estados e camadas procedurais que se somam: capa, respiração, inclinação nas curvas, flutuação e tremor de esforço.

| Voo e locomoção | Poderes | Combate | Camadas contínuas |
|---|---|---|---|
| decolagem carregada e salto com punho para cima | transformação e destransformação | postura de luta no chão e guarda no ar | **capa em 6 segmentos** com onda e **física de mola** |
| decolagem no ar (pulo duplo) | visão de calor (início, tensão, fim) | jab, direto e gancho | a capa levanta com a velocidade e sobe ao cair |
| pairar e pairar com **braços cruzados** | sopro congelante (inspira e sopra) | uppercut | respiração e piscar de olhos |
| voo com **inclinação nas curvas** | super soco (carga e golpe) | **chute giratório** 360° | olhos brilham na visão de calor |
| arrancada e voo supersônico | palma trovão | **golpe final** com investida | cabeça segue a câmera em todas as poses |
| freada, mergulho meteoro | pancada no chão | soco aéreo duplo | pose de herói parado e no inventário, **olhar em volta** e **alongar** quando fica parado |
| descida, pouso suave e **pouso de herói** | animações em 1ª pessoa | **chute tornado** e **martelo** aéreo | caminhada heroica e pose no ar ao pular; **deformação** no impacto e na decolagem |
| super velocidade correndo | **Explosão Solar** (concentrar e liberar em X) | | **brilho** do emblema, olhos e frisos que pulsa e acende com os poderes |
| | | | **cotovelos e joelhos** dobrando em todas as poses; porte maior quando transformado |

### Prévias

| | | |
|---|---|---|
| ![](docs/preview/01_transformacao.gif) transformação | ![](docs/preview/02_decolagem.gif) decolagem | ![](docs/preview/03_pairar_bracos_cruzados.gif) pairar / braços cruzados |
| ![](docs/preview/04_voo.gif) voo | ![](docs/preview/05_supersonico_e_curva.gif) supersônico e curva | ![](docs/preview/06_freada_e_pouso_suave.gif) freada e pouso suave |
| ![](docs/preview/07_pouso_de_heroi.gif) pouso de herói | ![](docs/preview/08_visao_de_calor.gif) visão de calor | ![](docs/preview/09_sopro_congelante.gif) sopro congelante |
| ![](docs/preview/10_super_soco.gif) super soco | ![](docs/preview/15_combo_de_6_golpes.gif) combo de 6 golpes | ![](docs/preview/16_combo_aereo.gif) combo aéreo |
| ![](docs/preview/12_palma_trovao.gif) palma trovão | ![](docs/preview/13_pancada_no_chao.gif) pancada no chão | ![](docs/preview/14_super_velocidade.gif) super velocidade |
| ![](docs/preview/17_animacoes_ociosas.gif) animações ociosas | ![](docs/preview/18_explosao_solar.gif) Explosão Solar | ![](docs/preview/19_giro_e_mach_2.gif) giro de esquiva e Mach 2 |
| ![](docs/preview/20_looping.gif) looping | ![](docs/preview/21_agarrar_e_arremessar.gif) agarrar e arremessar | |

*As prévias foram renderizadas fora do jogo pelo visualizador em `tools/preview`, com as mesmas animações e modelo do add-on. As partículas e a câmera aparecem só dentro do jogo.*

### Modelo 3D e skin em pixel art

Personagem original. O modelo tem **72 peças em 29 ossos**, com volume de verdade em vez do corpo quadrado padrão:

- peito, dorsais, abdômen e trapézio em relevo; ombreiras e bíceps salientes
- antebraços e canelas separados, com **cotovelos e joelhos** que dobram nas animações
- braceletes com aletas, joelheiras e botas com bico esculpidos
- emblema solar em relevo com 8 raios, gola alta atrás da cabeça e capa em 6 segmentos
- mandíbula, nariz, sobrancelhas, orelhas e cabelo em volume com mechas

A pintura é em pixel art com 2 pixels por unidade (detalhe equivalente a uma skin 128×128), feita peça por peça, com paleta própria e sombreado em faixas:

- rosto desenhado pixel a pixel, com olhos âmbar e sobrancelhas marcadas
- cabelo penteado para trás com volume (camada 3D)
- uniforme grafite com músculos sombreados e frisos dourados nas laterais
- **emblema solar** em relevo no peito
- braceletes e botas douradas, luvas grafite, cinto prateado com fivela de sol
- capa laranja "chama solar" com dobras, bainha e debrum dourados e sol vazado nas costas
- luvas grafite com placa dourada nos nós dos dedos
- ícones dos itens em pixel art com a mesma paleta
- **camada de brilho** (emblema, raios, olhos, frisos e braceletes) desenhada sem sombra, que pulsa e fica mais forte durante os poderes e o voo rápido

---

## Para desenvolvedores

Tudo é gerado por scripts, então é fácil ajustar poses, cores e física:

```
tools/gen_model.py        modelo 3D esculpido + pintura da skin e da camada de brilho
tools/gen_client.py       animações, controladores, render controllers, player.entity.json
tools/gen_fx_atlas.py     folha de sprites em pixel art das partículas de destruição, água e nuvens
tools/gen_assets.py       partículas, ícones, itens, anexos, receita, textos, manifestos, player.json
tools/validate.mjs        valida JSON, ossos, Molang, referências, sons e partículas
tools/typecheck/          verificação de tipos dos scripts contra @minecraft/server 2.0.0
tools/simulate/           roda os scripts num mundo simulado (178 verificações)
tools/preview/            visualizador 3D (three.js) que renderiza as prévias em GIF
tools/build.sh            regenera tudo, valida, simula e empacota em dist/
superman_addon/           pacotes de comportamento (scripts) e de recursos
```

```bash
(cd tools/typecheck && npm install) && (cd tools/preview && npm install)
./tools/build.sh                                         # gera dist/*.mcaddon
python3 tools/preview/gifs.py /tmp                        # regera as prévias
```

### Como funciona

- O servidor (scripts) controla o voo aplicando a velocidade do jogador a cada tick, com aceleração suave e **autocalibração**. Ele mede a velocidade real e ajusta o ganho, para o voo responder igual em qualquer versão.
- O estado (voo, poder, carga, combate, direção do controle) é sincronizado com o cliente por **propriedades de entidade** do jogador. Os controladores de animação usam essas propriedades para escolher as animações e misturar as transições.
- A inclinação nas curvas, a orientação do corpo seguindo a câmera e a física da capa são calculadas **no cliente**, a cada quadro, por Molang. Por isso ficam fluidas mesmo com atraso de rede.
- Os itens de poder usam **anexos vazios**, então nada é desenhado na mão do personagem.
- A destruição grande passa por uma **fila de ondas**, com limite de blocos verificados por tick, para não travar o jogo.
- O brilho é uma segunda passada do modelo com uma textura só das partes luminosas, desenhada **sem iluminação** (como as manchas do Warden). A intensidade vem de uma variável Molang que sobe com os poderes.

### Limitações conhecidas

- O add-on foi verificado com validação estática, checagem de tipos da API e um simulador do mundo, mas **não foi testado dentro do jogo** neste ambiente. Alguns detalhes visuais, como o sentido da inclinação, a orientação de anéis de partícula e a intensidade da velocidade, podem precisar de ajuste fino. Se o desvio lateral estiver invertido, use a opção nas configurações.
- O brilho usa o material da camada luminosa do Warden. Se alguma versão do jogo desenhar essa camada de um jeito diferente, o resto do personagem continua normal.
- **Armaduras** vestidas seguem os ossos do corpo, mas não dobram nos cotovelos e joelhos do modelo novo, então podem ficar desalinhadas. Como o herói já é invulnerável, o melhor é usá-lo sem armadura.
- Os poderes agora são bem mais destrutivos. Em celulares mais fracos, reduza a intensidade e as partículas nas configurações.
