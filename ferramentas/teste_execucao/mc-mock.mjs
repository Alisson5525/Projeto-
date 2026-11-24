// Simulacao minima e ESTRITA da API @minecraft/server 2.0 para teste de fumaca.
// Objetos conhecidos tem metodos reais; acessar metodos que nao existem na API 2.0
// (ex.: runCommandAsync, isValid()) gera erro, como no jogo.
export const erros = [];
export const log = [];
const subs = {};
function sinal(nome) {
  return {
    subscribe(fn) { (subs[nome] ??= []).push(fn); return fn; },
    unsubscribe(fn) { subs[nome] = (subs[nome] ?? []).filter((f) => f !== fn); },
  };
}
export function disparar(nome, ev) {
  for (const fn of subs[nome] ?? []) {
    try { fn(ev); } catch (e) { erros.push(`[${nome}] ${e?.stack ?? e}`); }
  }
}
export function inscritos() { return Object.fromEntries(Object.entries(subs).map(([k, v]) => [k, v.length])); }

let tick = 0;
const timers = new Map(); let tid = 0;
const add = (o) => { timers.set(++tid, o); return tid; };
export const system = {
  get currentTick() { return tick; },
  run(fn) { return add({ at: tick + 1, fn, every: 0 }); },
  runTimeout(fn, t = 1) { return add({ at: tick + Math.max(1, t), fn, every: 0 }); },
  runInterval(fn, t = 1) { return add({ at: tick + Math.max(1, t), fn, every: Math.max(1, t) }); },
  clearRun(id) { timers.delete(id); },
  afterEvents: { scriptEventReceive: sinal("scriptEventReceive") },
  beforeEvents: { startup: sinal("startup") },
};
export function avancar(n) {
  for (let i = 0; i < n; i++) {
    tick++;
    for (const [id, t] of [...timers]) {
      if (t.at !== tick) continue;
      try { t.fn(); } catch (e) { erros.push(`[timer] ${e?.stack ?? e}`); }
      if (t.every) t.at += t.every; else timers.delete(id);
    }
  }
}

class Placar {
  constructor(id) { this.id = id; this.v = new Map(); }
  getScore(p) { const k = p?.id ?? p; return this.v.get(k); }
  setScore(p, val) { this.v.set(p?.id ?? p, val); }
  addScore(p, val) { this.v.set(p?.id ?? p, (this.v.get(p?.id ?? p) ?? 0) + val); }
}
const placares = new Map();
const scoreboard = {
  getObjective(id) { return placares.get(id); },
  addObjective(id) { if (placares.has(id)) throw new Error("objective exists"); const o = new Placar(id); placares.set(id, o); return o; },
  getObjectives() { return [...placares.values()]; },
};

export class Vector { constructor(x, y, z) { this.x = x; this.y = y; this.z = z; } }
export class MolangVariableMap { setFloat() {} setColorRGB() {} setColorRGBA() {} setVector3() {} }
export class ItemStack {
  constructor(typeId, amount = 1) { this.typeId = typeId; this.amount = amount; this.lore = []; this.nameTag = undefined; }
  getLore() { return this.lore; } setLore(l) { this.lore = l; }
  getComponent() { return undefined; }
}
export const EquipmentSlot = { Mainhand: "Mainhand", Offhand: "Offhand", Head: "Head", Chest: "Chest", Legs: "Legs", Feet: "Feet" };
export const EntityDamageCause = new Proxy({}, { get: (_, k) => String(k) });
export const TicksPerSecond = 20;
export const GameMode = { Survival: "Survival", Creative: "Creative", Adventure: "Adventure", Spectator: "Spectator" };

let nid = 1;
class Bloco { constructor(ar) { this.isAir = ar; this.isLiquid = false; this.typeId = ar ? "minecraft:air" : "minecraft:stone"; } setType() {} }
export class Dimension {
  constructor(id) { this.id = `minecraft:${id}`; this.ents = []; }
  getEntities(o = {}) {
    let l = this.ents.filter((e) => e.isValid);
    if (o.type) l = l.filter((e) => e.typeId === o.type);
    if (o.excludeTypes) l = l.filter((e) => !o.excludeTypes.includes(e.typeId));
    if (o.tags) l = l.filter((e) => o.tags.every((t) => e.tags.has(t)));
    if (o.location && o.maxDistance) l = l.filter((e) => Math.hypot(e.location.x - o.location.x, e.location.y - o.location.y, e.location.z - o.location.z) <= o.maxDistance);
    return l;
  }
  getPlayers(o = {}) { return this.getEntities(o).filter((e) => e.typeId === "minecraft:player"); }
  getBlock(p) { if (![p.x, p.y, p.z].every(Number.isFinite)) throw new Error("bad loc"); return new Bloco(p.y > 64); }
  spawnParticle(id, loc) { if (typeof id !== "string" || !loc) throw new Error("particle args"); log.push(["particle", id]); }
  spawnEntity(t, loc) { const e = vigiar(new Entity(t, this, loc), "Entity"); this.ents.push(e); disparar("entitySpawn", { entity: e, cause: "Spawned" }); return e; }
  spawnItem(i, loc) { return new Entity("minecraft:item", this, loc); }
  playSound(id, loc, o) { if (typeof id !== "string") throw new Error("sound"); log.push(["sound", id]); }
  runCommand(c) { if (typeof c !== "string") throw new Error("cmd"); log.push(["dimcmd", c]); return { successCount: 1 }; }
  getTopmostBlock() { return new Bloco(false); }
}
const dims = { overworld: new Dimension("overworld"), nether: new Dimension("nether"), the_end: new Dimension("the_end") };

