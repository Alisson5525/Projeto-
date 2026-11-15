// Montarias: Corcel de Guerra, Lobo Gigante, Alce do Norte, Urso de Guerra, Unicórnio e Grifo (voo controlado).
// Vínculo com o dono (um de cada tipo por jogador), chamado pelo item de vínculo, domar criaturas selvagens, menu do dono,
// habilidades montadas, passivas, armadura e recuperação após a morte. As definições ficam em defs.js; os golpes, em skills.js.
import { world, system, GameMode, ItemStack } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { NS, V, ok, tick, chance, takeItem, giveItem, countItem, health, effect, bar } from "../core/util.js";
import { particle, sound, psound, anim } from "../core/fx.js";
import { onBeforeHurt } from "../core/damage.js";
import { getData } from "../core/store.js";
import { stats } from "../rpg/stats.js";
import { pauseHud } from "../rpg/progression.js";
import { show } from "../npc/economy.js";
import { setFlag } from "../quests/quests.js";
import { MOUNTS, BY_TYPE, ITEM_TYPE, OSSO_ALFA, REDEA_CELESTE, LOBO_NIVEL } from "./defs.js";
import { PASSIVES, SKILLS, cleanupSkills } from "./skills.js";

export { MOUNTS, OSSO_ALFA, REDEA_CELESTE, LOBO_NIVEL, ITEM_TYPE };
const PR = { dono: `${NS}:dono`, donoNome: `${NS}:dono_nome`, vinculo: `${NS}:vinculo` };
const MTAG = (pid) => `vm_${pid}`;
const DIMS = ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"];
const skillCd = new Map(); // jogador:tipo -> tick
const lastRider = new Map(); // montaria -> jogador (para a queda planada das montarias voadoras)

export function mountType(e) {
  return BY_TYPE[e?.typeId];
}
const infoHooks = {};
/** Linha extra no menu do dono (ex.: crescimento do filhote de dragão). */
export function setMountInfo(tipo, fn) {
  infoHooks[tipo] = fn;
}

// ------------------------------------------------------------------ vínculo (salvo no mundo)
const bondKey = (pid, tipo) => `${NS}:mont_${pid}_${tipo}`;
export function getBond(pid, tipo) {
  try {
    const v = world.getDynamicProperty(bondKey(pid, tipo));
    return typeof v === "string" ? JSON.parse(v) : undefined;
  } catch {
    return undefined;
  }
}
export function setBond(pid, tipo, b) {
  try {
    world.setDynamicProperty(bondKey(pid, tipo), b ? JSON.stringify(b) : undefined);
  } catch { /* */ }
}
function prop(e, k) {
  try {
    const v = e.getDynamicProperty(k);
    return typeof v === "string" ? v : undefined;
  } catch {
    return undefined;
  }
}
export function ownerOf(e) {
  return prop(e, PR.dono);
}
function isTamed(e) {
  try {
    return e.hasComponent("minecraft:is_tamed");
  } catch {
    return false;
  }
}
export function ridingOn(player) {
  try {
    return player.getComponent("minecraft:riding")?.entityRidingOn;
  } catch {
    return undefined;
  }
}
function riderOf(e) {
  try {
    return e.getComponent("minecraft:rideable")?.getRiders().find((r) => r.typeId === "minecraft:player");
  } catch {
    return undefined;
  }
}
const creative = (p) => {
  try {
    return p.getGameMode() === GameMode.Creative;
  } catch {
    return false;
  }
};

/** Montaria viva e carregada ligada ao jogador (ou undefined). */
export function findMount(pid, tipo, bond = getBond(pid, tipo)) {
  if (!bond) return undefined;
  for (const dimId of DIMS) {
    try {
      const e = world.getDimension(dimId).getEntities({ type: MOUNTS[tipo].id, tags: [MTAG(pid)] })
        .find((x) => prop(x, PR.vinculo) === bond.tok);
      if (e) return e;
    } catch { /* */ }
  }
  return undefined;
}

