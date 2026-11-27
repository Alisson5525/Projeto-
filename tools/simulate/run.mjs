// Executa os scripts reais do add-on num mundo simulado e verifica o comportamento.
// Uso: node --import ./loader.mjs run.mjs [absolute|half]
import path from 'node:path';
import { Entity, ItemStack, LOG, Player, overworld, system, world } from './mock_server.mjs';

globalThis.KB_MODE = process.argv[2] || 'absolute';
// aleatoriedade com semente fixa: a simulacao da sempre o mesmo resultado
let seed = Number(process.env.SIM_SEED || 0x5eed1234);
Math.random = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
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
const V3dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const AIR = new Set([3, 4, 5, 10]);

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

section('giro de esquiva, Mach 2, rastros e particulas por material');
{
  p.rot = { x: 0, y: 0 };
  p.mv = { x: 0, y: 1 };
  for (let i = 0; i < 20 && P(p, 'fly') !== 4; i++) tick(1);
  check(P(p, 'fly') === 4, 'voando antes do giro');
  const x0 = p.location.x;
  // toque duplo para a direita (no Bedrock, x negativo do controle = direita)
  p.mv = { x: -1, y: 1 }; tick(1); p.mv = { x: 0, y: 1 }; tick(2); p.mv = { x: -1, y: 1 }; tick(1);
  check(P(p, 'fly') === 13, `giro para a direita (${P(p, 'fly')})`);
  p.mv = { x: 0, y: 1 }; tick(4);
  check(Math.abs(p.location.x - x0) > 1.2, `esquiva lateral durante o giro (${(p.location.x - x0).toFixed(1)} blocos)`);
  tick(8);
  check(P(p, 'fly') === 4, 'volta ao voo depois do giro');
  p.mv = { x: -1, y: 1 }; tick(1); p.mv = { x: 0, y: 1 }; tick(1);
  check(P(p, 'fly') === 4, 'um toque so nao gira');
  // curva de 90 graus: a direcao acompanha o olhar sem derrapar
  tick(20);
  p.rot = { x: 0, y: 90 };
  const look90 = p.getViewDirection();
  tick(5);
  const vdir = { x: p.vel.x / hspeed(p), z: p.vel.z / hspeed(p) };
  const align = vdir.x * look90.x + vdir.z * look90.z;
  check(align > 0.93, `curva sem derrapar: em 5 ticks o movimento ja segue o olhar (alinhamento ${align.toFixed(2)})`);
  check(hspeed(p) > 0.6, `a curva nao para o heroi (${hspeed(p).toFixed(2)})`);
  p.rot = { x: 0, y: 0 };
  tick(8);
  // looping: toque duplo no pulo
  const yl = p.location.y, zl = p.location.z;
  jump(p); tick(2); jump(p); tick(1);
  check(P(p, 'fly') === 16, `looping com toque duplo no pulo (${P(p, 'fly')})`);
  let topY = p.location.y;
  for (let i = 0; i < 16; i++) { tick(1); topY = Math.max(topY, p.location.y); }
  check(topY > yl + 2, `subiu no looping (${(topY - yl).toFixed(1)} blocos)`);
  tick(3);
  check(P(p, 'fly') === 4, 'volta ao voo depois do looping');
  check(Math.abs(p.location.y - yl) < 3, `termina perto da altura inicial (${(p.location.y - yl).toFixed(1)})`);
  check(p.location.z > zl, 'segue em frente depois do looping');
  tick(10);
  // agua embaixo e uma parede de materiais variados no caminho
  const bx = Math.floor(p.location.x), bz = Math.floor(p.location.z), by = Math.floor(p.location.y);
  // lago 3 blocos abaixo da rota (voo rasante) e parede de materiais variados mais a frente
  for (let x = -5; x <= 5; x++) for (let z = 4; z < 60; z++) overworld.set({ x: bx + x, y: by - 3, z: bz + z }, 'minecraft:water');
  const mats = ['minecraft:sand', 'minecraft:glass', 'minecraft:oak_log', 'minecraft:oak_leaves'];
  for (let x = -3; x <= 3; x++) for (let y = 0; y <= 2; y++) for (let z = 0; z < 2; z++) overworld.set({ x: bx + x, y: by + y, z: bz + 90 + z }, mats[(x + 4) % 4]);
  const c0 = (k) => LOG.particles['superman:' + k] || 0;
  const before = Object.fromEntries(['shards', 'leaf_bits', 'grains', 'splinters', 'debris_dust', 'water_spray', 'water_foam'].map((k) => [k, c0(k)]));
  p.isSprinting = true; tick(3);
  check(P(p, 'fly') === 5, 'supersonico');
  const blast0 = LOG.sounds['firework.blast'] || 0;
  tick(85);
  check((LOG.sounds['firework.blast'] || 0) > blast0, 'rompeu a barreira de Mach 2');
  origWarn(`  Mach 2: ${hspeed(p).toFixed(2)} blocos/tick`);
  check(hspeed(p) > 2.4, `Mach 2 mais rapido que o supersonico (${hspeed(p).toFixed(2)})`);
  check(c0('speed_lines') > 0 && c0('contrail') > 0, 'linhas de velocidade e rastros de condensacao');
  check(c0('water_spray') > before.water_spray && c0('water_foam') > before.water_foam, 'rastro de agua ao passar rasante sobre o lago');
  for (const k of ['shards', 'leaf_bits', 'grains', 'splinters', 'debris_dust']) check(c0(k) > before[k], `particulas de ${k} ao atravessar a parede`);
  check(!!p.effects.speed, 'campo de visao abre com a velocidade');
  // giro dentro do supersonico mantem o Mach 2
  p.mv = { x: 1, y: 1 }; tick(1); p.mv = { x: 0, y: 1 }; tick(2); p.mv = { x: 1, y: 1 }; tick(1);
  check(P(p, 'fly') === 14, `giro para a esquerda no supersonico (${P(p, 'fly')})`);
  p.mv = { x: 0, y: 1 }; tick(10);
  check(P(p, 'fly') === 5 && hspeed(p) > 2.3, 'volta ao supersonico ainda em Mach 2');
  // atravessar a camada de nuvens
  p.location = { x: p.location.x, y: 186, z: p.location.z };
  p.prevLoc = undefined;
  const cl0 = c0('cloud_puff');
  p.rot = { x: -50, y: 0 }; tick(12);
  check(c0('cloud_puff') > cl0, 'rompe as nuvens ao subir');
  p.rot = { x: 0, y: 0 };
  p.isSprinting = false; p.mv = { x: 0, y: 0 }; tick(8);
  check(P(p, 'fly') === 3, 'freou para pairar');
  p.location = { x: p.location.x, y: 70, z: p.location.z };
  tick(5);
}

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
check((LOG.particles['superman:lens_flare'] || 0) > 10, 'brilho de lente nos olhos');
check((LOG.particles['superman:molten_drop'] || 0) > 0, 'gotas derretidas no ponto de impacto');
let melted = 0;
for (let y = -1; y < 4; y++) for (let dx = -1; dx <= 1; dx++) { const t = overworld.typeAt(hx + dx, hy + y, hz); if (t === 'minecraft:lava' || t === 'minecraft:magma' || t === 'minecraft:air') melted++; }
check(melted >= 4, `derreteu uma area, nao so um bloco (${melted})`);
tick(10); use(p, 'superman:visao_calor'); tick(1);
check(P(p, 'power') === 0, 'desligou ao tocar de novo');
check(P(p, 'charge') === 0, 'potencia do raio zerada ao desligar');

