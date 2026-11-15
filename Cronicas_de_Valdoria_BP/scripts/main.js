// Crônicas de Valdoria - ponto de entrada dos scripts.
// Organização: core (dados, dano, efeitos) · rpg (atributos, progressão, passivas) · abilities (motor, raças, classes)
// · magic (feitiços) · combat (armas) · items (equipamentos, uso) · creatures/bosses (IA) · quests · structures · npc · ui.
import { world, system, CommandPermissionLevel, CustomCommandStatus, CustomCommandParamType } from "@minecraft/server";
import "./data/items_explore.js"; // mescla os itens de exploração em ITEM_DATA antes de qualquer tabela de saque
import { startStore } from "./core/store.js";
import { startDamage } from "./core/damage.js";
import { startEngine } from "./abilities/engine.js";
import "./abilities/racial.js";
import "./abilities/class.js";
import "./magic/spells.js";
import { startReactions } from "./magic/reactions.js";
import { startWeapons } from "./combat/weapons.js";
import { startArchery } from "./combat/archery.js";
import { startProgression, setAbilityLine, addXP } from "./rpg/progression.js";
import { startPassives } from "./rpg/passives.js";
import { hudAbilityLine } from "./abilities/selection.js";
import { startEquipment } from "./items/equipment.js";
import { startItemUse } from "./items/use.js";
import { startCreatures } from "./creatures/ai.js";
import { startTactics } from "./creatures/tactics.js";
import { startBoss } from "./bosses/tita.js";
import { startLich } from "./bosses/senhor_mortos.js";
import { startDragon } from "./bosses/dragao.js";
import { startQueen } from "./bosses/rainha.js";
import { startMounts } from "./mounts/mounts.js";
import { startDragonEggs } from "./mounts/dragon.js";
import { startKing } from "./bosses/durgan.js";
import { startMorthil } from "./bosses/morthil.js";
import { startCompanions } from "./companions/companions.js";
import { startAzrakar } from "./bosses/azrakar.js";
import { startShadowCreatures } from "./creatures/sombrios.js";
import { startAuriel } from "./bosses/auriel.js";
import { startCelestialCreatures } from "./creatures/celestes.js";
import { startStructures } from "./structures/index.js";
import { startExploration } from "./exploration/index.js";
import { startPosture } from "./bosses/postura.js";
import { startSpecs } from "./rpg/specs.js";
import { startNpcs } from "./npc/index.js";
import { startQuests } from "./quests/quests.js";
import { openMainMenu } from "./ui/menus.js";
import { testMenu } from "./ui/teste.js";

system.beforeEvents.startup.subscribe((ev) => {
  const reg = ev.customCommandRegistry;
  reg.registerCommand({ name: "valdoria:diario", description: "Abre o Diário do Aventureiro (Crônicas de Valdoria)",
    permissionLevel: CommandPermissionLevel.Any, cheatsRequired: false }, (origin) => {
    const p = origin.sourceEntity;
    if (!p || p.typeId !== "minecraft:player") return { status: CustomCommandStatus.Failure, message: "Use como jogador." };
    system.run(() => openMainMenu(/** @type {any} */ (p)));
    return { status: CustomCommandStatus.Success };
  });
  reg.registerCommand({ name: "valdoria:teste", description: "Abre o Modo de Teste (criativo ou operador)",
    permissionLevel: CommandPermissionLevel.Any, cheatsRequired: false }, (origin) => {
    const p = origin.sourceEntity;
    if (!p || p.typeId !== "minecraft:player") return { status: CustomCommandStatus.Failure, message: "Use como jogador." };
    system.run(() => testMenu(/** @type {any} */ (p)));
    return { status: CustomCommandStatus.Success };
  });
  reg.registerCommand({ name: "valdoria:xp", description: "[Teste] Concede experiência ao executor",
    permissionLevel: CommandPermissionLevel.GameDirectors, cheatsRequired: true,
    mandatoryParameters: [{ name: "quantidade", type: CustomCommandParamType.Integer }] }, (origin, amount) => {
    const p = origin.sourceEntity;
    if (!p || p.typeId !== "minecraft:player") return { status: CustomCommandStatus.Failure, message: "Use como jogador." };
    system.run(() => addXP(/** @type {any} */ (p), Number(amount), "comando"));
    return { status: CustomCommandStatus.Success, message: `+${amount} XP` };
  });
});

let started = false;
function start() {
  if (started) return;
  started = true;
  startStore();
  startDamage();
  startReactions();
  startEngine();
  startWeapons();
  startArchery();
  startProgression();
  setAbilityLine(hudAbilityLine);
  startPassives();
  startEquipment();
  startItemUse();
  startCreatures();
  startTactics();
  startBoss();
  startLich();
  startDragon();
  startQueen();
  startKing();
  startMorthil();
  startCompanions();
  startAzrakar();
  startShadowCreatures();
  startAuriel();
  startCelestialCreatures();
  startMounts();
  startDragonEggs();
  startQuests();
  startStructures();
  startExploration();
  startSpecs(); // mecânicas das especializações (antes da postura, que vê o dano já modificado)
  startPosture(); // depois de todos os chefes: o gancho de postura vê o dano já com as imunidades aplicadas
  startNpcs();
  console.info("[Valdoria] Crônicas de Valdoria v2.3.0 (Edição Definitiva) carregado.");
}

world.afterEvents.worldLoad.subscribe(start);
