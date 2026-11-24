// Testes funcionais com asserções (fluxos reais: compra de status, modos, menus)
import fs from "fs";
import * as mc from "./mc-mock.mjs";
import * as ui from "./ui-mock.mjs";
const BP = process.argv[2];
process.on("unhandledRejection", (e) => mc.erros.push("[promise] " + (e?.stack ?? e)));
await import(BP + "/scripts/all.js");
const start = fs.readFileSync(BP + "/functions/start.mcfunction", "utf8");
for (const m of start.matchAll(/scoreboard objectives add (\S+)/g)) { try { mc.world.scoreboard.addObjective(m[1]); } catch {} }
for (const o of ["tp", "chakra", "health_stats2", "health_stats3", "dano_stats", "tempo_doujutsu"]) { try { mc.world.scoreboard.addObjective(o); } catch {} }
mc.avancar(5);
let falhas = 0, ok = 0;
function afirmar(cond, msg) { if (cond) { ok++; console.log("  OK   " + msg); } else { falhas++; console.log("  FALHA " + msg); } }
const sc = (p, o) => mc.world.scoreboard.getObjective(o)?.getScore(p) ?? 0;
async function abrirMenu(p, item, sel) {
  ui.definirSelecao(sel);
  const ev = { source: p, itemStack: new mc.ItemStack(item), cancel: false };
  mc.disparar("before:itemUse", ev); mc.disparar("itemUse", ev);
  for (let i = 0; i < 6; i++) { mc.avancar(2); await new Promise((r) => setTimeout(r, 0)); }
}
// 1) compra de status com TP suficiente
const a = mc.novoJogador("Rico");
mc.world.scoreboard.getObjective("tp").setScore(a, 5000);
a.addTag("pergaminha_ninja_lock");
mc.efeitos.length = 0;
await abrirMenu(a, "tnt:menu_status_evoluir", 1);
afirmar(mc.efeitos.some((c) => c.startsWith("function status/vida/vida_status_1")), "Status Vida 1 comprado com TP suficiente");
afirmar(sc(a, "tp") === 4700, `TP debitado (5000 -> ${sc(a, "tp")})`);
// 2) compra sem TP suficiente
const b = mc.novoJogador("Pobre");
mc.world.scoreboard.getObjective("tp").setScore(b, 100);
b.addTag("pergaminha_ninja_lock");
mc.efeitos.length = 0;
await abrirMenu(b, "tnt:menu_status_evoluir", 1);
afirmar(mc.efeitos.some((c) => c.includes("Requer 300")), "Aviso de TP insuficiente exibido");
afirmar(!mc.efeitos.some((c) => c.includes("vida_status_1")) && sc(b, "tp") === 100, "Nada comprado sem TP");
// 3) ativar / desativar modo
const c = mc.novoJogador("Uchiha");
mc.efeitos.length = 0;
mc.disparar("scriptEventReceive", { id: "ativar:sharingan", sourceEntity: c, message: "" });
mc.avancar(3);
afirmar(mc.efeitos.some((x) => x.startsWith("replaceitem entity @s slot.hotbar 0 tnt:sharingan_skill_1")), "Sharingan coloca a habilidade no slot");
afirmar(sc(c, "health_stats2") === 10 && c.hasTag("modo_ativado"), `Sharingan aplica bonus/tag (vida+${sc(c, "health_stats2")})`);
mc.disparar("scriptEventReceive", { id: "desativar:sharingan", sourceEntity: c, message: "" });
mc.avancar(3);
afirmar(sc(c, "health_stats2") === 0 && !c.hasTag("modo_ativado"), "Desativar Sharingan remove bonus/tag");
// 4) modo expira sozinho
mc.disparar("scriptEventReceive", { id: "ativar:byakugan", sourceEntity: c, message: "" });
mc.avancar(20 * 200);
afirmar(!c.getDynamicProperty("mode:byakugan_active") && !c.hasTag("modo_ativado"), "Byakugan expira e limpa o estado");
// 5) varredura de todos os menus/opcoes com muito TP: nenhum erro e comandos sem barra
const d = mc.novoJogador("Explorador");
mc.world.scoreboard.getObjective("tp").setScore(d, 999999);
for (const t of ["pergaminha_ninja_lock", "vida_status_3", "forca_status_3", "chakra_status_3", "uchiha", "hyuga", "clan_uchiha", "clan_hyuga", "ninja_konoha"]) d.addTag(t);
// pre-requisitos: todas as tags "*_lock" citadas nos menus de desbloqueio
for (const f of ["all_modos_unlock.js", "uchiha_modos_unlock.js", "hyuga_modos_unlock.js"]) {
  const t = fs.readFileSync(BP + "/scripts/menu_destravar_modos/" + f, "utf8");
  for (const m of t.matchAll(/hasTag\("([\w]+_lock)"\)/g)) d.addTag(m[1]);
}
const menus = ["tnt:menu_all_modos", "tnt:menu_status_evoluir", "tnt:menu_jutsus_evoluir", "tnt:menu_all_modos_evoluir", "tnt:menu_custon", "tnt:menu_missao", "tnt:escolha_clan", "tnt:pergaminho_inicial", "tnt:menu_modos_uchiha", "tnt:menu_modos_hyuga", "tnt:menu_modos_uchiha_evoluir", "tnt:menu_modos_hyuga_evoluir"];
const tagsAntes = d.tags.size;
for (const m of menus) for (let s = 0; s < 22; s++) await abrirMenu(d, m, s);
const ganhas = [...d.tags].filter((t) => !t.endsWith("_lock")).length;
afirmar(mc.world.scoreboard.getObjective("tp").getScore(d) < 999999, `Menus de desbloqueio cobram TP (gasto: ${999999 - mc.world.scoreboard.getObjective("tp").getScore(d)})`);
console.log("     tags apos varredura:", [...d.tags].filter((t) => !t.endsWith("_lock")).slice(0, 40).join(", "));
const barra = mc.erros.concat(mc.silenciados).filter((e) => e.includes("barra inicial"));
afirmar(barra.length === 0, "Nenhum comando enviado com barra inicial");
const uniq = [...new Set(mc.erros.map((e) => e.split("\n").slice(0, 2).join(" | ")))];
afirmar(uniq.length === 0, `Sem erros de script (${uniq.length})`);
for (const e of uniq.slice(0, 15)) console.log("     -", e);
console.log(`\n${ok} ok, ${falhas} falhas`);
process.exit(falhas ? 1 : 0);
