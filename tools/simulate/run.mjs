// Executa os scripts reais do add-on num mundo simulado e verifica o comportamento.
// Uso: node --import ./loader.mjs run.mjs [absolute|half]
import path from 'node:path';
import { Entity, ItemStack, LOG, Player, overworld, system, world } from './mock_server.mjs';

globalThis.KB_MODE = process.argv[2] || 'absolute';
const warnings = [];
const origWarn = console.warn;
console.warn = (...a) => { const m = a.join(' '); if (!m.includes('add-on carregado')) warnings.push(m); };

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
await import(path.join(ROOT, 'superman_addon/behavior_pack/scripts/main.js'));

let fails = 0, passes = 0;
const check = (cond, msg) => { if (cond) passes++; else { fails++; origWarn('  FALHOU: ' + msg); } };
const tick = (n = 1) => { for (let i = 0; i < n; i++) system.step(); };
const P = (p, k) => p.props['superman:' + k];
const speed = (p) => Math.hypot(p.vel.x, p.vel.y, p.vel.z);
const hspeed = (p) => Math.hypot(p.vel.x, p.vel.z);
const use = (p, id) => { p.hold(id); world.afterEvents.itemUse.fire({ source: p, itemStack: new ItemStack(id) }); };
const jump = (p) => {
  if (p.isOnGround) p.vel.y = 0.42;
  world.afterEvents.playerButtonInput.fire({ player: p, button: 'Jump', newButtonState: 'Pressed' });
};
const section = (t) => origWarn(`\n== ${t}`);

const p = new Player('Teste', { x: 0.5, y: 64, z: 0.5 });
world.players.push(p);
world.afterEvents.playerSpawn.fire({ player: p, initialSpawn: true });
tick(2);

section('entrada e transformacao');
check(p.inv.items.some((i) => i?.typeId === 'superman:emblema'), 'emblema entregue no primeiro login');
use(p, 'superman:emblema');
tick(1);
check(P(p, 'power') === 1, 'poder = TRANSFORM');
tick(20);
check(P(p, 'on') === true, 'transformado no meio da animacao');
tick(22);
check(P(p, 'power') === 0, 'transformacao terminou');
for (const id of ['voo', 'visao_calor', 'sopro_congelante', 'super_soco', 'impacto']) {
  check(p.inv.items.some((i) => i?.typeId === 'superman:' + id), `item ${id} entregue`);
}
check(p.effects.resistance && p.effects.strength, 'efeitos de super-heroi aplicados');

section('pulo duplo -> pairar');
jump(p); tick(4); jump(p); tick(1);
check(P(p, 'fly') === 10, 'AIRSTART apos pulo duplo');
tick(12);
check(P(p, 'fly') === 3, 'HOVER');
const y0 = p.location.y;
tick(40);
check(Math.abs(p.location.y - y0) < 1.5, `altitude estavel pairando (variou ${(p.location.y - y0).toFixed(2)})`);
p.jumpHeld = true; tick(20); p.jumpHeld = false;
check(p.location.y > y0 + 3, `subir segurando pulo (subiu ${(p.location.y - y0).toFixed(1)})`);

section('voo e supersonico');
p.rot = { x: 0, y: 0 }; // olhando para +Z
p.mv = { x: 0, y: 1 };
tick(10);
check(P(p, 'fly') === 4, 'FLY ao andar para frente');
tick(40);
const sFly = hspeed(p);
origWarn(`  velocidade de voo: ${(sFly / 0.91).toFixed(2)} blocos/tick (alvo 0.95)`);
check(sFly > 0.7 && sFly < 1.3, 'velocidade de voo proxima do alvo');
// parede de pedra a frente
const wz = Math.floor(p.location.z) + 30, wy = Math.floor(p.location.y);
for (let x = -3; x <= 3; x++) for (let y = -2; y <= 3; y++) for (let z = 0; z < 3; z++) overworld.set({ x: x, y: wy + y, z: wz + z }, 'minecraft:stone');
p.isSprinting = true;
tick(3);
check(P(p, 'fly') === 5, 'FAST com corrida');
const before = overworld.changes;
tick(50);
origWarn(`  velocidade supersonica: ${hspeed(p).toFixed(2)} (alvo 2.2), z=${p.location.z.toFixed(1)} parede em ${wz}`);
check(hspeed(p) > 1.6, 'supersonico rapido');
check(overworld.changes > before, 'blocos destruidos no caminho');
check(p.location.z > wz + 3, 'atravessou a parede');
check((LOG.sounds['mob.warden.sonic_boom'] || 0) > 0, 'estrondo sonico tocou');
p.isSprinting = false; p.mv = { x: 0, y: 0 };
tick(6);
check(P(p, 'fly') === 3, 'freou para HOVER');

