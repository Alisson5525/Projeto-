// Mock mínimo da API @minecraft/server 2.3.0 para os testes em Node.
// Implementa só o que os scripts do Zênite usam, com estado inspecionável
// (blocos num Map, sons/partículas/comandos registrados em listas).

// ---------------------------------------------------------------- enums
export const GameMode = { Adventure: 'Adventure', Creative: 'Creative', Spectator: 'Spectator', Survival: 'Survival' };
export const EquipmentSlot = { Chest: 'Chest', Feet: 'Feet', Head: 'Head', Legs: 'Legs', Mainhand: 'Mainhand', Offhand: 'Offhand' };
export const EasingType = { InOutSine: 'InOutSine', OutCubic: 'OutCubic', InOutCubic: 'InOutCubic', Linear: 'Linear', OutBack: 'OutBack', InOutQuad: 'InOutQuad', OutQuad: 'OutQuad' };
export const CommandPermissionLevel = { Any: 0, GameDirectors: 1, Admin: 2, Host: 3, Owner: 4 };
export const CustomCommandParamType = { BlockType: 'BlockType', Boolean: 'Boolean', EntitySelector: 'EntitySelector', EntityType: 'EntityType', Enum: 'Enum', Float: 'Float', Integer: 'Integer', ItemType: 'ItemType', Location: 'Location', PlayerSelector: 'PlayerSelector', String: 'String' };
export const CustomCommandStatus = { Success: 0, Failure: 1 };
export const PlayerPermissionLevel = { Visitor: 0, Member: 1, Operator: 2, Custom: 3 };
export const EntityDamageCause = { entityAttack: 'entityAttack', magic: 'magic', override: 'override', projectile: 'projectile', entityExplosion: 'entityExplosion', fall: 'fall', none: 'none' };
export const EntityComponentTypes = { Health: 'minecraft:health', Inventory: 'minecraft:inventory', Equippable: 'minecraft:equippable', Projectile: 'minecraft:projectile', TypeFamily: 'minecraft:type_family' };

// ---------------------------------------------------------------- util
const v = (x, y, z) => ({ x, y, z });
const chave = (l) => `${Math.floor(l.x)},${Math.floor(l.y)},${Math.floor(l.z)}`;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

class Signal {
  constructor() { this.handlers = []; }
  subscribe(cb) { this.handlers.push(cb); return cb; }
  unsubscribe(cb) { this.handlers = this.handlers.filter((h) => h !== cb); }
  /** usado pelos testes */
  __emit(ev) { for (const h of [...this.handlers]) h(ev); return ev; }
}

export class MolangVariableMap {
  constructor() { this.vars = {}; }
  setColorRGB(n, c) { this.vars[n] = { ...c, alpha: 1 }; }
  setColorRGBA(n, c) { this.vars[n] = { ...c }; }
  setFloat(n, f) { this.vars[n] = f; }
  setVector3(n, vec) { this.vars[n] = { ...vec }; }
}

export class ItemStack {
  constructor(typeId, amount = 1) {
    this.typeId = typeId.includes(':') ? typeId : `minecraft:${typeId}`;
    this.amount = amount;
    this.nameTag = undefined;
    this._lore = [];
  }
  getLore() { return [...this._lore]; }
  setLore(l = []) { this._lore = [...l]; }
  clone() { const c = new ItemStack(this.typeId, this.amount); c.nameTag = this.nameTag; c._lore = [...this._lore]; return c; }
}

class Container {
  constructor(size) { this.size = size; this.slots = new Array(size).fill(undefined); }
  get emptySlotsCount() { return this.slots.filter((s) => !s).length; }
  getItem(i) { return this.slots[i]; }
  setItem(i, it) { this.slots[i] = it; }
  addItem(it) {
    const i = this.slots.findIndex((s) => !s);
    if (i < 0) return it;
    this.slots[i] = it;
    return undefined;
  }
}

