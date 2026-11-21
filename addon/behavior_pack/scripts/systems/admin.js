import { system, world } from "@minecraft/server";
import { TAG } from "../core/config.js";
import { getFaction, setLevel, setBlood, getLevel, setWolfTier, syncWolfTier, setNum } from "../core/data.js";
import { safe, msg, DEBUG } from "../core/util.js";
import { become, cure, infect, clearInfection } from "./factions.js";
import { SKILLS, grantSkill } from "./skills.js";
import { forceBloodMoon } from "./world_events.js";

// Admin / map-maker commands:  /scriptevent vc:<command> [args]
//   vc:become vampire|werewolf|hunter     vc:cure
//   vc:level <1-10>                        vc:blood <0-20>
//   vc:skills all                          vc:infect vampire|werewolf|hunter
//   vc:bloodmoon on|off                    vc:debug on|off
const COMMANDS = {
  become: (p, a) => become(p, a[0]),
  cure: (p) => cure(p),
  level: (p, a) => {
    setLevel(p, Number(a[0]) || 1);
    setNum(p, "vc:xp", 0);
    if (getFaction(p) === "werewolf") {
      setWolfTier(p, 1);
      syncWolfTier(p);
    }
  },
  blood: (p, a) => setBlood(p, Number(a[0]) || 0),
  skills: (p) => {
    const f = getFaction(p);
    for (const s of SKILLS[f] || []) grantSkill(p, s.id, f);
  },
  infect: (p, a) => infect(p, a[0]),
  stopinfect: (p) => clearInfection(p),
  bloodmoon: (_p, a) => forceBloodMoon(a[0] !== "off"),
  debug: (_p, a) => {
    DEBUG.on = a[0] !== "off";
  },
};

system.afterEvents.scriptEventReceive.subscribe((e) => {
  if (!e.id.startsWith("vc:")) return;
  const cmd = e.id.slice(3);
  const args = (e.message || "").trim().split(/\s+/).filter(Boolean);
  const fn = COMMANDS[cmd];
  if (!fn) return;
  const targets = e.sourceEntity?.typeId === "minecraft:player" ? [e.sourceEntity] : world.getAllPlayers().filter((p) => p.hasTag(TAG.ADMIN));
  for (const p of targets) {
    safe(() => {
      fn(p, args);
      msg(p, "vc.admin.done", `${cmd} ${args.join(" ")}`.trim(), getFaction(p), getLevel(p));
    }, "scriptevent " + cmd);
  }
});
