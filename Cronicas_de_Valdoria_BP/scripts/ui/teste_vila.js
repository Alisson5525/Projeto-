// Modo de Teste: vilas, moradores, economia, reputação, guilda, missões dos moradores e ataques.
import { system, ItemStack } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { NS, V, giveItem } from "../core/util.js";
import { particle } from "../core/fx.js";
import { markDirty } from "../core/store.js";
import { nearestSite, TYPES } from "../structures/registry.js";
import { tryGenerate, lastGenerationInfo } from "../structures/generation.js";
import { ROLES, OFICIO, npcTag } from "../npc/roles.js";
import { npcData, addCoins, show } from "../npc/economy.js";
import { respawnAll } from "../npc/residents.js";
import { NPC_QUESTS } from "../npc/missions.js";
import { startRaid } from "../npc/defense.js";
import { actions, testMenu } from "./teste.js";
import { buildAllLoaded, royal, completeRoyal, PROVAS, SELO } from "../npc/capital.js";
import { breakAllForTest, wakeAzrakarForTest, rearm as rearmNyxhal, layout as nyxLayout } from "../structures/nyxhal_run.js";
import { oathsForTest, wakeAurielForTest, rearm as rearmCeleste, layout as celLayout, windStone } from "../structures/celeste_run.js";
import { COMPANIONS, recruit, activeOf, getBond, addCompanionXP, xpNeed } from "../companions/companions.js";
import { purifyAllForTest, wakeMorthilForTest, rearm as rearmAelthar, ORVALHO, layout as aeltharLayout } from "../npc/aelthar.js";
import { setFlag } from "../quests/quests.js";

const ICON = (id) => `textures/items/valdoria/${id}`;

function nearestVillage(player) {
  return nearestSite(player.location, player.dimension.id, (r) => r.tipo === "vila" && r.estado !== "construindo")?.rec;
}

async function setRep(player) {
  const d = npcData(player);
  const r = await show(player, new ModalFormData().title("Reputação").slider("Reputação com o Reino de Valdoria", -100, 600,
    { valueStep: 10, defaultValue: Math.max(-100, Math.min(600, d.rep)) }));
  if (r.canceled || !r.formValues) return undefined;
  d.rep = Number(r.formValues[0]);
  markDirty(player);
  return `§6[Teste] Reputação: ${d.rep}.`;
}

/** Cumpre os objetivos das missões ativas dos moradores (entrega os itens necessários quando preciso). */
function completeNpcQuests(player) {
  const d = npcData(player);
  let n = 0;
  for (const [id, st] of Object.entries(d.npc.q)) {
    const Q = NPC_QUESTS[id];
    if (!Q || st.e !== "ativa") continue;
    const o = Q.obj;
    if (o.tipo === "falar") st.lista = [...o.papeis];
    if (o.tipo === "abate") st.p = o.n;
    if (o.tipo === "entregar") giveItem(player, new ItemStack(o.item, o.n));
    if (o.tipo === "artefato") giveItem(player, new ItemStack(o.item, 1));
    if (o.tipo === "resgate") st.livre = true;
    if (o.tipo === "investigacao") Object.assign(st, { pistas: [...o.pistas], acusou: true, carta: true });
    n++;
  }
  for (const c of d.npc.guilda.ativas) if (c.tipo !== "entregar") c.p = c.n;
  markDirty(player);
  return `§6[Teste] Objetivos de ${n} missão(ões) de morador cumpridos. Fale com quem deu a missão para entregar.`;
}

function spawnRoles(player) {
  const dir = V.flat(player.getViewDirection());
  const side = { x: -dir.z, y: 0, z: dir.x };
  const roles = Object.keys(ROLES);
  roles.forEach((role, i) => {
    const R = ROLES[role];
    const loc = V.add(V.add(player.location, V.mul(dir, 5)), V.mul(side, (i - roles.length / 2) * 1.6));
    try {
      const e = player.dimension.spawnEntity(`${NS}:${R.tipo}`, loc);
      e.setProperty(`${NS}:oficio`, OFICIO[role]);
      e.setDynamicProperty(`${NS}:papel`, role);
      e.nameTag = npcTag(role, R.nomes[0]);
      particle(player.dimension, "invocacao", loc, {});
    } catch { /* */ }
  });
  return `§6[Teste] ${roles.length} moradores gerados (sem vila: lojas, missões e serviços funcionam; a Defesa exige uma vila).`;
}