export class Entity {
  constructor(typeId, dim, loc = { x: 0, y: 64, z: 0 }) {
    this.typeId = typeId; this.id = String(nid++); this.dimension = dim; this.location = { ...loc };
    this.tags = new Set(); this.props = new Map(); this.dprops = new Map(); this.isValid = true; this.nameTag = "";
    this.hp = { currentValue: 500, effectiveMax: 500, defaultValue: 500, setCurrentValue: (v) => { this.hp.currentValue = v; }, resetToMaxValue: () => { this.hp.currentValue = this.hp.effectiveMax; } };
    this.scoreboardIdentity = { id: this.id };
  }
  hasTag(t) { return this.tags.has(t); } addTag(t) { this.tags.add(t); return true; } removeTag(t) { return this.tags.delete(t); } getTags() { return [...this.tags]; }
  getComponent(c) {
    c = c.replace("minecraft:", "");
    if (c === "health") return this.hp;
    if (c === "type_family") return { hasTypeFamily: (f) => ["ninja", "mobs"].includes(f), getTypeFamilies: () => ["ninja", "mobs"] };
    if (c === "inventory") return { container: { size: 36, getItem: () => undefined, setItem() {} } };
    if (c === "equippable") return { getEquipment: (s) => { if (!(s in EquipmentSlot)) throw new Error("slot"); return undefined; }, setEquipment() {} };
    if (c === "projectile") return { owner: undefined, shoot(v) { if (!v) throw new Error("v"); } };
    return undefined;
  }
  getProperty(n) { return this.props.get(n) ?? 0; } setProperty(n, v) { this.props.set(n, v); }
  getDynamicProperty(k) { return this.dprops.get(k); } setDynamicProperty(k, v) { if (v === undefined) this.dprops.delete(k); else this.dprops.set(k, v); }
  getDynamicPropertyIds() { return [...this.dprops.keys()]; }
  getViewDirection() { return { x: 0, y: 0, z: 1 }; } getHeadLocation() { return { x: this.location.x, y: this.location.y + 1.6, z: this.location.z }; }
  getVelocity() { return { x: 0, y: 0, z: 0 }; }
  teleport(l, o) { if (![l.x, l.y, l.z].every(Number.isFinite)) throw new Error("teleport NaN"); this.location = { ...l }; }
  applyDamage(d, o) { if (!Number.isFinite(d)) throw new Error("dano NaN"); this.hp.currentValue -= d; return true; }
  applyKnockback(h, v) { if (typeof h !== "object" || !Number.isFinite(h.x) || !Number.isFinite(h.z) || !Number.isFinite(v)) throw new Error("applyKnockback 2.x espera ({x,z}, vertical)"); }
  applyImpulse() {}
  addEffect(t, d, o) { if (!Number.isFinite(d)) throw new Error("effect dur"); return {}; } removeEffect() { return true; } getEffects() { return []; } getEffect() { return undefined; }
  triggerEvent(e) { if (typeof e !== "string") throw new Error("event"); log.push(["event", e]); }
  runCommand(c) {
    if (typeof c !== "string") throw new Error("cmd");
    if (c.startsWith("/")) throw new Error("CommandError: barra inicial");
    log.push(["cmd", c]);
    return executarComando(this, c);
  }
  playAnimation(a, o) { if (typeof a !== "string") throw new Error("anim"); log.push(["anim", a]); }
  remove() { this.isValid = false; }
  setOnFire() { return true; } extinguishFire() { return true; }
  kill() { this.isValid = false; return true; }
}
export class Player extends Entity {
  constructor(name, dim) { super("minecraft:player", dim, { x: 10, y: 70, z: 10 }); this.name = name; this.isSneaking = false; this.selectedSlotIndex = 0;
    this.onScreenDisplay = { setActionBar() {}, setTitle(t, o) { if (typeof t !== "string") throw new Error("title"); }, updateSubtitle() {} };
    this.camera = { fade() {}, clear() {} }; }
  sendMessage(m) { log.push(["msg", typeof m === "string" ? m.slice(0, 60) : m]); }
  playSound(id, o) { if (typeof id !== "string") throw new Error("sound"); log.push(["psound", id]); }
  getGameMode() { return "Survival"; }
  spawnParticle() {}
}

