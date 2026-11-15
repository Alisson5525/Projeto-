// Roteamento do uso de itens (Diário, Sigilo, conjuradores, armas, Elixir, Ídolo, pergaminhos, mapa), Mesa Rúnica e kit inicial.
import { APITO, callCompanion, companionMenu } from "../companions/companions.js";
import { useHeart } from "../structures/celeste_run.js";
import { world, system, ItemStack } from "@minecraft/server";
import { NS, ok, tick, say, giveItem, heldItem } from "../core/util.js";
import { psound } from "../core/fx.js";
import { getData, markDirty, saveNow } from "../core/store.js";
import { itemData } from "../rpg/stats.js";
import { useAbility, ABILITIES } from "../abilities/registry.js";
import { selectedAbility, cycleAbility, selectedSpell, cycleSpell } from "../abilities/selection.js";
import { SPELLS } from "../magic/spells.js";
import { heavyAttack, weaponSkill } from "../combat/weapons.js";
import { openMainMenu, raceMenu, rebirthMenu, runeTableMenu } from "../ui/menus.js";
import { useIdol } from "../bosses/tita.js";
import { LORE_INTRO } from "../quests/quests.js";
import { SCROLL_ID, scrollLoreId } from "../structures/scrolls.js";
import { readLore } from "../ui/codex.js";
import { useMap } from "../structures/index.js";
import { useMountItem, mountType, ITEM_TYPE, OSSO_ALFA, REDEA_CELESTE, LOBO_NIVEL } from "../mounts/mounts.js";
import { placeEgg, OVO_ITEM } from "../mounts/dragon.js";
import { handleExploreItem } from "../exploration/items.js";

const debounce = new Map();
const INTERACTIVE = ["chest", "barrel", "door", "trapdoor", "gate", "button", "lever", "crafting", "furnace", "smoker", "anvil",
  "table", "bed", "shulker", "hopper", "dispenser", "dropper", "loom", "stonecutter", "grindstone", "lectern", "bell", "beacon",
  "brewing", "cauldron", "composter", "jukebox", "note", "repeater", "comparator", "daylight", "campfire", "sign", "frame",
  "respawn_anchor", "lodestone", "smithing", "cartography", "fletching", "chiseled_bookshelf", "decorated_pot", "crafter", "vault",
  "trial_spawner", "copper_bulb", "shelf"];

function castSpell(player, caster) {
  const id = selectedSpell(player);
  if (!id) {
    player.onScreenDisplay.setActionBar("§7Nenhum feitiço preparado. Abra o Diário > Grimório.");
    return;
  }
  if (SPELLS[id]?.combo && !caster.combo) {
    player.onScreenDisplay.setActionBar("§dFeitiços combinados exigem o Grimório do Arquimago.");
    return;
  }
  useAbility(player, id);
}

/** Executa a ação do item em mãos. Retorna true se o item pertence ao add-on e foi tratado. */
export function handleUse(player, item) {
  if (!item || !item.typeId.startsWith(`${NS}:`)) return false;
  const last = debounce.get(player.id) || 0;
  if (tick() - last < 5) return true;
  debounce.set(player.id, tick());
  const id = item.typeId;
  const d = itemData(item);
  if (handleExploreItem(player, item)) return true;
  if (id === `${NS}:diario_aventureiro`) {
    openMainMenu(player);
    return true;
  }
  if (id === `${NS}:sigilo_aventureiro`) {
    if (player.isSneaking) {
      const next = cycleAbility(player);
      player.onScreenDisplay.setActionBar(next ? `§bHabilidade: §f${ABILITIES[next].nome}` : "§7Nenhuma habilidade desbloqueada.");
      psound(player, "random.click", 1.4, 0.5);
    } else {
      const ab = selectedAbility(player);
      if (ab) useAbility(player, ab);
      else player.onScreenDisplay.setActionBar("§7Escolha uma raça no Diário para desbloquear habilidades.");
    }
    return true;
  }
  if (id === `${NS}:elixir_renascimento`) {
    rebirthMenu(player);
    return true;
  }
  if (id === `${NS}:idolo_tita`) {
    useIdol(player);
    return true;
  }
  if (id === SCROLL_ID) {
    const lid = scrollLoreId(item);
    if (lid) readLore(player, lid);
    else player.onScreenDisplay.setActionBar("§7A tinta deste pergaminho apagou-se com o tempo.");
    return true;
  }
  if (id === `${NS}:coracao_aetherita`) {
    useHeart(player);
    return true;
  }
  if (id === APITO) {
    if (player.isSneaking) companionMenu(player);
    else callCompanion(player);
    return true;
  }
  if (ITEM_TYPE[id]) {
    useMountItem(player, ITEM_TYPE[id]);
    return true;
  }
  if (id === OVO_ITEM) {
    placeEgg(player);
    return true;
  }
  if (id === OSSO_ALFA) {
    player.onScreenDisplay.setActionBar(`§7Ofereça o osso a um §fLobo Gigante selvagem§7 (florestas frias, nível ${LOBO_NIVEL}+).`);
    return true;
  }
  if (id === REDEA_CELESTE) {
    player.onScreenDisplay.setActionBar("§7Use a rédea num §fGrifo selvagem§7 (Ninho de Grifo, nas montanhas; nível 18+).");
    return true;
  }
  if (id === `${NS}:mapa_explorador`) {
    useMap(player).catch((e) => console.warn(`[Valdoria] mapa: ${e}`));
    return true;
  }
  if (!d) return false;
  if (d.k === "caster") {
    if (player.isSneaking) {
      const next = cycleSpell(player);
      player.onScreenDisplay.setActionBar(next ? `§dFeitiço: §f${ABILITIES[next].nome}` : "§7Nenhum feitiço preparado.");
      psound(player, "random.click", 1.6, 0.5);
    } else castSpell(player, d);
    return true;
  }
  if (d.k === "weapon") {
    if (player.isSneaking && d.skill) weaponSkill(player, item);
    else heavyAttack(player, item);
    return true;
  }
  return false;
}

