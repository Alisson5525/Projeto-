// Technique choice (TechniqueSelectionScreen): offered while the player has no
// technique. Card sounds follow the Java timings (drop, land, reveal).
import { type Player, system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { show, THEME } from "./forms";
import { join, K, tr } from "./i18n";
import { ensureTechniqueItem } from "./items";
import { now, rt, saveProfile } from "./players";
import { playFor } from "./sound";
import { SND } from "./sounds";

const open = new Set<string>();
const RETRY_TICKS = 200;

function cardIntroSounds(player: Player): void {
  // DROP at 0 s, LAND at 1.45 s, REVEAL at 2.45 s (single card).
  playFor(SND.cardDrop, player, 0.93, 0.34 / 0.34);
  system.runTimeout(() => player.isValid && playFor(SND.cardLand, player, 1.02), 29);
  system.runTimeout(() => player.isValid && playFor(SND.cardReveal, player, 0.92), 49);
}

export async function offerTechnique(player: Player): Promise<void> {
  const r = rt(player);
  if (r.profile.technique !== "none" || open.has(player.id)) return;
  open.add(player.id);
  try {
    cardIntroSounds(player);
    const form = new ActionFormData()
      .title(join(THEME, "§c", tr(K.chooseTitle)))
      .body(tr(K.chooseBody))
      .button(tr(K.chooseLimitless), "textures/jjk/cards/limitless");
    const res = await show(player, form);
    if (!player.isValid) return;
    if (res.canceled || res.selection !== 0) {
      r.offerAt = now() + RETRY_TICKS;
      player.onScreenDisplay.setActionBar(tr(K.chooseRetry));
      return;
    }
    playFor(SND.cardSelect, player);
    system.runTimeout(() => player.isValid && playFor(SND.cardShatter, player), 2);
    system.runTimeout(() => player.isValid && playFor(SND.cardReveal, player, 0.78, 0.48 / 0.48), 4);
    r.profile = { ...r.profile, technique: "limitless" };
    saveProfile(r);
    ensureTechniqueItem(player);
    player.onScreenDisplay.setTitle(tr(K.chooseDone), {
      subtitle: tr(K.chooseDoneSub),
      fadeInDuration: 5,
      stayDuration: 50,
      fadeOutDuration: 15,
    });
    player.dimension.spawnParticle("minecraft:knockback_roar_particle", { ...player.location, y: player.location.y + 1 });
  } finally {
    open.delete(player.id);
  }
}

/** Called every second: (re)offers the choice to players without a technique. */
export function tickOffers(player: Player): void {
  const r = rt(player);
  if (r.profile.technique !== "none" || open.has(player.id)) return;
  if (r.offerAt === 0) r.offerAt = now() + 30;
  if (now() >= r.offerAt) void offerTechnique(player);
}
