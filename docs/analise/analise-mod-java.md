# Análise completa do mod "My Jujutsu Kaisen" (Java) — base para a versão Bedrock

Arquivo analisado: `jujutsukaisen-0.0.0.jar` (30 MB, 552 arquivos).
Método: extração do .jar, descompilação das 270 classes (~26.700 linhas de Java) e leitura de todos os
arquivos de dados, animações, sons, texturas e efeitos.

Tempos estão em segundos (20 ticks = 1 s). "CE" = energia amaldiçoada.

---

## 1. Visão geral

| Item | Valor |
|---|---|
| Plataforma | Minecraft **Java 1.21.1**, loader **NeoForge 21.1.265+** |
| Dependências obrigatórias | **Photon** 2.2.10+ (efeitos visuais), **LDLib2** 2.2.45+, **Player Animation Library** 1.1.6+ |
| Nome / versão | "My Jujutsu Kaisen" 0.0.0, licença "All Rights Reserved" |
| Idiomas | inglês (`en_us`) e coreano (`ko_kr`) |
| Conteúdo jogável | 1 técnica inata completa: **Ilimitado (Gojo)**. "Boogie Woogie" e "Ratio" aparecem só como nomes futuros |

Sistemas principais:

1. Perfil e progressão (nível 0–100, XP, 3 atributos)
2. Energia amaldiçoada (máximo, regeneração, custos)
3. Modo de combate (câmera de ombro, combo de socos, defesa, esquiva, atordoamento)
4. 6 slots de técnica + versões do Despertar (12 habilidades no total)
5. Expansão de Domínio: Vazio Ilimitado (dimensão separada)
6. Técnica Amaldiçoada Reversa (teste de aprendizado + cura)
7. Item Seis Olhos (receita + "renascimento")
8. Interface: HUD de combate, Menu Jujutsu, tela de escolha de técnica com cartas
9. Áudio (27 sons com vozes e música) e efeitos visuais (Photon + shaders)

---

## 2. Perfil, progressão e atributos

Dados salvos no jogador (mantidos após a morte):

- `level` 0–100, `technique` (`none` / `limitless` / `boogie_woogie` / `ratio`), `crafted_six_eyes`, `reverseTechnique`
- `xp`, `vitality`, `strength`, `cursed` (cada atributo vai de 0 a 100)

### XP

- XP para o próximo nível: `40 + 3·n + n²/24` (n = nível atual; 0 no nível 100)
- Matar uma criatura: `22 + 0,65 × vida máxima` (vida limitada a 160) → zumbi = 35 XP
- Wither: 750 XP. Ender Dragon: 1200 XP (para quem causou dano)
- Conquistas: tarefa 60, objetivo 150, desafio 300 (fora do criativo)
- Usar técnicas: `3 + custoBase/12`, entre 4 e 24 XP, sem mensagem
  (Infinito 6, Azul 8, Rajada 4, Vermelho 11, Roxo 19, Despertar 11, Vazio 24, Azul Máx. 14, Vermelho Máx. 16, Nuke 13, fusão Roxo Próprio 13, cura RCT 6)
- Mensagens na barra de ação: "+X Jujutsu XP (a/b)" e "Jujutsu Level N · +3 stat points"

### Pontos de atributo

3 pontos por nível (300 no nível 100). Podem ser adicionados e removidos livremente no menu.

| Atributo | Efeito por ponto | No máximo (100 pts) |
|---|---|---|
| Vitalidade | +0,25 de vida máxima; −0,2% de dano recebido | +25 de vida (12,5 corações); −20% de dano |
| Força | +0,04 de dano de ataque; +0,8% de dano físico (socos, Rajada) | +4 de ataque; +80% |
| Energia | +4,6 de CE máxima; +0,65% de dano de técnicas | +460 CE; +65% |

### Energia amaldiçoada

- Máximo: `240 + 3 × nível + 4,6 × pontos de Energia`, teto 1000
- Regeneração (a cada 0,25 s): nada nos primeiros 0,75 s após usar técnica; depois sobe suavemente
  (curva smoothstep por ~11,25 s) até `2 + 12 + pontosEnergia/25` por 0,25 s; **30% mais rápida fora do modo de combate**
- Infinito ligado: **pausa** a regeneração e consome 28 CE/s (7 a cada 0,25 s); desliga sozinho com 0 CE
- Com Seis Olhos: custo = `arredondar para cima(base / 20)` (−95%); Infinito sem custo (a regeneração continua pausada)

### Desbloqueios

