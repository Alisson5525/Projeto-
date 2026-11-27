# Zênite — Add-on para Minecraft Bedrock (design)

Data: 2026-11-27 · Status: aprovado pelo usuário (proposta curta) · Pasta do projeto: `zenite/`

## Intenção

O usuário pediu "um add-on de Minecraft do Satoru Gojo, absurdamente incrível em todos os
sentidos". O personagem, o visual e os nomes das técnicas pertencem a uma obra protegida por
direitos autorais. Por isso o add-on é uma **criação original**, no mesmo estilo: "o feiticeiro
mais forte", que manipula o espaço. O usuário pediu para manter os nomes originais das técnicas.
Esse pedido foi recusado pelo mesmo motivo, e usamos nomes próprios.

O sucesso é este: o jogador abre o `.mcaddon` no celular ou no PC, cria um mundo e se sente o
feiticeiro mais forte do mundo. Tudo deve impressionar: efeitos visuais, sons, controles
fluidos, progressão e uma luta contra um chefe.

## Metas

- Sete técnicas com efeitos visuais e sonoros próprios: barreira, atração, repulsão, combinação,
  teletransporte, cura e uma técnica suprema de área.
- Progressão no sobrevivência (Éter, maestria, chefe) e tudo liberado no criativo.
- Chefe com 3 fases e ataques telegrafados (dá para desviar).
- Armadura completa com bônus de conjunto e um diadema com auréola flutuante.
- Português (pt_BR) e inglês (en_US).
- Sem experimentos. Funciona no celular e no PC. Seguro para multijogador.
- Entregar o `.mcaddon`, o código-fonte, as ferramentas que geram os recursos e um README.

## Fora do escopo

- Java Edition.
- Skin ou modelo do jogador como personagem. O visual vem da armadura.
- Telas JSON UI customizadas: são frágeis e quebram entre versões.

## Antimetas (falhar nisso é fracassar, mesmo que funcione)

- Qualquer coisa que reproduza o personagem protegido: nome, aparência ou nomes das técnicas.
- Exigir experimentos ou sobrescrever arquivos do jogo base (por exemplo, `player.json`).
- Travar o jogo: o orçamento de partículas e de blocos por tick é limitado.
- Destruir construções sem dar ao jogador a opção de desligar a destruição.

## Restrições

- Script API: `@minecraft/server` **2.3.0** e `@minecraft/server-ui` **2.0.0**. Exige o
  jogo 1.21.120 ou mais novo (outubro de 2025). É a versão mais antiga que tem comandos
  customizados, o que dá o melhor equilíbrio entre compatibilidade e recursos.
- O ambiente não acessa minecraft.net, então não dá para rodar um servidor Bedrock.
- A verificação é feita com:
  - a checagem de tipos dos scripts contra os typings oficiais;
  - testes com um *mock* da API;
  - um validador de referências;
  - prévias renderizadas.
- Os formatos JSON seguem os exemplos oficiais da Mojang (bedrock-samples v1.26.60).

## Abordagens

1. **Add-on Bedrock com Script API estável e conteúdo data-driven (escolhida).** Dá controle
   total tick a tick (física, partículas, blocos), formulários e comandos. Não precisa de
   experimentos.
2. **Só comandos e funções.** Não tem formulários, a física é limitada e a lógica fica
   frágil. Descartada.
3. **Mod Java (Fabric).** "Add-on" é coisa do Bedrock, e o mod não rodaria no celular.
   Descartada.

## Design

### Identidade

- **Zênite, o Feiticeiro do Firmamento.** O tema é astronomia e cosmos.
- Paleta: azul-noite, prata e ouro estelar, ciano (gravidade), carmesim (nova) e violeta
  (horizonte).
- Namespace: `zenite:`.

### Éter (recurso)

- Máximo de 100 +10 por nível de maestria acima do 1 (190 no nível 10).
- Regeneração: 2/s mais 0,2/s por nível. O conjunto completo de armadura dobra a regeneração.
- No criativo, o Éter é infinito.

### Técnicas