// ---------------------------------------------------------------- blocos
export class Block {
  constructor(dim, loc) { this.dimension = dim; this.location = v(Math.floor(loc.x), Math.floor(loc.y), Math.floor(loc.z)); this.isValid = true; }
  get x() { return this.location.x; }
  get y() { return this.location.y; }
  get z() { return this.location.z; }
  get typeId() { return this.dimension.__blocos.get(chave(this.location)) ?? 'minecraft:air'; }
  get type() { return { id: this.typeId }; }
  get isAir() { return this.typeId === 'minecraft:air'; }
  get isLiquid() { return this.typeId === 'minecraft:water' || this.typeId === 'minecraft:lava'; }
  setType(t) { this.dimension.setBlockType(this.location, typeof t === 'string' ? t : t.id); }
  above(n = 1) { return this.dimension.getBlock(v(this.x, this.y + n, this.z)); }
  below(n = 1) { return this.dimension.getBlock(v(this.x, this.y - n, this.z)); }
  center() { return v(this.x + 0.5, this.y + 0.5, this.z + 0.5); }
  bottomCenter() { return v(this.x + 0.5, this.y, this.z + 0.5); }
}

export class LocationOutOfWorldBoundariesError extends Error {}

let proximoId = 1;

export class Dimension {
  constructor(id) {
    this.id = id;
    this.heightRange = { min: -64, max: 320 };
    this.__blocos = new Map();
    this.__entidades = [];
    this.__particulas = [];
    this.__sons = [];
    this.__explosoes = [];
    this.__comandos = [];
    this.__descarregados = new Set(); // chaves de chunk "cx,cz"
  }
  __checar(l) {
    if (l.y < this.heightRange.min || l.y >= this.heightRange.max) throw new LocationOutOfWorldBoundariesError(`fora do mundo: ${chave(l)}`);
  }
  __carregado(l) { return !this.__descarregados.has(`${Math.floor(l.x / 16)},${Math.floor(l.z / 16)}`); }
  getBlock(l) { this.__checar(l); if (!this.__carregado(l)) return undefined; return new Block(this, l); }
  setBlockType(l, t) {
    this.__checar(l);
    if (!this.__carregado(l)) throw new Error('chunk descarregado');
    const id = typeof t === 'string' ? (t.includes(':') ? t : `minecraft:${t}`) : t.id;
    if (id === 'minecraft:air') this.__blocos.delete(chave(l)); else this.__blocos.set(chave(l), id);
  }
  spawnEntity(typeId, loc) {
    const e = typeId === 'minecraft:player' ? new Player(this, loc, 'Novo') : new Entity(typeId, this, loc);
    return e;
  }
  spawnItem(item, loc) { const e = new Entity('minecraft:item', this, loc); e.__item = item; return e; }
  spawnParticle(id, loc, vars) { this.__particulas.push({ id, loc: { ...loc }, vars: vars ? { ...vars.vars } : undefined }); }
  playSound(id, loc, opts) { this.__sons.push({ id, loc: { ...loc }, opts }); }
  createExplosion(loc, raio, opts = {}) { this.__explosoes.push({ loc: { ...loc }, raio, opts }); return true; }
  runCommand(cmd) { this.__comandos.push(cmd); return { successCount: 1 }; }
  getEntities(o = {}) {
    return this.__entidades.filter((e) => {
      if (!e.isValid) return false;
      if (o.type && e.typeId !== o.type) return false;
      if (o.excludeTypes && o.excludeTypes.includes(e.typeId)) return false;
      if (o.families && !o.families.every((f) => e.__familias.includes(f))) return false;
      if (o.excludeFamilies && o.excludeFamilies.some((f) => e.__familias.includes(f))) return false;
      if (o.tags && !o.tags.every((t) => e.hasTag(t))) return false;
      if (o.excludeTags && o.excludeTags.some((t) => e.hasTag(t))) return false;
      if (o.location) {
        const d = dist(o.location, e.location);
        if (o.maxDistance !== undefined && d > o.maxDistance) return false;
        if (o.minDistance !== undefined && d < o.minDistance) return false;
      }
      return true;
    });
  }
  getPlayers(o = {}) { return this.getEntities({ ...o, type: 'minecraft:player' }); }
  getEntitiesAtBlockLocation(l) { return this.__entidades.filter((e) => e.isValid && chave(e.location) === chave(l)); }
}

