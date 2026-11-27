// Smoke tests do Arconte do Eclipse: fases, ritual, recompensa e ataques.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { world, system, Player, Entity, ItemStack, GameMode, __resetarMundo } from '@minecraft/server';

let A, R, E;
const dim = () => world.getDimension('overworld');
const arcontes = () => dim().__entidades.filter((e) => e.isValid && e.typeId === 'zenite:arconte');

before(async () => {
  await import('../../BP/scripts/main.js');
  system.__startup();
  world.afterEvents.worldLoad.__emit({});
  A = await import('../../BP/scripts/chefe/arconte.js');
  R = await import('../../BP/scripts/chefe/ritual.js');
  E = await import('../../BP/scripts/core/estado.js');
});

function chao() {
  for (let x = -12; x <= 12; x++) for (let z = -12; z <= 12; z++) dim().setBlockType({ x, y: 63, z }, 'minecraft:grass_block');
}

test('faseDoArconte segue os limiares de 66% e 33%', () => {
  assert.equal(A.faseDoArconte(500, 500), 1);
  assert.equal(A.faseDoArconte(331, 500), 1);
  assert.equal(A.faseDoArconte(330, 500), 2);
  assert.equal(A.faseDoArconte(166, 500), 2);
  assert.equal(A.faseDoArconte(160, 500), 3);
  assert.equal(A.faseDoArconte(0, 500), 3);
});

test('o ritual invoca o zenite:arconte depois de 100 ticks', () => {
  __resetarMundo();
  chao();
  const p = new Player(dim(), { x: 0.5, y: 64, z: 0.5 }, 'Ritualista');
  assert.equal(R.iniciarRitual(p), true);
  system.__tickar(60);
  assert.equal(arcontes().length, 0, 'ainda não apareceu');
  system.__tickar(45);
  assert.equal(arcontes().length, 1, 'o Arconte despertou');
  assert.ok(p.__titulos.length > 0, 'título do despertar');
});

test('não começa um segundo ritual com o Arconte vivo', () => {
  assert.equal(arcontes().length, 1);
  const q = new Player(dim(), { x: 3.5, y: 64, z: 3.5 }, 'Outro');
  assert.equal(R.iniciarRitual(q), false);
});

test('usar o Selo do Eclipse inicia o ritual e consome o selo', () => {
  __resetarMundo();
  chao();
  const p = new Player(dim(), { x: 0.5, y: 64, z: 0.5 }, 'Selador');
  p.__inventario.setItem(0, new ItemStack('zenite:selo_eclipse', 2));
  world.afterEvents.itemUse.__emit({ source: p, itemStack: p.__inventario.getItem(0) });
  assert.equal(p.__inventario.getItem(0).amount, 1, 'um selo gasto');
  system.__tickar(110);
  assert.equal(arcontes().length, 1);
});

test('a morte do Arconte dá 600 de maestria a quem matou', () => {
  __resetarMundo();
  const p = new Player(dim(), { x: 0.5, y: 64, z: 0.5 }, 'Heroi');
  const a = new Entity('zenite:arconte', dim(), { x: 4.5, y: 64, z: 0.5 });
  a.applyDamage(999, { damagingEntity: p, cause: 'entityAttack' });
  system.__tickar(5);
  assert.equal(E.obterEstado(p).xp, 600);
  assert.ok(p.__titulos.length > 0, 'título de vitória');
});

test('o Arconte entra em fúria na fase 3', () => {
  __resetarMundo();
  const p = new Player(dim(), { x: 0.5, y: 64, z: 0.5 }, 'Alvo');
  const a = new Entity('zenite:arconte', dim(), { x: 8.5, y: 64, z: 0.5 });
  system.__tickar(10);
  a.__vida.atual = 150;
  system.__tickar(10);
  assert.equal(a.getProperty('zenite:fase'), 3);
  assert.ok((a.__eventos ?? []).includes('zenite:entrar_furia'));
});

test('na fase 3 o Eclipse Total telegrafa e acerta quem fica na linha', () => {
  __resetarMundo();
  const p = new Player(dim(), { x: 0.5, y: 64, z: 0.5 }, 'Teimoso');
  const a = new Entity('zenite:arconte', dim(), { x: 0.5, y: 64, z: 12.5 });
  a.__vida.atual = 100;
  system.__tickar(400);
  assert.ok(dim().__sons.some((s) => s.id === 'zenite.arconte_feixe'), 'carregou o feixe');
  assert.ok(p.__danos.length > 0, 'o jogador parado foi atingido');
});

test('o Arconte ignora jogadores no criativo', () => {
  __resetarMundo();
  const p = new Player(dim(), { x: 0.5, y: 64, z: 0.5 }, 'Criativo');
  p.setGameMode(GameMode.Creative);
  const a = new Entity('zenite:arconte', dim(), { x: 0.5, y: 64, z: 6.5 });
  a.__vida.atual = 100;
  system.__tickar(400);
  assert.equal(p.__danos.length, 0);
});
