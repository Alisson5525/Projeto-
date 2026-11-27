# Histórico de mudanças

## 2.0.1 — Correções

- **Sopro congelante:** olhando para baixo ou com alguém por perto, ele criava gelo, neve e pilares de gelo dentro do próprio herói, e parte do corpo sumia dentro dos blocos. Agora nada é criado no espaço do herói nem dentro de outras criaturas. A jaula de gelo também não prende mais o herói junto com o inimigo.
- Os pilares de gelo nascem ao longo do sopro, a pelo menos 3,5 blocos do herói, e a neve não se empilha mais flutuando.
- **Visão de calor:** o chão embaixo do herói vira magma em vez de lava, para ele não afundar.
- **Texturas piscando:** várias peças do modelo ficavam exatamente no mesmo plano e "brigavam" na tela (meio do short, cinto, base dos punhos, costas, orelhas, sobrancelhas, nariz, borda da capa e joelheiras). Todas foram reposicionadas.
- **Capa:** nas poses agachadas (sopro, visão de calor, socos, pouso, pancada, decolagem) a capa atravessava o chão. Agora ela dobra para trás.
- O herói ficou um pouco menos alto (antes a cabeça entrava no teto de túneis e portas de 2 blocos).
- O brilho de lente da visão de calor saiu dos olhos, onde cobria a tela em primeira pessoa, e foi para o ponto de impacto.

## 2.0.0 — A grande melhoria

**Modelo 3D**
- Modelo novo e esculpido: **72 peças em 29 ossos** no lugar do corpo quadrado padrão.
- Peito, dorsais, abdômen e trapézio em relevo, ombreiras e bíceps, braceletes com aletas, joelheiras e botas com bico.
- **Cotovelos e joelhos articulados** (antebraços e canelas são ossos próprios).
- Emblema em relevo com 8 raios, gola alta, capa em **6 segmentos**, rosto com mandíbula, nariz e sobrancelhas, cabelo com mechas.
- Skin repintada peça por peça para o modelo novo.
- **Camada de brilho**: emblema, raios, olhos, frisos e braceletes brilham no escuro, pulsam e acendem mais forte na transformação, na visão de calor, nos golpes, no voo rápido e no supremo.
- O herói fica **maior e mais imponente** quando transformado.

**Animações**
- Todas as poses refeitas com cotovelos e joelhos: guarda com punhos fechados, pairar com uma perna dobrada, pouso de herói ajoelhado, corrida e voo com os membros dobrando, socos com o braço estendendo de verdade.
- Duas animações novas da Explosão Solar (91 no total).
- O emblema pulsa com a respiração e com o brilho.

**Efeitos**
- 10 partículas novas: aura solar, detritos que flutuam do chão, clarão de impacto, parede de poeira, cone de vapor supersônico, rastro solar, coluna de luz, brilho de lente, gotas derretidas e o clarão da Explosão Solar.
- Decolagem, pousos, supersônico, soco, palma, pancada e golpe final agora soltam **anéis de choque em sequência**, clarão e poeira, e a tela pisca nos impactos mais fortes.
- Transformação com coluna de luz e anéis dourados.
- Visão de calor com brilho de lente nos olhos, clarão no alvo e gotas derretidas.
- Sopro congelante faz **pilares de gelo** brotarem do chão.
- O soco carregado ganha aura, e o voo supersônico deixa um rastro solar.

**Novo poder: Explosão Solar**
- Voando, agache e use o Impacto. O herói concentra a energia por 2 s e libera um clarão que atinge, queima e arremessa todos os inimigos num raio de 26 blocos, abre uma cratera e estilhaça o que é frágil em volta. Tem recarga de 12 s e não pode ser interrompido.

## 1.2.0 — Polimento geral

**Correções**
- Usar um poder durante a super velocidade não deixa mais a animação de corrida presa no cliente.
- O pulo duplo não dispara o voo de quem está de élitro. Planar com élitro, montar em algo ou entrar no modo espectador desliga o voo.
- Trocar de dimensão (portal) reinicia o voo, sem saltos de velocidade.
- O soco de super força respeita o modo aventura.
- A velocidade na tela ignora teleportes.

**Desempenho**
- Destruição grande (palma trovão, estrondo sônico, túnel do soco) agora acontece em **ondas** que se espalham por vários ticks, com limite de blocos verificados por tick. Isso acaba com as travadas e parece uma onda de choque de verdade.
- O túnel do voo supersônico não relê blocos já verificados.
- As explosões têm um raio máximo, mesmo na intensidade "devastador".

**Jogabilidade**
- Os poderes em área **poupam aliados**: aldeões, golens, animais domesticados e (por padrão) outros jogadores, inclusive nas explosões.
- Configurações novas: "Poupar aldeões, golens e animais domesticados", "Poderes em área atingem outros jogadores" e "Restaurar o padrão".
- Os itens de poder têm **descrição de uso** e **não caem ao morrer**.
- **Guia rápido** de controles na primeira transformação.
- O HUD mostra o **contador de combo** com o nome do golpe e a **barra de tempo** da visão de calor e do sopro.
- Os sons têm leve variação de tom, para não soarem repetitivos.

**Animações**
- A capa agora tem **física de mola**: balança, passa do ponto e volta, e se agita mais em arrancadas e freadas.
- **Deformação** (squash & stretch): o corpo estica na decolagem e achata no pouso de herói, no pouso suave, na pancada no chão e na explosão da transformação.
- **Animações ociosas**: parado em pose de herói, ele alterna entre olhar em volta e alongar os ombros.
- Removido um osso sem uso do modelo.

**Visual**
- Ícones dos itens redesenhados em **pixel art**, com a mesma paleta da skin.
- Skin: debrum dourado nas bordas da capa e placa dourada nos nós dos dedos.

## 1.1.0 — Herói original, combate e poderes mais fortes
- Skin em pixel art de um herói original (Solaris).
- Itens de poder não aparecem mais na mão do personagem.
- Postura de luta, combo de 6 golpes no chão e 3 golpes aéreos.
- Visão de calor, sopro congelante e demais poderes muito mais fortes.
- O mergulho meteoro para na superfície em vez de cavar até o fundo do mundo.

## 1.0.0 — Primeira versão
- Voo com física suave, decolagem, pairar, voo supersônico, mergulho e pousos.
- Visão de calor, sopro congelante, super soco, palma trovão, pancada no chão, super velocidade.
- Destruição do cenário configurável e 71 animações.
