// Teste de cenário: inicializa o add-on inteiro sobre um mundo simulado (blocos em memória, entidades com tags, jogador com
// inventário) e joga os mecanismos de exploração e os eventos do mundo do começo ao fim, verificando o estado resultante.
import { register } from "node:module";
register(new URL("./loader.mjs", import.meta.url));
const SCRIPTS = process.argv[2];
const srv = await import("./mock_server.mjs");
const { __world, __advance, subs, ItemStack, system } = srv;

// ---------------------------------------------------------------- mundo simulado
const blocks = new Map();
const famOf = (t) => (t.includes("goblin") ? ["goblin", "monster"] : /zombie|skeleton/.test(t) ? ["monster", "undead"] : []);
const K = (p) => `${Math.floor(p.x)},${Math.floor(p.y)},${Math.floor(p.z)}`;
let eid = 0;
function makeEntity(dim, typeId, loc) {
  const tags = new Set();
  const dp = {};
  const e = {
    id: `e${++eid}`, typeId, location: { ...loc }, dimension: dim, nameTag: "", isValid: true, isSneaking: false,
    addTag: (t) => tags.add(t), removeTag: (t) => tags.delete(t), hasTag: (t) => tags.has(t), getTags: () => [...tags],
    remove() { e.isValid = false; dim._ents.splice(dim._ents.indexOf(e), 1); },
    setProperty() {}, getProperty() { return 0; }, setDynamicProperty: (k, v) => { dp[k] = v; }, getDynamicProperty: (k) => dp[k],
    getComponent: (c) => (c === "minecraft:health" ? e._hp : c === "minecraft:inventory" ? e._inv : c === "minecraft:equippable" ? e._eq : undefined),
    hasComponent: (c) => c === "minecraft:health", addEffect() {}, removeEffect() {}, getEffect() { return undefined; },
    applyDamage(n) { e._hp.currentValue -= n; return true; }, applyImpulse(v) { e._imp = (e._imp || 0) + 1; }, applyKnockback() {}, clearVelocity() {}, setOnFire() {},
    getViewDirection: () => ({ x: 0, y: 0, z: -1 }), getHeadLocation: () => ({ x: e.location.x, y: e.location.y + 1.6, z: e.location.z }),
    getVelocity: () => ({ x: 0, y: 0, z: 0 }), matches: (q) => !!q?.families?.includes("monster") && /zombie|skeleton|goblin/.test(typeId), teleport(l) { e.location = { ...l }; }, triggerEvent() {}, playAnimation() {},
    runCommand() { return { successCount: 1 }; }, getRotation: () => ({ x: 0, y: 0 }), isOnGround: true,
  };
  e._hp = { currentValue: 20, effectiveMax: 20, defaultValue: 20, resetToMaxValue() { this.currentValue = this.effectiveMax; }, setCurrentValue(v) { this.currentValue = v; } };
  return e;
}
const dim = {
  id: "minecraft:overworld", _ents: [],
  getBlock(p) {
    const id = blocks.get(K(p)) || (p.y <= 70 ? "minecraft:grass_block" : "minecraft:air");
    return { typeId: id, location: { x: Math.floor(p.x), y: Math.floor(p.y), z: Math.floor(p.z) }, dimension: dim, permutation: { withState: () => ({}) },
      setPermutation() {}, getComponent: () => undefined };
  },
  getTopmostBlock: (p) => ({ location: { x: p.x, y: 70, z: p.z }, typeId: "minecraft:grass_block" }),
  setBlockType(p, id) { blocks.set(K(p), id); }, setBlockPermutation(p, perm) { blocks.set(K(p), perm.id); },
  fillBlocks(vol, perm) {
    const id = typeof perm === "string" ? perm : perm.id;
    for (let x = vol.from.x; x <= vol.to.x; x++) for (let y = vol.from.y; y <= vol.to.y; y++) for (let z = vol.from.z; z <= vol.to.z; z++) blocks.set(`${x},${y},${z}`, id);
  },
  isChunkLoaded: () => true, getBiome: () => ({ id: "minecraft:forest" }), spawnParticle() {}, playSound() {}, runCommand: () => ({ successCount: 1 }),
  spawnEntity(typeId, loc) { const e = makeEntity(dim, typeId.split("<")[0], loc); dim._ents.push(e); return e; },
  spawnItem(item, loc) { const e = makeEntity(dim, "minecraft:item", loc); e.item = item; dim._ents.push(e); return e; },
  getEntities(q = {}) {
    return [...dim._ents, ...__world.players].filter((e) => e.isValid && (!q.type || e.typeId === q.type) && (!q.tags || q.tags.every((t) => e.hasTag(t))) &&
      (!q.excludeTypes || !q.excludeTypes.includes(e.typeId)) && (!q.families || q.families.every((f) => famOf(e.typeId).includes(f))) &&
      (!q.location || Math.hypot(e.location.x - q.location.x, e.location.y - q.location.y, e.location.z - q.location.z) <= (q.maxDistance ?? 1e9)));
  },
  getPlayers(q = {}) {
    return __world.players.filter((p) => !q.location || Math.hypot(p.location.x - q.location.x, p.location.y - q.location.y, p.location.z - q.location.z) <= (q.maxDistance ?? 1e9));
  },
  getEntitiesFromRay: () => [], getBlockFromRay: () => undefined,
};
__world.dims["minecraft:overworld"] = dim;