section('pouso suave');
p.sneakHeld = true;
for (let i = 0; i < 400 && P(p, 'fly') !== 8; i++) tick(1);
check(P(p, 'fly') === 8, 'LANDSOFT ao descer ate o chao');
p.sneakHeld = false;
tick(20);
check(P(p, 'fly') === 0, 'voltou ao chao');

section('visao de calor');
const hx = Math.floor(p.location.x), hz = Math.floor(p.location.z) + 5, hy = Math.floor(p.location.y);
for (let y = 0; y < 3; y++) overworld.set({ x: hx, y: hy + y, z: hz }, 'minecraft:stone');
p.rot = { x: 0, y: 0 };
use(p, 'superman:visao_calor');
tick(70);
const hb = overworld.typeAt(hx, hy + 1, hz);
check(P(p, 'power') === 3, 'visao de calor ativa');
check(hb === 'minecraft:lava' || hb === 'minecraft:magma', `pedra derreteu (virou ${hb})`);
check((LOG.particles['superman:heat_beam'] || 0) > 50, 'raios desenhados');
check((LOG.particles['superman:heat_core'] || 0) > 50, 'nucleo do raio desenhado');
let melted = 0;
for (let y = -1; y < 4; y++) for (let dx = -1; dx <= 1; dx++) { const t = overworld.typeAt(hx + dx, hy + y, hz); if (t === 'minecraft:lava' || t === 'minecraft:magma' || t === 'minecraft:air') melted++; }
check(melted >= 4, `derreteu uma area, nao so um bloco (${melted})`);
tick(10); use(p, 'superman:visao_calor'); tick(1);
check(P(p, 'power') === 0, 'desligou ao tocar de novo');

section('sopro congelante');
const victim = new Entity('minecraft:skeleton', { x: p.location.x + 0.5, y: p.location.y, z: p.location.z - 6 });
const fz = Math.floor(p.location.z) - 1;
for (let x = -3; x <= 3; x++) for (let z = 0; z < 8; z++) overworld.set({ x: Math.floor(p.location.x) + x, y: 63, z: fz - z }, 'minecraft:water');
p.rot = { x: 30, y: 180 };
tick(12);
use(p, 'superman:sopro_congelante');
tick(60);
let ice = 0;
for (let x = -3; x <= 3; x++) for (let z = 0; z < 8; z++) if (overworld.typeAt(Math.floor(p.location.x) + x, 63, fz - z) === 'minecraft:ice') ice++;
check(ice > 0, `agua congelou (${ice} blocos)`);
check(victim.effects.slowness?.amp >= 6, 'inimigo congelado (lentidao forte)');
let cage = 0;
for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (overworld.typeAt(Math.floor(victim.location.x) + dx, Math.floor(victim.location.y), Math.floor(victim.location.z) + dz) === 'minecraft:ice') cage++;
check(cage >= 2, `jaula de gelo em volta do inimigo (${cage} lados)`);
victim.remove();
tick(200);
check(P(p, 'power') === 0, 'sopro terminou sozinho');

section('super soco');
p.rot = { x: 0, y: 0 };
const ex0 = LOG.explosions.length;
for (let y = 0; y < 3; y++) for (let x = -1; x <= 1; x++) overworld.set({ x: Math.floor(p.location.x) + x, y: Math.floor(p.location.y) + y, z: Math.floor(p.location.z) + 4 }, 'minecraft:stone');
use(p, 'superman:super_soco'); tick(25);
check(P(p, 'power') === 5 && P(p, 'charge') > 0.6, 'carregando soco');
use(p, 'superman:super_soco'); tick(1);
check(P(p, 'power') === 6, 'soco liberado');
tick(5);
check(LOG.explosions.length > ex0, 'impacto do soco explodiu a parede');
tick(12);
check(P(p, 'power') === 0, 'soco terminou');

