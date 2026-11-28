// Combat mode on/off (Java: R key). Extended by the combat systems.
import { K, tr } from "./i18n";
import { moveTechniqueToHome } from "./items";
import { casts, type Runtime } from "./players";

type Hook = (r: Runtime) => void;
const enterHooks: Hook[] = [];
const leaveHooks: Hook[] = [];

export const onEnterCombat = (hook: Hook): void => void enterHooks.push(hook);
export const onLeaveCombat = (hook: Hook): void => void leaveHooks.push(hook);

export function enterCombat(r: Runtime): boolean {
  if (r.combat) return true;
  if (r.profile.technique === "none") {
    r.player.onScreenDisplay.setActionBar(tr(K.needTechnique));
    return false;
  }
  moveTechniqueToHome(r.player);
  r.player.selectedSlotIndex = 8;
  r.combat = true;
  r.hudDirty = true;
  for (const h of enterHooks) h(r);
  r.player.onScreenDisplay.setActionBar(tr(K.combatOn));
  return true;
}

export function leaveCombat(r: Runtime, silent = false): void {
  if (!r.combat) return;
  r.combat = false;
  r.hudDirty = true;
  for (const h of leaveHooks) h(r);
  casts.interruptAll(r.id);
  if (!silent) r.player.onScreenDisplay.setActionBar(tr(K.combatOff));
}

export function toggleCombat(r: Runtime): void {
  if (r.combat) leaveCombat(r);
  else enterCombat(r);
}
