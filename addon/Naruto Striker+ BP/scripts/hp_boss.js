import * as mc from "@minecraft/server";

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

// barra de vida colorida (verde -> amarelo -> vermelho)
function nomeComVida(baseName, hp, hpMax) {
  const r = hpMax > 0 ? Math.max(0, Math.min(1, hp / hpMax)) : 0;
  const cor = r > 0.6 ? "§a" : r > 0.3 ? "§e" : "§c";
  const n = Math.round(r * 20);
  return `${baseName}\n${cor}${"|".repeat(n)}§8${"|".repeat(20 - n)} §f${hp}§7/§f${hpMax}§r`;
}

// atualiza a barra na hora em que a entidade toma dano (antes so a cada 1s)
mc.world.afterEvents.entityHurt.subscribe((ev) => {
  try {
    const entity = ev.hurtEntity;
    if (!entity || !entity.isValid) return;
    const baseName = ENTITY_NAMES[entity.typeId] ? (entity.hasTag("ns_elite") ? "§6§l[ELITE]§r " : "") + ENTITY_NAMES[entity.typeId] : undefined;
    if (!baseName) return;
    const health = entity.getComponent("health");
    if (!health) return;
    const tag = nomeComVida(baseName, Math.max(0, Math.floor(health.currentValue)), Math.floor(health.effectiveMax));
    if (entity.nameTag !== tag) entity.nameTag = tag;
  } catch (e) {}
});

const TIPOS_COM_NOME = [...new Set([...Object.keys(ENTITY_NAMES), ...Object.keys(STATIC_NAMES)])];

// 🔄 Atualiza entidades
mc.system.runInterval(() => {

  // busca so os tipos que tem nome/barra (antes: TODAS as entidades do overworld a cada 1s)
  // e em todas as dimensoes (chefes no End/Nether tambem ganham a barra)
  const entities = [];
  for (const dimId of ["overworld", "nether", "the_end"]) {
    let dim;
    try { dim = mc.world.getDimension(dimId); } catch { continue; }
    for (const type of TIPOS_COM_NOME) {
      try { for (const e of dim.getEntities({ type })) entities.push(e); } catch {}
    }
  }

  for (const entity of entities) {
    try {

    // 🏷️ nomes estáticos
    if (STATIC_NAMES[entity.typeId]) {

      const tag = STATIC_NAMES[entity.typeId];

      if (entity.nameTag !== tag) {
        entity.nameTag = tag;
      }

      continue;
    }

    // ❤️ entidades com HP
    const baseName = ENTITY_NAMES[entity.typeId] ? (entity.hasTag("ns_elite") ? "§6§l[ELITE]§r " : "") + ENTITY_NAMES[entity.typeId] : undefined;
    if (!baseName) continue;

    const health = entity.getComponent("health");
    if (!health) continue;

    const hp = Math.floor(health.currentValue);
    const hpMax = Math.floor(health.effectiveMax);

    const newTag = nomeComVida(baseName, hp, hpMax);

    // ✅ só atualiza se mudou
    if (entity.nameTag !== newTag) {
      entity.nameTag = newTag;
    }
    } catch (e) {}
  }

}, 20); // 1 segundo

// (removido: "actionbar dos instrutores" procurava a entidade inexistente "tnt:npc_instrutor"
//  para jogadores com a tag "mission.guilda", que nenhum sistema do add-on define.)
