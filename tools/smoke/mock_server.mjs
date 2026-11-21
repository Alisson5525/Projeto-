// Minimal behavioural mock of @minecraft/server 2.0.0 used by the smoke test.
// It is intentionally strict: calling something that doesn't exist throws,
// exactly like the real engine would.

export const EquipmentSlot = { Chest: "Chest", Feet: "Feet", Head: "Head", Legs: "Legs", Mainhand: "Mainhand", Offhand: "Offhand" };
export const GameMode = { Adventure: "Adventure", Creative: "Creative", Spectator: "Spectator", Survival: "Survival" };
export const ItemLockMode = { inventory: "inventory", none: "none", slot: "slot" };
export const WeatherType = { Clear: "Clear", Rain: "Rain", Thunder: "Thunder" };
export const MoonPhase = { FullMoon: 0, WaningGibbous: 1, FirstQuarter: 2, WaningCrescent: 3, NewMoon: 4, WaxingCrescent: 5, LastQuarter: 6, WaxingGibbous: 7 };

export const log = { calls: [], errors: [] };
export const registry = { items: new Set(["sunrise:blood_altar", "sunrise:recharging_altar", "sunrise:meat_grinder", "sunrise:caixao_oak", "sunrise:garlic",
  "sunrise:blood_bottle_4", "sunrise:vampire_skill_item", "sunrise:werewolf_skill_item", "sunrise:hunter_skill_item", "sunrise:vampire_craft_book",
  "sunrise:eclipse_ingot", "sunrise:vampire_sword"]) };
export const ItemTypes = { get: (id) => (registry.items.has(id) ? { id } : undefined) };
const rec = (what) => log.calls.push(what);

class Signal {
  constructor() { this.handlers = []; }
  subscribe(fn) { this.handlers.push(fn); return fn; }
  unsubscribe(fn) { this.handlers = this.handlers.filter((h) => h !== fn); }
  fire(ev) { for (const h of this.handlers) h(ev); }
}
const signals = (names) => Object.fromEntries(names.map((n) => [n, new Signal()]));

export class ItemStack {
  constructor(typeId, amount = 1) {
    if (typeof typeId !== "string" || !typeId.includes(":")) throw new Error("bad item id " + typeId);
    this.typeId = typeId; this.amount = amount; this.lockMode = "none"; this.keepOnDeath = false; this.nameTag = undefined;
    this._dur = { damage: 0, maxDurability: 100 };
  }
  getComponent(id) {
    if (id === "minecraft:durability") return this._dur;
    if (id === "minecraft:enchantable") return { getEnchantments: () => [], addEnchantments: () => {} };
    return undefined;
  }
  clone() { const c = new ItemStack(this.typeId, this.amount); return c; }
}

class Container {
  constructor(size) { this.size = size; this.slots = new Array(size).fill(undefined); }
  get emptySlotsCount() { return this.slots.filter((s) => !s).length; }
  get isValid() { return true; }
  getItem(i) { return this.slots[i]; }
  setItem(i, it) { this.slots[i] = it; }
  addItem(it) {
    for (let i = 0; i < this.size; i++) if (this.slots[i] && this.slots[i].typeId === it.typeId) { this.slots[i].amount += it.amount; return undefined; }
    const i = this.slots.findIndex((s) => !s);
    if (i < 0) return it;
    this.slots[i] = it; return undefined;
  }
}

