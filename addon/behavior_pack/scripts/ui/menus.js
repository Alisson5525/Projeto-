import { system } from "@minecraft/server";
import { ActionFormData, MessageFormData, ModalFormData, FormCancelationReason } from "@minecraft/server-ui";
import { TAG, DP, VERSION, MAX_LEVEL, HUNTER } from "../core/config.js";
import {
  Faction, getFaction, getLevel, getXp, xpForNext, getBlood, getWolfTier, getNum, setNum, getSettings, saveSettings, playerHud,
} from "../core/data.js";
import { safe, msg, sound, tr, countItem, isCreative } from "../core/util.js";
import { SKILLS, getUnlocked, hasSkill, tryUnlock, castSkill, cooldownLeft, setSelected, getSelected, skillIcon } from "../systems/skills.js";
import { BLOCK_UI } from "../blocks/components.js";
import { MISSIONS, missionProgress, deliverMission, getStats, spendPoint } from "../systems/hunter.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NL = { text: "\n" };
const NL2 = { text: "\n\n" };

/** Paragraph list of lang keys → RawMessage. */
function paragraphs(...keys) {
  const raw = [];
  keys.forEach((k, i) => {
    if (i) raw.push(NL2);
    raw.push(typeof k === "string" ? { translate: k } : k);
  });
  return { rawtext: raw };
}

const T = (key, ...w) => ({ rawtext: [tr(key, ...w)] });

/** Show a form; retries while the player has chat/inventory open. */
async function show(form, player, tries = 0) {
  const res = await form.show(player);
  if (res.canceled && res.cancelationReason === FormCancelationReason.UserBusy && tries < 30) {
    await new Promise((r) => system.runTimeout(() => r(undefined), 10));
    return show(form, player, tries + 1);
  }
  return res;
}

function click(player) {
  sound(player, "random.click", 0.5, 1.2);
}

const FACTION_COLOR = { human: "§f", vampire: "§4", werewolf: "§6", hunter: "§e" };

// ---------------------------------------------------------------------------
// Codex (Vampire Craft book)
// ---------------------------------------------------------------------------

export async function openCodex(player) {
  const isAdmin = player.hasTag(TAG.ADMIN) || isCreative(player);
  const pages = [
    ["status", "textures/items/vampire_craft_book"],
    ["vampire", "textures/items/vampire_tooth"],
    ["werewolf", "textures/items/werewolf_fang"],
    ["hunter", "textures/items/hunter_bow"],
    ["items", "textures/items/blood_bottle_4"],
    ["world", "textures/ui/vc_world"],
    ["settings", "textures/ui/vc_settings"],
  ];
  if (isAdmin) pages.push(["admin", "textures/ui/vc_admin"]);

  const f = new ActionFormData().title(T("vc.codex.title")).body(paragraphs("vc.codex.intro", tr("vc.codex.version", VERSION)));
  pages.forEach(([id, icon]) => f.button(T(`vc.codex.page.${id}`), icon));
  const res = await show(f, player);
  if (res.canceled || res.selection === undefined) return;
  click(player);
  const page = pages[res.selection][0];
  if (page === "status") return openStatus(player, true);
  if (page === "settings") return openSettings(player);
  if (page === "admin") return openAdmin(player);
  return openTopic(player, page);
}

const TOPICS = {
  vampire: ["become", "blood", "bite", "sun", "skills", "level"],
  werewolf: ["become", "form", "tiers", "skills", "level"],
  hunter: ["become", "missions", "stats", "bow", "skills"],
  items: ["altar", "recharge", "weapons", "grinder", "coffin", "cures", "armor"],
  world: ["bloodmoon", "explore", "structures", "drops", "mobs", "commands"],
};

async function openTopic(player, topic) {
  const subs = TOPICS[topic];
  const f = new ActionFormData().title(T(`vc.codex.page.${topic}`)).body(T(`vc.codex.${topic}.intro`));
  subs.forEach((s) => f.button(T(`vc.codex.${topic}.${s}.title`)));
  f.button(T("vc.ui.back"));
  const res = await show(f, player);
  if (res.canceled || res.selection === undefined) return;
  click(player);
  if (res.selection >= subs.length) return openCodex(player);
  const sub = subs[res.selection];
  const page = new MessageFormData()
    .title(T(`vc.codex.${topic}.${sub}.title`))
    .body(paragraphs(`vc.codex.${topic}.${sub}.1`, `vc.codex.${topic}.${sub}.2`))
    .button1(T("vc.ui.back"))
    .button2(T("vc.ui.close"));
  const r2 = await show(page, player);
  if (!r2.canceled && r2.selection === 0) return openTopic(player, topic);
}

