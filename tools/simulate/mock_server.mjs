// Mock minimo de @minecraft/server para rodar os scripts do add-on fora do jogo.
// Simula: mundo de blocos, fisica simples do jogador, eventos, particulas, sons e propriedades.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const RP = path.join(ROOT, 'superman_addon/resource_pack');
const PARTICLES = new Set(fs.readdirSync(path.join(RP, 'particles')).map((f) => 'superman:' + f.replace('.json', '')));
const SOUNDS = new Set(Object.keys(JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/vanilla/sound_definitions.json'), 'utf8')
  .replace(/^\s*\/\/.*$/mg, '')).sound_definitions));
const PROPS = JSON.parse(fs.readFileSync(path.join(ROOT, 'superman_addon/behavior_pack/entities/player.json'), 'utf8'))
  ['minecraft:entity'].description.properties;

export const LOG = { errors: [], particles: {}, sounds: {}, commands: [], explosions: [], props: [], effects: {} };
const err = (m) => { LOG.errors.push(m); };

export const InputButton = { Jump: 'Jump', Sneak: 'Sneak' };
export const ButtonState = { Pressed: 'Pressed', Released: 'Released' };
export const EquipmentSlot = { Mainhand: 'Mainhand', Offhand: 'Offhand', Head: 'Head', Chest: 'Chest', Legs: 'Legs', Feet: 'Feet' };
export const GameMode = { Survival: 'Survival', Creative: 'Creative', Adventure: 'Adventure', Spectator: 'Spectator' };
export const EntityDamageCause = { fire: 'fire', freezing: 'freezing', entityAttack: 'entityAttack', none: 'none' };

export class MolangVariableMap {
  constructor() { this.v = {}; }
  setFloat(k, n) { if (!k.startsWith('variable.')) err('molang var sem prefixo ' + k); if (!Number.isFinite(n)) err('molang NaN ' + k); this.v[k] = n; }
  setVector3(k, v) { if (![v.x, v.y, v.z].every(Number.isFinite)) err('molang vetor NaN ' + k); this.v[k] = v; }
  setColorRGB(k, c) { if (![c.red, c.green, c.blue].every(Number.isFinite)) err('molang cor NaN ' + k); this.v[k] = c; }
}

export class ItemStack {
  constructor(typeId, amount = 1) { this.typeId = typeId; this.amount = amount; }
}