section('palma trovao e pancada');
const zombie = new Entity('minecraft:zombie', { x: p.location.x, y: p.location.y, z: p.location.z + 4 });
use(p, 'superman:impacto'); tick(1);
check(P(p, 'power') === 7, 'palma');
tick(10);
check(Math.hypot(zombie.vel.x, zombie.vel.z) > 1, 'zumbi arremessado pela palma');
tick(15);
p.sneakHeld = true; use(p, 'superman:impacto'); tick(1); p.sneakHeld = false;
check(P(p, 'power') === 8, 'pancada no chao');
const ex1 = LOG.explosions.length;
tick(14);
check(LOG.explosions.length > ex1, 'cratera da pancada');
tick(15);

section('combos');
zombie.location = { x: p.location.x, y: p.location.y, z: p.location.z + 1.5 };
const seen = [];
for (let i = 0; i < 6; i++) {
  world.afterEvents.entityHitEntity.fire({ damagingEntity: p, hitEntity: zombie });
  tick(1); seen.push(P(p, 'power')); tick(5);
  zombie.location = { x: p.location.x, y: p.location.y, z: p.location.z + 1.5 }; zombie.vel = { x: 0, y: 0, z: 0 };
}
check(seen.join() === '9,10,12,11,13,14', `sequencia de combo no chao ${seen.join()}`);
check(P(p, 'combat') === true, 'postura de luta ativa');
tick(25);
check(P(p, 'power') === 0, 'combo terminou');
tick(100);
check(P(p, 'combat') === false, 'postura de luta encerrada');

section('soco quebra bloco');
const bl = overworld.getBlock({ x: 5, y: 63, z: 5 });
p.selected = 30; // mao vazia
world.afterEvents.entityHitBlock.fire({ damagingEntity: p, hitBlock: bl, blockFace: 'Up' });
check(bl.typeId === 'minecraft:air', 'super forca quebrou o bloco');

section('decolagem carregada');
p.location = { x: 40.5, y: 64, z: 40.5 }; p.vel = { x: 0, y: 0, z: 0 };
tick(2);
p.sneakHeld = true; tick(12);
check(P(p, 'fly') === 1, 'CHARGE ao segurar agachar');
tick(18);
jump(p); tick(1); p.sneakHeld = false;
check(P(p, 'fly') === 2, 'LAUNCH');
tick(4);
check(p.location.y > 66, `subiu rapido (y=${p.location.y.toFixed(1)})`);
tick(16);
check(P(p, 'fly') === 3, 'HOVER apos decolar');

section('mergulho -> pouso de heroi');
p.jumpHeld = true; tick(40); p.jumpHeld = false;
const ex2 = LOG.explosions.length;
use(p, 'superman:impacto'); tick(1);
check(P(p, 'fly') === 6, 'DIVE');
for (let i = 0; i < 200 && P(p, 'fly') !== 9; i++) tick(1);
check(P(p, 'fly') === 9, 'LANDHERO ao bater no chao');
check(LOG.explosions.length > ex2, 'cratera do pouso');
check(p.location.y > 55, `mergulho parou na superficie (y=${p.location.y.toFixed(1)})`);
tick(40);
check(P(p, 'fly') === 0, 'levantou do pouso');

section('combo aereo');
jump(p); tick(4); jump(p); tick(12);
check(P(p, 'fly') === 3, 'pairando para o combo aereo');
const bat = new Entity('minecraft:zombie', { x: p.location.x, y: p.location.y, z: p.location.z + 1.5 });
const seenAir = [];
for (let i = 0; i < 3; i++) {
  world.afterEvents.entityHitEntity.fire({ damagingEntity: p, hitEntity: bat });
  tick(1); seenAir.push(P(p, 'power')); tick(6);
  bat.location = { x: p.location.x, y: p.location.y, z: p.location.z + 1.5 };
}
check(seenAir.join() === '15,16,17', `sequencia aerea ${seenAir.join()}`);
check(bat.vel.y < 0, 'martelo cravou o inimigo para baixo');
const exSpike = LOG.explosions.length;
for (let i = 0; i < 40; i++) { bat.location.y += bat.vel.y; if (overworld.solid(bat.location.x, bat.location.y, bat.location.z)) { bat.location.y = Math.floor(bat.location.y) + 1; bat.vel.y = 0; } tick(1); }
check(LOG.explosions.length > exSpike, `cratera onde o inimigo caiu (y=${bat.location.y.toFixed(1)} vy=${bat.vel.y.toFixed(2)} chao=${bat.isOnGround} jogador y=${p.location.y.toFixed(1)})`);
bat.remove();
p.sneakHeld = true; for (let i = 0; i < 300 && P(p, 'fly') !== 0; i++) tick(1); p.sneakHeld = false;
tick(20);