// jogador com inventário de 36 espaços
const player = makeEntity(dim, "minecraft:player", { x: 0, y: 71, z: 40 });
player.name = "Teste";
const slots = new Array(36).fill(undefined);
player._inv = { container: { size: 36, get emptySlotsCount() { return slots.filter((s) => !s).length; }, getItem: (i) => slots[i],
  setItem: (i, it) => { slots[i] = it; }, addItem(it) { const i = slots.findIndex((s) => !s); if (i < 0) return it; slots[i] = it; return undefined; } } };
let held;
player._eq = { getEquipment: (slot) => (String(slot).includes("Mainhand") ? held : undefined), setEquipment() {} };
const ui = { title: [], bar: [] };
player.onScreenDisplay = { setActionBar: (m) => ui.bar.push(String(m)), setTitle: (t, o) => ui.title.push(`${t} ${o?.subtitle || ""}`) };
player.sendMessage = (m) => ui.bar.push(String(m));
player.playSound = () => {};
player.getGameMode = () => "survival";
player.camera = { fade() {} };
__world.players.push(player);
const errs = [];
const origWarn = console.warn;
console.warn = (...a) => { errs.push(a.join(" ")); };

// ---------------------------------------------------------------- carregar e iniciar o add-on
await import(`${SCRIPTS}/main.js`);
for (const fn of subs["system.before.startup"] || []) fn({ customCommandRegistry: { registerCommand() {}, registerEnum() {} } });
for (const fn of subs["world.after.worldLoad"] || []) fn({});
const fire = (name, ev) => { for (const fn of subs[name] || []) fn(ev); };
const reg = await import(`${SCRIPTS}/structures/registry.js`);
const mech = await import(`${SCRIPTS}/exploration/mechanisms.js`);
const store = await import(`${SCRIPTS}/core/store.js`);
const events = await import(`${SCRIPTS}/exploration/events.js`);
const d = store.getData(player);
d.nivel = 20;
d.raca = "humano";

let fails = 0;
const check = (cond, msg) => { console.log(`${cond ? "✓" : "✗"} ${msg}`); if (!cond) fails++; };
const blockAt = (p) => blocks.get(K(p)) || "?";
const goto = (p) => { player.location = { x: p.x + 0.5, y: p.y, z: p.z + 0.5 }; };
const interact = (p, item) => {
  held = item;
  const ev = { block: dim.getBlock(p), player, isFirstEvent: true, itemStack: item, cancel: false };
  fire("world.before.playerInteractWithBlock", ev);
  return ev;
};

