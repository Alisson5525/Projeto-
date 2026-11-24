import * as mc from "./mc-mock.mjs";
import * as ui from "./ui-mock.mjs";
const raiz = process.argv[2];
process.on("unhandledRejection", (e) => mc.erros.push("[promise] " + (e?.stack ?? e)));
await import(raiz + "/scripts/all.js");
console.log("inscricoes:", JSON.stringify(mc.inscritos()));
const p = mc.novoJogador("Tester");
const p2 = mc.novoJogador("Amigo");
for (const o of ["chakra", "tp", "tempo_doujutsu", "dano_stats", "health_stats2"]) { try { mc.world.scoreboard.addObjective(o); } catch {} }
mc.world.scoreboard.getObjective("tp").setScore(p, 5000);
mc.world.scoreboard.getObjective("chakra").setScore(p, 100);
mc.disparar("playerSpawn", { player: p, initialSpawn: true });
mc.disparar("playerJoin", { playerId: p.id, playerName: p.name });
mc.avancar(60);
// modos
for (const m of ["sharingan", "mgk_itachi", "susanoo_2_obito", "portao_8", "rikudou_kurama"]) {
  mc.disparar("scriptEventReceive", { id: "ativar:" + m, sourceEntity: p, message: "" });
  mc.avancar(40);
  mc.disparar("scriptEventReceive", { id: "desativar:" + m, sourceEntity: p, message: "" });
  mc.avancar(5);
}
// relog com modo ativo
mc.disparar("scriptEventReceive", { id: "ativar:sharingan", sourceEntity: p, message: "" });
mc.avancar(5);
mc.disparar("playerSpawn", { player: p, initialSpawn: true });
mc.avancar(5);
console.log("modo sharingan ativo apos relog:", p.getDynamicProperty("mode:sharingan_active"));
// itens de menu
for (const it of ["tnt:menu_all_modos", "tnt:menu_status_evoluir", "tnt:menu_jutsus_evoluir", "tnt:menu_all_modos_evoluir", "tnt:menu_custon", "tnt:menu_missao", "tnt:escolha_clan", "tnt:pergaminho_inicial", "tnt:menu_modos_uchiha", "tnt:menu_modos_hyuga", "tnt:menu_modos_uchiha_evoluir", "tnt:menu_modos_hyuga_evoluir", "tnt:ns_bomba_fumaca"]) {
  for (const sel of [0, 1, 3, 7]) {
    ui.definirSelecao(sel);
    const ev = { source: p, itemStack: new mc.ItemStack(it), cancel: false };
    mc.disparar("before:itemUse", ev);
    mc.disparar("itemUse", ev);
    mc.avancar(4);
    await new Promise((r) => setTimeout(r, 0));
    mc.avancar(4);
  }
}
// chefes e combate
const dim = mc.dims.overworld;
for (const t of ["tnt:itachi_c", "tnt:kisame_c", "tnt:zabuza", "tnt:neji_c", "tnt:kakashi_sinos", "tnt:orochimaru_miss_c", "tnt:gaara_c", "tnt:shukaku_biju", "tnt:kurama_biju", "tnt:anbu_boss", "tnt:espadachin_ss", "tnt:ninja_folha_b"]) {
  const b = dim.spawnEntity(t, { x: 14, y: 70, z: 14 });
  b.hp.effectiveMax = 1000; b.hp.currentValue = 1000;
  for (let i = 0; i < 30; i++) {
    b.hp.currentValue -= 30;
    mc.disparar("entityHitEntity", { damagingEntity: p, hitEntity: b });
    mc.disparar("entityHurt", { hurtEntity: b, damage: 30, damageSource: { damagingEntity: p, cause: "entityAttack" } });
    mc.avancar(15);
  }
  mc.avancar(200);
  b.hp.currentValue = 0;
  mc.disparar("entityDie", { deadEntity: b, damageSource: { damagingEntity: p, cause: "entityAttack" } });
  b.isValid = false;
  mc.avancar(20);
}
// morte do jogador, scriptevents diversos
mc.disparar("entityDie", { deadEntity: p, damageSource: { cause: "fall" } });
for (const id of ["ns:config", "tnt:tenseigan_orb", "tnt:skill_2_kurama_1", "tnt:bola_fogo", "npc:guy", "npc:iruka", "npc:jiraiya", "npc:orochimaru", "npc:tsunade", "ns:perfil", "ns:viagem", "ns:myoboku"]) {
  mc.disparar("scriptEventReceive", { id, sourceEntity: p, message: "" });
  mc.avancar(10);
}
mc.disparar("playerLeave", { playerId: p2.id, playerName: p2.name });
mc.avancar(2400);
await new Promise((r) => setTimeout(r, 10));
const sons = new Set(mc.log.filter((l) => l[0] === "sound" || l[0] === "psound").map((l) => l[1]));
const anims = new Set(mc.log.filter((l) => l[0] === "anim").map((l) => l[1]));
console.log("sons tocados:", [...sons].filter((s) => s.startsWith("ns.")).join(", "));
console.log("animacoes:", [...anims].join(", "));
console.log("comandos executados:", mc.log.filter((l) => l[0] === "cmd").length, "| particulas:", mc.log.filter((l) => l[0] === "particle").length);
const uniq = [...new Set(mc.erros.map((e) => e.split("\n").slice(0, 3).join(" | ")))];
console.log("ERROS:", mc.erros.length, "unicos:", uniq.length);
for (const e of uniq.slice(0, 40)) console.log(" -", e);

const sil = [...new Set(mc.silenciados.map((e) => e.replace(/:\d+:\d+\)?$/, "")))];
console.log("SILENCIADOS unicos:", sil.length);
for (const e of sil.slice(0, 60)) console.log(" ~", e.replace(/file:.*?scripts\//, ""));
