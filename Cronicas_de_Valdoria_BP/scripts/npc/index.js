// Ponto de entrada dos NPCs: tipos de estrutura "vila", "capital" (capital.js) e "aelthar" (aelthar.js), moradores, economia, diálogos, missões, guilda e defesa.
import { world } from "@minecraft/server";
import { registerType } from "../structures/registry.js";
import { VILLAGE } from "../structures/village.js";
import { residentsFromPlan, spawnResident, startResidents } from "./residents.js";
import { startEconomy } from "./economy.js";
import { startDialogue } from "./dialogue.js";
import { startMissions } from "./missions.js";
import { startGuild } from "./guild.js";
import { startDefense } from "./defense.js";
import { startCapital } from "./capital.js";
import { startAelthar } from "./aelthar.js";

VILLAGE.afterBuild = (rec, plan) => {
  rec.m = { moradores: residentsFromPlan(rec, plan), forasteiro: plan.marks.forasteiro?.[0], ataque: plan.marks.ataque || [], ultimoAtaque: -99 };
  const dim = world.getDimension(rec.dim);
  for (const m of rec.m.moradores) spawnResident(dim, rec, m);
  for (const pos of plan.marks.cavalo || []) {
    try {
      dim.spawnEntity("minecraft:horse", { x: pos.x + 0.5, y: pos.y, z: pos.z + 0.5 }, { initialPersistence: true });
    } catch { /* */ }
  }
};
registerType(VILLAGE);

export function startNpcs() {
  startEconomy();
  startResidents();
  startDialogue();
  startMissions();
  startGuild();
  startDefense();
  startCapital();
  startAelthar();
}
