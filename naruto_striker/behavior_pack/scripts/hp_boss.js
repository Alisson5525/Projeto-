import * as mc from "@minecraft/server";

const dimension = mc.world.getDimension("overworld");

// 📦 CONFIG DAS ENTIDADES
const ENTITY_NAMES = {
  "tnt:espadachin_s": "§6#S. §f> Espadachin",
  "tnt:espadachin_ss": "§d#SS. §f> Espadachin",
  "tnt:anbu": "§eRank A. §f> Anbu",
  "tnt:dummy": "§cDUMMY",
  "tnt:uchiha_b": "§a#B. §f> Uchiha",
  "tnt:uchiha_s": "§a#S. §f> Uchiha",
  "tnt:zetsu_branco": "§a#B. §f> Zetsu Branco",
  "tnt:gaara_c": "§b#S. §f> Gaara",
  "tnt:gaara_c_manto_1": "§cberserk #1. §f> Gaara",
  "tnt:gaara_c_manto_2": "§cberserk #2. §f> Gaara",
  "tnt:ninja_folha_b": "§a#B. §f> Ninja da Folha",
  "tnt:ninja_folha_s": "§b#S. §f> Ninja da Folha",
  "tnt:ninja_areia_b": "§a#B. §f> Ninja da Areia",
  "tnt:ninja_areia_s": "§b#S. §f> Ninja da Areia",
  "tnt:kakashi_sinos": "§eRank D. §f> Kakashi",
  "tnt:anbu_basico": "§eRank C. §f> Anbu",
  "tnt:anbu_boss": "§eRank B. §f> Anbu",
  "tnt:zabuza": "§eRank A. §f> Zabuza",
  "tnt:bandidos_rank_c": "§fBandidos §f> §eRank C.",
  "tnt:bandidos_rank_a": "§fBandidos §f> §eRank A.",
  "tnt:orochimaru_npc": "§aMentor §f> §fOrochimaru",
  "tnt:anbu_ladrao_a": "§fLadrão §f> §eRank A.",
  "tnt:anbu_ladrao_c": "§fLadrão §f> §eRank C.",
  "tnt:orochimaru_miss_c": "§fOrochimaru §f> §aMissão.",
  "tnt:neji_c": "§eNeji §f> §aMissão.",
  "tnt:itachi_c": "§eItachi §f> §aMissão.",
  "tnt:kisame_c": "§eKisame §f> §aMissão."
};

// 🏷️ entidades sem HP
const STATIC_NAMES = {
  "tnt:uchiha_morte_s": "§c[!].§fcoletar sharingan\n§c%100\n§l⬇",
  "tnt:uchiha_morte_b": "§c[!].§fcoletar sharingan\n§c%30\n§l⬇",
  "tnt:iruka": "§aInstrutor §f> §eiruka",
  "tnt:tsunade_hokage": "§eTsunade",
  "tnt:guy_npc_ex": "§aMentor §f> §eGuy§f <",
  "tnt:jiraiya_npc_ex": "§aMentor §f> §eJiraiya§f <",
  "tnt:teuchi": "§aVendedor: §eTeuchi"
};

// 🔄 Atualiza entidades
mc.system.runInterval(() => {

  const entities = dimension.getEntities({
    excludeFamilies: ["inanimate"],
    excludeTypes: ["item", "xp_orb"]
  });

  for (const entity of entities) {

    // 🏷️ nomes estáticos
    if (STATIC_NAMES[entity.typeId]) {

      const tag = STATIC_NAMES[entity.typeId];

      if (entity.nameTag !== tag) {
        entity.nameTag = tag;
      }

      continue;
    }

    // ❤️ entidades com HP
    const baseName = ENTITY_NAMES[entity.typeId];
    if (!baseName) continue;

    const health = entity.getComponent("health");
    if (!health) continue;

    const hp = Math.floor(health.currentValue);
    const hpMax = Math.floor(health.effectiveMax);

    const newTag = `${baseName}\n§fHp: §c${hp}/${hpMax}§r`;

    // ✅ só atualiza se mudou
    if (entity.nameTag !== newTag) {
      entity.nameTag = newTag;
    }
  }

}, 20); // 1 segundo

// 🎯 Actionbar dos instrutores
mc.system.runInterval(() => {

  for (const player of mc.world.getPlayers()) {

    if (!player.hasTag("mission.guilda")) continue;
    if (player.hasTag("instrutor.guilda")) continue;

    const instrutor = dimension.getEntities({
      type: "tnt:npc_instrutor",
      location: player.location,
      closest: 1,
      maxDistance: 30
    });

    for (const instr of instrutor) {

      const distance = Math.floor(getDistance(
        player.location,
        instr.location
      ));

      player.onScreenDisplay.setActionBar(
        `§cInstrutor §f- §a${distance}m`
      );
    }
  }

}, 10);

// 📏 distância
function getDistance(pos1, pos2) {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  const dz = pos1.z - pos2.z;

  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}