| Slot | Habilidade | Requisito |
|---|---|---|
| 1 | Infinito | nível 0 |
| 2 | Azul | nível 0 |
| 3 | Rajada (Barrage) | nível 6 |
| 4 | Vermelho | nível 18 **e** ter aprendido a RCT |
| 5 | Roxo Oco | nível 32 **e** Vermelho desbloqueado |
| 6 | Despertar | nível 48 |
| — | Teste da RCT | a partir do nível 15 |

---

## 3. Controles originais (PC)

| Tecla | Ação |
|---|---|
| R | Liga/desliga o modo de combate |
| M | Abre o Menu Jujutsu |
| 1–6 | Habilidades (no modo de combate as teclas da hotbar ficam bloqueadas) |
| Segurar 2 / 4 / 5 | Variações "segurar" (Azul puxando o Gojo, Azul Máximo, Vermelho Máximo, carga do Roxo) |
| Botão esquerdo | Combo de socos (M1) |
| Botão direito (segurar) | Defesa |
| Alt + W/A/S/D | Esquiva (rolamento) na direção |
| C (segurar) | Cura com RCT |
| Roda do mouse | Distância do Azul Máximo |
| Botão direito com Seis Olhos | Usar o item (2× para confirmar) |

Na carga do Roxo, Azul Máximo e Vermelho Máximo, o movimento vertical bruto do mouse controla a mira
(arfagem até ±180° e rolagem no ar), permitindo "virar" a mira por cima da cabeça.

---

## 4. Modo de combate

Exigido para todas as técnicas. Ao entrar:

- **Câmera de ombro** em 3ª pessoa: distância 2,8; deslocamento 0,7 à direita; 0,25 para cima;
  suavização 0,16 s; evita atravessar paredes; balanço da câmera nos socos (força 0,6)
- O HUD de combate substitui a hotbar (que desliza para baixo); vida, fome, armadura e XP são reposicionados
- Mira personalizada de "cantos invertidos"
- O botão de usar/atacar normais são cancelados (viram defesa / M1)

Ao sair: interrompe Rajada, Vermelho, Azul Máximo, Vermelho Máximo e desliga o Infinito.

### 4.1 Combo M1 (4 golpes)

| Golpe | Contato | Encadeia em | Dano base | Alcance | Atordoa | Empurrão |
|---|---|---|---|---|---|---|
| 1–3 | 0,15 s | 0,45 s | 1,75 | 2,5 | 0,6 / 0,6 / 0,75 s | mínimo (0,035) |
| 4 (forte) | 0,30 s | recuperação 1,0 s | 3,25 | 3,5 | 1,0 s | 0,4 + leve elevação |

- Dano × multiplicador de Força. Janela de combo: 1 s. Buffer de entrada: 0,15 s
- Alvo: o mais próximo num cone frontal de 120°, diferença de altura ≤ 2,4, com linha de visão
- −55% de velocidade enquanto ataca; o corpo trava na direção da câmera
- O 4º golpe dá 1 s de **proteção de finalização** ao alvo (imune a novos golpes)
- O empurrão padrão do Minecraft é cancelado (usa o empurrão próprio)

### 4.2 Defesa

- Segurar o botão direito: bloqueia golpes corpo a corpo vindos da **frente** (cone de 120°)
- Não bloqueia projéteis, explosões nem dano que ignora escudo
- −45% de velocidade

### 4.3 Esquiva (rolamento)

- 4 direções (frente/trás/esquerda/direita), 0,5 s, velocidade inicial 0,72 com desaceleração, pequeno salto
- **Invulnerável** durante o rolamento; recarga 2 s
- Pode ser usada **para escapar de atordoamento** (depois disso, só de novo em 12 s); escapar de uma Rajada interrompe o agressor
- No ar, a uma altura de até 2,6 blocos, fica "armada" por 0,35 s e executa ao tocar o chão, **anulando o dano de queda**

### 4.4 Atordoamento

Bloqueia movimento, ataques, uso de itens e interações. Criaturas param no lugar. Quem está
atordoado não causa dano (nem com projéteis).

---

## 5. Técnicas do Ilimitado

Custos sem Seis Olhos. "Invulnerável" = todo dano recebido é cancelado.

### Slot 1 — Infinito (alternar)

- Custo 45 para ligar + 28 CE/s; recarga de 3 s depois de desligar
- Projéteis e blocos caindo que se aproximam (dentro de 5,2 blocos) são desacelerados
  progressivamente (`((distância − 0,42)/4,78)^1,55`) e param a 0,42 bloco do corpo