section('visao de calor: potencia, corte continuo, agua, TNT e cinzas');
{
  const bx = Math.floor(p.location.x), by = Math.floor(p.location.y), bz = Math.floor(p.location.z);
  // parede larga de pedra a 8 blocos para varrer de um lado ao outro
  for (let x = -12; x <= 12; x++) for (let y = 0; y < 4; y++) overworld.set({ x: bx + x, y: by + y, z: bz + 8 }, 'minecraft:stone');
  const victim2 = new Entity('minecraft:zombie', { x: p.location.x, y: p.location.y, z: p.location.z + 4 });
  victim2.health = 6;
  const mk0 = LOG.particles['superman:heat_mark_xy'] || 0;
  p.rot = { x: 6, y: -35 };
  tick(12); // o mesmo item so conta um novo toque depois de 0,5 s
  use(p, 'superman:visao_calor');
  tick(10);
  tick(4);
  // varre 70 graus em 20 ticks: o corte deve ser continuo
  for (let i = 0; i <= 20; i++) { p.rot = { x: 6, y: -35 + i * 3.5 }; tick(1); }
  tick(30);
  check(P(p, 'charge') >= 0.9, `o raio esquenta ate o maximo (potencia ${P(p, 'charge')})`);
  check((LOG.particles['superman:heat_mark_xy'] || 0) > mk0, 'marcas de brasa na parede');
  check((LOG.particles['superman:heat_halo'] || 0) > 0 && (LOG.particles['superman:heat_smoke'] || 0) > 0, 'brilho em volta do raio e fumaca no impacto');
  let cut = 0, maxGap = 0, gap = 0;
  for (let x = -5; x <= 5; x++) {
    let hot = false;
    for (let y = 0; y < 4; y++) { const t = overworld.typeAt(bx + x, by + y, bz + 8); if (t !== 'minecraft:stone') hot = true; }
    if (hot) { cut++; gap = 0; } else { gap++; maxGap = Math.max(maxGap, gap); }
  }
  check(cut >= 9, `varrer com o olhar corta uma linha na parede (${cut} colunas)`);
  check(maxGap === 0, `corte continuo, sem pular blocos (maior buraco ${maxGap}, ${cut} colunas: ${[...Array(11).keys()].map((i) => { const x = i - 5; let h = 0; for (let y = 0; y < 4; y++) if (overworld.typeAt(bx + x, by + y, bz + 8) !== 'minecraft:stone') h = 1; return h; }).join('')}, x=${(p.location.x - bx).toFixed(2)})`);
  check(victim2.health < 6, 'criatura no caminho do raio queimou');
  world.afterEvents.entityDie.fire({ deadEntity: victim2, damageSource: { cause: 'fire' } });
  check((LOG.particles['superman:ash_burst'] || 0) > 0, 'criatura morta pelo raio vira cinzas');
  victim2.remove();
  use(p, 'superman:visao_calor'); tick(1);
  // agua no caminho ferve e evapora
  const wz = bz + 5;
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) overworld.set({ x: bx + x, y: by + 1 + y, z: wz }, 'minecraft:water');
  p.rot = { x: -2, y: 0 };
  tick(12);
  const st0 = LOG.particles['superman:steam'] || 0;
  use(p, 'superman:visao_calor'); tick(30);
  check((LOG.particles['superman:steam'] || 0) > st0, 'vapor subindo da agua fervendo');
  check(overworld.typeAt(bx, by + 1, wz) === 'minecraft:air', 'agua no caminho do raio evaporou');
  use(p, 'superman:visao_calor'); tick(12);
  // TNT detona
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) overworld.set({ x: bx + x, y: by + 1 + y, z: wz }, 'minecraft:air');
  overworld.set({ x: bx, y: by + 1, z: bz + 6 }, 'minecraft:tnt');
  const exT = LOG.explosions.length;
  use(p, 'superman:visao_calor'); tick(30);
  check(LOG.explosions.length > exT && overworld.typeAt(bx, by + 1, bz + 6) !== 'minecraft:tnt', 'o raio detona TNT');
  tick(2); use(p, 'superman:visao_calor'); tick(10);
  check(P(p, 'power') === 0, 'visao de calor desligada');
  for (let x = -12; x <= 12; x++) for (let y = -2; y < 6; y++) for (let z = 4; z <= 9; z++) overworld.set({ x: bx + x, y: by + y, z: bz + z }, y < 0 ? 'minecraft:dirt' : 'minecraft:air');
  p.rot = { x: 0, y: 0 };
  tick(5);
}

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