const SOFT = /short_grass|tall_grass|fern|flower|tulip|dandelion|poppy|snow_layer|deadbush|dead_bush|vine|carpet|petals|bush/;
function free(dim, loc) {
  try {
    const b = { x: Math.floor(loc.x), y: Math.floor(loc.y), z: Math.floor(loc.z) };
    return [0, 1, 2].every((dy) => {
      const k = dim.getBlock({ x: b.x, y: b.y + dy, z: b.z });
      return k && (k.isAir || SOFT.test(k.typeId));
    });
  } catch {
    return false;
  }
}
function spotNear(player) {
  const dir = V.flat(player.getViewDirection());
  for (const [back, side] of [[-2.5, 0], [-2.5, 2], [-2.5, -2], [2.5, 0], [0, 2.5], [0, -2.5]]) {
    const loc = V.add(player.location, { x: dir.x * back - dir.z * side, y: 0, z: dir.z * back + dir.x * side });
    if (free(player.dimension, loc)) return loc;
  }
  return { ...player.location };
}

export function bindEntity(player, tipo, e) {
  const M = MOUNTS[tipo];
  const old = findMount(player.id, tipo);
  if (old && old.id !== e.id) {
    particle(old.dimension, "fumaca", V.up(old.location, 1), {});
    try { old.remove(); } catch { /* */ }
  }
  try { e.getComponent("minecraft:tameable")?.tame(player); } catch { /* */ }
  try { e.triggerEvent("valdoria:domar"); } catch { /* */ }
  const prev = getBond(player.id, tipo);
  const tok = Math.random().toString(36).slice(2, 10);
  setBond(player.id, tipo, { ...(prev || {}), tok, morto: 0, nome: prev?.nome || "" });
  try {
    for (const t of e.getTags()) if (t.startsWith("vl_")) e.removeTag(t); // deixa de ser guardião de estrutura
    e.setDynamicProperty(PR.dono, player.id);
    e.setDynamicProperty(PR.donoNome, player.name);
    e.setDynamicProperty(PR.vinculo, tok);
    e.addTag(MTAG(player.id));
    e.nameTag = prev?.nome || `${M.nome} de ${player.name}`;
  } catch { /* */ }
  return e;
}

function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m ? `${m}min ${s}s` : `${s}s`;
}
function callFx(player, e, tipo, spot) {
  const M = MOUNTS[tipo];
  particle(player.dimension, "vento_explosao", V.up(spot, 0.5), { radius: 1.5 });
  sound(player.dimension, M.som, spot, M.pitch || 1, 1.2);
  if (e) anim(e, M.anim, 0.3);
}

