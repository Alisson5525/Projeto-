// Technique choice (TechniqueSelectionScreen): offered while the player has no
// technique. Card sounds follow the Java timings (drop, land, reveal).
// Limitless is the only technique, so the choice can never lock a player out:
// a menu that keeps closing on its own grants it, and /jjk:escolher always works.
import { type Player, system } from "@minecraft/server";
import { ActionFormData, FormCancelationReason } from "@minecraft/server-ui";
import { OfferTracker } from "../core/techniqueOffer";
import { show } from "./forms";
import { K, tr } from "./i18n";
import { ensureTechniqueItem } from "./items";
import { now, rt, saveProfile } from "./players";
import { playFor } from "./sound";
import { SND } from "./sounds";

const open = new Set<string>();
const trackers = new Map<string, OfferTracker>();
const RETRY_TICKS = 200;

function cardIntroSounds(player: Player): void {
  // DROP at 0 s, LAND at 1.45 s, REVEAL at 2.45 s (single card).
  playFor(SND.cardDrop, player, 0.93);
  system.runTimeout(() => player.isValid && playFor(SND.cardLand, player, 1.02), 29);
  system.runTimeout(() => player.isValid && playFor(SND.cardReveal, player, 0.92), 49);
}

/** Gives Limitless (menu choice, command or automatic fallback). */
export function grantLimitless(player: Player, automatic = false): boolean {
  const r = rt(player);
  if (r.profile.technique !== "none") return false;
  r.profile = { ...r.profile, technique: "limitless" };
  saveProfile(r);
  trackers.delete(player.id);
  ensureTechniqueItem(player);
  playFor(SND.cardSelect, player);
  system.runTimeout(() => player.isValid && playFor(SND.cardShatter, player), 2);
  system.runTimeout(() => player.isValid && playFor(SND.cardReveal, player, 0.78), 4);
  player.onScreenDisplay.setTitle(tr(K.chooseDone), { subtitle: tr(K.chooseDoneSub), fadeInDuration: 5, stayDuration: 50, fadeOutDuration: 15 });
  if (automatic) player.sendMessage(tr(K.chooseAuto));
  try {
    player.dimension.spawnParticle("minecraft:knockback_roar_particle", { ...player.location, y: player.location.y + 1 });
  } catch {
    // Unloaded chunk: the particle is only decoration.
  }
  return true;
}

export async function offerTechnique(player: Player): Promise<void> {
  const r = rt(player);
  if (r.profile.technique !== "none" || open.has(player.id)) return;
  open.add(player.id);
  const tracker = trackers.get(player.id) ?? new OfferTracker();
  trackers.set(player.id, tracker);
  let next: "choose" | "retry" | "grant";
  try {
    cardIntroSounds(player);
    player.onScreenDisplay.setActionBar(tr(K.chooseHint));
    const form = new ActionFormData()
      .title(tr(K.chooseTitle))
      .body(tr(K.chooseBody))
      .button(tr(K.chooseLimitless), "textures/jjk/cards/limitless");
    const shownAt = now();
    const res = await show(player, form);
    next = tracker.outcome({
      selected: res.selection === 0,
      canceled: res.canceled,
      busy: res.cancelationReason === FormCancelationReason.UserBusy,
      openTicks: now() - shownAt,
    });
  } catch (e) {
    console.warn(`[JJK] technique menu failed: ${String(e)}`);
    next = tracker.outcome({ error: true });
  } finally {
    open.delete(player.id);
  }
  if (!player.isValid) return;
  if (next === "choose") grantLimitless(player);
  else if (next === "grant") grantLimitless(player, true);
  else {
    r.offerAt = now() + RETRY_TICKS;
    player.onScreenDisplay.setActionBar(tr(K.chooseRetry));
  }
}

/** Called every second: (re)offers the choice to players without a technique. */
export function tickOffers(player: Player): void {
  const r = rt(player);
  if (r.profile.technique !== "none" || open.has(player.id)) return;
  if (r.offerAt === 0) r.offerAt = now() + 30;
  if (now() >= r.offerAt) void offerTechnique(player);
}
