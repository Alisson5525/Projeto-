# Histórico de mudanças

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
