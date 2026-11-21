# Itens Indestrutíveis — Add-on para Minecraft Bedrock

Armaduras, armas, ferramentas e **qualquer item com durabilidade** (espada, machado, picareta,
pá, enxada, arco, besta, tridente, escudo, elytra, vara de pesca, tesoura, isqueiro, maça...)
nunca quebram. Funciona também com itens de **outros add-ons**, desde que tenham durabilidade.

## Instalação

1. Baixe `dist/ItensIndestrutiveis.mcaddon` e abra o arquivo (o Minecraft importa sozinho).
2. No mundo, vá em **Pacotes de Comportamento** e ative **Itens Indestrutíveis**.
3. Pronto. Não é preciso ativar "Experimentos" (usa só a Script API estável).

Requer Minecraft Bedrock **1.21.0 ou mais recente**.

## Compatibilidade com outros add-ons

- **Não substitui nenhum arquivo do jogo**: nenhum item, entidade ou bloco vanilla é sobrescrito,
  então não entra em conflito com add-ons que alteram os mesmos itens.
- UUIDs próprios, sem dependências de outros pacotes.
- Apenas zera o dano dos itens via script — encantamentos, nomes, lore e dados de
  outros add-ons são preservados.
- A ordem na lista de pacotes não importa.

## Como funciona

O script (`IndestructibleItems_BP/scripts/main.js`) verifica os jogadores:
- **a cada tick**: armadura, mão secundária e item na mão principal;
- **a cada 1 segundo**: o inventário inteiro.

Quando um item com o componente `minecraft:durability` tem algum dano, ele volta à durabilidade
máxima. Como o reparo é contínuo, a barra de durabilidade nunca aparece e o item nunca quebra.

> Observação: itens fora do inventário (ex.: tridente arremessado, itens em baús) são reparados
> assim que voltam para o inventário de um jogador.

## Gerar o .mcaddon

```bash
./build.sh
```
