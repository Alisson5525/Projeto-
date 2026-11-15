# Ferramentas de desenvolvimento (não fazem parte do add-on)

- `gen_exploracao_itens.py` — gera os itens de exploração (JSON, textura 16x16 em pixel art, atlas e idiomas). Idempotente.
- `harness/run.mjs` — carrega `scripts/main.js` com `@minecraft/server` simulado, dispara `startup`/`worldLoad` e executa
  todos os intervalos 3 vezes. Detecta erros de importação, referências inválidas e exceções na inicialização.
- `harness/validate_structures.mjs` — executa o `plan()` de todas as estruturas em 4 rotações e valida cada bloco e estado
  contra a lista oficial (`@minecraft/vanilla-data` 1.26.60, com aviso de compatibilidade para 1.26.10), tabelas de saque
  e marcações dos mecanismos.
- `harness/validate_paths.mjs` — simula as estruturas novas em voxels e verifica por busca de caminho se salas, baús e
  mecanismos são alcançáveis a pé e se salas secretas/cofres ficam fechados antes de resolver os mecanismos.

Uso (a partir desta pasta): `node harness/run.mjs ../Cronicas_de_Valdoria_BP/scripts/main.js`
