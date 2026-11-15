// Modo de Teste das Etapas 4 a 6: covis e chefes (Ignaroth, Vaelith, Durgan), saltos de fase, montarias, o Dragão Jovem e Kar'Dum.
import { world, system, ItemStack } from "@minecraft/server";
import { NS, V, giveItem, health } from "../core/util.js";
import { allSites, getSite, TYPES } from "../structures/registry.js";
import { tryGenerate, lastGenerationInfo } from "../structures/generation.js";
import { rearmLair } from "../structures/lairs.js";
import { spawnDragon, DRAGON } from "../bosses/dragao.js";
import { spawnQueen, QUEEN } from "../bosses/rainha.js";
import { testMount, resetRecovery, MOUNTS, OSSO_ALFA } from "../mounts/mounts.js";
import { testEgg, testRush, testDragon } from "../mounts/dragon.js";
import { spawnKing, KING } from "../bosses/durgan.js";
import { buildNow as buildKarDum, openGate as openKarDum, rearm as rearmKarDum } from "../structures/kardum_run.js";
import { actions, testMenu } from "./teste.js";

const ICON = (id) => `textures/items/valdoria/${id}`;

function nearestBoss(player) {
  const list = player.dimension.getEntities({ location: player.location, maxDistance: 80 })
    .filter((e) => e.typeId === DRAGON || e.typeId === QUEEN || e.typeId === KING);
  return list.sort((a, b) => V.dist(a.location, player.location) - V.dist(b.location, player.location))[0];
}
function setHp(player, frac) {
  const b = nearestBoss(player);
  if (!b) return "§c[Teste] Nenhum chefe (Dragão, Rainha ou Durgan) a até 80 blocos.";
  const h = health(b);
  if (!h) return "§c[Teste] Chefe sem vida.";
  h.setCurrentValue(Math.max(2, h.effectiveMax * frac));
  return `§6[Teste] Vida do chefe ajustada para ${Math.round(frac * 100)}%. A troca de fase acontece no próximo turno dele.`;
}
async function gen(player, tipo) {
  player.onScreenDisplay.setActionBar(`§7Gerando ${TYPES[tipo].nome}...`);
  const rec = await tryGenerate(player, { tipo, front: true, ignoreRules: true });
  return rec ? `§6[Teste] ${rec.nome} gerado em ${rec.x} ${rec.y} ${rec.z}. Entre na arena para despertar o chefe.`
    : `§c[Teste] Não foi possível gerar: ${lastGenerationInfo()}`;
}
function nearestKarDum(player) {
  return allSites().filter((r) => r.tipo === "kardum" && r.dim === player.dimension.id)
    .sort((a, b) => V.dist2d(a, player.location) - V.dist2d(b, player.location))[0];
}
function ahead(player, d) {
  return V.add(player.location, V.mul(V.flat(player.getViewDirection()), d));
}