// ------------------------------------------------------------------ chamado (item de vínculo)
/** Usar o item de vínculo: chama a montaria; montado nela, ativa a habilidade. */
export function useMountItem(player, tipo) {
  const M = MOUNTS[tipo];
  const riding = ridingOn(player);
  if (ok(riding)) {
    if (mountType(riding) === tipo && ownerOf(riding) === player.id) return mountSkill(player, riding, tipo);
    player.onScreenDisplay.setActionBar("§7Desmonte antes de chamar outra montaria.");
    return;
  }
  const b = getBond(player.id, tipo);
  if (!b && tipo !== "cavalo") {
    player.onScreenDisplay.setActionBar(`§7Nenhum ${M.nome} está ligado a você. ${M.obter}`);
    return;
  }
  const cur = findMount(player.id, tipo, b);
  if (cur) {
    if (cur.dimension.id === player.dimension.id && V.dist(cur.location, player.location) < 6) {
      player.onScreenDisplay.setActionBar(`§7Seu ${M.nome} já está ao seu lado.`);
      try { cur.triggerEvent("valdoria:seguir"); } catch { /* */ }
      return;
    }
    const spot = spotNear(player);
    try {
      cur.teleport(spot, { dimension: player.dimension, facingLocation: player.location });
      cur.triggerEvent("valdoria:seguir");
    } catch { /* */ }
    callFx(player, undefined, tipo, spot);
    player.onScreenDisplay.setActionBar(`§a${cur.nameTag || M.nome} atende ao seu chamado.`);
    return;
  }
  if (b?.morto) {
    const left = M.recMin * 60000 - (Date.now() - b.morto);
    if (left > 0) {
      player.onScreenDisplay.setActionBar(`§cSeu ${M.nome} ainda se recupera dos ferimentos: §f${fmtTime(Math.ceil(left / 1000))}`);
      psound(player, "note.bass", 0.8, 0.6);
      return;
    }
  }
  const spot = spotNear(player);
  let e;
  try {
    e = player.dimension.spawnEntity(M.id, spot, M.adultoEvento && b?.adulto ? { spawnEvent: M.adultoEvento } : undefined);
  } catch (err) {
    player.onScreenDisplay.setActionBar(`§cA montaria não pôde surgir aqui: ${err}`);
    return;
  }
  bindEntity(player, tipo, e);
  callFx(player, e, tipo, spot);
  player.onScreenDisplay.setActionBar(`§a${e.nameTag} chega ao seu chamado! §7(Agachar + interagir: comandos)`);
  if (tipo === "cavalo") setFlag(player, "corcel_chamado");
}

// ------------------------------------------------------------------ domar e vincular
function tryTame(player, wild, tipo) {
  if (!ok(wild) || isTamed(wild)) return;
  const M = MOUNTS[tipo];
  const T = M.domar;
  if (!T) return;
  const d = getData(player);
  if (d.nivel < T.nivel && !creative(player)) {
    player.onScreenDisplay.setActionBar(`§cO ${M.nome} só respeita aventureiros de nível ${T.nivel} ou maior.`);
    sound(wild.dimension, T.som || M.som, wild.location, M.pitch || 1, 1);
    return;
  }
  const refuse = T.req?.(player);
  if (refuse && !creative(player)) {
    player.onScreenDisplay.setActionBar(refuse);
    return;
  }
  if (T.consome && !creative(player) && !takeItem(player, T.item, 1)) return;
  const luck = stats(player).luck || 0;
  if (!chance(T.chance + luck)) {
    particle(wild.dimension, "fumaca", V.up(wild.location, 1.6), {});
    sound(wild.dimension, T.som || M.som, wild.location, M.pitch || 1, 1);
    player.onScreenDisplay.setActionBar(`§7${T.msgFalha} §8(tente de novo)`);
    return;
  }
  bindEntity(player, tipo, wild);
  for (let i = 0; i < 3; i++) system.runTimeout(() => ok(wild) && particle(wild.dimension, "cura", V.up(wild.location, 1.8), {}), i * 6);
  anim(wild, M.anim, 0.3);
  sound(wild.dimension, M.som, wild.location, M.pitch || 1, 1);
  if (tipo === "cavalo") {
    player.onScreenDisplay.setActionBar(`§aEste ${M.nome} agora é seu.`);
  } else {
    player.onScreenDisplay.setTitle(`§6${M.nome} domado!`, { subtitle: "§7Use o item de vínculo para chamá-lo; agache + interaja para comandos",
      fadeInDuration: 5, stayDuration: 50, fadeOutDuration: 15 });
  }
  if (!countItem(player, M.item)) giveItem(player, new ItemStack(M.item, 1));
  setFlag(player, `${tipo}_domado`);
}

