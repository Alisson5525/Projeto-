// Reverse Cursed Technique: the trial (learning) and healing.
import { UNLOCK_LEVEL } from "../core/constants";
import { K, tr } from "./i18n";
import { now, type Runtime } from "./players";

/** Starts the Reversal Trial (menu button). Requires level 15 and not learned yet. */
export function startTrial(r: Runtime): void {
  const p = r.profile;
  if (p.rct) {
    r.player.onScreenDisplay.setActionBar(tr(K.rctLearned));
    return;
  }
  if (p.level < UNLOCK_LEVEL.rctTrial) {
    r.player.onScreenDisplay.setActionBar(tr(K.rctLocked, UNLOCK_LEVEL.rctTrial));
    return;
  }
  if (r.trial.isActive()) return;
  r.trial.start(now());
  r.trialOrigin = { ...r.player.location };
  r.hudDirty = true;
  r.player.onScreenDisplay.setActionBar(tr(K.trialBody));
}