section('sopro olhando para os pes (nada de gelo dentro do heroi)');
{
  const bx = Math.floor(p.location.x), by = Math.floor(p.location.y), bz = Math.floor(p.location.z);
  for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) overworld.set({ x: bx + x, y: by, z: bz + z }, 'minecraft:water');
  const pal0 = new Entity('minecraft:skeleton', { x: bx + 1.5, y: by, z: bz + 0.5 });
  p.rot = { x: 25, y: 0 };
  tick(5);
  use(p, 'superman:sopro_congelante');
  tick(120);
  let inside = 0;
  for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) for (let y = 0; y <= 2; y++) {
    const t = overworld.typeAt(bx + x, by + y, bz + z);
    if (/ice|snow/.test(t)) inside++;
  }
  check(inside === 0, `nenhum gelo ou neve no espaco do heroi (${inside})`);
  let far = 0;
  for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) if (Math.max(Math.abs(x), Math.abs(z)) >= 2 && /ice/.test(overworld.typeAt(bx + x, by, bz + z))) far++;
  check(far > 0, `a agua mais longe congelou (${far})`);
  let inMob = 0;
  const ml = pal0.location;
  for (let y = 0; y <= 1; y++) if (/ice/.test(overworld.typeAt(Math.floor(ml.x), Math.floor(ml.y) + y, Math.floor(ml.z)))) inMob++;
  check(inMob === 0, `nenhum gelo dentro do inimigo (${inMob})`);
  pal0.remove();
  for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) for (let y = 0; y <= 3; y++) overworld.set({ x: bx + x, y: by + y, z: bz + z }, 'minecraft:air');
  // chao seco: os pilares de gelo nascem a distancia, nunca colados no heroi
  p.rot = { x: 35, y: 0 };
  tick(80);
  const before = new Set([...overworld.blocks].filter(([, t]) => t === 'minecraft:blue_ice').map(([k]) => k));
  for (let r = 0; r < 3; r++) { if (P(p, 'power') !== 4) use(p, 'superman:sopro_congelante'); tick(230); }
  const tops = [...overworld.blocks].filter(([k, t]) => t === 'minecraft:blue_ice' && !before.has(k)).map(([k]) => k.split(',').map(Number));
  check(tops.length > 0, `pilares de gelo brotaram do chao (${tops.length})`);
  const near = tops.filter(([x, , z]) => Math.hypot(x + 0.5 - p.location.x, z + 0.5 - p.location.z) < 3.5).length;
  check(near === 0, `nenhum pilar colado no heroi (${near})`);
  p.rot = { x: 0, y: 0 };
  tick(20);
}

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
check((LOG.particles['superman:impact_flash'] || 0) > 0 && (LOG.particles['superman:dust_wall'] || 0) > 0, 'clarao e parede de poeira no impacto do soco');

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
tick(8);
check((LOG.particles['superman:rising_debris'] || 0) > 0, 'detritos flutuando depois da pancada');
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

