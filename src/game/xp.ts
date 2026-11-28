// Jujutsu XP sources (MenuServerHandler.grantXp / onEntityKilled).
import { type Entity, type EntityHealthComponent, type Player, world } from "@minecraft/server";
import { XP } from "../core/constants";
import { grantXp as applyXp } from "../core/profile";
import { killXp, techniqueXp, xpToNext } from "../core/progression";
import { refreshAttributes } from "./attributes";
import { K, tr } from "./i18n";
import { rt, type Runtime, saveProfile } from "./players";

export function grantXp(r: Runtime, amount: number, show: boolean): void {
  const before = r.profile.level;
  const gain = applyXp(r.profile, amount);
  if (gain.profile === r.profile) return;
  r.profile = gain.profile;
  saveProfile(r);
  if (gain.leveledUp) {
    refreshAttributes(r);
    r.player.playSound("random.levelup", { volume: 0.6, pitch: 1.1 });
    if (show) r.player.onScreenDisplay.setActionBar(tr(K.levelUp, r.profile.level, gain.gainedPoints));
  } else if (show) {
    r.player.onScreenDisplay.setActionBar(tr(K.xpGain, amount, r.profile.xp, xpToNext(r.profile.level)));
  }
  if (r.profile.level !== before) r.hudDirty = true;
}

export function grantTechniqueXp(r: Runtime, baseCost: number): void {
  grantXp(r, techniqueXp(baseCost), false);
}

function killer(source: { damagingEntity?: Entity; damagingProjectile?: Entity }): Player | undefined {
  const e = source.damagingEntity;
  if (e?.typeId === "minecraft:player") return e as Player;
  return undefined;
}

export function registerXpSources(): void {
  world.afterEvents.entityDie.subscribe(({ deadEntity, damageSource }) => {
    const player = killer(damageSource);
    if (!player || player.id === deadEntity.id) return;
    let reward: number;
    if (deadEntity.typeId === "minecraft:wither") reward = XP.wither;
    else if (deadEntity.typeId === "minecraft:ender_dragon") reward = XP.dragon;
    else {
      const health = deadEntity.getComponent("minecraft:health") as EntityHealthComponent | undefined;
      reward = killXp(health?.effectiveMax ?? 20);
    }
    grantXp(rt(player), reward, true);
  });
}
