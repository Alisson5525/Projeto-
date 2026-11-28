# Jujutsu Kaisen: Ilimitado — Bedrock (celular)

Porte do mod Java **My Jujutsu Kaisen** (NeoForge 1.21.1, técnica do Gojo / Ilimitado) para
**Minecraft Bedrock**, pensado para jogar no **celular** e leve o bastante para aparelhos fracos.

## Requisitos

- Minecraft Bedrock **1.26.50 ou mais novo** (Android, iOS, Windows ou consoles).
- **Não** precisa ativar nenhum experimento. Os comandos de teste (`/jjk:level` etc.) pedem trapaças ativadas.

## Instalação

1. Baixe o arquivo **`JJK_Ilimitado.mcaddon`**.
2. Abra o arquivo com o Minecraft:
   - **Android:** toque no arquivo (na pasta Downloads ou na notificação) e escolha *Minecraft*.
   - **iOS:** no app *Arquivos*, toque no arquivo → *Compartilhar* → *Minecraft*.
   - **Windows:** dê dois cliques no arquivo.
3. O jogo mostra "Importação concluída" duas vezes (pacote de comportamento e de recursos).
4. Crie ou edite um mundo → **Pacotes de Comportamento** → ative **Jujutsu Kaisen: Ilimitado**
   (o pacote de recursos é ativado junto). Entre no mundo.

Na primeira entrada aparece a escolha de técnica (cartas). Escolha o **Ilimitado** e você recebe o
item da técnica, que fica sempre no **slot 9** da barra.

## Controles (celular)

| Ação | Fora do combate | No modo de combate |
|---|---|---|
| Tocar e usar o item **Ilimitado** | entra no modo de combate | — |
| Agachado + usar o item | abre o **Menu Jujutsu** | sai do modo de combate |
| Slots **1–6** da barra | itens normais | técnicas 1–6 (a seleção volta sozinha ao slot 9) |
| Slot **7** | normal | **esquiva** na direção do joystick (parado = para trás) |
| Slot **8** | normal | **cura reversa** liga/desliga (precisa da TAR) |
| Atacar | normal | combo **M1** de 4 golpes |
| **Agachar** | normal | **defesa** (bloqueia golpes corpo a corpo pela frente) |
| `/jjk:menu` | abre o menu | abre o menu |

### Técnicas

| Slot | Normal | Despertado |
|---|---|---|
| 1 | **Infinito** (liga/desliga) | Infinito |
| 2 | **Azul** — toque: puxa o alvo da mira; toque de novo antes de 1,5 s: você vai até o alvo (ou voa para onde mira, se não houver alvo) | **Azul Máximo** — 8,5 s de conjuração; toque de novo para cancelar; joystick para frente/trás afasta ou aproxima a esfera |
| 3 | **Rajada** (nível 6) | Rajada |
| 4 | **Vermelho** (nível 18 + TAR) | **Vermelho Máximo** — mire e toque de novo para disparar (dispara sozinho após 10 s) |
| 5 | **Roxo Oco** (nível 32) — dispara sozinho após a carga de 7,45 s | Roxo desperto; durante os 5 s do **Roxo Próprio**: **Roxo Nuclear** |
| 6 | **Despertar** (nível 48) | **Vazio Ilimitado** (uma vez por Despertar) |

- **Roxo Próprio:** com o Azul Máximo parado no ar (conjuração completa), atravesse-o com o feixe do
  Vermelho Máximo. Nos 5 s seguintes, o slot 5 lança o **Roxo Nuclear**.
- **Técnica Amaldiçoada Reversa (TAR):** a partir do nível 15, *Menu → Técnicas Aprendidas → Iniciar
  Teste*. Agache para carregar e levante dentro da zona verde do medidor; acerte 2 de 3 pulsos sem
  se mover.
- **Seis Olhos:** receita com 6 diamantes em volta de um olho de ender (`DDD / DED / _D_`). Use o item,
  leia o aviso e use de novo no mesmo slot para **renascer**: você volta ao nível 0 (perde nível, atributos
  e XP), mas fica para sempre com custos −95% e Infinito grátis.

## Desempenho (celular fraco)

O mundo começa no perfil **leve**. Um operador pode mudar em *Menu Jujutsu → Configurações*:

- **Perfil de desempenho:** `leve` (padrão), `médio`, `alto` (alto = valores do Java). Controla a
  quantidade de partículas, quantos blocos são apagados por tick e o número de destroços do Azul Máximo.
- **Destruição de terreno:** `desligada`, `leve` (padrão: túneis e crateras menores) ou `completa`
  (Roxo Próprio com raio 24 e Roxo Nuclear com raio 64, como no Java).

Nunca são apagados: rocha-matriz, barreiras, blocos de comando/estrutura, portais e blocos com
conteúdo (baús, fornalhas, placas, geradores...).

Cada jogador ajusta no próprio menu: volume de efeitos, vozes e música, distância e lado da câmera e
números nos slots.

## Comandos

| Comando | Quem pode | O que faz |
|---|---|---|
| `/jjk:menu` | todos | abre o Menu Jujutsu |
| `/jjk:level <0-100>` | operador, trapaças | define o nível Jujutsu |
| `/jjk:xp <quantidade>` | operador, trapaças | dá XP Jujutsu |
| `/jjk:rct` | operador, trapaças | concede a Técnica Reversa |
| `/jjk:reset` | operador, trapaças | reinicia o perfil Jujutsu |

## O que muda em relação ao Java

O Bedrock não tem shaders, malhas 3D livres nem teclas extras no celular, então algumas coisas
foram adaptadas:

- **Teclas → toques:** "segurar" virou "tocar de novo" (Azul, Azul Máximo, Vermelho Máximo); o Roxo e
  o Vermelho Máximo disparam sozinhos; a defesa é o agachar; a cura reversa é um botão liga/desliga.
- **Efeitos visuais:** os efeitos Photon viraram partículas leves e esferas desenhadas por partícula;
  a distorção do Infinito virou uma ondulação no ponto de contato.
- **Vazio Ilimitado:** dimensão própria (vazia, com chão invisível), céu estrelado com fitas coloridas
  em vez do shader, cúpula da barreira feita de placas que fecham no mesmo padrão do Java. Quem estava
  dentro volta exatamente para onde estava, mesmo se o jogo fechar no meio.
- **Dano rápido:** o Bedrock ignora golpes repetidos em menos de meio segundo; os socos da Rajada e os
  pulsos do Roxo Nuclear são agrupados para dar o mesmo dano total.
- **Destroços do Azul Máximo:** cubos com a textura do bloco arrancado (o Bedrock não tem "block display").

## Problemas comuns

- **A barra de energia/ícones não aparece:** confira se o pacote de recursos está ativo e se você está
  no modo de combate (toque no item Ilimitado).
- **"Não há espaço para outra Expansão de Domínio":** o mundo atingiu o limite de áreas carregadas;
  espere outros domínios terminarem.
- **Ficou preso no Vazio depois de sair do jogo:** ao entrar de novo, você é devolvido automaticamente
  para onde estava antes do domínio.
