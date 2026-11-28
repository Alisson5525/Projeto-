// Slash commands (Java: /jjk level|rct grant|reset, /jjk_menu_xp).
import {
  CommandPermissionLevel,
  type CustomCommandOrigin,
  CustomCommandParamType,
  CustomCommandStatus,
  type Player,
  type StartupEvent,
  system,
} from "@minecraft/server";
import { defaultProfile } from "../core/profile";
import { LEVEL_CAP } from "../core/constants";
import { refreshAttributes } from "./attributes";
import { leaveCombat } from "./combatMode";
import { K, tr } from "./i18n";
import { openMainMenu } from "./menu/menus";
import { resetRuntime, rt, saveProfile } from "./players";
import { grantLimitless, offerTechnique } from "./techniqueSelect";
import { grantXp } from "./xp";

function playerOf(origin: CustomCommandOrigin): Player | undefined {
  const e = origin.sourceEntity ?? origin.initiator;
  return e?.typeId === "minecraft:player" ? (e as Player) : undefined;
}

const ok = { status: CustomCommandStatus.Success };
const fail = { status: CustomCommandStatus.Failure, message: "Players only" };

export function registerCommands(init: StartupEvent): void {
  const reg = init.customCommandRegistry;
  reg.registerCommand(
    { name: "jjk:menu", description: "Abre o Menu Jujutsu", permissionLevel: CommandPermissionLevel.Any, cheatsRequired: false },
    (origin) => {
      const p = playerOf(origin);
      if (!p) return fail;
      system.run(() => {
        if (rt(p).profile.technique === "none") void offerTechnique(p);
        else void openMainMenu(p);
      });
      return ok;
    },
  );
  // Always works, even if menus cannot open on the device (no cheats needed).
  reg.registerCommand(
    { name: "jjk:escolher", description: "Escolhe a técnica Ilimitado", permissionLevel: CommandPermissionLevel.Any, cheatsRequired: false },
    (origin) => {
      const p = playerOf(origin);
      if (!p) return fail;
      system.run(() => {
        if (!grantLimitless(p)) p.sendMessage(tr(K.chooseAlready));
      });
      return ok;
    },
  );
  reg.registerCommand(
    {
      name: "jjk:level",
      description: "Define o nível Jujutsu (0-100)",
      permissionLevel: CommandPermissionLevel.GameDirectors,
      cheatsRequired: true,
      mandatoryParameters: [{ name: "value", type: CustomCommandParamType.Integer }],
    },
    (origin, value: number) => {
      const p = playerOf(origin);
      if (!p) return fail;
      system.run(() => {
        const r = rt(p);
        r.profile = { ...r.profile, level: Math.max(0, Math.min(LEVEL_CAP, Math.trunc(value))), xp: 0 };
        saveProfile(r);
        refreshAttributes(r);
        p.sendMessage(tr(K.cmdLevel, r.profile.level));
      });
      return ok;
    },
  );
  reg.registerCommand(
    {
      name: "jjk:xp",
      description: "Concede XP Jujutsu",
      permissionLevel: CommandPermissionLevel.GameDirectors,
      cheatsRequired: true,
      mandatoryParameters: [{ name: "amount", type: CustomCommandParamType.Integer }],
    },
    (origin, amount: number) => {
      const p = playerOf(origin);
      if (!p) return fail;
      system.run(() => {
        grantXp(rt(p), Math.max(1, Math.min(1_000_000, Math.trunc(amount))), true);
        p.sendMessage(tr(K.cmdXp, amount));
      });
      return ok;
    },
  );
  reg.registerCommand(
    { name: "jjk:rct", description: "Concede a Técnica Reversa", permissionLevel: CommandPermissionLevel.GameDirectors, cheatsRequired: true },
    (origin) => {
      const p = playerOf(origin);
      if (!p) return fail;
      system.run(() => {
        const r = rt(p);
        r.profile = { ...r.profile, rct: true };
        saveProfile(r);
        p.sendMessage(tr(K.cmdRct));
      });
      return ok;
    },
  );
  reg.registerCommand(
    { name: "jjk:reset", description: "Reinicia o perfil Jujutsu", permissionLevel: CommandPermissionLevel.GameDirectors, cheatsRequired: true },
    (origin) => {
      const p = playerOf(origin);
      if (!p) return fail;
      system.run(() => {
        leaveCombat(rt(p), true);
        const r = resetRuntime(p);
        r.profile = { ...defaultProfile(), settings: r.profile.settings };
        saveProfile(r);
        refreshAttributes(r);
        p.sendMessage(tr(K.cmdReset));
      });
      return ok;
    },
  );
}
