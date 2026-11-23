// Exploracao: o mundo e dividido em regioes nomeadas (estilo mundo ninja).
// Descobrir uma regiao nova da XP; a cada 4 regioes um "Pergaminho Perdido" da TP.
import { world, system } from "@minecraft/server";
import { cmd } from "../lib/cmd.js";
import { ehJogador, lerNum, lerJSON, gravarJSON, somarScore, particula, som, msg, mundoCfg } from "./util";
import { darXP, somarStat, nivelDe } from "./progressao";

const TAM_REGIAO = 192;
const MAX_SALVAS = 1500;

const LUGAR = [
  "Floresta", "Vale", "Desfiladeiro", "Planície", "Bosque", "Montanha", "Lago", "Ruínas",
  "Pântano", "Colinas", "Cachoeira", "Penhasco", "Campos", "Templo", "Ponte", "Caverna",
  "Estepe", "Mata", "Pico", "Vilarejo Abandonado",
];
const COMPLEMENTO = [
  "da Névoa", "do Trovão", "dos Sapos", "das Serpentes", "das Lesmas", "dos Corvos",
  "da Lua Vermelha", "do Vento Cortante", "das Mil Folhas", "do Sol Nascente",
  "do Esquecimento", "das Trevas", "dos Heróis", "do Chakra Antigo", "das Sombras",
  "do Dragão de Água", "da Areia Dourada", "das Cinzas", "do Eremita", "dos Sete Espadachins",
];

