// Builds the HUD state for a player and sends it through the title channel.
import type { RawMessage } from "@minecraft/server";
import { AWAKENING_TICKS, COOLDOWN, UNLOCK_LEVEL } from "../core/constants";
import { encodeHud, type HudState, type SlotState, type TrialStageChar } from "../core/hudCodec";
import { lockReason } from "../core/progression";
import { TRIAL } from "../core/rct";
import { isAwakened, maxEnergy, now, type Runtime } from "./players";

const STAY = 400;
const REFRESH = 200;

function remaining(r: Runtime, id: keyof Runtime["ready"], max: number): number {
  const left = r.ready[id] - now();
  return left <= 0 || max <= 0 ? 0 : Math.min(1, left / max);
}

function lockedState(r: Runtime, slot: number): SlotState | null {
  const reason = lockReason(slot, r.profile.level, r.profile.rct);
  if (!reason) return null;
  return reason === "rct" ? "r" : reason === "red" ? "v" : "0";
}

const TRIAL_CHARS: Record<string, TrialStageChar> = {
  IDLE: "-",
  READY: "r",
  CHARGING: "c",
  PASSED: "p",
  FAILED: "f",
  INTERRUPTED: "i",
};

export function hudState(r: Runtime): HudState {
  const t = now();
  const awakened = isAwakened(r);
  const slot = (n: number, active: boolean, cooldown: number): { state: SlotState; cooldown: number } => ({
    state: lockedState(r, n) ?? (active ? "2" : "1"),
    cooldown: lockedState(r, n) ? 0 : cooldown,
  });
  const slots = [
    slot(1, r.infinity, remaining(r, "infinity", COOLDOWN.infinity)),
    slot(2, false, remaining(r, "blue", r.blueCooldownMax)),
    slot(3, false, remaining(r, "barrage", COOLDOWN.barrage)),
    slot(4, false, remaining(r, "red", r.redCooldownMax)),
    slot(5, false, remaining(r, "purple", COOLDOWN.purple)),
    slot(6, awakened && !r.domainUsed, awakened ? 0 : remaining(r, "awakening", COOLDOWN.awakening)),
    { state: "1" as SlotState, cooldown: remaining(r, "roll", COOLDOWN.roll) },
    {
      state: (r.profile.rct && r.profile.level >= UNLOCK_LEVEL.rctTrial ? (r.rctHealing ? "2" : "1") : "0") as SlotState,
      cooldown: 0,
    },
  ];
  const trial = r.trial.isActive()
    ? {
        stage: TRIAL_CHARS[r.trial.stage] ?? "-",
        charge: r.trial.stage === "CHARGING" ? Math.min(1, (t - r.trial.phaseAt) / TRIAL.meterTicks) : 0,
        pulse: r.trial.attempts,
        mask: r.trial.successMask,
      }
    : null;
  return {
    visible: r.combat,
    awakened,
    infinity: r.infinity,
    energy: r.energy,
    energyMax: maxEnergy(r),
    slots,
    awakening: awakened ? Math.min(1, (r.awakeningEnd - t) / AWAKENING_TICKS) : 0,
    hold: r.holdProgress,
    slotNumbers: r.profile.settings.slotNumbers,
    trial,
  };
}

/** Sends the HUD when it changed (or periodically so the title never expires). */
export function tickHud(r: Runtime): void {
  const t = now();
  if (t < r.hudSuspendUntil) return;
  const state = hudState(r);
  if (!state.visible && !state.trial && r.lastHud === "") return;
  const text = encodeHud(state);
  if (text === r.lastHud && t - r.lastHudTick < REFRESH) return;
  r.player.onScreenDisplay.setTitle(text, { fadeInDuration: 0, stayDuration: STAY, fadeOutDuration: 0 });
  r.lastHud = state.visible || state.trial ? text : "";
  r.lastHudTick = t;
  r.hudDirty = false;
}

/** Shows a real title, pausing the HUD channel while it is on screen. */
export function showTitle(r: Runtime, title: RawMessage, subtitle: RawMessage | undefined, ticks: number): void {
  r.hudSuspendUntil = now() + ticks + 10;
  r.lastHud = "";
  r.player.onScreenDisplay.setTitle(title, { subtitle, fadeInDuration: 5, stayDuration: ticks, fadeOutDuration: 10 });
}