// ================================================================ Templo Rúnico
const rec = await reg.createSite(dim, "templo_runico", { x: 0, y: 70, z: 0 }, 0);
check(!!rec && rec.estado === "ativo" && rec.mk, "templo construído com marcações persistidas");
const T = reg.TYPES.templo_runico;
const seq = T.mecanismos.find((m) => m.id === "sinos");
const bells = rec.mk.sino;
check(blockAt(bells[0]) === "minecraft:bell", "sinos colocados nas posições marcadas");
const gate = rec.mk.porta_sinos;
check(blockAt(gate[0]) === "minecraft:chiseled_polished_blackstone", "parede de runas fechada antes do enigma");
// lê a pista no atril
goto(rec.mk.mural[0]);
const evRead = interact(rec.mk.mural[0]);
await __advance(3);
check(evRead.cancel === true && Object.keys(store.getData(player).pistas).length === 1, "atril abre a pista e anota no Diário");
// erro proposital
const { order } = mech.puzzleOf(rec.seed + seq.id.length * 131, seq.n);
const wrong = order[1];
goto(bells[wrong]);
interact(bells[wrong]);
await __advance(2);
check(!mech.mechDone(rec, "sinos") && (rec.m.mec.sinos.prog || []).length === 0, "sino errado rearma o enigma");
// ordem correta
for (const i of order) { goto(bells[i]); interact(bells[i]); await __advance(2); }
await __advance(80);
check(mech.mechDone(rec, "sinos"), "ordem correta resolve o enigma dos sinos");
check(blockAt(gate[0]) === "minecraft:air", "parede de runas aberta após o enigma");
check(!!store.getData(player).expl[rec.id]?.o?.sinos, "objetivo 'sinos' creditado ao jogador");
// passagem secreta
const btn = rec.mk.botao_sacerdotes[0];
fire("world.after.buttonPush", { block: dim.getBlock(btn), dimension: dim, source: player });
await __advance(40);
check(blockAt(rec.mk.passagem[0]) === "minecraft:air", "botão liso abre a passagem dos sacerdotes");
const sala = rec.mk.sala_sacerdotes;
goto({ x: sala[0].x + 1, y: sala[0].y, z: sala[0].z + 1 });
await __advance(20);
check(!!store.getData(player).expl[rec.id]?.o?.sacerdotes, "entrar na sala secreta conta como segredo encontrado");
// guardião (só desperta depois dos sinos)
const gs = rec.mk.sala_guardiao;
goto({ x: gs[0].x + 3, y: gs[0].y, z: gs[0].z + 3 });
await __advance(20);
const guard = dim.getEntities({ tags: [`vg_${rec.id}_guardiao`] })[0];
check(!!guard && guard.typeId === "valdoria:sentinela_runica" && guard.nameTag.includes("Guardião"), "Guardião Rúnico desperta ao entrar no salão");
guard._hp.effectiveMax = 100;
guard._hp.currentValue = 40;
await __advance(15);
check(dim.getEntities({ type: "valdoria:fragmento_pedra" }).length >= 2, "Guardião na metade da vida convoca reforços (fase 2)");
guard.remove();
fire("world.after.entityDie", { deadEntity: guard, damageSource: { damagingEntity: player, cause: "entityAttack" } });
await __advance(5);
check(mech.mechDone(rec, "guardiao"), "derrotar o guardião conclui o mecanismo");
check(dim._ents.some((e) => e.typeId === "minecraft:item" && e.item?.typeId === "valdoria:chave_antiga"), "guardião solta a Chave Antiga");
// cofre com chave
const door = rec.mk.porta_cofre[0];
check(blockAt(door) === "valdoria:portao_selado", "cofre selado com Portão Selado");
goto(door);
interact(door, undefined);
await __advance(2);
check(blockAt(door) === "valdoria:portao_selado", "sem a chave o portão não abre");
slots[0] = new ItemStack("valdoria:chave_antiga", 1);
interact(door, slots[0]);
await __advance(40);
check(blockAt(door) === "minecraft:air", "Chave Antiga abre o cofre (e é consumida)");
check(!slots[0], "chave consumida do inventário");
// armadilha de dardos
const plate = rec.mk.placa_dardo[0];
player._hp.currentValue = player._hp.effectiveMax; // os espectros do templo drenam vida de verdade durante o teste
const hpBefore = player._hp.currentValue;
goto(plate);
fire("world.after.pressurePlatePush", { block: dim.getBlock(plate), dimension: dim, redstonePower: 1, previousRedstonePower: 0, source: player });
await __advance(15);
check(player._hp.currentValue < hpBefore, `placa de pressão dispara dardos em quem pisou (${hpBefore.toFixed(1)} -> ${player._hp.currentValue.toFixed(1)})`);
// exploração completa: limpa os guardas e verifica a recompensa
for (const e of dim.getEntities({ tags: [`vl_${rec.id}`] })) e.remove();
goto({ x: rec.x, y: rec.y + 1, z: rec.z });
await __advance(400);
const st = mech.explorationStatus(player, rec);
check(st.completo, `exploração completa do templo (${st.done}/${st.total} objetivos)`);