section('soco teleguiado, agarrar e arremessar, estilhacar');
{
  const fly = (e, n) => { // fisica simples para criaturas arremessadas no simulador
    for (let i = 0; i < n; i++) {
      e.location = { x: e.location.x + e.vel.x, y: e.location.y + e.vel.y, z: e.location.z + e.vel.z };
      e.vel.y = Math.max(-3, e.vel.y - 0.08);
      if (overworld.solid(e.location.x, e.location.y, e.location.z)) { e.location.y = Math.floor(e.location.y) + 1; e.vel = { x: 0, y: 0, z: 0 }; }
      tick(1);
    }
  };
  // super soco reto (sem mira automatica): o heroi nao sai do lugar e o soco alcanca longe em linha reta
  p.rot = { x: 0, y: 0 };
  tick(5);
  const px = p.location.x, pz = p.location.z, py = p.location.y;
  for (let x = -2; x <= 2; x++) for (let y = 0; y < 4; y++) for (let z = 1; z < 30; z++) overworld.set({ x: Math.floor(px) + x, y: Math.floor(py) + y, z: Math.floor(pz) + z }, 'minecraft:air');
  const far = new Entity('minecraft:zombie', { x: px, y: py, z: pz + 22 });
  const side = new Entity('minecraft:zombie', { x: px + 8, y: py, z: pz + 6 });
  use(p, 'superman:super_soco'); tick(32);
  use(p, 'superman:super_soco'); tick(1);
  check(V3dist(p.location, { x: px, y: py, z: pz }) < 0.6, 'o heroi nao e puxado ate o inimigo (sem mira automatica)');
  tick(4);
  check(far.health < 20, 'soco carregado alcanca um inimigo a 22 blocos em linha reta');
  check(side.health === 20, 'inimigo fora da linha do soco nao e atingido');
  check(Math.hypot(far.vel.x, far.vel.z) > 1.5, 'inimigo arremessado pelo soco');
  far.remove(); side.remove();
  tick(15);
  // tunel longo e largo: parede de pedra a 12 blocos, com 30 de espessura
  const wz0 = Math.floor(pz) + 12;
  for (let x = -7; x <= 7; x++) for (let y = -5; y <= 8; y++) for (let z = 0; z < 30; z++) overworld.set({ x: Math.floor(px) + x, y: Math.floor(py) + y, z: wz0 + z }, 'minecraft:stone');
  const ex1 = LOG.explosions.length;
  use(p, 'superman:super_soco'); tick(32);
  use(p, 'superman:super_soco'); tick(60);
  let deepest = 0, widest = 0;
  for (let z = 0; z < 30; z++) if (overworld.typeAt(Math.floor(px), Math.floor(py) + 1, wz0 + z) === 'minecraft:air') deepest = z + 1;
  for (let x = 0; x <= 7; x++) if (overworld.typeAt(Math.floor(px) + x, Math.floor(py) + 1, wz0 + 15) === 'minecraft:air') widest = x;
  origWarn(`  tunel do soco: ${deepest} blocos de comprimento, raio ${widest}`);
  check(deepest >= 24, `tunel longo atravessa a montanha (${deepest} blocos)`);
  check(widest >= 3, `tunel largo (raio ${widest})`);
  check(LOG.explosions.length >= ex1 + 2, 'cratera no impacto e explosao no fim do tunel');
  for (let x = -7; x <= 7; x++) for (let y = -5; y <= 8; y++) for (let z = 0; z < 30; z++) overworld.set({ x: Math.floor(px) + x, y: Math.floor(py) + y, z: wz0 + z }, 'minecraft:air');
  tick(10);
  // agarrar e arremessar
  const ex0 = LOG.explosions.length;
  const foe = new Entity('minecraft:zombie', { x: p.location.x, y: p.location.y, z: p.location.z + 1.5 });
  p.sneakHeld = true;
  world.afterEvents.entityHitEntity.fire({ damagingEntity: p, hitEntity: foe });
  tick(1);
  check(P(p, 'power') === 20, 'agachado + bater = agarrar');
  tick(10);
  check(Math.abs(foe.location.y - (p.location.y + 2.45)) < 0.3, 'inimigo erguido acima da cabeca');
  use(p, 'superman:visao_calor'); tick(1);
  check(P(p, 'power') === 20, 'com as maos ocupadas os outros poderes esperam');
  p.sneakHeld = false; tick(1);
  check(P(p, 'power') === 21, 'soltar o agachar = arremessar');
  tick(4);
  check(Math.hypot(foe.vel.x, foe.vel.z) > 3, `arremesso forte (${Math.hypot(foe.vel.x, foe.vel.z).toFixed(1)})`);
  const bystander = new Entity('minecraft:zombie', { x: foe.location.x + foe.vel.x * 2, y: foe.location.y - 1, z: foe.location.z + foe.vel.z * 2 });
  fly(foe, 30);
  check(LOG.explosions.length > ex0, 'o inimigo arremessado abriu uma cratera ao cair');
  check(foe.health < 20, 'o arremessado se machucou no impacto');
  foe.remove(); bystander.remove();
  tick(20);
  check(P(p, 'power') === 0, 'arremesso terminou');
  // estilhacar: congela com o sopro e depois bate
  const ice = new Entity('minecraft:zombie', { x: p.location.x, y: p.location.y, z: p.location.z + 4 });
  p.rot = { x: 10, y: 0 };
  use(p, 'superman:sopro_congelante'); tick(40);
  use(p, 'superman:sopro_congelante'); tick(2);
  const hp0 = ice.health;
  ice.location = { x: p.location.x, y: p.location.y, z: p.location.z + 1.5 };
  world.afterEvents.entityHitEntity.fire({ damagingEntity: p, hitEntity: ice });
  tick(1);
  check(hp0 - ice.health >= 22, `inimigo congelado estilhacou (dano ${(hp0 - ice.health).toFixed(0)})`);
  check((LOG.particles['superman:shards'] || 0) > 0 && p.actionbar.includes('ESTILHA'), 'cacos de gelo e aviso de estilhacar');
  ice.remove();
  p.rot = { x: 0, y: 0 };
  tick(20);
}

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

