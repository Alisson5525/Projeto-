// Exploracao: o mundo e dividido em regioes nomeadas (estilo mundo ninja).
// Descobrir uma regiao nova da XP; a cada 4 regioes um "Pergaminho Perdido" da TP.
import { world, system } from "@minecraft/server";
import { ehJogador, lerNum, lerJSON, gravarJSON, somarScore, particula, som, msg } from "./util";
import { darXP, somarStat } from "./progressao";

const TAM_REGIAO = 192;
const MAX_SALVAS = 1500;

const LUGAR = [
  "Floresta", "Vale", "Desfiladeiro", "Planicie", "Bosque", "Montanha", "Lago", "Ruinas",
  "Pantano", "Colinas", "Cachoeira", "Penhasco", "Campos", "Templo", "Ponte", "Caverna",
  "Estepe", "Mata", "Pico", "Vilarejo Abandonado",
];
const COMPLEMENTO = [
  "da Nevoa", "do Trovao", "dos Sapos", "das Serpentes", "das Lesmas", "dos Corvos",
  "da Lua Vermelha", "do Vento Cortante", "das Mil Folhas", "do Sol Nascente",
  "Esquecida", "Sombria", "dos Herois", "do Chakra Antigo", "das Sombras",
  "do Dragao de Agua", "da Areia Dourada", "das Cinzas", "do Eremita", "dos Sete Espadachins",
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
  if (dimId.includes("nether")) return "Dimensao do Fogo Infernal";
  if (dimId.includes("end")) return "Dimensao Kamui";
  if (x === 0 && z === 0) return "Arredores da Vila Oculta";
  const h = hash(x, z, dimId);
  return `${LUGAR[h % LUGAR.length]} ${COMPLEMENTO[(h >>> 8) % COMPLEMENTO.length]}`;
}

const ultimaRegiao = new Map(); // playerId -> chave

world.afterEvents.playerLeave.subscribe((ev) => ultimaRegiao.delete(ev.playerId));

system.runInterval(() => {
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
        msg(player, `§2Voce esta em: §a${nome}`);
        continue;
      }
      msg(player, `§2Nova regiao descoberta: §a§l${nome}§r §7(+${xp} XP)`);
      som(player, "note.pling", 0.8, 1.4);
      particula(player.dimension, "tnt:ns_folhas", loc);
      darXP(player, xp, "exploracao");

      if (total % 4 === 0) {
        const tp = 60 + Math.min(240, total * 4);
        somarScore(player, "tp", tp);
        msg(player, `§6Voce encontrou um §lPergaminho Perdido§r§6 escondido na regiao! §e+${tp} TP`);
        som(player, "random.orb", 1, 0.7);
        particula(player.dimension, "tnt:ns_fumaca_ninja", { x: loc.x, y: loc.y, z: loc.z });
        particula(player.dimension, "tnt:ns_level_up", loc);
      }
    } catch {}
  }
}, 40);