// ================================================================ outros locais: sequência por alavanca e altar
const bib = await reg.createSite(dim, "biblioteca", { x: 300, y: 70, z: 0 }, 1);
const bseq = reg.TYPES.biblioteca.mecanismos[0];
const bord = mech.puzzleOf(bib.seed + bseq.id.length * 131, bseq.n).order;
for (const i of bord) {
  const p = bib.mk.alavanca[i];
  goto(p);
  fire("world.after.leverAction", { block: dim.getBlock(p), dimension: dim, isPowered: true, player });
  await __advance(2);
}
await __advance(40);
check(mech.mechDone(bib, "estantes") && blockAt(bib.mk.alcapao[0]) === "minecraft:air", "alavancas na ordem abrem o Arquivo Proibido (estrutura girada 90°)");
const san = await reg.createSite(dim, "santuario_estrada", { x: -300, y: 70, z: 0 }, 2);
goto(san.mk.altar[0]);
interact(san.mk.altar[0], undefined);
await __advance(8);
check(!store.getData(player).expl[san.id]?.altar, "altar exige a oferenda");
slots[1] = new ItemStack("minecraft:bread", 2);
interact(san.mk.altar[0], slots[1]);
await __advance(3);
check(!!store.getData(player).expl[san.id]?.o?.altar && slots[1]?.amount === 1, "pão no altar concede a bênção e é consumido");

// ================================================================ retrofit: acampamento original ganha tambor e esconderijo
player.location = { x: 900, y: 71, z: 900 };
const camp = await reg.createSite(dim, "acampamento", { x: 600, y: 70, z: 0 }, 3);
delete camp.m.rv; // simula um acampamento de mundo antigo
reg.saveSite(camp);
await __advance(220);
check(camp.m.rv === 1 && blockAt(camp.mk.tambor[0]) === "minecraft:noteblock", "retrofit aplicado a acampamento existente (tambor de guerra)");
check(blockAt(camp.mk.terra_fofa[0]) === "minecraft:dirt_with_roots", "esconderijo do chefe adicionado sob a tenda");
goto(camp.mk.tambor[0]);
interact(camp.mk.tambor[0]);
let waves = 0;
for (let i = 0; i < 40 && !mech.mechDone(camp, "tambor"); i++) {
  await __advance(20);
  const list = dim.getEntities({ tags: [`vw_${camp.id}_tambor`] });
  if (list.length) waves++;
  for (const e of list) e.remove();
}
check(mech.mechDone(camp, "tambor") && waves >= 3, `Desafio do Tambor: ${waves} ondas derrotadas e desafio concluído`);
check(blockAt(camp.mk.bau_tambor[0]) === "minecraft:chest", "tributo dos goblins (baú) aparece após o desafio");