// ------------------------------------------------------------------ menu do dono
async function mountMenu(player, e, tipo) {
  const M = MOUNTS[tipo];
  const h = health(e);
  const cur = Math.ceil(h?.currentValue ?? 0);
  const max = Math.ceil(h?.effectiveMax ?? 1);
  const cd = Math.max(0, Math.ceil(((skillCd.get(`${player.id}:${tipo}`) || 0) - tick()) / 20));
  const body = [
    `§7Vida: §c${cur}/${max} ${bar(cur / max, 12, "§c", "§8")}`,
    `§7Velocidade: §f${M.velocidade}`,
    `§7Movimento: §f${M.salto}`,
    `§7Armadura: §f-${Math.round(M.armadura * 100)}% de dano recebido`,
    `§7Habilidade: §e${M.hab}§7 - use o item de vínculo montado ${cd ? `§c(${cd}s)` : "§a(pronta)"}`,
    `§7Passiva: §f${M.passiva}`,
    `§7Cura: alimente com §f${M.comida}`,
    `§8Se cair em combate, volta após ${M.recMin} min de recuperação.`,
  ].concat(infoHooks[tipo] ? [infoHooks[tipo](player, e)] : []).join("\n");
  const f = new ActionFormData().title(`§l${e.nameTag || M.nome}`).body(body)
    .button("Seguir-me").button("Ficar aqui").button("Renomear").button("§cDispensar (volta ao estábulo)").button("Fechar");
  const r = await show(player, f);
  if (r.canceled || !ok(e)) return;
  switch (r.selection) {
    case 0:
      try { e.triggerEvent("valdoria:seguir"); } catch { /* */ }
      player.onScreenDisplay.setActionBar(`§a${e.nameTag} vai segui-lo.`);
      break;
    case 1:
      try { e.triggerEvent("valdoria:ficar"); } catch { /* */ }
      player.onScreenDisplay.setActionBar(`§e${e.nameTag} vai esperar aqui.`);
      break;
    case 2: {
      const b = getBond(player.id, tipo) || {};
      const m = await show(player, new ModalFormData().title("Renomear montaria")
        .textField("Nome", "Ex.: Trovão", { defaultValue: b.nome || "" }));
      if (m.canceled || !ok(e)) return;
      const name = String(m.formValues?.[0] ?? "").replace(/§./g, "").trim().slice(0, 24);
      b.nome = name;
      setBond(player.id, tipo, b);
      e.nameTag = name || `${M.nome} de ${player.name}`;
      break;
    }
    case 3: {
      particle(e.dimension, "vento_explosao", V.up(e.location, 1), { radius: 1.2 });
      try { e.remove(); } catch { /* */ }
      const b = getBond(player.id, tipo);
      if (b) setBond(player.id, tipo, { ...b, morto: 0 });
      player.onScreenDisplay.setActionBar(`§7${M.nome} dispensado. Use o item de vínculo para chamá-lo de novo.`);
      break;
    }
    default:
  }
}

// ------------------------------------------------------------------ habilidades e passivas
function mountSkill(player, e, tipo) {
  const M = MOUNTS[tipo];
  const key = `${player.id}:${tipo}`;
  const left = (skillCd.get(key) || 0) - tick();
  if (left > 0) {
    player.onScreenDisplay.setActionBar(`§7${M.hab}: recarga §c${Math.ceil(left / 20)}s`);
    return;
  }
  skillCd.set(key, tick() + M.habCd * 20);
  anim(e, M.anim, 0.3);
  const msg = SKILLS[tipo](player, e);
  pauseHud(player, 40);
  player.onScreenDisplay.setActionBar(msg);
}

function hud(rider, e, tipo) {
  const M = MOUNTS[tipo];
  const h = health(e);
  if (!h) return;
  const left = Math.max(0, Math.ceil(((skillCd.get(`${rider.id}:${tipo}`) || 0) - tick()) / 20));
  pauseHud(rider, 25);
  rider.onScreenDisplay.setActionBar(`§6${e.nameTag || M.nome} §cVida ${Math.ceil(h.currentValue)}/${Math.ceil(h.effectiveMax)} §8| §e${M.hab}: ${left ? `§c${left}s` : "§apronta"}`);
}

