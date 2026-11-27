// Smoke tests das sete técnicas, sobre o mock da API.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { world, system, Player, Entity, __resetarMundo } from '@minecraft/server';

let L, E, CFG, AB;
const dim = () => world.getDimension('overworld');
const firmamentos = () => [...dim().__blocos.values()].filter((t) => t === 'zenite:firmamento').length;

before(async () => {
  await import('../../BP/scripts/main.js');
  system.__startup();
  world.afterEvents.worldLoad.__emit({});
  L = await import('../../BP/scripts/core/lancar.js');
  E = await import('../../BP/scripts/core/estado.js');
  CFG = await import('../../BP/scripts/core/configuracoes.js');
  AB = await import('../../BP/scripts/tecnicas/abobada.js');
});

/** Feiticeiro no nível máximo, com a Abóbada liberada e Éter cheio, olhando para +Z. */
function feiticeiro(nome = 'Zen') {
  const p = new Player(dim(), { x: 0.5, y: 64, z: 0.5 }, nome);
  const e = E.obterEstado(p);
  e.xp = 2540;
  e.nivel = 10;
  e.abobada = true;
  e.eter = 190;
  return p;
}
function lancar(p, id) {
  system.__tickar(5);
  E.obterEstado(p).eter = 190;
  return L.tentarLancar(p, id, 'teste');
}
function parede(z, tipo = 'minecraft:stone') {
  for (let y = 60; y < 72; y++) for (let x = -4; x <= 4; x++) dim().setBlockType({ x, y, z }, tipo);
}

test('véu ativo aplica resistência V e congela uma flecha a 2 blocos', () => {
  __resetarMundo();
  const p = feiticeiro();
  assert.equal(lancar(p, 'veu'), true);
  assert.equal(E.obterEstado(p).veu, true);
  const flecha = new Entity('minecraft:arrow', dim(), { x: 0.5, y: 65.2, z: 2.5 });
  flecha.__vel = { x: 0, y: -0.1, z: -1.5 };
  system.__tickar(6);
  const r = p.getEffect('minecraft:resistance');
  assert.ok(r && r.amplifier === 4, 'resistência V');
  assert.deepEqual(flecha.getVelocity(), { x: 0, y: 0, z: 0 }, 'flecha parada');
  assert.ok(dim().__sons.some((s) => s.id === 'zenite.veu_bloqueio'), 'som de bloqueio');
  system.__tickar(5);
  assert.equal(lancar(p, 'veu'), true, 'usar de novo desliga');
  assert.equal(E.obterEstado(p).veu, false);
});

test('véu se desliga sozinho quando o Éter acaba', () => {
  __resetarMundo();
  const p = feiticeiro();
  lancar(p, 'veu');
  E.obterEstado(p).eter = 0.5;
  system.__tickar(10);
  assert.equal(E.obterEstado(p).veu, false);
});

test('poço puxa um zumbi em direção ao centro', () => {
  __resetarMundo();
  const p = feiticeiro();
  const z = new Entity('minecraft:zombie', dim(), { x: 5.5, y: 64, z: 14.5 });
  assert.equal(lancar(p, 'poco'), true);
  system.__tickar(15);
  assert.ok(z.__impulsos.length > 0, 'recebeu impulsos');
  assert.ok(z.__impulsos.at(-1).x < 0, 'puxado para o centro (x negativo)');
});

test('supernova contra uma parede cria explosão só com destruição ligada', () => {
  __resetarMundo();
  CFG.salvarCfgMundo({ destruicao: true });
  parede(6);
  const p = feiticeiro();
  assert.equal(lancar(p, 'nova'), true);
  system.__tickar(12);
  assert.equal(dim().__explosoes.length, 1, 'explodiu com destruição ligada');
  assert.ok(dim().__sons.some((s) => s.id === 'zenite.nova_impacto'));

  __resetarMundo();
  CFG.salvarCfgMundo({ destruicao: false });
  parede(6);
  const q = feiticeiro('Q');
  assert.equal(lancar(q, 'nova'), true);
  system.__tickar(12);
  assert.equal(dim().__explosoes.length, 0, 'sem explosão de blocos com destruição desligada');
  assert.ok(dim().__sons.some((s) => s.id === 'zenite.nova_impacto'), 'ainda há impacto');
  CFG.salvarCfgMundo({ destruicao: true });
});

test('supernova fere o alvo e não fere outro jogador com PvP desligado', () => {
  __resetarMundo();
  CFG.salvarCfgMundo({ destruicao: false, pvp: false });
  const p = feiticeiro();
  const z = new Entity('minecraft:zombie', dim(), { x: 0.5, y: 64, z: 7.5 });
  const amigo = new Player(dim(), { x: 2.5, y: 64, z: 8.5 }, 'Amigo');
  assert.equal(lancar(p, 'nova'), true);
  system.__tickar(12);
  assert.ok(z.__danos.length > 0, 'zumbi ferido');
  assert.equal(amigo.__danos.length, 0, 'amigo intacto');
  CFG.salvarCfgMundo({ destruicao: true });
});

test('passo mirando numa entidade teleporta para trás dela', () => {
  __resetarMundo();
  const p = feiticeiro();
  new Entity('minecraft:zombie', dim(), { x: 0.5, y: 64, z: 8.5 });
  assert.equal(lancar(p, 'passo'), true);
  assert.ok(p.location.z > 9.5 && p.location.z < 11, `z=${p.location.z}`);
});