// ---------------------------------------------------------------- entidades
const FAMILIAS = {
  'minecraft:player': ['player', 'mob'],
  'minecraft:zombie': ['zombie', 'undead', 'monster', 'mob'],
  'minecraft:skeleton': ['skeleton', 'undead', 'monster', 'mob'],
  'minecraft:cow': ['cow', 'mob'],
  'minecraft:wolf': ['wolf', 'mob'],
  'minecraft:vex': ['vex', 'monster', 'mob'],
  'minecraft:arrow': ['arrow'],
  'minecraft:item': ['item'],
  'zenite:arconte': ['zenite_arconte', 'monster', 'mob'],
};
const VIDA = { 'minecraft:player': 20, 'minecraft:zombie': 20, 'minecraft:skeleton': 20, 'minecraft:cow': 10, 'minecraft:wolf': 8, 'minecraft:vex': 14, 'zenite:arconte': 500 };

export class Entity {
  constructor(typeId, dim, loc) {
    this.id = String(proximoId++);
    this.typeId = typeId;
    this.dimension = dim;
    this.location = { ...loc };
    this.isValid = true;
    this.nameTag = '';
    this.__familias = FAMILIAS[typeId] ?? ['mob'];
    this.__vel = v(0, 0, 0);
    this.__rot = { x: 0, y: 0 };
    this.__efeitos = new Map();
    this.__tags = new Set();
    this.__props = new Map();
    this.__impulsos = [];
    this.__knockbacks = [];
    this.__danos = [];
    const max = VIDA[typeId];
    this.__vida = max !== undefined ? { atual: max, max } : undefined;
    dim.__entidades.push(this);
  }
  getComponent(nome) {
    const n = nome.startsWith('minecraft:') ? nome : `minecraft:${nome}`;
    if (n === 'minecraft:health' && this.__vida) {
      const s = this.__vida;
      return {
        get currentValue() { return s.atual; },
        get effectiveMax() { return s.max; },
        get defaultValue() { return s.max; },
        setCurrentValue(x) { s.atual = Math.max(0, Math.min(s.max, x)); return true; },
        resetToMaxValue() { s.atual = s.max; },
      };
    }
    if (n === 'minecraft:projectile' && this.__familias.includes('arrow')) return { owner: this.__dono };
    if (n === 'minecraft:type_family') { const f = this.__familias; return { getTypeFamilies: () => [...f], hasTypeFamily: (x) => f.includes(x) }; }
    if (n === 'minecraft:item' && this.__item) return { itemStack: this.__item };
    if (n === 'minecraft:tameable' && this.__dono) return { isTamed: true, tamedToPlayerId: this.__dono };
    return undefined;
  }
  hasComponent(n) { return !!this.getComponent(n); }
  addEffect(tipo, duracao, o = {}) { const id = typeof tipo === 'string' ? tipo.replace('minecraft:', '') : tipo.getName(); this.__efeitos.set(id, { duracao, amplificador: o.amplifier ?? 0, showParticles: o.showParticles ?? true }); return undefined; }
  removeEffect(tipo) { const id = typeof tipo === 'string' ? tipo.replace('minecraft:', '') : tipo.getName(); return this.__efeitos.delete(id); }
  getEffect(tipo) { const id = typeof tipo === 'string' ? tipo.replace('minecraft:', '') : tipo; const e = this.__efeitos.get(id); return e ? { typeId: id, duration: e.duracao, amplifier: e.amplificador, isValid: true } : undefined; }
  getEffects() { return [...this.__efeitos.entries()].map(([typeId, e]) => ({ typeId, duration: e.duracao, amplifier: e.amplificador, isValid: true })); }
  applyDamage(qtd, o = {}) {
    this.__danos.push({ qtd, o });
    if (!this.__vida) return false;
    const resist = this.__efeitos.get('resistance');
    const fator = resist ? Math.max(0, 1 - 0.2 * (resist.amplificador + 1)) : 1;
    this.__vida.atual = Math.max(0, this.__vida.atual - qtd * fator);
    if (this.__vida.atual <= 0) this.__morrer(o.damagingEntity);
    return true;
  }
  __morrer(matador) {
    if (!this.isValid) return;
    this.isValid = false;
    mundo.afterEvents.entityDie.__emit({ deadEntity: this, damageSource: { cause: 'entityAttack', damagingEntity: matador } });
  }
  applyImpulse(vec) { if (this.typeId === 'minecraft:player') throw new Error('applyImpulse não funciona em jogadores'); this.__impulsos.push({ ...vec }); this.__vel = v(this.__vel.x + vec.x, this.__vel.y + vec.y, this.__vel.z + vec.z); }
  applyKnockback(h, vert) { this.__knockbacks.push({ h: { ...h }, vert }); }
  clearVelocity() { this.__vel = v(0, 0, 0); }
  getVelocity() { return { ...this.__vel }; }
  teleport(loc, o = {}) {
    this.location = { ...loc };
    if (o.dimension) { this.dimension.__entidades = this.dimension.__entidades.filter((e) => e !== this); o.dimension.__entidades.push(this); this.dimension = o.dimension; }
    if (o.facingLocation) { const d = v(o.facingLocation.x - loc.x, o.facingLocation.y - loc.y, o.facingLocation.z - loc.z); this.__rot = { x: 0, y: (Math.atan2(-d.x, d.z) * 180) / Math.PI }; }
    if (o.rotation) this.__rot = { ...o.rotation };
  }
  tryTeleport(loc, o = {}) { this.teleport(loc, o); return true; }
  getRotation() { return { ...this.__rot }; }
  setRotation(r) { this.__rot = { ...r }; }
  getViewDirection() {
    const yaw = (this.__rot.y * Math.PI) / 180; const pitch = (this.__rot.x * Math.PI) / 180;
    return v(-Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
  }
  getHeadLocation() { return v(this.location.x, this.location.y + (this.typeId === 'minecraft:player' ? 1.62 : 1.5), this.location.z); }
  getBlockFromViewDirection(o = {}) {
    const max = o.maxDistance ?? 64; const d = this.getViewDirection(); const h = this.getHeadLocation();
    for (let t = 0; t <= max; t += 0.2) {
      const p = v(h.x + d.x * t, h.y + d.y * t, h.z + d.z * t);
      let b; try { b = this.dimension.getBlock(p); } catch { return undefined; }
      if (b && !b.isAir && (o.includeLiquidBlocks || !b.isLiquid)) return { block: b, face: 'North', faceLocation: v(p.x - b.x, p.y - b.y, p.z - b.z) };
    }
    return undefined;
  }
  getEntitiesFromViewDirection(o = {}) {
    const max = o.maxDistance ?? 64; const d = this.getViewDirection(); const h = this.getHeadLocation();
    const out = [];
    for (const e of this.dimension.__entidades) {
      if (e === this || !e.isValid) continue;
      const c = v(e.location.x, e.location.y + 0.9, e.location.z);
      const rel = v(c.x - h.x, c.y - h.y, c.z - h.z);
      const t = rel.x * d.x + rel.y * d.y + rel.z * d.z;
      if (t < 0 || t > max) continue;
      const perp = Math.hypot(rel.x - d.x * t, rel.y - d.y * t, rel.z - d.z * t);
      if (perp < 1.0) out.push({ entity: e, distance: t });
    }
    return out.sort((a, b) => a.distance - b.distance);
  }
  kill() { if (this.__vida) this.__vida.atual = 0; this.__morrer(undefined); return true; }
  remove() { this.isValid = false; this.dimension.__entidades = this.dimension.__entidades.filter((e) => e !== this); }
  addTag(t) { this.__tags.add(t); return true; }
  removeTag(t) { return this.__tags.delete(t); }
  hasTag(t) { return this.__tags.has(t); }
  getTags() { return [...this.__tags]; }
  getDynamicProperty(k) { return this.__props.get(k); }
  setDynamicProperty(k, val) { if (val === undefined) this.__props.delete(k); else this.__props.set(k, val); }
  getDynamicPropertyIds() { return [...this.__props.keys()]; }
  runCommand(cmd) { this.dimension.__comandos.push(cmd); return { successCount: 1 }; }
  isOnGround = true;
  isSneaking = false;
  isFalling = false;
  isInWater = false;
}

export class Player extends Entity {
  constructor(dim, loc, nome = 'Steve') {
    super('minecraft:player', dim, loc);
    this.name = nome;
    this.nameTag = nome;
    this.__modo = GameMode.Survival;
    this.playerPermissionLevel = PlayerPermissionLevel.Operator;
    this.__inventario = new Container(36);
    this.__equip = {};
    this.selectedSlotIndex = 0;
    this.__mensagens = [];
    this.__actionbar = [];
    this.__titulos = [];
    this.__sonsJogador = [];
    this.__camera = [];
    const self = this;
    this.onScreenDisplay = {
      setActionBar(t) { self.__actionbar.push(t); },
      setTitle(t, o) { self.__titulos.push({ t, o }); },
      updateSubtitle(t) { self.__titulos.push({ sub: t }); },
      isValid: true,
    };
    this.camera = {
      isValid: true,
      fade(o) { self.__camera.push({ fade: o }); },
      setCamera(preset, o) { self.__camera.push({ preset, o }); },
      clear() { self.__camera.push({ clear: true }); },
    };
  }
  getGameMode() { return this.__modo; }
  setGameMode(m) { this.__modo = m; }
  sendMessage(m) { this.__mensagens.push(m); }
  playSound(id, o) { this.__sonsJogador.push({ id, o }); }
  spawnParticle(id, loc, vars) { this.dimension.spawnParticle(id, loc, vars); }
  getComponent(nome) {
    const n = nome.startsWith('minecraft:') ? nome : `minecraft:${nome}`;
    if (n === 'minecraft:inventory') return { container: this.__inventario, inventorySize: 36 };
    if (n === 'minecraft:equippable') {
      const eq = this.__equip; const inv = this.__inventario; const self = this;
      return {
        getEquipment(s) { return s === 'Mainhand' ? inv.getItem(self.selectedSlotIndex) : eq[s]; },
        setEquipment(s, it) { if (s === 'Mainhand') inv.setItem(self.selectedSlotIndex, it); else eq[s] = it; return true; },
      };
    }
    return super.getComponent(nome);
  }
}

// ---------------------------------------------------------------- mundo
const overworld = new Dimension('minecraft:overworld');
const dims = { 'minecraft:overworld': overworld, overworld, 'minecraft:nether': new Dimension('minecraft:nether'), 'minecraft:the_end': new Dimension('minecraft:the_end') };

const mundo = {
  __props: new Map(),
  __mensagens: [],
  afterEvents: {},
  beforeEvents: {},
  getDimension(id) { return dims[id] ?? dims[`minecraft:${id}`]; },
  getAllPlayers() { return Object.values(dims).filter((d, i, a) => a.indexOf(d) === i).flatMap((d) => d.__entidades.filter((e) => e instanceof Player && e.isValid)); },
  getPlayers(o) { return this.getAllPlayers().filter((p) => !o?.name || p.name === o.name); },
  getEntity(id) { for (const d of Object.values(dims)) { const e = d.__entidades.find((x) => x.id === id); if (e) return e; } return undefined; },
  getDynamicProperty(k) { return this.__props.get(k); },
  setDynamicProperty(k, val) { if (val === undefined) this.__props.delete(k); else this.__props.set(k, val); },
  sendMessage(m) { this.__mensagens.push(m); },
  getAbsoluteTime() { return sistema.currentTick; },
  getTimeOfDay() { return 6000; },
};
for (const n of ['entityDie', 'entityHurt', 'entityHitEntity', 'entitySpawn', 'entityRemove', 'itemUse', 'itemStartUse', 'itemReleaseUse', 'itemCompleteUse', 'itemStopUse', 'playerSpawn', 'playerJoin', 'playerLeave', 'playerInteractWithBlock', 'playerInteractWithEntity', 'playerBreakBlock', 'projectileHitEntity', 'projectileHitBlock', 'worldLoad', 'explosion', 'effectAdd', 'playerButtonInput', 'playerDimensionChange']) mundo.afterEvents[n] = new Signal();
for (const n of ['itemUse', 'playerLeave', 'playerBreakBlock', 'playerInteractWithBlock', 'playerInteractWithEntity', 'explosion', 'effectAdd', 'entityRemove']) mundo.beforeEvents[n] = new Signal();
export const world = mundo;

// ---------------------------------------------------------------- sistema
let runs = [];
let runIdSeq = 1;
const comandosRegistrados = new Map();
const enumsRegistrados = new Map();
const sistema = {
  currentTick: 0,
  beforeEvents: { startup: new Signal(), shutdown: new Signal(), watchdogTerminate: new Signal() },
  afterEvents: { scriptEventReceive: new Signal() },
  run(cb) { return this.runTimeout(cb, 0); },
  runTimeout(cb, ticks = 1) { const id = runIdSeq++; runs.push({ id, cb, em: this.currentTick + Math.max(1, ticks), intervalo: 0 }); return id; },
  runInterval(cb, ticks = 1) { const id = runIdSeq++; runs.push({ id, cb, em: this.currentTick + Math.max(1, ticks), intervalo: Math.max(1, ticks) }); return id; },
  runJob(gen) { const id = runIdSeq++; runs.push({ id, gen, em: this.currentTick + 1, intervalo: 1, job: true }); return id; },
  clearRun(id) { runs = runs.filter((r) => r.id !== id); },
  clearJob(id) { this.clearRun(id); },
  waitTicks(n) { return new Promise((res) => this.runTimeout(res, n)); },
  /** usado pelos testes: avança n ticks executando timers e jobs */
  __tickar(n = 1) {
    for (let i = 0; i < n; i++) {
      this.currentTick++;
      for (const r of [...runs]) {
        if (!runs.includes(r) || r.em > this.currentTick) continue;
        if (r.job) {
          let passos = 0; let fim = false;
          while (passos++ < 200) { const res = r.gen.next(); if (res.done) { fim = true; break; } }
          if (fim) runs = runs.filter((x) => x !== r);
          continue;
        }
        if (r.intervalo) r.em = this.currentTick + r.intervalo; else runs = runs.filter((x) => x !== r);
        r.cb();
      }
    }
  },
  /** dispara o startup com um registro de comandos falso */
  __startup() {
    const reg = {
      registerCommand(def, cb) { comandosRegistrados.set(def.name, { def, cb }); },
      registerEnum(nome, valores) { enumsRegistrados.set(nome, valores); },
    };
    this.beforeEvents.startup.__emit({ customCommandRegistry: reg, itemComponentRegistry: { registerCustomComponent() {} }, blockComponentRegistry: { registerCustomComponent() {} } });
  },
  __comandos: comandosRegistrados,
  __enums: enumsRegistrados,
  __resetar() { runs = []; this.currentTick = 0; },
};
export const system = sistema;

/** Utilitário de testes: limpa o mundo entre casos. */
export function __resetarMundo() {
  for (const d of new Set(Object.values(dims))) {
    d.__blocos.clear(); d.__entidades.length = 0; d.__particulas.length = 0; d.__sons.length = 0;
    d.__explosoes.length = 0; d.__comandos.length = 0; d.__descarregados.clear();
  }
  mundo.__props.clear(); mundo.__mensagens.length = 0;
}
