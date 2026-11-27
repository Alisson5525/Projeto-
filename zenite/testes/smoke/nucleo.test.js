// Smoke tests do núcleo de runtime, rodando os scripts reais sobre o mock da API.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { world, system, Player, Entity, ItemStack, GameMode, __resetarMundo } from '@minecraft/server';
import { __responder, __formsMostrados, __limparForms } from '@minecraft/server-ui';

let L, E, C, M;
const dim = () => world.getDimension('overworld');
const jogador = (nome = 'Ana') => new Player(dim(), { x: 0.5, y: 64, z: 0.5 }, nome);
const esperar = () => new Promise((r) => setImmediate(r));

before(async () => {
  await import('../../BP/scripts/main.js');
  system.__startup();
  world.afterEvents.worldLoad.__emit({});
  L = await import('../../BP/scripts/core/lancar.js');
  E = await import('../../BP/scripts/core/estado.js');
  C = await import('../../BP/scripts/core/combate.js');
  M = await import('../../BP/scripts/sistemas/maestria.js');
});

test('main registra eventos e comandos', () => {
  for (const n of ['itemUse', 'playerInteractWithBlock', 'entityDie', 'playerSpawn', 'worldLoad']) {
    assert.ok(world.afterEvents[n].handlers.length > 0, `afterEvents.${n}`);
  }
  assert.ok(world.beforeEvents.playerLeave.handlers.length > 0, 'beforeEvents.playerLeave');
  for (const c of ['zenite:menu', 'zenite:codice', 'zenite:kit', 'zenite:nivel', 'zenite:arconte', 'zenite:limpar']) {
    assert.ok(system.__comandos.has(c), `comando ${c}`);
  }
});

test('isAlvoValido respeita pvp', () => {
  __resetarMundo();
  const a = jogador('A');
  const b = jogador('B');
  const z = new Entity('minecraft:zombie', dim(), { x: 3, y: 64, z: 0 });
  const item = new Entity('minecraft:item', dim(), { x: 1, y: 64, z: 0 });
  const lobo = new Entity('minecraft:wolf', dim(), { x: 2, y: 64, z: 2 });
  lobo.__dono = a.id;
  assert.equal(C.isAlvoValido(a, a, { pvp: true }), false, 'o conjurador nunca é alvo');
  assert.equal(C.isAlvoValido(a, b, { pvp: false }), false, 'sem PvP, jogador não é alvo');
  assert.equal(C.isAlvoValido(a, b, { pvp: true }), true, 'com PvP, jogador é alvo');
  assert.equal(C.isAlvoValido(a, z, { pvp: false }), true, 'monstro é alvo');
  assert.equal(C.isAlvoValido(a, item, { pvp: true }), false, 'item no chão não é alvo');
  assert.equal(C.isAlvoValido(a, lobo, { pvp: true }), false, 'pet do conjurador não é alvo');
});

test('debounce de 4 ticks', () => {
  __resetarMundo();
  const p = jogador();
  let n = 0;
  L.registrarTecnica('nova', { lancar: () => { n++; return true; } });
  L.registrarTecnica('poco', { lancar: () => { n++; return true; } });
  E.obterEstado(p).eter = 100;
  assert.equal(L.tentarLancar(p, 'nova', 'teste'), true);
  system.__tickar(2);
  assert.equal(L.tentarLancar(p, 'poco', 'teste'), false, 'dentro de 4 ticks é ignorado');
  system.__tickar(3);
  assert.equal(L.tentarLancar(p, 'poco', 'teste'), true, 'depois de 4 ticks lança');
  assert.equal(n, 2);
});

test('sem Éter, tentarLancar retorna false e toca zenite.negado', () => {
  __resetarMundo();
  const p = jogador();
  L.registrarTecnica('nova', { lancar: () => true });
  system.__tickar(10);
  E.obterEstado(p).eter = 5;
  assert.equal(L.tentarLancar(p, 'nova', 'teste'), false);
  assert.ok(p.__sonsJogador.some((s) => s.id === 'zenite.negado'));
});

test('técnica bloqueada por nível não lança', () => {
  __resetarMundo();
  const p = jogador();
  let n = 0;
  L.registrarTecnica('horizonte', { lancar: () => { n++; return true; } });
  E.obterEstado(p).eter = 190;
  assert.equal(L.tentarLancar(p, 'horizonte', 'teste'), false);
  assert.equal(n, 0);
});

test('lançar gasta Éter e aplica a recarga', () => {
  __resetarMundo();
  const p = jogador();
  L.registrarTecnica('nova', { lancar: () => true });
  const e = E.obterEstado(p);
  e.eter = 100;
  system.__tickar(6);
  assert.equal(L.tentarLancar(p, 'nova', 'teste'), true);
  assert.ok(e.eter <= 70.5 && e.eter >= 69.5, `éter ${e.eter}`);
  system.__tickar(6);
  assert.equal(L.tentarLancar(p, 'nova', 'teste'), false, 'em recarga');
});

test('no criativo o Éter não diminui', () => {
  __resetarMundo();
  const p = jogador();
  p.setGameMode(GameMode.Creative);
  L.registrarTecnica('nova', { lancar: () => true });
  const e = E.obterEstado(p);
  e.eter = 10;
  system.__tickar(6);
  const antes = e.eter;
  assert.equal(antes, 100, 'o criativo mantém o Éter cheio');
  assert.equal(L.tentarLancar(p, 'nova', 'teste'), true);
  assert.equal(e.eter, antes, 'lançar no criativo não gasta Éter');
});