let nextId = 1;
export class Entity {
  constructor(typeId, dimension, location, families = []) {
    this.id = String(nextId++); this.typeId = typeId; this.dimension = dimension; this.location = { ...location };
    this._tags = new Set(); this._dp = new Map(); this._effects = new Map(); this._fam = families; this.isValid = true;
    this._health = { currentValue: 20, effectiveMax: 20, setCurrentValue: (v) => { this._health.currentValue = v; } };
    this.isSneaking = false; this.isSprinting = false; this.isJumping = false; this.isOnGround = true; this.isInWater = false;
    this.nameTag = "";
    dimension._entities.push(this);
  }
  hasTag(t) { return this._tags.has(t); }
  addTag(t) { this._tags.add(t); return true; }
  removeTag(t) { return this._tags.delete(t); }
  getTags() { return [...this._tags]; }
  getDynamicProperty(k) { return this._dp.get(k); }
  setDynamicProperty(k, v) { if (v === undefined) this._dp.delete(k); else this._dp.set(k, v); }
  getComponent(id) {
    if (id === "minecraft:health") return this._health;
    if (id === "minecraft:type_family") return { hasTypeFamily: (f) => this._fam.includes(f), getTypeFamilies: () => this._fam };
    if (id === "minecraft:projectile" && this.typeId === "minecraft:arrow") return { owner: undefined, shoot: (v) => rec(["shoot", v]) };
    if (id === "minecraft:tameable") return undefined;
    return undefined;
  }
  getEffect(id) { return this._effects.get(id); }
  addEffect(id, duration, opts = {}) { if (typeof duration !== "number") throw new Error("duration"); const e = { typeId: id, duration, amplifier: opts.amplifier ?? 0 }; this._effects.set(id, e); return e; }
  removeEffect(id) { return this._effects.delete(id); }
  applyDamage(n, opts) { if (typeof n !== "number" || n < 0) throw new Error("bad damage"); this._health.currentValue -= n; rec(["damage", this.typeId, n, opts?.cause]); return true; }
  applyKnockback(h, v) { if (typeof h !== "object" || typeof v !== "number") throw new Error("applyKnockback(VectorXZ, number) expected"); rec(["kb", h, v]); }
  applyImpulse(v) { rec(["impulse", v]); }
  setOnFire(s) { rec(["fire", this.typeId, s]); return true; }
  getViewDirection() { return { x: 0, y: 0, z: 1 }; }
  getHeadLocation() { return { x: this.location.x, y: this.location.y + 1.6, z: this.location.z }; }
  getEntitiesFromViewDirection(opts) { return this.dimension._entities.filter((e) => e !== this && e.isValid && Math.abs(e.location.x - this.location.x) < 1 && e.location.z > this.location.z && e.location.z - this.location.z <= (opts?.maxDistance ?? 64)).map((entity) => ({ entity, distance: 1 })); }
  tryTeleport(loc) { this.location = { ...loc }; return true; }
  teleport(loc) { this.location = { ...loc }; }
  triggerEvent(e) { rec(["event", e]); }
  playAnimation(a, o) { rec(["anim", a]); }
  remove() { this.isValid = false; }
  matches() { return true; }
  runCommand(c) { rec(["cmd", c]); return { successCount: 1 }; }
  kill() { this.isValid = false; return true; }
}

export class Player extends Entity {
  constructor(name, dimension) {
    super("minecraft:player", dimension, { x: 0, y: 64, z: 0 }, ["player", "mob"]);
    this.name = name; this._inv = new Container(36); this._equip = {}; this._gm = GameMode.Survival; this.messages = []; this.actionbar = undefined;
    this.onScreenDisplay = { setActionBar: (t) => { this.actionbar = t; }, setTitle: (t, o) => rec(["title", t]) };
    this.camera = { fade: (o) => rec(["fade", o]) };
    this.selectedSlotIndex = 0;
  }
  getComponent(id) {
    if (id === "minecraft:inventory") return { container: this._inv };
    if (id === "minecraft:equippable") return {
      getEquipment: (s) => { if (!EquipmentSlot[s]) throw new Error("bad slot " + s); return s === "Mainhand" ? this._inv.getItem(this.selectedSlotIndex) : this._equip[s]; },
      setEquipment: (s, it) => { if (!EquipmentSlot[s]) throw new Error("bad slot " + s); if (s === "Mainhand") this._inv.setItem(this.selectedSlotIndex, it); else this._equip[s] = it; return true; },
    };
    return super.getComponent(id);
  }
  getGameMode() { return this._gm; }
  sendMessage(m) { this.messages.push(m); }
  playSound() {}
  setSpawnPoint(p) { rec(["spawnpoint", p]); }
}

class Block {
  constructor(dim, loc, typeId = "minecraft:air", states = {}) { this.dimension = dim; this.location = loc; this.typeId = typeId; this._states = states; }
  get isAir() { return this.typeId === "minecraft:air"; }
  get isLiquid() { return false; }
  get permutation() {
    const states = { ...this._states };
    return { getState: (n) => states[n], withState: (n, v) => { const p = { _s: { ...states, [n]: v } }; return p; } };
  }
  setPermutation(p) { this._states = p._s; }
  setType(t) { this.typeId = t; }
  above() { return new Block(this.dimension, { ...this.location, y: this.location.y + 1 }); }
  below() { return new Block(this.dimension, { ...this.location, y: this.location.y - 1 }, "sunrise:caixao_oak"); }
  getItemStack() { return new ItemStack(this.typeId, 1); }
  getComponent(id) {
    if (id === "minecraft:inventory" && this.typeId === "minecraft:chest") { this._inv ??= new Container(27); return { container: this._inv }; }
    return undefined;
  }
}

