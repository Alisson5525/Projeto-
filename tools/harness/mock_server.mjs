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
export const system = {
  currentTick: 0,
  run(fn) { return 1; }, runTimeout(fn) { return 1; }, runInterval(fn, t) { intervals.push([fn, t]); return intervals.length; },
  runJob(gen) { try { for (const _ of gen) { /* drena */ } } catch (e) { console.error("job", e); } return 1; },
  clearRun() {}, clearJob() {},
  beforeEvents: evtGroup("system.before"), afterEvents: evtGroup("system.after"),
};
export const __intervals = intervals;
const dyn = new Map();
const dimension = {
  id: "minecraft:overworld",
  getPlayers() { return []; }, getEntities() { return []; }, getEntity() { return undefined; },
  runCommand() { return { successCount: 1 }; }, isChunkLoaded() { return false; },
  spawnParticle() {}, playSound() {}, getBlock() { return undefined; }, getTopmostBlock() { return undefined; },
  getBlockFromRay() { return undefined; }, getEntitiesFromRay() { return []; }, spawnEntity() { return mk("entity"); },
  setBlockType() {}, setBlockPermutation() {}, fillBlocks() {}, getBiome() { return { id: "minecraft:plains" }; },
};
export const world = {
  beforeEvents: evtGroup("world.before"), afterEvents: evtGroup("world.after"),
  getDynamicProperty(k) { return dyn.get(k); }, setDynamicProperty(k, v) { if (v === undefined) dyn.delete(k); else dyn.set(k, v); },
  getDynamicPropertyIds() { return [...dyn.keys()]; },
  getAllPlayers() { return []; }, getPlayers() { return []; }, getDimension() { return dimension; }, getEntity() { return undefined; },
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