section('super velocidade');
p.isSprinting = true; tick(3);
check(P(p, 'fly') === 11, 'SPEED correndo');
check(!!p.effects.speed, 'efeito de velocidade');
p.isSprinting = false; tick(2);
check(P(p, 'fly') === 0, 'parou de correr');

section('polimento: itens, tutorial e HUD');
const heatItem = p.inv.items.find((i) => i?.typeId === 'superman:visao_calor');
check(heatItem && heatItem.getLore().length > 0 && heatItem.keepOnDeath, 'itens de poder com descricao e mantidos ao morrer');
check((p.messages || []).some((m) => m.includes('guia rápido')), 'tutorial mostrado na primeira transformacao');
p.location = { x: 200.5, y: 64, z: 200.5 }; p.vel = { x: 0, y: 0, z: 0 }; p.rot = { x: 0, y: 0 };
tick(30);
const dummy = new Entity('minecraft:zombie', { x: 200.5, y: 64, z: 202 });
world.afterEvents.entityHitEntity.fire({ damagingEntity: p, hitEntity: dummy });
tick(4);
check(p.actionbar.includes('COMBO'), `HUD mostra o combo (${p.actionbar})`);
dummy.remove();
tick(40);

section('polimento: poder durante super velocidade');
p.isSprinting = true; tick(3);
check(P(p, 'fly') === 11, 'correndo em super velocidade');
use(p, 'superman:visao_calor'); tick(1);
check(P(p, 'fly') === 0, 'cliente avisado ao sair da super velocidade');
p.isSprinting = false;
tick(10); use(p, 'superman:visao_calor'); tick(2);
check(P(p, 'power') === 0, 'visao de calor desligada');

section('polimento: elitro, montaria, planar e dimensao');
const toGround = () => { p.sneakHeld = true; for (let i = 0; i < 300 && P(p, 'fly') !== 0; i++) tick(1); p.sneakHeld = false; tick(20); };
p.chest = new ItemStack('minecraft:elytra');
jump(p); tick(4); jump(p); tick(2);
check(P(p, 'fly') !== 10 && P(p, 'fly') !== 3, 'com elitro o pulo duplo nao liga o voo');
p.chest = undefined; tick(30);
jump(p); tick(4); jump(p); tick(12);
check(P(p, 'fly') === 3, 'sem elitro o pulo duplo liga o voo');
p.ridingOn = new Entity('minecraft:horse', p.location); tick(1);
check(P(p, 'fly') === 0, 'montar desliga o voo');
p.ridingOn.remove(); p.ridingOn = undefined; tick(30);
jump(p); tick(4); jump(p); tick(12);
p.isGliding = true; tick(1);
check(P(p, 'fly') === 0, 'planar com elitro desliga o voo');
p.isGliding = false; tick(30);
jump(p); tick(4); jump(p); tick(12);
world.afterEvents.playerDimensionChange.fire({ player: p });
check(P(p, 'fly') === 0, 'trocar de dimensao reinicia o voo');
tick(40);