- Criaturas também desaceleram até 1,5% da velocidade e são empurradas para fora (0,44 bloco)
- Cancela: ataques corpo a corpo de jogadores/criaturas, ferrões, projéteis (flechas, tridentes,
  bolas de fogo, cargas de vento, fogos, crânios), blocos caindo/bigornas/estalactites, explosões
  originadas fora do corpo (inclusive o empurrão)
- **Não** cancela: magia, veneno/wither, fogo, lava, queda, afogamento, sufocamento, raio, sopro do dragão, sonic boom, espinhos
- Som de "deflexão" (no máximo a cada 0,25 s); visual com shader de distorção ao redor do Gojo

### Slot 2 — Lapso: Azul

- Custo 60, recarga 5 s. Animação de 2,25 s; −55% de velocidade enquanto conjura
- Alvo escolhido pela mira: até 16 blocos, cone de 22°, com linha de visão
- **Toque**: aos 1,5 s o alvo é atordoado por 2 s e **puxado** até 1,55 bloco à frente do Gojo
  (velocidade até 1,35 bloco/tick)
- **Segurar até 1,5 s**: em vez disso, o **Gojo é puxado** até o alvo (com inércia, desviando de paredes, para a ~1,2 bloco)
- Segurar **sem alvo**: o Gojo voa na direção da mira por até 16 blocos (o custo só é cobrado nesse caso)
- Alvo em defesa interrompe o puxão; alvo que rola escapa

### Slot 3 — Rajada (Barrage)

- Gratuita, recarga 10 s, nível 6; −72% de velocidade
- Agarrão aos 0,25 s (alcance 2,65, cone estreito, altura ≤ 1,8); bloqueado por defesa frontal; se errar, termina em 1 s
- Acertando: alvo preso 1,42 bloco à frente, seguindo o Gojo; **13 socos** + **chute** que lança (1,2 para frente, 0,46 para cima)
- Dano total 6 × Força (agarrão 1 + 13 × 0,2 + chute 2,4); sequência completa ~6,45 s
- **Gojo invulnerável** durante os socos; alvo atordoado até 1 s após o fim

### Slot 4 — Reversão: Vermelho

- Custo 100, recarga 8 s; nível 18 + RCT. Animação 1,15 s, explosão aos 1,0 s; −70% de velocidade
- Levar dano durante a conjuração cancela
- Explosão repulsiva de **raio 5** na frente da palma: dano 13 (centro) → 6 (borda) × Energia; empurrão forte
- **Escava um domo** de raio 5 no terreno (não quebra baús/blocos com dados nem blocos inquebráveis)

### Slot 5 — Roxo Oco

- Custo 200, recarga 20 s; nível 32 + Vermelho
- O Gojo fica parado (sem gravidade, **invulnerável**); se estiver no ar, sobe 1,7 bloco
- Fusão do Azul e Vermelho aos 6,15 s; pose pronta aos 7,45 s; ao soltar a tecla (ou depois de 7,45 s se já solta), 1 s de preparo e disparo
- Projétil: nasce a 3,8 blocos, 2 blocos/tick, alcance **160 blocos**, **raio 3,4**, dano **24** × Energia (1× por alvo)
- **Apaga todos os blocos** quebráveis no caminho (até 700 por tick)

### Slot 6 — Despertar

- Custo 100, recarga 100 s; nível 48
- Cinemática de 7,85 s: sobe até 10 blocos (limitado pelo teto), paira, desce; **invulnerável**; voz "transform"
- Depois: **60 s de Despertar**, que transforma os slots 2, 4, 5 e 6:

| Slot | Normal | No Despertar |
|---|---|---|
| 2 | Azul | Azul Máximo |
| 4 | Vermelho | Vermelho Máximo |
| 5 | Roxo Oco | Roxo Desperto / Roxo Nuclear |
| 6 | Despertar | Vazio Ilimitado (1× por Despertar) |

### Azul Máximo (Despertar, slot 2)

- Custo 140, recarga 40 s. **Segurar** para conjurar; Gojo travado no ar/chão e invulnerável; câmera recua (4,5) e FOV vai a 90
- A esfera nasce no peito, orbita ao redor do Gojo (3,45 s) e vai para 9 blocos à frente
  (roda do mouse ajusta de 2,5 a 24); depois acompanha a mira
- Soltar antes de 8,45 s **cancela**; segurar até o fim **deixa o campo parado** no lugar (até ~39 s de vida)
- A cada 0,5 s: puxa entidades num raio de até 4,5 e causa 1,5 × Energia (máx. 16 acertos por alvo)
- A cada 0,25 s: **arranca até 8 blocos** num raio de até 10, que viram destroços girando até o centro e somem (máx. 256)