export async function bossesMenu(player) {
  return actions(player, "Chefes e montarias", "§7Ninho do Dragão, Santuário, Kar'Dum, Ignaroth, Vaelith, Durgan e as sete montarias.\n" +
    "§8Ative \"Criaturas te atacam no criativo\" em Criaturas e chefe para ser alvo dos chefes.", [
    ["Gerar Ninho do Dragão à frente", ICON("escama_dragao"), (p) => gen(p, "ninho")],
    ["Gerar Santuário do Véu Negro à frente", ICON("veu_sombrio"), (p) => gen(p, "santuario")],
    ["Invocar Ignaroth (desce do céu à frente)", ICON("coracao_dragao"), (p) => {
      spawnDragon(p.dimension, ahead(p, 14), `teste${system.currentTick}`);
      return "§6[Teste] Ignaroth está descendo.";
    }],
    ["Invocar Vaelith à frente", ICON("coroa_veu"), (p) => {
      spawnQueen(p.dimension, ahead(p, 8), `teste${system.currentTick}`);
      return "§6[Teste] Vaelith despertou.";
    }],
    ["Chefe próximo: ir para a fase II (65%; Durgan: use 32%)", ICON("pedra_aprimoramento"), (p) => setHp(p, 0.65)],
    ["Chefe próximo: ir para a fase III (32%)", ICON("pedra_aprimoramento"), (p) => setHp(p, 0.32)],
    ["Chefe próximo: derrotar", ICON("runa_luz"), (p) => {
      const b = nearestBoss(p);
      if (!b) return "§c[Teste] Nenhum chefe por perto.";
      try { b.applyDamage(99999); } catch { /* */ }
      return "§6[Teste] Golpe final aplicado.";
    }],
    ["Covis próximos: chefe volta agora", ICON("mapa_explorador"), (p) => {
      let n = 0;
      for (const rec of allSites()) {
        if ((rec.tipo !== "ninho" && rec.tipo !== "santuario") || V.dist2d(rec, p.location) > 200) continue;
        rearmLair(world.getDimension(rec.dim), getSite(rec.id) || rec);
        n++;
      }
      return `§6[Teste] ${n} covil(is) rearmado(s).`;
    }],
    ["Receber Corcel de Guerra (com Escritura)", ICON("escritura_cavalo"), (p) => {
      testMount(p, "cavalo");
      return "§6[Teste] Corcel gerado e vinculado. Agache + interaja para comandos; montado, use a Escritura para a Investida.";
    }],
    ["Receber Lobo Gigante domado (com Apito)", ICON("apito_lobo"), (p) => {
      testMount(p, "lobo");
      return "§6[Teste] Lobo gerado e vinculado. Pular montado = bote; o Apito montado = Uivo do Alfa.";
    }],
    ["Lobo Gigante selvagem + 3 Ossos do Alfa", ICON("osso_alfa"), (p) => {
      p.dimension.spawnEntity(MOUNTS.lobo.id, ahead(p, 5));
      giveItem(p, new ItemStack(OSSO_ALFA, 3));
      return "§6[Teste] Lobo selvagem gerado. Interaja segurando o osso (30% por tentativa).";
    }],
    ["Receber Grifo domado (com Pena Dourada)", ICON("pena_dourada"), (p) => {
      testMount(p, "grifo");
      return "§6[Teste] Grifo vinculado. Monte, olhe para onde quer ir e ande; segure pular para subir.";
    }],
    ["Receber Unicórnio, Urso de Guerra e Alce domados", ICON("sino_prata"), (p) => {
      for (const t of ["unicornio", "urso", "alce"]) testMount(p, t);
      return "§6[Teste] Três montarias vinculadas (e seus itens de vínculo).";
    }],
    ["Selvagens (alce, urso, unicórnio, grifo) + itens de domar", ICON("redea_celeste"), (p) => {
      let i = 0;
      for (const t of ["alce", "urso", "unicornio", "grifo"]) {
        p.dimension.spawnEntity(MOUNTS[t].id, V.add(ahead(p, 6), { x: (i++ - 1.5) * 3, y: 0, z: 0 }));
        giveItem(p, new ItemStack(MOUNTS[t].domar.item, 4));
      }
      return "§6[Teste] Selvagens gerados com 4 itens de domar de cada (frutas, mel, maçã dourada, rédea).";
    }],
    ["Gerar Ninho de Grifo à frente", ICON("pena_grifo"), (p) => gen(p, "ninho_grifo")],
    ["Zerar recuperação e recargas das montarias", ICON("pocao_energia"), (p) => {
      resetRecovery(p);
      return "§6[Teste] Montarias prontas para serem chamadas.";
    }],
    ["Itens dos chefes (escamas, véu, relíquias)", ICON("veu_sombrio"), (p) => {
      for (const [id, n] of [["escama_dragao", 8], ["veu_sombrio", 8], ["coracao_dragao", 1], ["coroa_veu", 1], ["cetro_vaelith", 1]]) {
        giveItem(p, new ItemStack(`${NS}:${id}`, Number(n)));
      }
      return "§6[Teste] Itens entregues.";
    }],
    // ---- Etapa 6
    ["Receber Ovo de Ignaroth + fogueira", ICON("ovo_ignaroth"), (p) => {
      testEgg(p);
      return "§6[Teste] Coloque a fogueira, depois o ovo a até 3 blocos dela (use o ovo olhando para o chão).";
    }],
    ["Ovos e filhote próximos: chocar e crescer já", ICON("ovo_ignaroth"), (p) => {
      const n = testRush(p);
      return n ? "§6[Teste] Ovos a 100% (chocam em 1 s com você perto); filhote a 99%: dê uma carne para ele crescer."
        : "§7[Teste] Nenhum ovo a até 32 blocos e nenhum filhote ligado a você.";
    }],
    ["Receber Dragão Jovem filhote (com Talismã)", ICON("talisma_dragao"), (p) => {
      testDragon(p, false);
      return "§6[Teste] Filhote vinculado. Dê carne assada para ele crescer; agache + interaja para ver o crescimento.";
    }],
    ["Receber Dragão Jovem adulto (com Talismã)", ICON("talisma_dragao"), (p) => {
      testDragon(p, true);
      return "§6[Teste] Dragão adulto vinculado. Monte, olhe para onde quer ir e ande; segure pular para subir; Talismã = Sopro.";
    }],
    ["Gerar Ruínas de Kar'Dum à frente (com os salões)", ICON("engrenagem_runica"), async (p) => {
      p.onScreenDisplay.setActionBar("§7Gerando Ruínas de Kar'Dum...");
      const rec = await tryGenerate(p, { tipo: "kardum", front: true, ignoreRules: true });
      if (!rec) return `§c[Teste] Não foi possível gerar: ${lastGenerationInfo()}`;
      const done = await buildKarDum(rec);
      return done ? `§6[Teste] Kar'Dum gerado em ${rec.x} ${rec.y} ${rec.z}, com os salões construídos.`
        : `§6[Teste] Kar'Dum gerado em ${rec.x} ${rec.y} ${rec.z}. Os salões serão construídos quando você se aproximar.`;
    }],
    ["Kar'Dum próximo: abrir o Portão Rúnico", ICON("engrenagem_runica"), async (p) => {
      const rec = nearestKarDum(p);
      if (!rec) return "§7[Teste] Nenhuma Kar'Dum no mundo.";
      if (rec.m?.a !== 2) await buildKarDum(rec);
      if (rec.m?.a !== 2) return "§c[Teste] A área ainda não está carregada; aproxime-se.";
      openKarDum(p.dimension, rec, p);
      return "§6[Teste] Portão Rúnico aberto.";
    }],
    ["Invocar Durgan à frente", ICON("martelo_durgan"), (p) => {
      spawnKing(p.dimension, ahead(p, 7), `teste${system.currentTick}`);
      return "§6[Teste] Durgan despertou.";
    }],
    ["Kar'Dum próximo: reiniciar (runas, portão, rei)", ICON("martelo_durgan"), (p) => {
      const rec = nearestKarDum(p);
      if (!rec) return "§7[Teste] Nenhuma Kar'Dum no mundo.";
      rearmKarDum(p.dimension, getSite(rec.id) || rec);
      return "§6[Teste] Kar'Dum reiniciada.";
    }],
  ], testMenu);
}