// ================================================================ estilos de arma nos golpes comuns
const hitWith = async (weaponId, target, dmg = 6) => {
  held = new ItemStack(weaponId, 1);
  const hp0 = target._hp.currentValue;
  fire("world.before.entityHurt", { hurtEntity: target, damageSource: { cause: "entityAttack", damagingEntity: player }, damage: dmg, cancel: false });
  target._hp.currentValue -= dmg; // o dano vanilla do próprio golpe
  fire("world.after.entityHurt", { hurtEntity: target, damageSource: { cause: "entityAttack", damagingEntity: player }, damage: dmg });
  await __advance(3);
  return hp0 - target._hp.currentValue;
};
player.location = { x: 3000, y: 71, z: 3000 };
const mob = (id, dz, dx = 0) => { const e = dim.spawnEntity(id, { x: 3000 + dx, y: 71, z: 3000 - dz }); e._hp.currentValue = e._hp.effectiveMax = 200; return e; };
const z1 = mob("minecraft:zombie", 2), z2 = mob("minecraft:zombie", 2, 1), cow = mob("minecraft:cow", 2, -1);
await hitWith("valdoria:espada_longa_aco", z1);
check(z2._hp.currentValue < 200 && cow._hp.currentValue === 200, "Espada longa: golpe amplo atinge o zumbi ao lado e poupa a vaca");
const sk = mob("minecraft:skeleton", 2, 5);
const baseHit = await hitWith("valdoria:espada_curta_aco", mob("minecraft:skeleton", 2, 8));
const maceHit = await hitWith("valdoria:maca_aco", sk);
check(maceHit > baseHit, `Maça: esmaga mortos-vivos (${maceHit.toFixed(1)} contra ${baseHit.toFixed(1)} da espada curta)`);
const z3 = mob("minecraft:zombie", 2, 12);
await hitWith("valdoria:machado_guerra_aco", z3);
await hitWith("valdoria:machado_guerra_aco", z3);
const dmgMod = await import(`${SCRIPTS}/core/damage.js`);
check(Math.abs((dmgMod.debuff(z3).vuln?.pct || 0) - 0.16) < 1e-9, "Machado: rompe-armadura acumula (+16% após 2 golpes)");
const z4 = mob("minecraft:zombie", 2, 16);
dmgMod.lastBlock.set(player.id, system.currentTick);
const rip = await hitWith("valdoria:katana_aco", z4);
const plain = await hitWith("valdoria:katana_aco", z4);
check(rip > plain, `Katana: contra-ataque após bloqueio (${rip.toFixed(1)} contra ${plain.toFixed(1)})`);
for (const e of [z1, z2, cow, sk, z3, z4]) e.remove();
held = undefined;

// ================================================================ chefes: postura e primeira vitória
player.location = { x: 5000, y: 71, z: 5000 };
const tita = dim.spawnEntity("valdoria:tita_pedra", { x: 5000, y: 71, z: 4997 });
tita._hp.effectiveMax = tita._hp.currentValue = 560;
let hits = 0;
for (; hits < 40; hits++) {
  await hitWith("valdoria:martelo_guerra_aco", tita, 9);
  await __advance(25);
  if ((dmgMod.debuff(tita).vuln?.pct || 0) >= 0.3) break;
}
check((dmgMod.debuff(tita).vuln?.pct || 0) >= 0.3 && ui.title.some((t) => t.includes("Postura quebrada")),
  `Postura do Titã quebra após ${hits + 1} marteladas (exposto +30%)`);
const espadaHits = await (async () => {
  const t2 = dim.spawnEntity("valdoria:tita_pedra", { x: 5003, y: 71, z: 4997 });
  t2._hp.effectiveMax = t2._hp.currentValue = 560;
  let n = 0;
  for (; n < 60; n++) {
    await hitWith("valdoria:espada_curta_aco", t2, 9);
    await __advance(25);
    if ((dmgMod.debuff(t2).vuln?.pct || 0) >= 0.3) break;
  }
  t2.remove();
  return n + 1;
})();
check(espadaHits > hits + 1, `Armas pesadas quebram a postura mais depressa (espada curta: ${espadaHits} golpes)`);
const frag0 = slots.filter((x) => x?.typeId === "valdoria:fragmento_mapa").length;
tita.remove();
fire("world.after.entityDie", { deadEntity: tita, damageSource: { damagingEntity: player, cause: "entityAttack" } });
await __advance(80);
const frag1 = slots.filter((x) => x?.typeId === "valdoria:fragmento_mapa").length;
check(!!store.getData(player).flags.vitoria_tita_pedra && frag1 > frag0, "Primeira vitória contra o Titã registra e entrega um Fragmento de Mapa");
held = undefined;