| id | Nome | Custo | Recarga | Libera |
|----|------|-------|---------|--------|
| veu | Véu Assintótico (liga/desliga) | 10 + 3/s | 3 s | Nv 1 |
| poco | Poço Gravitacional | 25 | 6 s | Nv 1 |
| nova | Supernova | 30 | 7 s | Nv 1 |
| passo | Passo Espacial | 12 | 1,5 s | Nv 1 |
| reversao | Reversão Vital | 40 | 20 s | Nv 2 |
| horizonte | Horizonte de Eventos | 70 | 25 s | Nv 4 |
| abobada | Abóbada Celeste (suprema) | Éter cheio | 120 s | Coração do Firmamento |

- **Véu Assintótico:**
  - Resistência V (100%) enquanto estiver ativo.
  - Projéteis a até 3,5 blocos congelam no ar e caem quando o véu desliga ou você se afasta.
  - Monstros a até 1,6 bloco são empurrados.
  - Brilho sutil, onda e um "tink" ao parar algo.
  - Desliga sozinho quando o Éter acaba.
- **Poço Gravitacional:**
  - Esfera ciano que viaja até o ponto mirado (até 24 blocos) e dura 4 s.
  - Puxa tudo num raio de 9 blocos.
  - Causa 3 de dano a cada 0,5 s num raio de 2,5.
  - Corrói blocos num raio de 1,8 quando a destruição está ligada.
- **Supernova:**
  - Projétil carmesim rápido.
  - Na colisão: onda de choque de raio 7, até 14 de dano e explosão que quebra blocos (se a
    destruição estiver ligada).
  - O conjurador fica protegido da própria explosão.
- **Passo Espacial:**
  - Teletransporte de até 28 blocos.
  - Se você mirar numa entidade, aparece nas costas dela, virado para ela.
  - Deixa um rastro de partículas nas duas pontas.
- **Reversão Vital:**
  - Cura 12 de vida na hora e dá Regeneração II por 5 s.
  - Remove efeitos negativos e apaga o fogo.
- **Horizonte de Eventos:**
  - Canaliza por 2 s com lentidão, enquanto as esferas ciano e carmesim orbitam e se fundem à
    frente do jogador.
  - Depois dispara uma esfera violeta (raio 3) a 2 blocos por tick, por 45 ticks.
  - Apaga blocos (se a destruição estiver ligada; blocos protegidos ficam) e causa 45 de dano
    num raio de 3,5.
  - Tem flash e tremor de tela.
- **Abóbada Celeste:**
  - Cúpula de raio 14 feita do bloco `zenite:firmamento`, estrelado, animado e luminoso. Ela é
    colocada só onde há ar.
  - Dura 20 s.
  - Os inimigos dentro ficam congelados no lugar, com lentidão, fraqueza e escuridão, e levam
    2 de dano por segundo.
  - O conjurador ganha Força II, Velocidade II e Regeneração. Lá dentro, as técnicas custam 0 e
    recarregam na metade do tempo.
  - Tem câmera cinematográfica orbitando o conjurador (se estiver ativada), flash violeta,
    título e névoa estelar.
  - A cúpula fecha de cima para baixo e se desfaz no fim.
  - As posições ficam salvas para limpeza caso o mundo feche no meio da técnica.

### Controles

- **Astrolábio do Zênite:**
  - Usar lança a técnica selecionada.
  - Agachar e usar abre a **Roda de Técnicas**, um formulário com ícones, custo, recarga e
    bloqueio. Ela também dá acesso a Sigilos, Configurações, Códice e Status.
- **Sigilos** (um item por técnica, opcionais): lançam a técnica direto da barra rápida.
- **Comandos:**
  - `/zenite:menu` e `/zenite:codice` para todos.
  - `/zenite:kit`, `/zenite:nivel <n>`, `/zenite:arconte` e `/zenite:limpar`, que exigem
    trapaças.
- Interagir com um bloco segurando o Astrolábio também lança a técnica. Um *debounce* de
  4 ticks evita lançar duas vezes.

### Maestria

- XP ganho:
  - matar um mob: 5 + vida máxima ÷ 2;
  - matar o chefe: 600;
  - lançar uma técnica: +1 (no máximo uma vez por segundo).
- Níveis de 1 a 10, nos limiares acumulados 0, 60, 160, 320, 540, 820, 1160, 1560, 2020 e
  2540.
- Subir de nível mostra um título, toca um som, solta partículas e manda uma mensagem.

### Itens

