// Simulação mínima de @minecraft/server para validar carregamento e inicialização dos scripts fora do jogo.
const handler = {
  get(t, k) {
    if (k === Symbol.toPrimitive) return () => "mock";
    if (k === "then") return undefined;
    if (!(k in t)) t[k] = mk(String(k));
    return t[k];
  },
  apply() { return mk("ret"); },
  construct() { return mk("new"); },
};
export function mk(name) {
  const f = function () {};
  f._n = name;
  return new Proxy(f, handler);
}
export const subs = {};
function evtGroup(prefix) {
  return new Proxy({}, { get(_, k) { return { subscribe(fn) { (subs[`${prefix}.${String(k)}`] ||= []).push(fn); return fn; }, unsubscribe() {} }; } });
}
const intervals = [];
// agendador simples: tarefas pontuais (run/runTimeout) e repetidas (runInterval) por tick
const timers = new Map();
let timerId = 0;
export const system = {
  currentTick: 0,
  run(fn) { return system.runTimeout(fn, 1); },
  runTimeout(fn, t = 1) { const id = ++timerId; timers.set(id, { fn, at: system.currentTick + Math.max(1, t) }); return id; },
  runInterval(fn, t = 1) { intervals.push([fn, t]); const id = ++timerId; timers.set(id, { fn, at: system.currentTick + t, every: t }); return id; },
  runJob(gen) { try { for (const _ of gen) { /* drena */ } } catch (e) { console.error("job", e); } return 1; },
  clearRun(id) { timers.delete(id); }, clearJob() {},
  beforeEvents: evtGroup("system.before"), afterEvents: evtGroup("system.after"),
};
export const __intervals = intervals;
/** Avança n ticks executando as tarefas vencidas (usado pelos testes de cenário). */
export async function __advance(n = 1) {
  for (let i = 0; i < n; i++) {
    system.currentTick++;
    for (const [id, t] of [...timers]) {
      if (t.at > system.currentTick) continue;
      if (t.every) t.at += t.every; else timers.delete(id);
      try { await t.fn(); } catch (e) {
        console.error("tarefa:", e);
        globalThis.__errors = (globalThis.__errors || 0) + 1;
        globalThis.__lastErr = `${e?.stack || e}`.split("\n").slice(0, 4).join(" | ");
      }
    }
    await Promise.resolve();
  }
}
const dyn = new Map();
const dimension = {
  id: "minecraft:overworld",
  getPlayers() { return []; }, getEntities() { return []; }, getEntity() { return undefined; },
  runCommand() { return { successCount: 1 }; }, isChunkLoaded() { return false; },
  spawnParticle() {}, playSound() {}, getBlock() { return undefined; }, getTopmostBlock() { return undefined; },
  getBlockFromRay() { return undefined; }, getEntitiesFromRay() { return []; }, spawnEntity() { return mk("entity"); },
  setBlockType() {}, setBlockPermutation() {}, fillBlocks() {}, getBiome() { return { id: "minecraft:plains" }; },
};
export const __world = { dims: {}, players: [] };
export const world = {
  beforeEvents: evtGroup("world.before"), afterEvents: evtGroup("world.after"),
  getDynamicProperty(k) { return dyn.get(k); }, setDynamicProperty(k, v) { if (v === undefined) dyn.delete(k); else dyn.set(k, v); },
  getDynamicPropertyIds() { return [...dyn.keys()]; },
  getAllPlayers() { return __world.players; }, getPlayers() { return __world.players; },
  getDimension(id) { return __world.dims[id] || __world.dims["minecraft:overworld"] || dimension; },
  getEntity(id) {
    const pl = __world.players.find((x) => x.id === id);
    if (pl) return pl;
    for (const d of Object.values(__world.dims)) { const e = d._ents?.find((x) => x.id === id); if (e) return e; }
    return undefined;
  },
  getAbsoluteTime() { return system.currentTick + 1000; },
  sendMessage() {}, getDefaultSpawnLocation() { return { x: 0, y: 64, z: 0 }; }, getTimeOfDay() { return 6000; }, getDay() { return 1; },
  scoreboard: mk("scoreboard"), gameRules: mk("gameRules"),
};
export class MolangVariableMap { setColorRGB() {} setColorRGBA() {} setFloat() {} setVector3() {} setSpeedAndDirection() {} }
export class ItemStack {
  constructor(typeId, amount = 1) { this.typeId = typeId; this.amount = amount; this._lore = []; this._dp = {}; this.nameTag = undefined; }
  setLore(l) { this._lore = l; } getLore() { return this._lore; }
  setDynamicProperty(k, v) { this._dp[k] = v; } getDynamicProperty(k) { return this._dp[k]; }
  getComponent() { return undefined; } hasComponent() { return false; } getTags() { return []; } hasTag() { return false; }
  clone() { const c = new ItemStack(this.typeId, this.amount); c._lore = [...this._lore]; c._dp = { ...this._dp }; return c; }
  get maxAmount() { return 64; } get isStackable() { return true; }
}
export const BlockPermutation = { resolve(id, st) { return { id, st }; } };
export class BlockVolume { constructor(a, b) { this.from = a; this.to = b; } }
const enumProxy = (name) => new Proxy({}, { get: (_, k) => `${name}.${String(k)}` });
export const EquipmentSlot = enumProxy("EquipmentSlot");
export const GameMode = { Creative: "creative", Survival: "survival", Adventure: "adventure", Spectator: "spectator" };
export const EntityDamageCause = enumProxy("cause");
export const CommandPermissionLevel = enumProxy("perm");
export const CustomCommandStatus = enumProxy("status");
export const CustomCommandParamType = enumProxy("param");
export const PlayerPermissionLevel = enumProxy("ppl");
export const TicksPerSecond = 20;
export const EntityComponentTypes = enumProxy("ect");
export const ItemComponentTypes = enumProxy("ict");
export const BlockComponentTypes = enumProxy("bct");
export const Direction = enumProxy("dir");
export const InputButton = enumProxy("ib");
export const ButtonState = enumProxy("bs");
export const HudElement = enumProxy("hud");
export const HudVisibility = enumProxy("hv");
export const DimensionTypes = mk("DimensionTypes");
export const EntityInitializationCause = enumProxy("eic");
export const EasingType = enumProxy("ease");
export const LiquidType = enumProxy("liq");
export const ScoreboardIdentityType = enumProxy("sit");
export const WeatherType = enumProxy("weather");
export const TimeOfDay = { Day: 1000, Noon: 6000, Sunset: 12000, Night: 13000, Midnight: 18000, Sunrise: 23000 };
export const MoonPhase = { FullMoon: 0, WaningGibbous: 1, FirstQuarter: 2, WaningCrescent: 3, NewMoon: 4, WaxingCrescent: 5, LastQuarter: 6, WaxingGibbous: 7 };