// ---------------------------------------------------------------- mundo
const key = (x, y, z) => `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
const PASSABLE = /(air|water|lava|fire|snow_layer|short_grass|tall_grass|flower|torch)/;

class Block {
  constructor(dim, x, y, z) { this.dimension = dim; this.location = { x, y, z }; this.isValid = true; }
  get typeId() { return this.dimension.typeAt(this.location.x, this.location.y, this.location.z); }
  get isAir() { return this.typeId === 'minecraft:air'; }
  get isLiquid() { return /water|lava/.test(this.typeId); }
  setType(t) { if (typeof t !== 'string' || !t.startsWith('minecraft:')) err('setType invalido ' + t); this.dimension.set(this.location, t); }
}

class Dimension {
  constructor(id) { this.id = id; this.blocks = new Map(); this.heightRange = { min: -64, max: 320 }; this.entities = []; this.changes = 0; }
  typeAt(x, y, z) {
    const k = key(x, y, z);
    if (this.blocks.has(k)) return this.blocks.get(k);
    return y < 64 ? (y > 60 ? 'minecraft:dirt' : 'minecraft:stone') : 'minecraft:air';
  }
  set(l, t) { this.blocks.set(key(l.x, l.y, l.z), t); this.changes++; }
  getBlock(l) {
    if (l.y < -64 || l.y >= 320) throw new Error('LocationOutOfWorldBoundaries');
    return new Block(this, Math.floor(l.x), Math.floor(l.y), Math.floor(l.z));
  }
  setBlockType(l, t) { this.set(l, t); }
  solid(x, y, z) { const t = this.typeAt(x, y, z); return !PASSABLE.test(t); }
  getBlockFromRay(o, d, opt = {}) {
    const max = opt.maxDistance ?? 64;
    for (let s = 0; s <= max; s += 0.05) {
      const p = { x: o.x + d.x * s, y: o.y + d.y * s, z: o.z + d.z * s };
      const t = this.typeAt(p.x, p.y, p.z);
      if (t === 'minecraft:air') continue;
      if (/water|lava/.test(t) && !opt.includeLiquidBlocks) continue;
      if (PASSABLE.test(t) && !/water|lava/.test(t) && !opt.includePassableBlocks) continue;
      const b = this.getBlock(p);
      const f = { x: p.x - b.location.x, y: p.y - b.location.y, z: p.z - b.location.z };
      let face = 'Up';
      const m = Math.min(f.y, 1 - f.y, f.x, 1 - f.x, f.z, 1 - f.z);
      if (m === 1 - f.y) face = 'Up'; else if (m === f.y) face = 'Down'; else if (m === f.x) face = 'West';
      else if (m === 1 - f.x) face = 'East'; else if (m === f.z) face = 'North'; else face = 'South';
      return { block: b, face, faceLocation: f };
    }
    return undefined;
  }
  getEntitiesFromRay(o, d, opt = {}) {
    const out = [];
    for (const e of this.entities) {
      const rel = { x: e.location.x - o.x, y: e.location.y + 0.9 - o.y, z: e.location.z - o.z };
      const along = rel.x * d.x + rel.y * d.y + rel.z * d.z;
      if (along < 0 || along > (opt.maxDistance ?? 64)) continue;
      const px = rel.x - d.x * along, py = rel.y - d.y * along, pz = rel.z - d.z * along;
      if (Math.hypot(px, py, pz) < 0.8) out.push({ entity: e, distance: along });
    }
    return out;
  }
  getEntities(opt = {}) {
    return this.entities.filter((e) => !opt.location || Math.hypot(e.location.x - opt.location.x, e.location.y - opt.location.y,
      e.location.z - opt.location.z) <= (opt.maxDistance ?? 1e9));
  }
  spawnParticle(id, loc, m) {
    if (!PARTICLES.has(id)) err('particula inexistente ' + id);
    if (![loc.x, loc.y, loc.z].every(Number.isFinite)) err('particula em posicao NaN ' + id);
    if (m && !(m instanceof MolangVariableMap)) err('molang map invalido');
    LOG.particles[id] = (LOG.particles[id] || 0) + 1;
  }
  playSound(id, loc, opt) {
    if (!SOUNDS.has(id)) err('som inexistente ' + id);
    LOG.sounds[id] = (LOG.sounds[id] || 0) + 1;
  }
  createExplosion(loc, r, opt = {}) {
    if (!Number.isFinite(r) || r <= 0) err('raio de explosao invalido ' + r);
    LOG.explosions.push({ loc, r, opt });
    let blocks = [];
    const R = Math.ceil(r);
    for (let x = -R; x <= R; x++) for (let y = -R; y <= R; y++) for (let z = -R; z <= R; z++) {
      if (x * x + y * y + z * z > r * r) continue;
      const b = this.getBlock({ x: loc.x + x, y: loc.y + y, z: loc.z + z });
      if (!b.isAir) blocks.push(b);
    }
    const ev = { source: opt.source, getImpactedBlocks: () => blocks, setImpactedBlocks: (bl) => { blocks = bl; }, cancel: false };
    for (const f of world.beforeEvents.explosion._subs) f(ev);
    if (opt.breaksBlocks && !ev.cancel) for (const b of blocks) b.setType('minecraft:air');
    return true;
  }
  runCommand(cmd) {
    LOG.commands.push(cmd);
    const m = cmd.match(/^setblock (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (\S+)( destroy)?$/);
    if (m) {
      const id = m[4].includes(':') ? m[4] : 'minecraft:' + m[4];
      this.set({ x: +m[1], y: +m[2], z: +m[3] }, id);
      return { successCount: 1 };
    }
    err('comando desconhecido: ' + cmd);
    return { successCount: 0 };
  }
}
export const overworld = new Dimension('minecraft:overworld');

// ---------------------------------------------------------------- entidades
let nextId = 1;
export class Entity {
  constructor(typeId, loc) {
    this.id = String(nextId++); this.typeId = typeId; this.location = { ...loc }; this.dimension = overworld; this.isValid = true;
    this.vel = { x: 0, y: 0, z: 0 }; this.health = 20; this.effects = {}; this.dyn = {}; this.fire = 0;
    overworld.entities.push(this);
  }
  applyKnockback(h, v) {
    if (typeof h !== 'object' || !Number.isFinite(h.x) || !Number.isFinite(h.z) || !Number.isFinite(v)) err(`knockback invalido ${JSON.stringify(h)} ${v}`);
    if (globalThis.KB_MODE === 'half') this.vel = { x: this.vel.x / 2 + h.x, y: Math.min(this.vel.y / 2 + v, v), z: this.vel.z / 2 + h.z };
    else this.vel = { x: h.x, y: v, z: h.z };
  }
  applyDamage(n, opt) { if (!Number.isFinite(n)) err('dano NaN'); if (!opt?.cause) err('dano sem causa'); this.health -= n; return true; }
  addEffect(id, d, opt) {
    if (!Number.isInteger(d) || d <= 0) err(`duracao de efeito invalida ${id} ${d}`);
    this.effects[id] = { d, amp: opt?.amplifier ?? 0 }; LOG.effects[id] = (LOG.effects[id] || 0) + 1;
  }
  removeEffect(id) { delete this.effects[id]; return true; }
  setOnFire(s) { this.fire = s; return true; }
  extinguishFire() { this.fire = 0; return true; }
  remove() { this.isValid = false; overworld.entities = overworld.entities.filter((e) => e !== this); }
  getVelocity() { return { ...this.vel }; }
  get isOnGround() { return this.dimension.solid(this.location.x, this.location.y - 0.01, this.location.z) && this.vel.y <= 0.001; }
  getDynamicProperty(k) { return this.dyn[k]; }
  setDynamicProperty(k, v) { this.dyn[k] = v; }
}

class Container {
  constructor() { this.size = 36; this.items = new Array(36).fill(undefined); }
  getItem(i) { return this.items[i]; }
  addItem(it) { const i = this.items.findIndex((x) => !x); if (i >= 0) this.items[i] = it; return undefined; }
}

export class Player extends Entity {
  constructor(name, loc) {
    super('minecraft:player', loc);
    this.name = name; this.rot = { x: 0, y: 0 }; this.props = {};
    for (const [k, p] of Object.entries(PROPS)) this.props[k] = p.default;
    this.mv = { x: 0, y: 0 }; this.jumpHeld = false; this.sneakHeld = false; this.isSprinting = false; this.isFlying = false;
    this.isInWater = false; this.inv = new Container(); this.selected = 0; this.actionbar = ''; this.mode = 'Survival';
    this.inputInfo = { getMovementVector: () => ({ ...this.mv }), getButtonState: (b) => ((b === 'Jump' ? this.jumpHeld : this.sneakHeld) ? 'Pressed' : 'Released') };
    this.camera = { fade: () => {} };
    this.onScreenDisplay = { setActionBar: (t) => { this.actionbar = t; }, setTitle: (t, o) => { this.title = t; } };
  }
  get isSneaking() { return this.sneakHeld; }
  set isSneaking(v) { this.sneakHeld = v; }
  get isJumping() { return this.jumpHeld; }
  get isOnGround() { return this.dimension.solid(this.location.x, this.location.y - 0.01, this.location.z) && this.vel.y <= 0.001; }
  getRotation() { return { ...this.rot }; }
  getViewDirection() {
    const p = this.rot.x * Math.PI / 180, y = this.rot.y * Math.PI / 180;
    return { x: -Math.sin(y) * Math.cos(p), y: -Math.sin(p), z: Math.cos(y) * Math.cos(p) };
  }
  getHeadLocation() { return { x: this.location.x, y: this.location.y + 1.62, z: this.location.z }; }
  setProperty(k, v) {
    const d = PROPS[k];
    if (!d) { err('propriedade inexistente ' + k); return; }
    if (d.type === 'bool' && typeof v !== 'boolean') err(`propriedade ${k} esperava bool: ${v}`);
    if ((d.type === 'int' || d.type === 'float') && (typeof v !== 'number' || v < d.range[0] || v > d.range[1])) err(`propriedade ${k} fora da faixa: ${v}`);
    if (d.type === 'int' && !Number.isInteger(v)) err(`propriedade ${k} esperava inteiro: ${v}`);
    this.props[k] = v; LOG.props.push([system.currentTick, k, v]);
  }
  getProperty(k) { return this.props[k]; }
  getComponent(id) {
    if (id === 'minecraft:inventory') return { container: this.inv };
    if (id === 'minecraft:equippable') return { getEquipment: (s) => (s === 'Mainhand' ? this.inv.items[this.selected] : undefined) };
    return undefined;
  }
  getGameMode() { return this.mode; }
  runCommand(cmd) { LOG.commands.push(cmd); if (!/^camerashake add @s [\d.]+ [\d.]+ positional$/.test(cmd)) err('comando de jogador invalido ' + cmd); return { successCount: 1 }; }
  sendMessage(m) { this.lastMessage = m; }
  hold(id) { const i = this.inv.items.findIndex((x) => x?.typeId === id); if (i < 0) err('item nao encontrado no inventario: ' + id); this.selected = i; }
  /** Fisica simples: integra velocidade, gravidade (reduzida por slow_falling), arrasto e colisao com o chao. */
  physics() {
    const g = this.effects.slow_falling ? 0.01 : 0.08;
    const n = { x: this.location.x + this.vel.x, y: this.location.y + this.vel.y, z: this.location.z + this.vel.z };
    if (this.dimension.solid(n.x, n.y + 0.9, n.z) || this.dimension.solid(n.x, n.y + 0.1, n.z)) { this.vel.x = 0; this.vel.z = 0; n.x = this.location.x; n.z = this.location.z; }
    if (this.dimension.solid(n.x, n.y, n.z) && this.vel.y <= 0) { n.y = Math.floor(n.y) + 1; this.vel.y = 0; }
    this.location = n;
    this.vel.y = (this.vel.y - g) * 0.98;
    const drag = this.isOnGround ? 0.546 : 0.91;
    this.vel.x *= drag; this.vel.z *= drag;
    for (const [k, e] of Object.entries(this.effects)) { e.d--; if (e.d <= 0) delete this.effects[k]; }
  }
}

// ---------------------------------------------------------------- world/system
class Signal {
  constructor() { this._subs = []; }
  subscribe(f) { this._subs.push(f); return f; }
  unsubscribe(f) { this._subs = this._subs.filter((x) => x !== f); }
  fire(ev) { for (const f of this._subs) f(ev); }
}
const AFTER = ['itemUse', 'playerButtonInput', 'entityHitEntity', 'entityHitBlock', 'playerSpawn', 'entityDie', 'entitySpawn', 'explosion'];
const BEFORE = ['explosion', 'playerLeave'];
export const world = {
  players: [], dyn: {},
  afterEvents: Object.fromEntries(AFTER.map((k) => [k, new Signal()])),
  beforeEvents: Object.fromEntries(BEFORE.map((k) => [k, new Signal()])),
  getAllPlayers() { return this.players.slice(); },
  getDynamicProperty(k) { return this.dyn[k]; },
  setDynamicProperty(k, v) { this.dyn[k] = v; },
  getDimension() { return overworld; },
};
export const system = {
  currentTick: 0, intervals: [], queue: [],
  runInterval(f, n = 1) { this.intervals.push({ f, n }); return this.intervals.length; },
  run(f) { this.queue.push(f); return 0; },
  runTimeout(f) { this.queue.push(f); return 0; },
  /** Avanca um tick do jogo. */
  step() {
    this.currentTick++;
    for (const { f, n } of this.intervals) if (this.currentTick % n === 0) f();
    const q = this.queue.splice(0);
    for (const f of q) f();
    for (const p of world.players) p.physics();
  },
};
