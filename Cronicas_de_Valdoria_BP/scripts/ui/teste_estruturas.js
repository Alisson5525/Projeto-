// Modo de Teste: estruturas e masmorra (gerar à frente, listar e teleportar, repovoar, construir e reiniciar a cripta).
import { ActionFormData } from "@minecraft/server-ui";
import { getWorldCfg, setWorldCfg } from "../core/store.js";
import { allSites, nearestSite, repopulate, TYPES, dist2d, compass } from "../structures/registry.js";
import { tryGenerate, lastGenerationInfo } from "../structures/generation.js";
import { buildNow, rearm, openGate } from "../structures/dungeon.js";
import { Plan } from "../structures/builder.js";
import { F } from "../structures/crypt.js";
import { actions, testMenu } from "./teste.js";

const ICON = (id) => `textures/items/valdoria/${id}`;
const FREQS = [0, 0.5, 1, 2];
const FREQ_NAMES = ["desligada", "rara", "normal", "frequente"];

async function generate(player, tipo) {
  player.onScreenDisplay.setActionBar(`§7Gerando ${TYPES[tipo].nome}...`);
  const rec = await tryGenerate(player, { tipo, front: true, ignoreRules: true });
  if (!rec) return `§c[Teste] Não foi possível gerar: ${lastGenerationInfo()}`;
  return `§6[Teste] ${rec.nome} gerado em ${rec.x} ${rec.y} ${rec.z}.${tipo === "cripta" ? " A masmorra é construída quando você chega ao mausoléu." : ""}`;
}

function nearestCrypt(player) {
  return nearestSite(player.location, player.dimension.id, (r) => r.tipo === "cripta")?.rec;
}

async function teleportMenu(player) {
  const sites = allSites().filter((s) => s.dim === player.dimension.id && s.estado !== "construindo")
    .sort((a, b) => dist2d(a, player.location) - dist2d(b, player.location));
  if (!sites.length) return "§7[Teste] Nenhum local gerado nesta dimensão.";
  const f = new ActionFormData().title("Teleportar").body("§7Locais gerados (mais próximos primeiro).");
  const spots = [];
  for (const s of sites) {
    const P = new Plan({ x: s.x, y: s.y, z: s.z }, s.rot);
    f.button(`${s.nome}\n§8${Math.round(dist2d(s, player.location))} blocos ${compass(player.location, s)} · ${s.estado}`);
    spots.push(P.world(0, 1, (TYPES[s.tipo]?.raio || 8) + 3));
    if (s.tipo === "cripta" && s.m?.b === 2) {
      f.button(`${s.nome}: diante do portão selado`);
      spots.push(P.world(0, F + 1, -46));
      f.button(`${s.nome}: Câmara do Trono`);
      spots.push(P.world(0, F + 1, -55));
    }
  }
  f.button("Voltar");
  /** @type {any} */
  const r = await f.show(player).catch(() => ({ canceled: true }));
  if (r.canceled || r.selection === undefined || r.selection >= spots.length) return undefined;
  const loc = spots[r.selection];
  try {
    player.teleport({ x: loc.x + 0.5, y: loc.y, z: loc.z + 0.5 });
  } catch (e) {
    return `§c[Teste] Falha ao teleportar: ${e}`;
  }
  return undefined;
}

export async function structuresMenu(player) {
  const cfg = getWorldCfg();
  const n = allSites().length;
  return actions(player, "Estruturas e masmorra",
    `§7Locais no mundo: §f${n}§7. Geração automática: §f${FREQ_NAMES[FREQS.indexOf(cfg.estruturas ?? 1)] || "normal"}§7.\n` +
    `§7Última tentativa automática que falhou: §f${lastGenerationInfo() || "nenhuma"}§7.\n` +
    "§7As estruturas aparecem à sua frente (ignorando distância mínima, bioma e terreno). Para que ondas, armadilhas e o " +
    "chefe da cripta reajam a você no criativo, ligue §fCriaturas e chefe > atacam você no criativo§7.", [
      ["Gerar Acampamento Goblin à frente", ICON("insignia_goblin"), (p) => generate(p, "acampamento")],
      ["Gerar Torre do Mago em Ruínas à frente", ICON("grimorio_arquimago"), (p) => generate(p, "torre")],
      ["Gerar Cripta Ancestral à frente", ICON("chave_cripta"), (p) => generate(p, "cripta")],
      ["Teleportar para um local", ICON("mapa_explorador"), teleportMenu],
      ["Cripta mais próxima: construir a masmorra agora", ICON("chave_cripta"), async (p) => {
        const rec = nearestCrypt(p);
        if (!rec) return "§7[Teste] Nenhuma cripta no mundo. Gere uma primeiro.";
        const done = await buildNow(rec);
        return done ? "§6[Teste] Masmorra construída (as duas etapas)." : "§c[Teste] A área ainda não está carregada; aproxime-se da cripta.";
      }],
      ["Cripta mais próxima: abrir o portão selado", ICON("chave_cripta"), (p) => {
        const rec = nearestCrypt(p);
        if (!rec || rec.m?.b !== 2) return "§7[Teste] Construa a masmorra primeiro.";
        openGate(p.dimension, rec, p);
        return "§6[Teste] Portão aberto.";
      }],
      ["Cripta mais próxima: reiniciar (chefe, ondas, guardiões)", ICON("coroa_mortos"), (p) => {
        const rec = nearestCrypt(p);
        if (!rec) return "§7[Teste] Nenhuma cripta no mundo.";
        rearm(p.dimension, rec);
        return "§6[Teste] Cripta reiniciada: o Senhor dos Mortos volta ao trono.";
      }],
      ["Local mais próximo: repovoar agora", ICON("insignia_goblin"), (p) => {
        const hit = nearestSite(p.location, p.dimension.id, (r) => r.tipo !== "cripta");
        if (!hit) return "§7[Teste] Nenhum acampamento ou torre no mundo.";
        repopulate(p.dimension, hit.rec, true);
        return `§6[Teste] ${hit.rec.nome} repovoado.`;
      }],
      [`Geração automática: ${FREQ_NAMES[FREQS.indexOf(cfg.estruturas ?? 1)] || "normal"}`, ICON("runa_luz"), (p) => {
        const c = getWorldCfg();
        const i = (FREQS.indexOf(c.estruturas ?? 1) + 1) % FREQS.length;
        c.estruturas = FREQS[i];
        setWorldCfg(c);
        return `§6[Teste] Geração automática de estruturas: ${FREQ_NAMES[i]}.`;
      }],
    ], testMenu);
}