// ================================================================ arco e besta
const shoot = async (weaponId, holdTicks, target, hitY) => {
  const it = new ItemStack(weaponId, 1);
  held = it;
  fire("world.after.itemStartUse", { itemStack: it, source: player });
  await __advance(holdTicks);
  fire("world.after.itemReleaseUse", { itemStack: it, source: player });
  const arrow = dim.spawnEntity("minecraft:arrow", { x: player.location.x, y: 72.5, z: player.location.z - 1 });
  arrow.getComponent = (c) => (c === "minecraft:projectile" ? { owner: player } : undefined);
  arrow.getVelocity = () => ({ x: 0, y: 0, z: -2 });
  fire("world.after.entitySpawn", { entity: arrow });
  await __advance(1);
  const hp0 = target._hp.currentValue;
  fire("world.after.projectileHitEntity", { projectile: arrow, source: player, location: { x: target.location.x, y: hitY, z: target.location.z },
    getEntityHit: () => ({ entity: target }) });
  await __advance(2);
  arrow.remove();
  return { dano: Number(arrow.getDynamicProperty("valdoria:dano")), extra: hp0 - target._hp.currentValue, perf: !!arrow.getDynamicProperty("valdoria:perf") };
};
player.location = { x: 6000, y: 71, z: 6000 };
const alvo = dim.spawnEntity("minecraft:zombie", { x: 6000, y: 71, z: 5990 });
alvo._hp.effectiveMax = alvo._hp.currentValue = 300;
const comum = await shoot("valdoria:arco_teixo", 40, alvo, 71.5);   // 2 s: passou da janela
const perfeito = await shoot("valdoria:arco_teixo", 24, alvo, 71.5); // 1,2 s: dentro da janela (carga 1,0 s)
check(perfeito.perf && perfeito.dano > comum.dano, `Arco: Tiro Perfeito na janela (${perfeito.dano} contra ${comum.dano})`);
const cabeca = await shoot("valdoria:arco_teixo", 40, alvo, 72.9);
check(cabeca.extra > 0, "Arco: acerto na cabeça causa dano extra");
await shoot("valdoria:besta_aco", 30, alvo, 71.5);
check(Math.abs((dmgMod.debuff(alvo).vuln?.pct || 0) - 0.12) < 1e-9, "Besta: virote rompe a armadura do alvo (+12%)");
alvo.remove();
held = undefined;

// ================================================================ táticas de IA: pedir apoio
player.location = { x: 4000, y: 71, z: 4000 };
const g1 = dim.spawnEntity("valdoria:goblin", { x: 4000, y: 71, z: 3997 });
const g2 = dim.spawnEntity("valdoria:goblin", { x: 4012, y: 71, z: 3990 });
const tdm = await import(`${SCRIPTS}/core/damage.js`);
g1._hp.currentValue = 8;
fire("world.after.entityHurt", { hurtEntity: g1, damageSource: { cause: "entityAttack", damagingEntity: player }, damage: 4 });
check((g2._imp || 0) > 0 && tdm.hasAggro(g2), "Goblin ferido chama o bando: aliado distante corre em direção ao agressor");
g1.remove(); g2.remove();

// ================================================================ eventos do mundo: forçar cada um e avançar
player.location = { x: 2000, y: 71, z: 2000 };
for (const [id, nome] of events.EVENT_TYPES()) {
  const before = dim._ents.length;
  const msg = events.forceEvent(player, id);
  await __advance(45);
  const ok = typeof msg === "string" && !msg.startsWith("§cNão") && !msg.startsWith("§cEventos");
  check(ok, `evento '${nome}' começou${ok ? "" : `: ${msg}`} (${dim._ents.length - before} entidades)`);
}
// encerra a patrulha matando os goblins e confere a recompensa
const patrol = events.activeEvents().find((e) => e.tipo === "patrulha");
if (patrol) {
  for (const e of dim.getEntities({ tags: [`ve_${patrol.id}`] })) e.remove();
  const xp0 = store.getData(player).xp + store.getData(player).nivel * 100000;
  player.location = { x: patrol.x, y: patrol.y, z: patrol.z };
  await __advance(60);
  const xp1 = store.getData(player).xp + store.getData(player).nivel * 100000;
  check(!events.activeEvents().some((e) => e.id === patrol.id) && xp1 > xp0, "patrulha derrotada encerra o evento e dá recompensa");
}
console.warn = origWarn;
const real = errs.filter((e) => !e.includes("blocos não puderam"));
check(!real.length && !globalThis.__errors, `sem exceções nos sistemas durante o cenário${real.length ? ":\n    " + real.slice(0, 8).join("\n    ") : ""}`);
console.log(fails ? `\n${fails} verificação(ões) falharam.` : "\nTodas as verificações passaram.");
process.exit(fails ? 1 : 0);