function starterKit(player) {
  const d = getData(player);
  if (d.kit) return;
  d.kit = true;
  markDirty(player);
  for (const [id, n] of [[`${NS}:diario_aventureiro`, 1], [`${NS}:sigilo_aventureiro`, 1], [`${NS}:varinha_aprendiz`, 1],
    [`${NS}:essencia_arcana`, 2], [`${NS}:pocao_energia`, 3]]) giveItem(player, new ItemStack(String(id), Number(n)));
  saveNow(player);
  say(player, `§6§l» Crônicas de Valdoria «§r\n${LORE_INTRO}`);
  say(player, "§eVocê recebeu o §6Diário do Aventureiro§e, o §bSigilo§e e uma §dVarinha de Aprendiz§e. Use o Diário para começar!");
}

export function startItemUse() {
  world.afterEvents.itemUse.subscribe((ev) => {
    try { handleUse(ev.source, ev.itemStack); } catch (e) { console.warn(`[Valdoria] uso de item: ${e}`); }
  });
  world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
    if (!ev.isFirstEvent) return;
    const p = ev.player;
    if (ev.block.typeId === `${NS}:mesa_runica`) {
      ev.cancel = true;
      system.run(() => ok(p) && runeTableMenu(p));
      return;
    }
    const it = ev.itemStack;
    if (!it || !it.typeId.startsWith(`${NS}:`)) return;
    const bid = ev.block.typeId;
    if (INTERACTIVE.some((k) => bid.includes(k))) return;
    if (!itemData(it) && !it.typeId.includes("diario") && !it.typeId.includes("sigilo")) return;
    system.run(() => ok(p) && handleUse(p, heldItem(p)));
  });
  world.beforeEvents.playerInteractWithEntity.subscribe((ev) => {
    const it = ev.itemStack;
    if (!it || !it.typeId.startsWith(`${NS}:`)) return;
    const d = itemData(it);
    if (!d || !["weapon", "caster", "sigil", "menu"].includes(d.k)) return;
    const t = ev.target;
    if (t.typeId === "minecraft:villager_v2" || t.typeId === "minecraft:wandering_trader" || t.typeId === "minecraft:npc") return;
    if (t.typeId === `${NS}:aldeao` || t.typeId === `${NS}:guarda` || t.typeId === `${NS}:prisioneiro`) return;
    if (mountType(t)) return; // interagir com a montaria (montar/comandos) não dispara golpes da arma
    const p = ev.player;
    system.run(() => ok(p) && handleUse(p, heldItem(p)));
  });
  world.afterEvents.playerSpawn.subscribe((ev) => {
    if (!ev.initialSpawn) return;
    const p = ev.player;
    system.runTimeout(() => {
      if (!ok(p)) return;
      starterKit(p);
      const d = getData(p);
      if (!d.raca) {
        p.onScreenDisplay.setTitle("§6§lCrônicas de Valdoria", { subtitle: "§7Abra o Diário do Aventureiro", fadeInDuration: 10,
          stayDuration: 60, fadeOutDuration: 20 });
        system.runTimeout(() => ok(p) && !getData(p).raca && raceMenu(p), 90);
      }
    }, 40);
  });
}