/** Remove montarias de vínculos antigos (duplicatas que reaparecem ao carregar uma área). */
function validate(e) {
  const pid = ownerOf(e);
  const tipo = mountType(e);
  if (!pid || !tipo) return true;
  const b = getBond(pid, tipo);
  if (b && b.tok !== prop(e, PR.vinculo)) {
    try { e.remove(); } catch { /* */ }
    return false;
  }
  return true;
}

/** Desmontou de uma montaria voadora no ar: o cavaleiro plana até o chão. */
function glideDown(player, mount, msg) {
  if (!ok(player) || !ok(mount)) return;
  let drop = 99;
  try {
    const hit = player.dimension.getBlockFromRay(player.location, { x: 0, y: -1, z: 0 }, { maxDistance: 96, includePassableBlocks: false });
    if (hit) drop = player.location.y - (hit.block.location.y + 1);
  } catch { /* fora do mundo: plana assim mesmo */ }
  if (drop > 3) {
    effect(player, "slow_falling", 160, 0, true);
    player.onScreenDisplay.setActionBar(msg || "§bVocê desce planando.");
  }
}

export function startMounts() {
  world.beforeEvents.playerInteractWithEntity.subscribe((ev) => {
    const t = ev.target;
    const tipo = BY_TYPE[t.typeId];
    if (!tipo) return;
    const p = ev.player;
    const it = ev.itemStack;
    if (!isTamed(t)) {
      if (MOUNTS[tipo].domar && it?.typeId === MOUNTS[tipo].domar.item) {
        ev.cancel = true;
        system.run(() => ok(p) && tryTame(p, t, tipo));
      }
      return;
    }
    const owner = ownerOf(t);
    if (owner && owner !== p.id) {
      ev.cancel = true;
      const nm = prop(t, PR.donoNome) || "outro aventureiro";
      system.run(() => ok(p) && p.onScreenDisplay.setActionBar(`§cEste ${MOUNTS[tipo].nome} pertence a ${nm}.`));
      return;
    }
    if (p.isSneaking) {
      ev.cancel = true;
      system.run(() => ok(p) && ok(t) && mountMenu(p, t, tipo));
    }
  });

  onBeforeHurt((ev) => {
    const tipo = BY_TYPE[ev.hurtEntity.typeId];
    if (!tipo || !isTamed(ev.hurtEntity)) return;
    ev.damage *= 1 - MOUNTS[tipo].armadura;
  });

  world.afterEvents.entityDie.subscribe((ev) => {
    const e = ev.deadEntity;
    let tipo;
    let pid;
    let tok;
    try {
      tipo = BY_TYPE[e.typeId];
      if (!tipo) return;
      pid = ownerOf(e);
      tok = prop(e, PR.vinculo);
    } catch {
      return;
    }
    if (!pid) return;
    const b = getBond(pid, tipo);
    if (!b || b.tok !== tok) return;
    setBond(pid, tipo, { ...b, morto: Date.now() });
    const owner = world.getAllPlayers().find((p) => p.id === pid);
    if (owner) {
      owner.onScreenDisplay.setTitle(" ", { subtitle: `§cSeu ${MOUNTS[tipo].nome} caiu! §7Ele se recupera em ${MOUNTS[tipo].recMin} min.`,
        fadeInDuration: 5, stayDuration: 50, fadeOutDuration: 15 });
      psound(owner, "note.bass", 0.6, 1);
    }
  });

  world.afterEvents.entityLoad.subscribe((ev) => {
    if (ok(ev.entity) && BY_TYPE[ev.entity.typeId]) validate(ev.entity);
  });

  let n = 0;
  system.runInterval(() => {
    n++;
    for (const dimId of DIMS) {
      let list = [];
      try {
        list = world.getDimension(dimId).getEntities({ families: ["valdoria_montaria"] });
      } catch {
        continue;
      }
      for (const e of list) {
        const tipo = BY_TYPE[e.typeId];
        if (!tipo || !isTamed(e)) continue;
        if (n % 10 === 0 && !validate(e)) continue;
        const rider = riderOf(e);
        if (MOUNTS[tipo].voa) {
          const prevId = lastRider.get(e.id);
          if (prevId && (!ok(rider) || rider.id !== prevId)) {
            const prev = world.getEntity(prevId);
            if (prev && !ridingOn(prev)) glideDown(prev, e, MOUNTS[tipo].planar);
          }
          if (ok(rider)) lastRider.set(e.id, rider.id);
          else lastRider.delete(e.id);
        }
        if (!ok(rider)) continue;
        try { PASSIVES[tipo](e, rider); } catch (err) { console.warn(`[Valdoria] montaria: ${err}`); }
        if (n % 5 === 0 && ownerOf(e) === rider.id) hud(rider, e, tipo);
      }
    }
    if (n % 300 === 0) cleanupSkills();
  }, 4);
}