test('o estado sobrevive a salvar e recarregar', () => {
  __resetarMundo();
  const p = jogador();
  const e = E.obterEstado(p);
  e.xp = 400;
  e.selecionada = 'poco';
  e.abobada = true;
  e.eter = 33;
  E.salvarEstado(p);
  E.descartarEstado(p.id);
  const e2 = E.obterEstado(p);
  assert.equal(e2.xp, 400);
  assert.equal(e2.nivel, 4);
  assert.equal(e2.selecionada, 'poco');
  assert.equal(e2.abobada, true);
  assert.equal(Math.round(e2.eter), 33);
});

test('subir de nível mostra título e libera técnica', () => {
  __resetarMundo();
  const p = jogador();
  E.obterEstado(p).xp = 50;
  M.ganharXp(p, 20);
  assert.equal(E.obterEstado(p).nivel, 2);
  assert.ok(p.__titulos.length > 0, 'mostrou título');
  assert.ok(p.__sonsJogador.some((s) => s.id === 'zenite.nivel'));
});

test('matar um mob dá maestria a quem matou', () => {
  __resetarMundo();
  const p = jogador();
  const z = new Entity('minecraft:zombie', dim(), { x: 2, y: 64, z: 0 });
  z.applyDamage(50, { damagingEntity: p, cause: 'entityAttack' });
  assert.equal(E.obterEstado(p).xp, 15);
});

test('primeiro login entrega o Códice uma vez', () => {
  __resetarMundo();
  const p = jogador();
  world.afterEvents.playerSpawn.__emit({ player: p, initialSpawn: true });
  system.__tickar(2);
  world.afterEvents.playerSpawn.__emit({ player: p, initialSpawn: true });
  system.__tickar(2);
  const codices = p.__inventario.slots.filter((s) => s && s.typeId === 'zenite:codice');
  assert.equal(codices.length, 1);
});

test('segurar o Astrolábio mostra o HUD', () => {
  __resetarMundo();
  const p = jogador();
  p.__inventario.setItem(0, new ItemStack('zenite:astrolabio'));
  system.__tickar(8);
  assert.ok(p.__actionbar.length > 0);
});

test('agachar e usar o Astrolábio abre a Roda; escolher seleciona a técnica', async () => {
  __resetarMundo();
  __limparForms();
  const p = jogador();
  p.isSneaking = true;
  __responder({ selection: 1 });
  world.afterEvents.itemUse.__emit({ source: p, itemStack: new ItemStack('zenite:astrolabio') });
  system.__tickar(2);
  await esperar();
  await esperar();
  assert.equal(__formsMostrados.length, 1);
  assert.equal(E.obterEstado(p).selecionada, 'poco');
});

test('usar o Astrolábio sem agachar lança a técnica selecionada', () => {
  __resetarMundo();
  const p = jogador();
  let n = 0;
  L.registrarTecnica('passo', { lancar: () => { n++; return true; } });
  const e = E.obterEstado(p);
  e.selecionada = 'passo';
  e.eter = 100;
  system.__tickar(6);
  world.afterEvents.itemUse.__emit({ source: p, itemStack: new ItemStack('zenite:astrolabio') });
  assert.equal(n, 1);
});

test('comandos kit e nivel funcionam', () => {
  __resetarMundo();
  const p = jogador();
  system.__comandos.get('zenite:kit').cb({ sourceEntity: p, sourceType: 'Entity' });
  system.__tickar(2);
  const ids = p.__inventario.slots.filter(Boolean).map((s) => s.typeId);
  assert.ok(ids.includes('zenite:astrolabio') && ids.includes('zenite:codice') && ids.includes('zenite:manto'));
  system.__comandos.get('zenite:nivel').cb({ sourceEntity: p, sourceType: 'Entity' }, 7);
  system.__tickar(2);
  assert.equal(E.obterEstado(p).nivel, 7);
});

test('chaves de idioma montadas em tempo de execução existem nas duas línguas', async () => {
  const fs = await import('node:fs');
  const { CAPITULOS } = await import('../../BP/scripts/ui/codice.js');
  const { TECNICAS } = await import('../../BP/scripts/core/config.js');
  const ler = (l) => new Set(fs.readFileSync(new URL(`../../RP/texts/${l}.lang`, import.meta.url), 'utf8').split('\n').map((x) => x.split('=')[0]));
  const langs = [ler('pt_BR'), ler('en_US')];
  const faltando = (chaves) => chaves.filter((k) => !langs.every((s) => s.has(k)));
  const chaves = [];
  for (const c of CAPITULOS) {
    chaves.push(`zenite.codice.cap.${c.id}`);
    for (let i = 1; i <= c.paragrafos; i++) chaves.push(`zenite.codice.${c.id}.${i}`);
  }
  for (const t of TECNICAS) chaves.push(`zenite.tec.${t.id}.nome`, `zenite.tec.${t.id}.desc`, `item.zenite.sigilo_${t.id}.name`);
  assert.deepEqual(faltando(chaves), []);
  assert.deepEqual(faltando(['zenite.codice.inicio.99']), ['zenite.codice.inicio.99'], 'a checagem detecta chave inexistente');
});

test('comandos sem parâmetros não enviam mandatoryParameters indefinido', () => {
  for (const [nome, { def }] of system.__comandos) {
    if (Object.prototype.hasOwnProperty.call(def, 'mandatoryParameters')) {
      assert.ok(Array.isArray(def.mandatoryParameters), `${nome}: mandatoryParameters deve ser lista quando presente`);
    }
  }
});
