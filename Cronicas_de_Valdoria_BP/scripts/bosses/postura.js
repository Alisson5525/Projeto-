// Postura dos chefes: uma camada comum a todos os chefes, por cima das fases e mecânicas próprias de cada um.
// O dano recebido enche a barra de postura; golpes pesados (martelos, maças, machados, espadas grandes) e críticos enchem mais.
// Quando a barra enche, a postura QUEBRA: o chefe fica exposto por 5 s (+30% de dano recebido, golpes mais fracos e lento),
// com aviso claro na tela. Depois há 25 s de recuperação. Dano anulado pelas imunidades de cada chefe não conta.
// Também: primeira vitória contra cada chefe (por jogador) concede uma recompensa de exploração e um registro no Diário.
import { world, system, ItemStack } from "@minecraft/server";
import { NS, V, ok, isPlayer, effect, heldItem, giveItem, say } from "../core/util.js";
import { particle, sound, psound, shake } from "../core/fx.js";
import { onBeforeHurt, onKill, addVulnerable } from "../core/damage.js";
import { itemData } from "../rpg/stats.js";
import { getData, markDirty } from "../core/store.js";
import { addXP, pauseHud } from "../rpg/progression.js";

export const BOSSES = {
  [`${NS}:tita_pedra`]: "Titã de Pedra", [`${NS}:senhor_mortos`]: "Malachar, o Senhor dos Mortos",
  [`${NS}:dragao_ancestral`]: "Ignaroth, o Dragão Ancestral", [`${NS}:rainha_trevas`]: "Vaelith, a Rainha das Trevas",
  [`${NS}:rei_durgan`]: "Durgan, o Rei Sob a Montanha", [`${NS}:morthil`]: "Morthil, o Guardião Cinzento",
  [`${NS}:azrakar`]: "Azrakar, o Rei Demônio", [`${NS}:guardiao_celeste`]: "Auriel, o Guardião Celestial",
};
const LIMIAR = 0.14; // fração da vida máxima que enche a postura (com 1 jogador)
const JANELA = 12 * 20; // a postura se esvazia se o chefe ficar este tempo sem levar golpes
const EXPOSTO = 5 * 20;
const RECUPERA = 25 * 20;
const PESO_ARMA = { martelo_guerra: 1.8, maca: 1.7, machado_guerra: 1.4, espada_grande: 1.4, alabarda: 1.2, lanca: 1.1 };
const st = new Map(); // id do chefe -> {p, last, until, cd, avisos}

function stateOf(boss) {
  let s = st.get(boss.id);
  if (!s) st.set(boss.id, (s = { p: 0, last: 0, cd: 0, aviso: 0 }));
  return s;
}
function weight(src, ev) {
  if (!isPlayer(src)) return 0.6; // aliados, invocações
  let w = 1;
  if (ev.cause === "projectile" || ev.kind === "projectile") w = 0.7; // flechas (físicas ou elementais)
  else if (ev.element === "physical" || ev.cause === "entityAttack") {
    const wd = itemData(heldItem(src));
    w = wd?.k === "weapon" ? PESO_ARMA[wd.type] || 1 : 0.9;
  } else w = 0.8; // feitiços
  return w;
}
function bar(frac) {
  const n = Math.round(Math.min(1, frac) * 10);
  return `§6${"▮".repeat(n)}§8${"▮".repeat(10 - n)}`;
}

function breakPosture(boss, s) {
  const now = system.currentTick;
  s.p = 0;
  s.until = now + EXPOSTO;
  s.cd = now + EXPOSTO + RECUPERA;
  addVulnerable(boss, 0.3, EXPOSTO / 20);
  effect(boss, "weakness", EXPOSTO, 1);
  effect(boss, "slowness", EXPOSTO, 2);
  const name = BOSSES[boss.typeId] || "O chefe";
  particle(boss.dimension, "onda_choque", boss.location, { radius: 2.5 });
  particle(boss.dimension, "detritos", V.up(boss.location, 1.5), { radius: 1.5 });
  sound(boss.dimension, "random.anvil_land", boss.location, 0.6, 1.5);
  sound(boss.dimension, "mob.irongolem.crack", boss.location, 0.7, 1.2);
  for (const p of boss.dimension.getPlayers({ location: boss.location, maxDistance: 48 })) {
    p.onScreenDisplay.setTitle("§6§lPostura quebrada!", { subtitle: `§f${name} §7está exposto: §e+30% de dano §7por 5 s`,
      fadeInDuration: 3, stayDuration: 40, fadeOutDuration: 10 });
    shake(p, 0.25, 0.6);
  }
}

