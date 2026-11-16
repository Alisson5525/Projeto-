# Myths & Magic 1.0.10: correções

Este arquivo lista as correções feitas sobre o add-on original **Alylica's Myths & Magic 1.0.9**.

- **Download:** `dist/MythsAndMagic1.0.10-corrigido.mcaddon`
- **Código-fonte corrigido:** `MythsAndMagic/BP` e `MythsAndMagic/RP`

## Compatibilidade

| Item | Valor |
|---|---|
| Versão mínima do jogo | 1.26.50 (igual ao original) |
| Script API | `@minecraft/server` 2.10.0 e `@minecraft/server-ui` 2.0.0, ambas estáveis |
| Versão do pacote | 1.0.10. O número subiu para que o Minecraft aceite importar este pacote por cima do 1.0.9. |

## Erros corrigidos

### Arquivos JSON quebrados
- **13 arquivos `RP/attachables/magic_staff/*/earth_staff.json`:** cada um tinha dois objetos JSON colados e não carregava. Isso deixava o cajado de terra sem modelo e sem textura na mão. Mantive uma cópia de cada.

### Entidades, loot e trocas
- **Entidade `mm:coven_ruins_mob` duplicada:** o arquivo `entities/structure/coven_ruins.json` era uma cópia errada do `sanctuary_mob`. Quando o jogo carregava essa cópia, a Booze e a Bruxa das Coven Ruins não apareciam. Removi a cópia e mantive a versão que as estruturas usam.
- **Loot tables que não existiam:** criei `loot_tables/entities/mage.json` e `loot_tables/entities/stray_polar_bear.json`. As duas estão vazias, para não inventar drops.
- **IDs de itens vanilla antigos, que não existem mais:** troquei pelos IDs atuais em 11 loot tables e numa troca de aldeão.
  - `horsearmoriron`, `horsearmorgold` e `horsearmordiamond` viraram `iron_horse_armor`, `golden_horse_armor` e `diamond_horse_armor`.
  - `record_*` virou `music_disc_*`.
  - `map` virou `filled_map`.
  - `turtle_shell_piece` virou `turtle_scute`.
- **Loot do tesouro do Scrubel:** uma função não tinha a chave `"function": "set_damage"`.

### Blocos
- **Blocos com formato 1.26.20 ou mais novo (ballista, porta e escada twisted):** o `minecraft:tags` desses blocos tinha tags sem namespace (`axe_mine`, `pickaxe_mine`), e esse componente exige o formato `namespace:tag`. Nada no add-on usava essas tags, então removi.

### Scripts (erros em tempo de execução)
- **`demonArmour.js`:** usava a variável `player`, que não existia. O som de quebra da armadura demoníaca lançava erro.
- **`depleteDurability.js`:** usava a variável `source`, que não existia. Também não verificava se quem minerava era um jogador.
- **`icarusBoots.js`:** a variável `val` não existia (o certo era `value`).
- **`icicleSpear.js`:**
  - usava a variável `snowballProjectile`, que não existia;
  - lia a posição da entidade morta depois de ela já ter sumido;
  - não verificava se o atacante ainda era válido.
- **`mymik.js`:** o ID do scriptevent estava sem `mm:`, então nunca batia com o evento enviado. Por isso o ataque à distância do Mymik e do Dyzgise não reativava. Também passou a verificar se a entidade ainda existe.
- **`magicTriggered.js`:**
  - podia ler `originLoc.x` com `originLoc` indefinido, e chamava `hasParticipant` sem identidade de placar;
  - os sons `spell.shadow.charge` e `spell.purify` não existem. Troquei pelos sons definidos `spell.shadow.cast` e `spell.purify.cast`.
- **Comando `/mm:testpopup`:** o parâmetro de fundo era o objeto de definição em vez do valor, e o ícone padrão apontava para uma textura inexistente.
- **Comandos customizados (`/mm:*`):** não quebram mais quando são executados por bloco de comando, pelo console ou por entidades que não são jogadores.
- **`meteorArmour.js`:** a propriedade `mm:airtime` começava como `NaN`. Também troquei o `&` por `&&`.
- **`ballista.js`:** adicionei uma proteção para quando o bloco de disparo não está carregado. O comportamento de disparo continua o original.
- **Removido `blockBehaviour/orbPondererOld.js`:** era um backup antigo que nunca era carregado e importava `Enchantment`, que não existe mais na API.

### Interface (HUD)
- **`hud_screen.json`:** tinha 166 elementos de barras de chefe de **outros add-ons**, sobra de um template, com cerca de 60 texturas inexistentes. Toda vez que uma barra de chefe aparecia, isso gerava erros de textura. Removi esses elementos, e a barra de chefe voltou a ser a vanilla. A barra de mana, os toasts e a ação do relógio continuam iguais.

## Como foi verificado
- Os 2.631 arquivos JSON são analisados sem erro. O jogo aceita comentários, e eles foram mantidos.
- Os 143 scripts têm a sintaxe e os tipos verificados contra `@minecraft/server` 2.10.0. Todos os imports e exports existem.
- Referências cruzadas conferidas:
  - texturas, geometrias, animações, render controllers, partículas e sons, comparando com os recursos vanilla;
  - componentes customizados registrados nos scripts;
  - loot tables, receitas, features e estruturas.
- Os nomes de componentes de itens, blocos e entidades foram conferidos contra o schema oficial `@minecraft/bedrock-schemas` 1.26.60.

## Observações
- O Alterrealm é uma dimensão customizada definida em JSON. Isso é um recurso recente do jogo e foi mantido como o autor fez.
- Se o mundo já usa a 1.0.9, depois de importar confira em **Configurações do mundo → Pacotes** se a versão 1.0.10 está ativa.