// ---------------------------------------------------------------------------
// Status page
// ---------------------------------------------------------------------------

export async function openStatus(player, fromCodex = false) {
  const f = getFaction(player);
  const lvl = getLevel(player);
  const raw = [
    tr("vc.status.faction"), { text: ` ${FACTION_COLOR[f]}` }, tr(`vc.faction.${f}`), { text: "§r" }, NL,
  ];
  if (f !== Faction.HUMAN) {
    raw.push(tr("vc.status.level"), { text: ` §b${lvl}/${MAX_LEVEL}§r` }, NL);
    if (f !== Faction.HUNTER) raw.push(tr("vc.status.xp"), { text: ` §a${lvl >= MAX_LEVEL ? "MAX" : `${getXp(player)}/${xpForNext(lvl)}`}§r` }, NL);
  }
  if (f === Faction.VAMPIRE) raw.push(tr("vc.status.blood"), { text: ` §c${getBlood(player)}/20§r` }, NL);
  if (f === Faction.WEREWOLF) raw.push(tr("vc.status.tier"), { text: ` §6${["", "I", "II", "III"][getWolfTier(player)]}§r` }, NL);
  if (f === Faction.HUNTER) {
    const s = getStats(player);
    raw.push(tr("vc.status.points"), { text: ` §a${getNum(player, DP.HUNTER_POINTS, 0)}§r` }, NL);
    raw.push(tr("vc.hunter.stat.vital"), { text: ` ${s.vital}/${HUNTER.MAX_STAT}  ` }, tr("vc.hunter.stat.agility"), { text: ` ${s.agility}/${HUNTER.MAX_STAT}  ` }, tr("vc.hunter.stat.combat"), { text: ` ${s.combat}/${HUNTER.MAX_STAT}` }, NL);
  }
  if (f === Faction.VAMPIRE || f === Faction.WEREWOLF || f === Faction.HUNTER) {
    const owned = getUnlocked(player, f);
    raw.push(NL, tr("vc.status.skills"), { text: ` §d${owned.length}/${SKILLS[f].length}§r` }, NL);
    for (const id of owned) raw.push({ text: " §7• §f" }, tr(`vc.skill.${f}.${id}.name`), NL);
  }
  const form = new MessageFormData().title(T("vc.codex.page.status")).body({ rawtext: raw }).button1(T("vc.ui.back")).button2(T("vc.ui.close"));
  const res = await show(form, player);
  if (fromCodex && !res.canceled && res.selection === 0) return openCodex(player);
}

// ---------------------------------------------------------------------------
// Skill menu (vampire / werewolf skill item)
// ---------------------------------------------------------------------------

export async function openSkillMenu(player) {
  const f = getFaction(player);
  const owned = getUnlocked(player, f);
  const actives = SKILLS[f].filter((s) => s.kind === "active" && owned.includes(s.id));
  const sel = getSelected(player);

  const form = new ActionFormData().title(T("vc.skills.title")).body(T("vc.skills.body"));
  for (const s of actives) {
    const cd = cooldownLeft(player, s.id);
    const label = { rawtext: [{ text: s.id === sel ? "§a» " : "" }, tr(`vc.skill.${f}.${s.id}.name`), { text: cd > 0 ? ` §8(${cd}s)` : "" }] };
    form.button(label, skillIcon(s.id));
  }
  form.button(T("vc.skills.passives"), "textures/ui/skill_back");
  form.button(T("vc.codex.page.status"), "textures/items/vampire_craft_book");

  const res = await show(form, player);
  if (res.canceled || res.selection === undefined) return;
  click(player);
  if (res.selection === actives.length) return openPassives(player);
  if (res.selection === actives.length + 1) return openStatus(player);
  const skill = actives[res.selection];
  setSelected(player, skill.id);
  castSkill(player, skill.id);
}