export async function villageMenu(player) {
  return actions(player, "Vila e moradores", "§7Vilas, Aurendel (a capital), NPCs, comércio, reputação, Guilda, Coroa e missões.", [
    ["Gerar Vila de Valdoria à frente", ICON("moeda_ouro"), async (p) => {
      p.onScreenDisplay.setActionBar(`§7Gerando ${TYPES.vila.nome}...`);
      const rec = await tryGenerate(p, { tipo: "vila", front: true, ignoreRules: true });
      return rec ? `§6[Teste] ${rec.nome} gerada em ${rec.x} ${rec.y} ${rec.z} com ${rec.m?.moradores?.length || 0} moradores.`
        : `§c[Teste] Não foi possível gerar: ${lastGenerationInfo()}`;
    }],
    ["+500 moedas", ICON("moeda_ouro"), (p) => { addCoins(p, 500, "teste"); return undefined; }],
    ["Definir reputação", ICON("amuleto_fortuna"), setRep],
    ["Guilda: inscrever e +100 pontos", ICON("insignia_goblin"), (p) => {
      const g = npcData(p).npc.guilda;
      g.membro = true;
      g.pontos += 100;
      markDirty(p);
      return `§6[Teste] Guilda: ${g.pontos} pontos.`;
    }],
    ["Cumprir objetivos das missões dos moradores", ICON("diario_aventureiro"), completeNpcQuests],
    ["Reiniciar missões dos moradores", ICON("diario_aventureiro"), (p) => {
      const d = npcData(p);
      d.npc.q = {};
      d.npc.falou = {};
      d.npc.guilda.ativas = [];
      markDirty(p);
      return "§6[Teste] Missões dos moradores reiniciadas.";
    }],
    ["Gerar um morador de cada ofício", ICON("pergaminho_antigo"), spawnRoles],
    ["Vila mais próxima: recriar moradores", ICON("moeda_ouro"), (p) => {
      const rec = nearestVillage(p);
      if (!rec) return "§7[Teste] Nenhuma vila no mundo.";
      return `§6[Teste] ${respawnAll(p.dimension, rec)} morador(es) recriado(s) em ${rec.nome}.`;
    }],
    ["Vila mais próxima: ataque goblin agora", ICON("machado_guerra_aco"), (p) => {
      const rec = nearestVillage(p);
      if (!rec) return "§7[Teste] Nenhuma vila no mundo.";
      system.run(() => startRaid(rec, "desafio"));
      return "§6[Teste] Ataque iniciado. Fique dentro da vila (no criativo, ligue \"criaturas atacam você\").";
    }],
    // ---- Etapa 7: Aurendel
    ["Gerar Aurendel, a capital, à frente", ICON("selo_real"), async (p) => {
      const old = nearestSite(p.location, p.dimension.id, (r) => r.tipo === "capital")?.rec;
      if (old) return `§7[Teste] Aurendel já existe em ${old.x} ${old.y} ${old.z} (uma por mundo).`;
      p.onScreenDisplay.setActionBar("§7Gerando Aurendel (o centro agora; os outros setores conforme os chunks carregam)...");
      const rec = await tryGenerate(p, { tipo: "capital", front: true, ignoreRules: true });
      if (!rec) return `§c[Teste] Não foi possível gerar: ${lastGenerationInfo()}`;
      const n = await buildAllLoaded(rec);
      return `§6[Teste] Aurendel gerada em ${rec.x} ${rec.y} ${rec.z}: ${n}/9 setores construídos; o resto surge ao se aproximar.`;
    }],
    ["Aurendel: construir setores carregados agora", ICON("selo_real"), async (p) => {
      const rec = nearestSite(p.location, p.dimension.id, (r) => r.tipo === "capital")?.rec;
      if (!rec) return "§7[Teste] Aurendel ainda não existe.";
      return `§6[Teste] ${await buildAllLoaded(rec)}/9 setores construídos.`;
    }],
    ["Coroa: concluir uma Missão Real", ICON("selo_real"), (p) => {
      const g = royal(p);
      completeRoyal(p, g.ativas[0] || { id: `teste${system.currentTick}`, nome: "Missão de teste", selos: 1, moedas: 10, xp: 10 });
      return `§6[Teste] Missões Reais concluídas: ${g.feitos}/${PROVAS}.`;
    }],
    ["Coroa: liberar a Sagração (audiência e provas)", ICON("selo_real"), (p) => {
      setFlag(p, "audiencia");
      setFlag(p, "provas_reais");
      giveItem(p, new ItemStack(SELO, 6));
      return "§6[Teste] Fale com o Rei para ser sagrado. Você também recebeu 6 Selos Reais.";
    }],
    // ---- Etapa 9: Aelthar
    ["Gerar Aelthar, o Reino Élfico, à frente", ICON("orvalho_lunar"), async (p) => {
      const old = nearestSite(p.location, p.dimension.id, (r) => r.tipo === "aelthar")?.rec;
      if (old) return `§7[Teste] Aelthar já existe em ${old.x} ${old.y} ${old.z} (um por mundo).`;
      p.onScreenDisplay.setActionBar("§7Gerando Aelthar (57 x 57 blocos, com a caverna do Coração)...");
      const rec = await tryGenerate(p, { tipo: "aelthar", front: true, ignoreRules: true });
      return rec ? `§6[Teste] Aelthar gerado em ${rec.x} ${rec.y} ${rec.z} com ${rec.m?.moradores?.length || 0} moradores.`
        : `§c[Teste] Não foi possível gerar: ${lastGenerationInfo()}`;
    }],
    ["Aelthar: purificar as 3 raízes agora (abre o selo)", ICON("orvalho_lunar"), (p) => {
      const rec = nearestSite(p.location, p.dimension.id, (r) => r.tipo === "aelthar")?.rec;
      if (!rec) return "§7[Teste] Aelthar ainda não existe.";
      purifyAllForTest(rec);
      return "§6[Teste] Raízes purificadas e Selo de Raízes aberto.";
    }],
    ["Aelthar: ir ao Coração e despertar Morthil", ICON("seiva_ancestral"), (p) => {
      const rec = nearestSite(p.location, p.dimension.id, (r) => r.tipo === "aelthar")?.rec;
      if (!rec) return "§7[Teste] Aelthar ainda não existe.";
      const pos = aeltharLayout(rec).marks.poco[0];
      p.teleport({ x: pos.x + 0.5, y: pos.y, z: pos.z + 2.5 });
      return wakeMorthilForTest(rec) ? "§6[Teste] Morthil despertou no Coração de Ylthariel." : "§7[Teste] Morthil já está acordado.";
    }],
    ["Aelthar: liberar a Bênção da Rainha (+3 Orvalhos)", ICON("aelthar_peitoral"), (p) => {
      for (const f of ["descoberto_aelthar", "conselho_elfico", "orvalho", "raizes_aelthar", "morthil"]) setFlag(p, f);
      giveItem(p, new ItemStack(ORVALHO, 3));
      return "§6[Teste] Fale com a Rainha Lyrael para receber a Bênção de Aelthar.";
    }],
    ["Aelthar: reativar o Coração (Morthil volta)", ICON("seiva_ancestral"), (p) => {
      const rec = nearestSite(p.location, p.dimension.id, (r) => r.tipo === "aelthar")?.rec;
      if (!rec) return "§7[Teste] Aelthar ainda não existe.";
      rearmAelthar(p.dimension, rec);
      return "§6[Teste] O Coração voltou a ficar cinzento; entre na caverna para enfrentar Morthil de novo.";
    }],
    // ---- Etapa 10: companheiros
    ...Object.keys(COMPANIONS).map((cid) => [`Companheiro: recrutar ${COMPANIONS[cid].nome} (sem requisitos)`, ICON("apito_companheiro"), (p) =>
      `§6[Teste] ${recruit(p, cid, true).msg}`]),
    ["Companheiro: +5 níveis no companheiro ativo", ICON("apito_companheiro"), (p) => {
      const cid = activeOf(p.id);
      if (!cid) return "§7[Teste] Nenhum companheiro ativo.";
      for (let i = 0; i < 5; i++) {
        const b = getBond(p.id, cid);
        addCompanionXP(p.id, xpNeed(b.nivel) - b.xp);
      }
      return `§6[Teste] ${COMPANIONS[cid].nome} agora está no nível ${getBond(p.id, cid).nivel}.`;
    }],
    // ---- Etapa 11: Nyxhal
    ["Gerar a Cidadela de Nyxhal à frente", ICON("coracao_abismo"), async (p) => {
      const old = nearestSite(p.location, p.dimension.id, (r) => r.tipo === "nyxhal")?.rec;
      if (old) return `§7[Teste] Nyxhal já existe em ${old.x} ${old.y} ${old.z} (um por mundo).`;
      p.onScreenDisplay.setActionBar("§7Gerando Nyxhal (49 x 49 blocos)...");
      const rec = await tryGenerate(p, { tipo: "nyxhal", front: true, ignoreRules: true });
      return rec ? `§6[Teste] Nyxhal gerado em ${rec.x} ${rec.y} ${rec.z}.` : `§c[Teste] Não foi possível gerar: ${lastGenerationInfo()}`;
    }],
    ["Nyxhal: quebrar os 3 Selos de Sombra agora", ICON("essencia_sombria"), (p) => {
      const rec = nearestSite(p.location, p.dimension.id, (r) => r.tipo === "nyxhal")?.rec;
      if (!rec) return "§7[Teste] Nyxhal ainda não existe.";
      breakAllForTest(p, rec);
      return "§6[Teste] Selos quebrados e Barreira Sombria aberta.";
    }],
    ["Nyxhal: ir ao Salão do Trono e despertar Azrakar", ICON("lamina_azrakar"), (p) => {
      const rec = nearestSite(p.location, p.dimension.id, (r) => r.tipo === "nyxhal")?.rec;
      if (!rec) return "§7[Teste] Nyxhal ainda não existe.";
      const L = nyxLayout(rec);
      const pos = L.marks.chefe[0];
      p.teleport({ x: pos.x + 0.5, y: pos.y, z: pos.z + 6.5 });
      return wakeAzrakarForTest(rec) ? "§6[Teste] Azrakar despertou no Salão do Trono." : "§7[Teste] Azrakar já está acordado.";
    }],
    ["Nyxhal: reativar o trono (Azrakar volta)", ICON("coracao_abismo"), (p) => {
      const rec = nearestSite(p.location, p.dimension.id, (r) => r.tipo === "nyxhal")?.rec;
      if (!rec) return "§7[Teste] Nyxhal ainda não existe.";
      rearmNyxhal(p.dimension, rec);
      return "§6[Teste] O trono está ocupado de novo; entre no salão para enfrentar Azrakar.";
    }],
    // ---- Etapa 12: Santuário Celestial
    ["Gerar o Santuário Celestial à frente", ICON("pluma_auriel"), async (p) => {
      const old = nearestSite(p.location, p.dimension.id, (r) => r.tipo === "celeste")?.rec;
      if (old) return `§7[Teste] O Santuário já existe em ${old.x} ${old.y} ${old.z} (um por mundo).`;
      p.onScreenDisplay.setActionBar("§7Gerando o Santuário Celestial (círculo no chão + ilha no céu)...");
      const rec = await tryGenerate(p, { tipo: "celeste", front: true, ignoreRules: true });
      return rec ? `§6[Teste] Santuário gerado em ${rec.x} ${rec.y} ${rec.z} (ilha em y ${celLayout(rec).sky}).`
        : `§c[Teste] Não foi possível gerar: ${lastGenerationInfo()}`;
    }],
    ["Santuário: subir à ilha", ICON("pena_celeste"), (p) => {
      const rec = nearestSite(p.location, p.dimension.id, (r) => r.tipo === "celeste")?.rec;
      if (!rec) return "§7[Teste] O Santuário ainda não existe.";
      windStone(p, rec, true);
      return "§6[Teste] Você subiu pela Pedra dos Ventos.";
    }],
    ["Santuário: cumprir os 3 Juramentos agora", ICON("pena_celeste"), (p) => {
      const rec = nearestSite(p.location, p.dimension.id, (r) => r.tipo === "celeste")?.rec;
      if (!rec) return "§7[Teste] O Santuário ainda não existe.";
      oathsForTest(rec);
      return "§6[Teste] Juramentos cumpridos e Portão Celestial aberto.";
    }],
    ["Santuário: ir à Plataforma e chamar Auriel", ICON("lanca_auriel"), (p) => {
      const rec = nearestSite(p.location, p.dimension.id, (r) => r.tipo === "celeste")?.rec;
      if (!rec) return "§7[Teste] O Santuário ainda não existe.";
      const pos = celLayout(rec).marks.chefe[0];
      p.teleport({ x: pos.x + 0.5, y: pos.y, z: pos.z + 6.5 });
      return wakeAurielForTest(rec) ? "§6[Teste] Auriel desceu à Plataforma do Guardião." : "§7[Teste] Auriel já está na plataforma.";
    }],
    ["Santuário: reativar a Plataforma (Auriel volta)", ICON("pluma_auriel"), (p) => {
      const rec = nearestSite(p.location, p.dimension.id, (r) => r.tipo === "celeste")?.rec;
      if (!rec) return "§7[Teste] O Santuário ainda não existe.";
      rearmCeleste(p.dimension, rec);
      return "§6[Teste] Auriel voltou para além das nuvens; entre na plataforma para enfrentá-lo de novo.";
    }],
  ], testMenu);
}