section('polimento: aliados protegidos');
p.location = { x: 300.5, y: 64, z: 300.5 }; p.vel = { x: 0, y: 0, z: 0 }; p.rot = { x: 0, y: 0 };
tick(30);
const villager = new Entity('minecraft:villager_v2', { x: 300.5, y: 64, z: 304 });
const wolf = new Entity('minecraft:wolf', { x: 301.5, y: 64, z: 304 }); wolf.tamed = true;
const enemy = new Entity('minecraft:zombie', { x: 299.5, y: 64, z: 304 });
const friend = new Player('Amigo', { x: 302.5, y: 64, z: 305 }); world.players.push(friend);
use(p, 'superman:impacto'); tick(12);
check(villager.health === 20 && Math.hypot(villager.vel.x, villager.vel.z) < 0.01, 'aldeao poupado pela palma');
check(wolf.health === 20, 'lobo domesticado poupado');
check(friend.health === 20, 'outro jogador poupado (opcao desligada)');
check(enemy.health < 20, 'inimigo atingido pela palma');
for (const e of [villager, wolf, enemy, friend]) e.remove();
world.players = world.players.filter((x) => x !== friend);
tick(20);

section('polimento: onda de destruicao');
p.location = { x: 400.5, y: 64, z: 400.5 }; p.vel = { x: 0, y: 0, z: 0 }; p.rot = { x: 0, y: 0 };
tick(30);
for (let x = -1; x <= 1; x++) for (let y = 0; y < 3; y++) overworld.set({ x: 400 + x, y: 64 + y, z: 413 }, 'minecraft:glass');
use(p, 'superman:impacto'); tick(10);
const farNow = overworld.typeAt(400, 65, 413);
tick(10);
const farLater = overworld.typeAt(400, 65, 413);
check(farNow === 'minecraft:glass' && farLater === 'minecraft:air', `vidro distante quebra depois, em onda (${farNow} -> ${farLater})`);
tick(20);

section('polimento: modo aventura');
p.mode = 'Adventure';
const advBlock = overworld.getBlock({ x: 402, y: 63, z: 400 });
p.selected = 30;
world.afterEvents.entityHitBlock.fire({ damagingEntity: p, hitBlock: advBlock, blockFace: 'Up' });
check(advBlock.typeId !== 'minecraft:air', 'modo aventura nao quebra blocos com o soco');
p.mode = 'Survival';

section('configuracoes e destransformar');
p.sneakHeld = true; use(p, 'superman:emblema'); p.sneakHeld = false;
await new Promise((r) => setTimeout(r, 10));
check(globalThis.__formShown === 1, 'menu de configuracoes aberto');
check(typeof world.dyn['superman:settings'] === 'string', 'configuracoes salvas');
globalThis.__formAnswer = (v) => { v[0] = false; return v; };
tick(12); p.sneakHeld = true; use(p, 'superman:emblema'); p.sneakHeld = false;
await new Promise((r) => setTimeout(r, 10));
check(JSON.parse(world.dyn['superman:settings']).destruction === false, 'desligar a destruicao pelo menu');
globalThis.__formAnswer = (v) => { v[v.length - 1] = true; return v; };
tick(12); p.sneakHeld = true; use(p, 'superman:emblema'); p.sneakHeld = false;
await new Promise((r) => setTimeout(r, 10));
check(JSON.parse(world.dyn['superman:settings']).destruction === true, 'restaurar o padrao pelo menu');
globalThis.__formAnswer = undefined;
tick(12);
use(p, 'superman:emblema'); tick(14);
check(P(p, 'on') === false, 'destransformou');
tick(12);
check(P(p, 'power') === 0, 'fim da destransformacao');
use(p, 'superman:visao_calor'); tick(1);
check(P(p, 'power') === 0, 'poderes bloqueados sem transformar');

origWarn(`\nModo de empurrao: ${globalThis.KB_MODE}`);
origWarn(`Particulas: ${Object.entries(LOG.particles).map(([k, v]) => `${k.slice(9)}=${v}`).join(' ')}`);
origWarn(`Sons distintos: ${Object.keys(LOG.sounds).length}, explosoes: ${LOG.explosions.length}, comandos: ${LOG.commands.length}`);
for (const e of LOG.errors.slice(0, 20)) origWarn('  MOCK: ' + e);
for (const w of warnings.slice(0, 20)) origWarn('  AVISO DO SCRIPT: ' + w);
origWarn(`\n${passes} verificacoes OK, ${fails} falha(s), ${LOG.errors.length} erro(s) de API, ${warnings.length} aviso(s).`);
process.exit(fails || LOG.errors.length || warnings.length ? 1 : 0);