async function openPassives(player) {
  const f = getFaction(player);
  const owned = getUnlocked(player, f);
  const raw = [];
  for (const s of SKILLS[f].filter((x) => x.kind === "passive")) {
    raw.push({ text: owned.includes(s.id) ? "§a✔ " : "§8✖ " }, tr(`vc.skill.${f}.${s.id}.name`), { text: "§r§7 — " }, tr(`vc.skill.${f}.${s.id}.desc`), NL);
  }
  const form = new MessageFormData().title(T("vc.skills.passives")).body({ rawtext: raw }).button1(T("vc.ui.back")).button2(T("vc.ui.close"));
  const res = await show(form, player);
  if (!res.canceled && res.selection === 0) return openSkillMenu(player);
}

// ---------------------------------------------------------------------------
// Unlock menu (Blood Altar)
// ---------------------------------------------------------------------------

export async function openUnlockMenu(player, faction = getFaction(player)) {
  if (faction !== Faction.VAMPIRE && faction !== Faction.WEREWOLF) return;
  const lvl = getLevel(player);
  const list = SKILLS[faction].filter((s) => !s.free && !hasSkill(player, s.id, faction));
  if (!list.length) {
    msg(player, "vc.altar.all_unlocked");
    return;
  }
  const form = new ActionFormData().title(T("vc.altar.title")).body(T("vc.altar.body", lvl));
  for (const s of list) {
    const lockedLvl = lvl < s.level;
    const costTxt = s.cost.map((c) => {
      const have = countItem(player, c.item);
      return `${have >= c.amount ? "§a" : "§c"}${c.amount}x`;
    });
    const raw = [{ text: lockedLvl ? "§8" : "§f" }, tr(`vc.skill.${faction}.${s.id}.name`), { text: `\n§7` }];
    if (lockedLvl) raw.push(tr("vc.altar.req_level", s.level));
    else s.cost.forEach((c, i) => raw.push({ text: `${i ? " §7+ " : ""}${costTxt[i]} ` }, { translate: `item.${c.item}.name` }));
    form.button({ rawtext: raw }, skillIcon(s.id));
  }
  const res = await show(form, player);
  if (res.canceled || res.selection === undefined) return;
  const s = list[res.selection];

  const confirm = new MessageFormData()
    .title({ rawtext: [tr(`vc.skill.${faction}.${s.id}.name`)] })
    .body(paragraphs(`vc.skill.${faction}.${s.id}.desc`, tr("vc.altar.confirm", s.level)))
    .button1(T("vc.ui.unlock"))
    .button2(T("vc.ui.back"));
  const r2 = await show(confirm, player);
  if (r2.canceled) return;
  if (r2.selection === 1) return openUnlockMenu(player, faction);
  const outcome = tryUnlock(player, faction, s.id);
  msg(player, outcome, s.level);
  if (outcome === "vc.skill.unlocked") {
    const def = SKILLS[faction].find((x) => x.id === s.id);
    if (def?.kind === "active") setSelected(player, s.id);
  }
}

// ---------------------------------------------------------------------------
// Hunter menu
// ---------------------------------------------------------------------------

export async function openHunterMenu(player) {
  const m = missionProgress(player);
  const pts = getNum(player, DP.HUNTER_POINTS, 0);
  const actives = SKILLS.hunter.filter((s) => getUnlocked(player, Faction.HUNTER).includes(s.id));

  const body = [tr("vc.hunter.menu.body", getLevel(player), pts), NL2];
  if (m) {
    body.push(tr("vc.hunter.mission.current"), { text: " " });
    if (m.def.kind === "kill") body.push(tr(`vc.hunter.mission.${m.idx}`), { text: ` §7(${m.have}/${m.def.count})` });
    else body.push(tr("vc.hunter.mission.deliver", m.def.count), { text: " " }, { translate: `item.${m.def.item}.name` }, { text: ` §7(${m.have}/${m.def.count})` });
  } else body.push(tr("vc.hunter.all_done"));

  const form = new ActionFormData().title(T("vc.hunter.menu.title")).body({ rawtext: body });
  const actions = [];
  for (const s of actives) {
    const cd = cooldownLeft(player, s.id);
    form.button({ rawtext: [tr(`vc.skill.hunter.${s.id}.name`), { text: cd > 0 ? ` §8(${cd}s)` : "" }] }, skillIcon(s.id));
    actions.push(() => {
      setSelected(player, s.id);
      castSkill(player, s.id);
    });
  }
  if (m?.def.kind === "deliver") {
    form.button(T("vc.hunter.menu.deliver"), "textures/ui/hunter_mission");
    actions.push(() => msg(player, deliverMission(player)));
  }
  form.button({ rawtext: [tr("vc.hunter.menu.train"), { text: pts > 0 ? ` §a(${pts})` : "" }] }, "textures/ui/hunter_train");
  actions.push(() => openTraining(player));
  form.button(T("vc.codex.page.status"), "textures/items/vampire_craft_book");
  actions.push(() => openStatus(player));

  const res = await show(form, player);
  if (res.canceled || res.selection === undefined) return;
  click(player);
  actions[res.selection]?.();
}