const players = [];
export const world = {
  scoreboard,
  getDimension(id) { const d = dims[id.replace("minecraft:", "")]; if (!d) throw new Error("dim " + id); return d; },
  getPlayers(o = {}) { return players.filter((p) => p.isValid && (!o.name || p.name === o.name)); },
  getAllPlayers() { return players.filter((p) => p.isValid); },
  getEntity(id) { for (const d of Object.values(dims)) { const e = d.ents.find((x) => x.id === id); if (e) return e; } return undefined; },
  wd: new Map(),
  getDynamicProperty(k) { return this.wd.get(k); }, setDynamicProperty(k, v) { this.wd.set(k, v); },
  getTimeOfDay() { return 13000; }, getAbsoluteTime() { return tick; }, getDay() { return 1; },
  getDefaultSpawnLocation() { return { x: 0, y: 64, z: 0 }; },
  sendMessage() {},
  afterEvents: new Proxy({}, { get: (_, k) => sinal(String(k)) }),
  beforeEvents: new Proxy({}, { get: (_, k) => sinal("before:" + String(k)) }),
};
export function novoJogador(nome) { const p = vigiar(new Player(nome, dims.overworld), "Player"); players.push(p); dims.overworld.ents.push(p); return p; }
export { dims };

// ---- instrumentacao: erros silenciados e acessos a membros inexistentes ----
export const silenciados = [];
for (const C of [Entity, Player, Dimension]) {
  for (const k of Object.getOwnPropertyNames(C.prototype)) {
    const f = C.prototype[k];
    if (k === "constructor" || typeof f !== "function") continue;
    C.prototype[k] = function (...a) {
      try { return f.apply(this, a); } catch (e) { silenciados.push(`${C.name}.${k}: ${e.message} @ ${(new Error().stack.split("\n")[2] || "").trim()}`); throw e; }
    };
  }
}
const IGN = new Set(["then", "toJSON", "constructor", "inspect", "nodeType", "asymmetricMatch", "$$typeof"]);
export function vigiar(obj, nome) {
  return new Proxy(obj, {
    get(t, k, r) {
      if (typeof k === "string" && !(k in t) && !IGN.has(k)) silenciados.push(`${nome}.${k} inexistente @ ${(new Error().stack.split("\n")[2] || "").trim()}`);
      const v = Reflect.get(t, k, t);
      return typeof v === "function" ? v.bind(t) : v;
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}


// ---- interpretacao minima de comandos (como o motor): seletor @s com scores/tag; tag/scoreboard
function seletorCasa(ent, sel) {
  const m = /^@s(?:\[(.*)\])?$/.exec(sel);
  if (!m) return true; // outros seletores: assume que existe alvo
  const cond = m[1] ?? "";
  const sc = /scores=\{([^}]*)\}/.exec(cond);
  if (sc) for (const par of sc[1].split(",")) {
    const [obj, faixa] = par.split("=");
    const v = placares.get(obj.trim())?.getScore(ent) ;
    if (v === undefined) return false;
    let [a, b] = faixa.includes("..") ? faixa.split("..") : [faixa, faixa];
    const lo = a === "" ? -Infinity : Number(a), hi = b === "" ? Infinity : Number(b);
    if (!(v >= lo && v <= hi)) return false;
  }
  const semSc = cond.replace(/scores=\{[^}]*\}/, "").replace(/hasitem=\[[^\]]*\]|hasitem=\{[^}]*\}/g, "");
  for (const t of semSc.matchAll(/tag=(!?)([\w.]+)/g)) {
    const tem = ent.tags.has(t[2]);
    if (t[1] === "!" ? tem : !tem) return false;
  }
  return true;
}
export const efeitos = [];
function executarComando(ent, c) {
  c = c.trim();
  let m;
  if ((m = /^execute (?:as|at) (@s(?:\[[^\]]*(?:\[[^\]]*\][^\]]*)*\])?) run (.*)$/.exec(c))) {
    if (!seletorCasa(ent, m[1])) throw new Error("CommandError: No targets matched selector");
    return executarComando(ent, m[2]);
  }
  if ((m = /^tag @s (add|remove) (\S+)/.exec(c))) { m[1] === "add" ? ent.tags.add(m[2]) : ent.tags.delete(m[2]); return { successCount: 1 }; }
  if ((m = /^scoreboard players (add|remove|set) @s (\S+) (-?\d+)/.exec(c))) {
    let o = placares.get(m[2]); if (!o) throw new Error("CommandError: objective not found " + m[2]);
    const atual = o.getScore(ent) ?? 0, n = Number(m[3]);
    o.setScore(ent, m[1] === "add" ? atual + n : m[1] === "remove" ? atual - n : n);
    return { successCount: 1 };
  }
  if ((m = /^(tellraw|tag|scoreboard|effect|replaceitem|give|clear|playsound|particle|event|function|camerashake|camera|hud|title|titleraw|tp|summon|structure|tickingarea|playanimation|fog|loot|say|kill|xp|inputpermission|gamemode|setblock|fill) (@s\[[^\]]*\])/.exec(c))) {
    if (!seletorCasa(ent, m[2])) throw new Error("CommandError: No targets matched selector");
  }
  efeitos.push(c);
  return { successCount: 1 };
}