section('sopro congelante voando');
{
  p.rot = { x: 0, y: 0 };
  p.mv = { x: 0, y: 1 };
  for (let i = 0; i < 20 && P(p, 'fly') !== 4; i++) tick(1);
  check(P(p, 'fly') === 4, 'voando para frente antes do sopro');
  use(p, 'superman:sopro_congelante'); tick(2);
  check(P(p, 'fly') === 3, 'o heroi freia e paira para soprar');
  tick(30);
  check(P(p, 'fly') === 3 && P(p, 'power') === 4, 'continua pairando enquanto sopra, mesmo segurando para frente');
  p.isSprinting = true; tick(10); p.isSprinting = false;
  check(P(p, 'fly') === 3, 'nao entra no supersonico durante o sopro');
  use(p, 'superman:sopro_congelante'); tick(1);
  check(P(p, 'power') === 0, 'sopro desligado');
  for (let i = 0; i < 20 && P(p, 'fly') !== 4; i++) tick(1);
  check(P(p, 'fly') === 4, 'volta a voar depois do sopro');
  p.mv = { x: 0, y: 0 };
  for (let i = 0; i < 20 && P(p, 'fly') !== 3; i++) tick(1);
}

section('explosao solar');
tick(20);
const novaY = p.location.y;
const ring = [0, 1, 2, 3].map((i) => new Entity('minecraft:zombie', { x: p.location.x + 8 * Math.cos(i * 1.57), y: p.location.y - 2, z: p.location.z + 8 * Math.sin(i * 1.57) }));
const exNova = LOG.explosions.length;
const burst0 = LOG.particles['superman:nova_burst'] || 0;
p.sneakHeld = true; use(p, 'superman:impacto'); p.sneakHeld = false; tick(1);
check(P(p, 'power') === 18, 'concentrando a explosao solar');
check(P(p, 'fly') !== 6, 'agachado no ar nao mergulha');
use(p, 'superman:visao_calor'); tick(1);
check(P(p, 'power') === 18, 'outros poderes nao interrompem o supremo');
tick(30);
check(Math.abs(p.location.y - novaY) < 0.8, `fica parado no ar enquanto concentra (variou ${(p.location.y - novaY).toFixed(2)})`);
check((LOG.particles['superman:rising_debris'] || 0) > 0, 'detritos subindo do chao durante a carga');
for (let i = 0; i < 20 && P(p, 'power') !== 19; i++) tick(1);
check(P(p, 'power') === 19, 'explosao solar liberada');
tick(6);
check((LOG.particles['superman:nova_burst'] || 0) >= burst0 + 2, 'clarao solar duplo');
check(ring.every((z) => z.health < 20), 'todos os inimigos em volta atingidos');
check(ring.every((z) => Math.hypot(z.vel.x, z.vel.z) > 1), 'inimigos arremessados para longe');
check(ring.every((z) => z.fire > 0), 'inimigos em chamas');
check(LOG.explosions.length > exNova, 'cratera embaixo da explosao');
tick(30);
check(P(p, 'power') === 0, 'explosao solar terminou');
check(AIR.has(P(p, 'fly')), 'continua voando depois do supremo');
p.sneakHeld = true; use(p, 'superman:impacto'); p.sneakHeld = false;
const novaBar = p.actionbar;
tick(1);
check(P(p, 'power') === 0 && novaBar.includes('recarregando'), `explosao solar tem recarga (${novaBar})`);
for (const z of ring) z.remove();

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
