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
tick(10); use(p, 'superman:visao_calor'); tick(1);
check(P(p, 'power') === 0, 'desligou ao tocar de novo');

section('sopro congelante');
const fz = Math.floor(p.location.z) - 1;
for (let x = -3; x <= 3; x++) for (let z = 0; z < 8; z++) overworld.set({ x: Math.floor(p.location.x) + x, y: 63, z: fz - z }, 'minecraft:water');
p.rot = { x: 30, y: 180 };
tick(12);
use(p, 'superman:sopro_congelante');
tick(60);
let ice = 0;
for (let x = -3; x <= 3; x++) for (let z = 0; z < 8; z++) if (overworld.typeAt(Math.floor(p.location.x) + x, 63, fz - z) === 'minecraft:ice') ice++;
check(ice > 0, `agua congelou (${ice} blocos)`);
tick(100);
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
for (let i = 0; i < 3; i++) {
  world.afterEvents.entityHitEntity.fire({ damagingEntity: p, hitEntity: zombie });
  tick(1); seen.push(P(p, 'power')); tick(5);
}
check(seen.join() === '9,10,11', `sequencia de combo ${seen.join()}`);
tick(20);
check(P(p, 'power') === 0, 'combo terminou');

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
tick(40);
check(P(p, 'fly') === 0, 'levantou do pouso');

section('super velocidade');
p.isSprinting = true; tick(3);
check(P(p, 'fly') === 11, 'SPEED correndo');
check(!!p.effects.speed, 'efeito de velocidade');
p.isSprinting = false; tick(2);
check(P(p, 'fly') === 0, 'parou de correr');

section('configuracoes e destransformar');
p.sneakHeld = true; use(p, 'superman:emblema'); p.sneakHeld = false;
await new Promise((r) => setTimeout(r, 10));
check(globalThis.__formShown === 1, 'menu de configuracoes aberto');
check(typeof world.dyn['superman:settings'] === 'string', 'configuracoes salvas');
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