test('passo sem espaço não teleporta nem gasta Éter', () => {
  __resetarMundo();
  const p = feiticeiro();
  for (let z = 1; z < 40; z++) for (let y = 63; y < 68; y++) dim().setBlockType({ x: 0, y, z }, 'minecraft:stone');
  system.__tickar(5);
  const e = E.obterEstado(p);
  e.eter = 100;
  assert.equal(L.tentarLancar(p, 'passo', 'teste'), false);
  assert.equal(e.eter, 100);
});

test('reversão cura 12', () => {
  __resetarMundo();
  const p = feiticeiro();
  p.__vida.atual = 4;
  p.addEffect('minecraft:poison', 200);
  assert.equal(lancar(p, 'reversao'), true);
  assert.equal(p.__vida.atual, 16);
  assert.ok(p.getEffect('minecraft:regeneration'), 'regeneração');
  assert.equal(p.getEffect('minecraft:poison'), undefined, 'veneno removido');
});

test('horizonte apaga blocos comuns e preserva bedrock e baús', () => {
  __resetarMundo();
  CFG.salvarCfgMundo({ destruicao: true });
  const p = feiticeiro();
  dim().setBlockType({ x: 0, y: 65, z: 14 }, 'minecraft:stone');
  dim().setBlockType({ x: 1, y: 65, z: 14 }, 'minecraft:bedrock');
  dim().setBlockType({ x: 0, y: 66, z: 18 }, 'minecraft:chest');
  assert.equal(lancar(p, 'horizonte'), true);
  assert.equal(E.obterEstado(p).canalizando, true, 'canalizando');
  system.__tickar(70);
  assert.equal(E.obterEstado(p).canalizando, false);
  assert.equal(dim().getBlock({ x: 0, y: 65, z: 14 }).typeId, 'minecraft:air');
  assert.equal(dim().getBlock({ x: 1, y: 65, z: 14 }).typeId, 'minecraft:bedrock');
  assert.equal(dim().getBlock({ x: 0, y: 66, z: 18 }).typeId, 'minecraft:chest');
});

test('horizonte fora do mundo não lança', () => {
  __resetarMundo();
  const p = feiticeiro();
  p.teleport({ x: 0.5, y: 300, z: 0.5 });
  p.setRotation({ x: -90, y: 0 });
  assert.equal(lancar(p, 'horizonte'), true);
  assert.doesNotThrow(() => system.__tickar(110));
  const nucleos = dim().__particulas.filter((x) => x.id === 'zenite:brilho' && x.loc.y > 330).length;
  assert.ok(nucleos >= 20, `a esfera seguiu além do teto do mundo (${nucleos})`);
});

test('a abóbada coloca firmamento só no ar e remove tudo depois de 400 ticks', () => {
  __resetarMundo();
  const p = feiticeiro();
  dim().setBlockType({ x: 0, y: 78, z: 0 }, 'minecraft:stone');
  assert.equal(lancar(p, 'abobada'), true);
  system.__tickar(80);
  assert.ok(firmamentos() > 1500, `${firmamentos()} blocos`);
  assert.equal(dim().getBlock({ x: 0, y: 78, z: 0 }).typeId, 'minecraft:stone');
  assert.equal(E.obterEstado(p).dentroAbobada, p.id);
  system.__tickar(400);
  assert.equal(firmamentos(), 0);
  assert.equal(E.obterEstado(p).dentroAbobada, undefined);
});

test('a abóbada congela inimigos lá dentro', () => {
  __resetarMundo();
  const p = feiticeiro();
  const z = new Entity('minecraft:zombie', dim(), { x: 6.5, y: 64, z: 0.5 });
  assert.equal(lancar(p, 'abobada'), true);
  system.__tickar(40);
  z.location = { x: 9.5, y: 64, z: 0.5 };
  system.__tickar(2);
  assert.ok(Math.abs(z.location.x - 6.5) < 0.01, 'voltou à posição congelada');
  assert.ok(z.getEffect('minecraft:slowness'), 'lentidão');
  system.__tickar(400);
});

test('abobada limpa ao sair e na recarga', () => {
  __resetarMundo();
  const p = feiticeiro();
  lancar(p, 'abobada');
  system.__tickar(60);
  assert.ok(firmamentos() > 0);
  world.beforeEvents.playerLeave.__emit({ player: p });
  p.remove();
  system.__tickar(120);
  assert.equal(firmamentos(), 0, 'sair encerra a cúpula');

  __resetarMundo();
  const casca = [{ x: 0, y: 14, z: 0 }, { x: 14, y: 0, z: 0 }, { x: 0, y: 0, z: -14 }];
  for (const o of casca) dim().setBlockType({ x: 100 + o.x, y: 64 + o.y, z: 100 + o.z }, 'zenite:firmamento');
  world.setDynamicProperty('zenite:abobadas_pendentes', JSON.stringify([{ dim: 'minecraft:overworld', x: 100, y: 64, z: 100, r: 14 }]));
  assert.equal(AB.limparAbobadasPendentes(), 1);
  assert.equal(firmamentos(), 0, 'cúpula esquecida removida');
  assert.equal(world.getDynamicProperty('zenite:abobadas_pendentes'), '[]');
});

test('morrer desliga o Véu e cancela a canalização', () => {
  __resetarMundo();
  const p = feiticeiro();
  lancar(p, 'veu');
  const e = E.obterEstado(p);
  assert.equal(e.veu, true);
  e.canalizando = true;
  world.afterEvents.entityDie.__emit({ deadEntity: p, damageSource: { cause: 'entityAttack' } });
  assert.equal(e.veu, false, 'véu desligado');
  assert.equal(e.canalizando, false, 'canalização cancelada');
});