| id | Nome | Obtenção |
|----|------|----------|
| poeira_estelar | Poeira Estelar | sem forma: ametista + pó de glowstone + lápis → 2 |
| astrolabio | Astrolábio do Zênite | formato: P D P / G O G / P D P (P=poeira, D=diamante, G=ouro, O=olho do fim) |
| codice | Códice do Zênite | sem forma: livro + poeira. Também é dado no primeiro login |
| selo_eclipse | Selo do Eclipse | C P C / P O P / C P C (C=obsidiana chorona) |
| coracao_firmamento | Coração do Firmamento | drop do chefe. Usar libera a Abóbada (ou dá 500 XP se já estiver liberada) |
| sigilo_* (7) | Sigilo: <técnica> | pela Roda de Técnicas |
| diadema / manto / perneiras / botas | Traje do Zênite | peça de diamante cercada de poeira estelar |

- Bônus da armadura:
  - Diadema: Visão Noturna, renovada sem piscar.
  - Conjunto completo: Éter regenera 2× mais rápido, Velocidade I e o Véu drena metade.

### Bloco

- `zenite:firmamento`:
  - textura estelar animada (flipbook) e emissão de luz;
  - inquebrável e imune a explosões;
  - não dropa nada e fica escondido do inventário criativo.

### Chefe: Arconte do Eclipse

- Design original:
  - figura de túnica com 2,6 blocos de altura;
  - a cabeça é um disco de eclipse com coroa luminosa;
  - auréola partida flutuante e fragmentos orbitando;
  - runas emissivas (material `entity_emissive_alpha`).
- Atributos:
  - 500 de vida, 10 de ataque e velocidade 0,28;
  - barra de chefe;
  - imune a fogo e a queda;
  - persistente.
- Fases:
  - **Fase 1 (100–66%):** corpo a corpo, puxão gravitacional no alvo (cerca de 7 s) e
    teletransporte para as costas (cerca de 9 s).
  - **Fase 2 (66–33%):** chuva de 3 novas teleguiadas que dá para desviar, Véu Negro (4 s
    invulnerável, a cada 15 s) e 2 Ecos (vex) invocados ao entrar na fase.
  - **Fase 3 (<33%):** fúria. O chefe fica mais rápido e usa o "Eclipse Total": 1,5 s de
    carga com a trajetória marcada, depois um feixe em linha reta com dano alto.
- Transições de fase: rugido, partículas e falas no chat.
- Morte: implosão cinematográfica de 2 s, drop do Coração do Firmamento, diamantes e XP, e
  600 de maestria.
- Invocação: o Selo do Eclipse inicia um ritual de 5 s (coluna de partículas, raio e som).
  Também há um ovo de spawn no criativo.
- Sem jogadores a até 32 blocos, o chefe regenera 1% de vida por segundo.

### HUD

- Barra de ação, a cada 5 ticks, para quem segura um item do Zênite ou está com Véu ativo,
  canalizando ou dentro da Abóbada.
- Usa uma página de glifos própria: segmentos da barra de Éter e ícones das técnicas.
- Mostra o Éter (atual/máximo), a técnica selecionada e se está pronta ou em recarga, e os
  estados ativos.

### Configurações

- Do mundo (só operador): destruição de terreno (ligada), técnicas atingem outros jogadores
  (desligado), boas-vindas (ligadas).
- Do jogador: câmera cinematográfica, tremor de tela e HUD (todos ligados).

### Recursos

- Texturas em pixel art procedural (Python e PIL), geradas por `ferramentas/`.
- Geometria do chefe e do diadema gerada a partir de uma única descrição, com prévias em 3D.
- Sons sintetizados em numpy e gravados em OGG Vorbis.
- Cerca de 10 partículas com variáveis Molang para cor e tamanho. Névoa `zenite:abobada`.

### Testes

- `tsc --checkJs` contra os typings 2.3.0.
- `node:test` para a lógica pura (progressão, Éter, matemática, HUD).
- Smoke test com um mock da API: o `main.js` carrega, se inscreve nos eventos e simula ticks
  e técnicas.
- Validador estático:
  - JSON e UUIDs;
  - referências entre arquivos (texturas, geometrias, partículas, sons, itens das receitas e
    das loot tables);
  - chaves de idioma nos dois arquivos.

## Decisões deixadas para quem constrói

O desenho exato da pixel art, o design de som, o ajuste das partículas e os números finos de
balanceamento.
