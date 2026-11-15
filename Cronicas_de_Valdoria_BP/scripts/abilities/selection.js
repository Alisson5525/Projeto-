// Habilidades desbloqueadas (raça + classe) e seleção do Sigilo; linha de HUD.
import { getData, markDirty } from "../core/store.js";
import { heldItem } from "../core/util.js";
import { RACAS } from "../data/races.js";
import { CLASSES } from "../data/classes.js";
import { ABILITIES, cooldownLeft } from "./registry.js";
import { itemData } from "../rpg/stats.js";

const RACIAL_LEVELS = [1, 4, 8];
export function racialUnlockLevel(i) {
  return RACIAL_LEVELS[i] ?? 1;
}

export function unlockedAbilities(player) {
  const d = getData(player);
  const out = [];
  if (d.raca) RACAS[d.raca].habilidades.forEach((id, i) => d.nivel >= racialUnlockLevel(i) && out.push(id));
  if (d.classe) for (const [id, lv] of CLASSES[d.classe].habilidades) if (d.nivel >= lv) out.push(id);
  return out;
}

export function selectedAbility(player) {
  const list = unlockedAbilities(player);
  if (!list.length) return undefined;
  const d = getData(player);
  if (d.habSel >= list.length || d.habSel < 0) d.habSel = 0;
  return list[d.habSel];
}

export function cycleAbility(player) {
  const list = unlockedAbilities(player);
  if (!list.length) return undefined;
  const d = getData(player);
  d.habSel = (d.habSel + 1) % list.length;
  markDirty(player);
  return list[d.habSel];
}

export function preparedSpells(player) {
  return getData(player).grimorio.filter((x) => !!x);
}

export function selectedSpell(player) {
  const list = preparedSpells(player);
  if (!list.length) return undefined;
  const d = getData(player);
  if (d.magiaSel >= list.length || d.magiaSel < 0) d.magiaSel = 0;
  return list[d.magiaSel];
}

export function cycleSpell(player) {
  const list = preparedSpells(player);
  if (!list.length) return undefined;
  const d = getData(player);
  d.magiaSel = (d.magiaSel + 1) % list.length;
  markDirty(player);
  return list[d.magiaSel];
}

function fmtAb(player, id, prefix) {
  const ab = ABILITIES[id];
  if (!ab) return "";
  const cd = cooldownLeft(player, id);
  return `${prefix}${cd > 0 ? `§7${ab.nome} §c${Math.ceil(cd / 20)}s` : `§f${ab.nome}`}`;
}

/** Linha extra do HUD conforme o item em mãos. */
export function hudAbilityLine(player) {
  const held = heldItem(player);
  const d = itemData(held);
  if (held?.typeId === "valdoria:sigilo_aventureiro") {
    const id = selectedAbility(player);
    return id ? fmtAb(player, id, "§bSigilo: ") : "§7Sigilo: escolha uma raça no Diário";
  }
  if (d && d.k === "caster") {
    const id = selectedSpell(player);
    return id ? fmtAb(player, id, "§dFeitiço: ") : "§7Nenhum feitiço preparado (Diário > Grimório)";
  }
  return "";
}