### Vermelho Máximo (Despertar, slot 4)

- Custo 160, recarga 12 s. **Segurar** para mirar (sobe 1,7 bloco, invulnerável, voz + som de carga em loop); **soltar dispara**
- Feixe de **48 blocos** (3 blocos/tick), **raio 2,36**, dano **22** × Energia, empurra 1,8; apaga blocos (240/tick)
- Se o feixe passar a ≤ 6,9 blocos de um **Azul Máximo parado** do próprio Gojo → **Roxo Próprio**

### Roxo Desperto (Despertar, slot 5)

Igual ao Roxo Oco, com raio 5,3 e dano 34.

### Roxo Próprio (fusão Azul Máximo + Vermelho Máximo)

- Esfera instável com som de faíscas; janela de **5 s** para ativar o Roxo Nuclear
- Se não, explode após 6 s: **raio 24**, dano **40** × Energia em todos dentro;
  se o Gojo estiver dentro, **perde metade da vida atual** (sem dano de queda depois)
- **Apaga a esfera de terreno** de raio 24

### Roxo Nuclear (Nuke — slot 5 durante a janela do Roxo Próprio)

- Custo 120. Cinemática de **21,3 s**, Gojo invulnerável o tempo todo
- Roteiro: sobe 15 blocos (4 s) enquanto o Roxo Próprio espirala para 17 blocos acima da cabeça;
  Azul sai da mão esquerda (4–5,9 s) e entra em órbita; Vermelho sai da direita (8–9,75 s);
  fusão aos 10 s; segunda espiral aos 12 s; carga aos 13 s; **explosão aos 19 s** com ~15–22 s de duração
- Explosão: **raio 64**, 6 × Energia de dano por segundo (pulsos a cada 0,25 s); o Gojo perde 50% da vida
- **Apaga uma esfera de terreno de raio 64** (~1,1 milhão de blocos), de cima para baixo, ao longo da explosão
- Câmera cinematográfica: sobe 10 blocos olhando para cima, gira 180°, olha para baixo, vai para a frente
  (25 blocos), entra em órbita de 55 blocos acelerando; tremor; HUD some e volta
- Voz + efeito sonoro + **música própria** para quem está no raio; visível até 256 blocos; 30 s sem dano de queda

### Vazio Ilimitado (Despertar, slot 6)

- Custo 280, uma vez por Despertar. Raio **24**; o Gojo fica imóvel enquanto forma (3,5 s)
- Painel em estilo **mangá** desliza na tela com a imagem do domínio e o Gojo em pose
- Captura todos no raio (máx. 64 entidades) e os **transfere para uma dimensão própria**
  (vazio, chão de bedrock na altura 64, noite fixa), mantendo as posições relativas
- **20 s** ativo: todos exceto o Gojo ficam **paralisados** ("sobrecarga de informação": símbolos piscando sobre a cabeça)
- Barreira com **80 de vida**, impenetrável enquanto fechada; quem está fora a desgasta: socar a barreira 4
  (1× a cada 0,5 s), ataque que a atravessaria até 20, projétil 6, explosão 12, Roxo 40, Vermelho Máx. 20; se zerar, o domínio cai
- Ao terminar (fratura de 0,9 s), todos voltam exatamente para onde estavam; mortes, logout e itens dropados são tratados
- Interior: céu procedural (shader), "eclipse"/buraco negro ao longe, 672 fitas coloridas (roxo, rosa, azul)

---

## 6. Técnica Amaldiçoada Reversa (RCT)

- **Teste** (nível 15+, no menu): 3 pulsos. Segurar o botão e soltar dentro da zona verde:
  pulso 1: 0,6–1,1 s; pulso 2: 1,1–1,55 s; pulso 3: 0,8–1,2 s. Segurar mais de 2,5 s = erro.
  Acertar 2 de 3 aprende a RCT. Falha se mover >0,6 bloco, levar dano ou montar; expira em 30 s parado
- **Cura** (segurar C): +4 de vida (2 corações) por 40 CE, no máximo 1×/s; só se não estiver com vida cheia

## 7. Seis Olhos

- Item épico, não empilha. Receita: olho de ender no centro + 6 diamantes nas outras casas
  (livro de receitas: `DDD / DED / _D_`), liberada ao ter diamante e olho de ender
- Clique direito → aviso em vermelho; clique de novo (mesmo slot) → **renascimento**:
  volta ao ponto de nascimento, zera nível JJK, atributos e XP vanilla, remove efeitos, enche fome e vida