async function openTraining(player) {
  const s = getStats(player);
  const pts = getNum(player, DP.HUNTER_POINTS, 0);
  const stats = ["vital", "agility", "combat"];
  const form = new ActionFormData().title(T("vc.hunter.menu.train")).body(T("vc.hunter.train.body", pts));
  for (const st of stats) {
    form.button({ rawtext: [tr(`vc.hunter.stat.${st}`), { text: ` §8[${s[st]}/${HUNTER.MAX_STAT}]\n§7` }, tr(`vc.hunter.stat.${st}.desc`)] }, `textures/ui/hunter_${st}`);
  }
  form.button(T("vc.ui.back"));
  const res = await show(form, player);
  if (res.canceled || res.selection === undefined) return;
  if (res.selection === stats.length) return openHunterMenu(player);
  msg(player, spendPoint(player, stats[res.selection]));
  return openTraining(player);
}

// ---------------------------------------------------------------------------
// Vampire eye colour (Change Stone)
// ---------------------------------------------------------------------------

export async function openEyeMenu(player) {
  const form = new ActionFormData().title(T("vc.eyes.title")).body(T("vc.eyes.body"));
  for (let i = 1; i <= 4; i++) form.button(T(`vc.eyes.${i}`), `textures/entity/player_vampire_eye/eye${i}`);
  form.button(T("vc.eyes.none"));
  const res = await show(form, player);
  if (res.canceled || res.selection === undefined) return;
  [...TAG.EYES, "eye0"].forEach((t) => player.removeTag(t));
  if (res.selection < 4) {
    player.addTag(`eye${res.selection + 1}`);
    setNum(player, "vc:eyes_on", 1);
    setNum(player, "vc:eyes_placed", 0);
  } else player.addTag("eye0");
  sound(player, "random.orb", 0.6, 1.4);
}

// ---------------------------------------------------------------------------
// Settings (per player) and world settings (admins)
// ---------------------------------------------------------------------------

async function openSettings(player) {
  const form = new ModalFormData().title(T("vc.settings.title"));
  form.toggle(T("vc.settings.hud"), { defaultValue: playerHud(player) });
  const res = await show(form, player);
  if (res.canceled || !res.formValues) return;
  setNum(player, DP.HUD, res.formValues[0] ? 1 : 0);
  if (!res.formValues[0]) safe(() => player.onScreenDisplay.setActionBar(" "));
  msg(player, "vc.settings.saved");
}

async function openAdmin(player) {
  const s = getSettings();
  const form = new ModalFormData()
    .title(T("vc.admin.title"))
    .toggle(T("vc.admin.sun"), { defaultValue: s.sunDamage })
    .slider(T("vc.admin.infection"), 0, 100, { valueStep: 5, defaultValue: s.infectionChance })
    .toggle(T("vc.admin.bloodmoon"), { defaultValue: s.bloodMoon })
    .slider(T("vc.admin.bloodmoon_chance"), 0, 100, { valueStep: 5, defaultValue: s.bloodMoonChance })
    .toggle(T("vc.admin.ambush"), { defaultValue: s.mobAmbush })
    .toggle(T("vc.admin.book"), { defaultValue: s.starterBook })
    .toggle(T("vc.admin.encounters"), { defaultValue: s.encounters !== false })
    .toggle(T("vc.admin.spawn_boost"), { defaultValue: s.spawnBoost !== false });
  const res = await show(form, player);
  if (res.canceled || !res.formValues) return;
  const [sun, inf, bm, bmc, amb, book, enc, boost] = res.formValues;
  saveSettings({ sunDamage: !!sun, infectionChance: Number(inf), bloodMoon: !!bm, bloodMoonChance: Number(bmc), mobAmbush: !!amb, starterBook: !!book, encounters: !!enc, spawnBoost: !!boost });
  msg(player, "vc.settings.saved");
}

export { MISSIONS };

BLOCK_UI.openUnlockMenu = openUnlockMenu;