function onHurt(ev) {
  if (ev.cancel) return;
  const boss = ev.hurtEntity;
  if (!BOSSES[boss?.typeId] || !(ev.damage > 0)) return;
  const src = ev.src;
  if (!ok(src)) return;
  const now = system.currentTick;
  const s = stateOf(boss);
  if (now < s.cd) return;
  const h = boss.getComponent("minecraft:health");
  if (!h) return;
  if (now - s.last > JANELA) s.p = 0;
  s.last = now;
  const players = boss.dimension.getPlayers({ location: boss.location, maxDistance: 40 }).length;
  const limiar = h.effectiveMax * LIMIAR * (1 + 0.35 * Math.max(0, players - 1));
  s.p += ev.damage * weight(src, ev);
  const frac = s.p / limiar;
  if (frac >= 1) {
    system.run(() => ok(boss) && breakPosture(boss, s));
    return;
  }
  // avisos discretos aos 50% e 80% para quem está batendo
  const marco = frac >= 0.8 ? 2 : frac >= 0.5 ? 1 : 0;
  if (marco > s.aviso && isPlayer(src)) {
    s.aviso = marco;
    system.run(() => {
      if (!ok(src)) return;
      pauseHud(src, 30);
      src.onScreenDisplay.setActionBar(`§7Postura de ${BOSSES[boss.typeId]}: ${bar(frac)}`);
    });
  }
  if (marco === 0) s.aviso = 0;
}

/** Primeira vitória contra cada chefe: Fragmento de Mapa, XP e registro (para quem lutou por perto). */
function firstVictory(ev) {
  const boss = ev.deadEntity;
  const name = BOSSES[boss?.typeId];
  if (!name) return;
  st.delete(boss.id);
  let players = [];
  try { players = boss.dimension.getPlayers({ location: boss.location, maxDistance: 64 }); } catch { return; }
  const flag = `vitoria_${boss.typeId.replace(`${NS}:`, "")}`;
  for (const p of players) {
    const d = getData(p);
    d.flags = d.flags || {};
    if (d.flags[flag]) continue;
    d.flags[flag] = Date.now();
    markDirty(p);
    system.runTimeout(() => {
      if (!ok(p)) return;
      addXP(p, 500, "primeira vitória");
      giveItem(p, new ItemStack(`${NS}:fragmento_mapa`, 1));
      psound(p, "ui.toast.challenge_complete", 1, 1);
      say(p, `§6[Primeira vitória] §f${name}§6 caiu diante de você. §7+500 XP e um Fragmento de Mapa Antigo.`);
    }, 60);
  }
}

export function startPosture() {
  onBeforeHurt(onHurt); // registrado depois dos ganchos dos chefes: imunidades já foram aplicadas
  onKill(firstVictory);
  // marca visual enquanto o chefe está exposto
  system.runInterval(() => {
    const now = system.currentTick;
    for (const [id, s] of st) {
      if (!s.until || s.until < now) {
        if (now - s.last > 20 * 60 * 5) st.delete(id); // chefe esquecido (descarregado)
        continue;
      }
      const boss = world.getEntity(id);
      if (!ok(boss)) continue;
      particle(boss.dimension, "cor_anel", V.up(boss.location, 0.1), { color: "gold", radius: 1.6 });
      particle(boss.dimension, "critico", V.up(boss.location, 2.5), {});
    }
  }, 10);
}

/** Linhas para o Diário (bestiário): chefes vencidos pelo jogador. */
export function victoriesOf(player) {
  const f = getData(player).flags || {};
  return Object.entries(BOSSES).map(([id, nome]) => ({ nome, venceu: !!f[`vitoria_${id.replace(`${NS}:`, "")}`] }));
}