- Fica com **Seis Olhos** para sempre: custos −95% e Infinito gratuito

---

## 8. Interface

### HUD de combate

- Moldura pixel-art 512×171 (tons ciano) no centro inferior
- Barra de energia em hexágono alongado com animação de preenchimento
- 6 slots com ícones do Ilimitado (versões do Despertar para slots 2, 4, 5, 6)
- Recarga (varredura), cadeado com nível/requisito ("RCT", "Red"), números 1–6 opcionais,
  indicador do Infinito e de "segurar", borda com tempo restante do Despertar
- Mira de cantos invertidos; esconde a mira padrão

### Menu Jujutsu (tecla M)

- **Poder**: Atributos (pontos, níveis, efeitos) · Técnica Inata (prévia Normal/Desperto com nome, descrição, custos e nível de desbloqueio de cada slot, selo dos Seis Olhos) · Técnicas Aprendidas (RCT com o teste; Black Flash "em desenvolvimento"; Domínio Simples "planejado")
- **Configurações**: Câmera (suavização, distância, deslocamento lateral, altura, corpo acompanha o ataque) · Controles · Gráficos/HUD (escala, números dos slots, indicadores) · Som (efeitos, vozes, música)
- Visual "ritual": fundo, moldura, abas, botões e divisórias próprios

### Escolha de técnica (primeiro login / sem técnica)

Cartas caem viradas (verso "呪術廻戦"), pousam, viram revelando "Limitless"; ao escolher: foco,
pausa de impacto e **queima amaldiçoada** (flipbook 6×6); sons próprios para cada etapa.

## 9. Áudio

27 arquivos OGG: vozes do Gojo (Azul Máx., Vermelho Máx., Roxo, Vazio, Despertar, Nuke),
efeitos (puxão do Azul, explosão do Vermelho, deflexão do Infinito, agarrão, faíscas, explosões),
música do Nuke e 6 sons da tela de cartas. Cada som tem volume e alcance próprios; há 3 canais
(efeitos, vozes, música) controláveis no menu.

## 10. Recursos visuais

- **12 arquivos de animação do jogador** (combo, defesa, rolamento, corrida, Azul, Vermelho,
  Rajada, Azul Máx., Vermelho Máx. pronto/disparo, Roxo, Despertar, Domínio, Nuke).
  Estão no **formato de animação do próprio Bedrock (1.8.0)**, com alguns "easings" extras
- **18 efeitos Photon** (~300 emissores no total): esferas, brilhos, fitas de sucção, ondas de
  choque, raios, explosão do Nuke etc.; 26 texturas de efeito (até 4096×4096); 3 malhas OBJ e 7 GLB
- **Shaders próprios**: distorção do Infinito, céu do Vazio Ilimitado, buraco negro do Nuke, refração
- Texturas de interface: HUD, ícones, menu, cartas, imagem do domínio, glifos da sobrecarga

## 11. Comandos (operador)

`/jjk level <0-100>` · `/jjk rct grant` · `/jjk reset` · `/jjk_menu_xp <quantidade>`

## 12. Partes que são só ferramentas de desenvolvimento

Ponte de editor do Photon, servidor MCP e exportador de PNG — usados pelo autor para criar os
efeitos; não fazem parte do jogo e não precisam ser portados.

---

## 13. O que muda no Bedrock (celular)

| Parte | Como fica no Bedrock | Fidelidade esperada |
|---|---|---|
| Regras, números e tempos | Script API (JavaScript) estável | Total |
| Sons | Reaproveitados direto | Total |
| Ícones, HUD, menu, cartas | Reaproveitados (texturas grandes reduzidas para celular) | Total |
| Animações do jogador | Conversão automática (renomear ossos, "assar" os easings) | Alta |
| HUD de combate | JSON UI | Alta |
| Menus e tela de cartas | Formulários do servidor com visual customizado | Alta |
| Câmera de ombro e cinemáticas | Presets de câmera, FOV, fade, tremor | Alta |
| Vazio Ilimitado | Dimensão customizada (JSON estável desde 1.26.50) | Alta |
| Efeitos Photon | Partículas do Bedrock + entidades com brilho | Média-alta |
| Shaders (distorção, céu do domínio) | Não existem em add-ons → aproximação com partículas/entidades | Média |
| Controles | Sem teclado: precisam ser redesenhados para toque | Adaptado |
| Destruição de terreno | Preenchimento em lotes; esferas de raio 24/64 pesam no celular | Ajustável |