// ------------------------------------------------------------------ Modo de Teste
/** Gera uma montaria já vinculada ao jogador e entrega o item de vínculo. */
export function testMount(player, tipo) {
  const M = MOUNTS[tipo];
  const e = player.dimension.spawnEntity(M.id, spotNear(player));
  bindEntity(player, tipo, e);
  if (!countItem(player, M.item)) giveItem(player, new ItemStack(M.item, 1));
  particle(player.dimension, "cura", V.up(e.location, 1.8), {});
  return e;
}
export function resetRecovery(player) {
  for (const tipo of Object.keys(MOUNTS)) {
    const b = getBond(player.id, tipo);
    if (b) setBond(player.id, tipo, { ...b, morto: 0 });
  }
  skillCd.clear();
}

// ------------------------------------------------------------------ Estábulo (Diário)
function statusOf(player, tipo) {
  const M = MOUNTS[tipo];
  const b = getBond(player.id, tipo);
  if (!b) return `§8Sem ${M.nome.toLowerCase()}. §7${M.obter}`;
  const e = findMount(player.id, tipo, b);
  const filhote = typeof b.cresc === "number" && !b.adulto ? ` §d(filhote: ${Math.floor(b.cresc)}% crescido)` : "";
  if (e) {
    const h = health(e);
    return `§a${e.nameTag || M.nome}§7 - ${Math.ceil(h?.currentValue ?? 0)}/${Math.ceil(h?.effectiveMax ?? 0)} de vida, a ${Math.round(V.dist(e.location, player.location))} blocos${filhote}`;
  }
  const left = b.morto ? M.recMin * 60000 - (Date.now() - b.morto) : 0;
  if (left > 0) return `§c${b.nome || M.nome} se recupera: ${fmtTime(Math.ceil(left / 1000))}`;
  return `§e${b.nome || M.nome}§7 está no estábulo (ou longe daqui). Use o item de vínculo para chamá-lo.`;
}

export async function stableMenu(player, back) {
  const lines = [];
  for (const [tipo, M] of Object.entries(MOUNTS)) {
    lines.push(`§6§l${M.nome}§r`, statusOf(player, tipo), `§8${M.velocidade}. ${M.passiva}. Habilidade: ${M.hab}.`, "");
  }
  lines.push("§7Montar: interaja com a montaria. Comandos (seguir, ficar, renomear, dispensar): agache e interaja.",
    "§7Cura: alimente-a. Se cair, volta após alguns minutos de recuperação.");
  const f = new ActionFormData().title("Estábulo").body(lines.join("\n"));
  const opts = [];
  for (const [tipo, M] of Object.entries(MOUNTS)) {
    if (getBond(player.id, tipo) || (tipo === "cavalo" && countItem(player, M.item))) {
      f.button(`Chamar: ${M.nome}`, `textures/items/${NS}/${M.item.split(":")[1]}`);
      opts.push(() => useMountItem(player, tipo));
    }
  }
  f.button("Voltar");
  const r = await show(player, f);
  if (r.canceled || r.selection === undefined) return;
  if (r.selection < opts.length) return opts[r.selection]();
  if (back) return back(player);
}