function hash(x, z, d) {
  let h = 2166136261 ^ d.length;
  for (const n of [x, z]) {
    h ^= n & 0xffff;
    h = Math.imul(h, 16777619);
    h ^= (n >>> 16) & 0xffff;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function nomeRegiao(x, z, dimId) {
  if (dimId.includes("nether")) {
    const h = hash(x, z, dimId);
    const L = ["Cavernas", "Rios", "Ruínas", "Abismos", "Fortalezas", "Planícies", "Picos", "Vales"];
    const C = ["de Lava", "Ardentes", "do Fogo Infernal", "dos Ossos", "de Cinzas", "do Amaterasu", "Carmesim", "do Rei Demônio"];
    return `${L[h % L.length]} ${C[(h >>> 8) % C.length]}`;
  }
  if (dimId.includes("end")) {
    // regioes de 192 blocos: (-500,-500) cai na regiao (-3,-3)
    if (x === -3 && z === -3) return "Monte Myoboku";
    return "Dimensão Kamui";
  }
  if (x === 0 && z === 0) return "Arredores da Vila Oculta";
  const h = hash(x, z, dimId);
  return `${LUGAR[h % LUGAR.length]} ${COMPLEMENTO[(h >>> 8) % COMPLEMENTO.length]}`;
}

const ultimaRegiao = new Map(); // playerId -> chave

/* ------------------------------------------------------------------ */
/* Esconderijos ninja: bau com saque perto do jogador, marcado por fumaca */
/* ------------------------------------------------------------------ */
const CHANCE_ESCONDERIJO = 0.35;
const marcadores = []; // { dim, x, y, z, ate }

function ehAr(b) {
  return !!b && b.isAir;
}

function ehChaoFirme(b) {
  if (!b || b.isAir || b.isLiquid) return false;
  return !/(leaves|log|wood|fence|glass|slab|stairs|torch|flower|grass_path|snow_layer|tallgrass|tall_grass|short_grass|fern|vine|carpet|door|bed|chest|sign)/.test(b.typeId);
}

function direcao(dx, dz) {
  const ang = (Math.atan2(-dx, dz) * 180) / Math.PI; // 0 = sul, 90 = oeste (como o jogo)
  const nomes = ["Sul", "Sudoeste", "Oeste", "Noroeste", "Norte", "Nordeste", "Leste", "Sudeste"];
  return nomes[(Math.round(((ang % 360) + 360) % 360 / 45)) % 8];
}

export function criarEsconderijo(player) {
  const dim = player.dimension;
  const base = player.location;
  for (let tentativa = 0; tentativa < 8; tentativa++) {
    const ang = Math.random() * Math.PI * 2;
    const dist = 9 + Math.random() * 9;
    const x = Math.floor(base.x + Math.cos(ang) * dist);
    const z = Math.floor(base.z + Math.sin(ang) * dist);
    for (let y = Math.floor(base.y) + 10; y >= Math.floor(base.y) - 12; y--) {
      let chao, alvo, acima;
      try {
        chao = dim.getBlock({ x, y, z });
        alvo = dim.getBlock({ x, y: y + 1, z });
        acima = dim.getBlock({ x, y: y + 2, z });
      } catch {
        break; // fora do mundo / nao carregado
      }
      if (!chao || !alvo || !acima) break;
      if (!ehChaoFirme(chao) || !ehAr(alvo) || !ehAr(acima)) continue;
      try {
        alvo.setType("minecraft:chest");
      } catch {
        break;
      }
      try {
        cmd(dim, `loot insert ${x} ${y + 1} ${z} loot "ns/esconderijo"`);
      } catch {}
      marcadores.push({ dim, x: x + 0.5, y: y + 1.5, z: z + 0.5, ate: system.currentTick + 20 * 90 });
      particula(dim, "tnt:ns_folhas", { x: x + 0.5, y: y + 1, z: z + 0.5 });
      const d = Math.round(Math.hypot(x - base.x, z - base.z));
      msg(player, `§6Um §lesconderijo ninja§r§6 foi revelado a §e${direcao(x - base.x, z - base.z)}§6, a ~${d} blocos. §7(siga a fumaça)`);
      som(player, "random.chestopen", 0.6, 0.8);
      return true;
    }
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* Emboscadas ao entrar em regioes novas (escala com o nivel)           */
/* ------------------------------------------------------------------ */
const CHANCE_EMBOSCADA = 0.15;
const emboscadas = new Map(); // playerId -> { ids: Set, ate }

function pontoNoChao(dim, base, distMin, distMax) {
  for (let tentativa = 0; tentativa < 6; tentativa++) {
    const ang = Math.random() * Math.PI * 2;
    const dist = distMin + Math.random() * (distMax - distMin);
    const x = Math.floor(base.x + Math.cos(ang) * dist);
    const z = Math.floor(base.z + Math.sin(ang) * dist);
    for (let y = Math.floor(base.y) + 6; y >= Math.floor(base.y) - 8; y--) {
      let chao, a1, a2;
      try {
        chao = dim.getBlock({ x, y, z }); a1 = dim.getBlock({ x, y: y + 1, z }); a2 = dim.getBlock({ x, y: y + 2, z });
      } catch { break; }
      if (!chao || !a1 || !a2) break;
      if (ehChaoFirme(chao) && ehAr(a1) && ehAr(a2)) return { x: x + 0.5, y: y + 1, z: z + 0.5 };
    }
  }
  return undefined;
}

export function emboscada(player) {
  const nv = nivelDe(player);
  const grupo = nv >= 40 ? ["tnt:espadachin_s", "tnt:ninja_folha_s"]
    : nv >= 20 ? ["tnt:ninja_folha_b", "tnt:ninja_areia_b", "tnt:bandidos_rank_a"]
    : ["tnt:bandidos_rank_c", "tnt:bandidos_rank_c"];
  const dim = player.dimension;
  let n = 0;
  const ids = new Set();
  for (const tipo of grupo) {
    const p = pontoNoChao(dim, player.location, 7, 12);
    if (!p) continue;
    try {
      const e = dim.spawnEntity(tipo, p);
      if (e?.id) ids.add(e.id);
      particula(dim, "tnt:ns_fumaca_ninja", p);
      n++;
    } catch {}
  }
  if (ids.size > 0) emboscadas.set(player.id, { ids, ate: system.currentTick + 20 * 180, nv });
  if (n > 0) {
    msg(player, "§c§l[!] EMBOSCADA!§r §cInimigos surgiram da fumaça!");
    som(player, "mob.evocation_illager.prepare_attack", 0.8, 1.2);
  }
}

// coluna de fumaca sobre os esconderijos por 90s
system.runInterval(() => {
  const agora = system.currentTick;
  for (let i = marcadores.length - 1; i >= 0; i--) {
    const m = marcadores[i];
    if (agora > m.ate) {
      marcadores.splice(i, 1);
      continue;
    }
    particula(m.dim, "minecraft:campfire_tall_smoke_particle", { x: m.x, y: m.y + 0.6, z: m.z });
    particula(m.dim, "tnt:ns_aura", { x: m.x, y: m.y - 0.4, z: m.z }, [1.0, 0.8, 0.3]);
  }
}, 10);

world.afterEvents.playerLeave.subscribe((ev) => {
  ultimaRegiao.delete(ev.playerId);
  emboscadas.delete(ev.playerId);
});

// derrotar todos os inimigos da emboscada em ate 3 minutos rende um bonus
world.afterEvents.entityDie.subscribe((ev) => {
  try {
    if (emboscadas.size === 0) return;
    const id = ev.deadEntity?.id;
    for (const [pid, e] of emboscadas) {
      if (system.currentTick > e.ate) { emboscadas.delete(pid); continue; }
      if (!e.ids.delete(id) || e.ids.size > 0) continue;
      emboscadas.delete(pid);
      const player = world.getPlayers().find((p) => p.id === pid);
      if (!ehJogador(player)) continue;
      const xp = 60 + e.nv * 3;
      const tp = 80 + e.nv * 2;
      somarScore(player, "tp", tp);
      darXP(player, xp, "emboscada");
      somarStat(player, "ns:emboscadas_ok", 1);
      msg(player, `§a§lEmboscada repelida!§r §6+${tp} TP §b+${xp} XP`);
      som(player, "random.levelup", 0.6, 1.2);
      particula(player.dimension, "tnt:ns_level_up", player.location);
    }
  } catch {}
});

system.runInterval(() => {
  if (!mundoCfg("exploracao")) return;
  for (const player of world.getPlayers()) {
    try {
      if (!ehJogador(player)) continue;
      const loc = player.location;
      const dimId = player.dimension.id;
      const rx = Math.floor(loc.x / TAM_REGIAO);
      const rz = Math.floor(loc.z / TAM_REGIAO);
      const chave = `${dimId.replace("minecraft:", "")[0]}${rx},${rz}`;
      if (ultimaRegiao.get(player.id) === chave) continue;
      ultimaRegiao.set(player.id, chave);

      const salvas = lerJSON(player, "ns:regioes", []);
      if (salvas.includes(chave)) continue;

      // primeira vez nesta regiao
      if (salvas.length < MAX_SALVAS) {
        salvas.push(chave);
        gravarJSON(player, "ns:regioes", salvas);
      }
      somarStat(player, "ns:regioes_n", 1);
      const total = lerNum(player, "ns:regioes_n", 1);

      const nome = nomeRegiao(rx, rz, dimId);
      const xp = 25 + Math.min(75, total * 2);
      // a regiao de nascimento nao conta como "descoberta" barulhenta
      if (total === 1) {
        msg(player, `§2Você está em: §a${nome}`);
        continue;
      }
      msg(player, `§2Nova região descoberta: §a§l${nome}§r §7(+${xp} XP)`);
      som(player, "note.pling", 0.8, 1.4);
      particula(player.dimension, "tnt:ns_folhas", loc);
      darXP(player, xp, "exploracao");

      if (mundoCfg("esconderijo") && Math.random() < CHANCE_ESCONDERIJO) criarEsconderijo(player);
      else if (mundoCfg("emboscada") && player.dimension.id === "minecraft:overworld" && Math.random() < CHANCE_EMBOSCADA) emboscada(player);

      if (total % 4 === 0) {
        const tp = 60 + Math.min(240, total * 4);
        somarScore(player, "tp", tp);
        msg(player, `§6Você encontrou um §lPergaminho Perdido§r§6 escondido na região! §e+${tp} TP`);
        som(player, "random.orb", 1, 0.7);
        particula(player.dimension, "tnt:ns_fumaca_ninja", { x: loc.x, y: loc.y, z: loc.z });
        particula(player.dimension, "tnt:ns_level_up", loc);
      }
    } catch {}
  }
}, 40);