class Dimension {
  constructor(id) { this.id = id; this._entities = []; this.roofY = undefined; }
  spawnParticle(id, loc) { if (!id.includes(":")) throw new Error("particle id"); rec(["particle", id]); }
  playSound(id, loc, o) { rec(["sound", id]); }
  spawnEntity(type, loc) { const fam = type.includes("vampire") ? ["vampiro", "monster"] : ["mob"]; return new Entity(type, this, loc, fam); }
  spawnItem(it, loc) { rec(["drop", it.typeId]); return new Entity("minecraft:item", this, loc); }
  getEntities(q = {}) {
    return this._entities.filter((e) => e.isValid && (!q.location || Math.hypot(e.location.x - q.location.x, e.location.y - q.location.y, e.location.z - q.location.z) <= (q.maxDistance ?? 1e9))
      && (!q.type || e.typeId === q.type) && (!q.families || q.families.every((f) => e._fam.includes(f))) && (!q.excludeTypes || !q.excludeTypes.includes(e.typeId)));
  }
  getPlayers() { return this._entities.filter((e) => e instanceof Player); }
  getBlock(loc) { const k = `${loc.x},${loc.y},${loc.z}`; this._blocks ??= new Map(); if (!this._blocks.has(k)) this._blocks.set(k, new Block(this, loc)); return this._blocks.get(k); }
  getTopmostBlock({ x, z }) { return new Block(this, { x, y: this.roofY ?? 62, z }, "minecraft:grass_block"); }
  getBlockFromRay(loc, dir, o) { return { block: new Block(this, { x: Math.floor(loc.x + dir.x * 5), y: 63, z: Math.floor(loc.z + dir.z * 5) }, "minecraft:stone"), face: "Up", faceLocation: { x: 0, y: 1, z: 0 } }; }
  runCommand(c) { rec(["cmd", c]); return { successCount: 1 }; }
  setWeather() {}
}

const overworld = new Dimension("minecraft:overworld");
// Early execution: world APIs throw until the world has loaded (like the real 2.x engine).
export const early = { on: true };
const guard = (fn) => (...a) => { if (early.on) throw new Error("world API used during early execution"); return fn(...a); };
let time = 6000;
let moon = 0;
const worldDP = new Map();
export const world = {
  afterEvents: signals(["playerSpawn", "playerLeave", "entityDie", "entityHitEntity", "entityHurt", "itemUse", "itemCompleteUse", "weatherChange", "projectileHitEntity", "playerInteractWithEntity", "dataDrivenEntityTrigger", "entityHitBlock", "itemStartUseOn"]),
  beforeEvents: signals(["itemUse", "playerInteractWithEntity"]),
  getAllPlayers: guard(() => overworld.getPlayers().filter((p) => p.isValid)),
  getPlayers: guard((q = {}) => overworld.getPlayers().filter((p) => p.isValid && (!q.tags || q.tags.every((t) => p.hasTag(t))))),
  getDimension: guard(() => overworld),
  getTimeOfDay: guard(() => time),
  setTimeOfDay: guard((t) => { time = t; }),
  getAbsoluteTime: guard(() => 24000 * 5 + time),
  getMoonPhase: guard(() => moon),
  getDynamicProperty: guard((k) => worldDP.get(k)),
  setDynamicProperty: guard((k, v) => worldDP.set(k, v)),
  getDefaultSpawnLocation: guard(() => ({ x: 0, y: 64, z: 0 })),
  getEntity: guard((id) => overworld._entities.find((e) => e.id === id)),
  scoreboard: { getObjective: () => undefined },
};

const intervals = [];
const timeouts = [];
let tick = 0;
export const system = {
  get currentTick() { return tick; },
  runInterval(fn, n = 1) { intervals.push({ fn, n, next: tick + n }); return intervals.length; },
  runTimeout(fn, n = 1) { timeouts.push({ fn, at: tick + n }); return timeouts.length; },
  run(fn) { timeouts.push({ fn, at: tick + 1 }); },
  beforeEvents: signals(["startup"]),
  afterEvents: signals(["scriptEventReceive"]),
};

// --- Test harness controls -------------------------------------------------------------------
export const harness = {
  overworld, Player, Entity, Block,
  setTime: (t) => { time = t; },
  setMoon: (m) => { moon = m; },
  step(n = 1) {
    for (let i = 0; i < n; i++) {
      tick++;
      for (const iv of intervals) if (iv.next <= tick) { iv.next = tick + iv.n; try { iv.fn(); } catch (e) { log.errors.push(e); } }
      for (const t of timeouts.splice(0).filter((t) => { if (t.at <= tick) { try { t.fn(); } catch (e) { log.errors.push(e); } return false; } return true; })) timeouts.push(t);
    }
  },
};
