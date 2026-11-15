// Definições das montarias: como domar, item de vínculo, atributos exibidos, passiva e habilidade (ver skills.js).
import { NS } from "../core/util.js";
import { npcData } from "../npc/economy.js";

export const OSSO_ALFA = `${NS}:osso_alfa`;
export const REDEA_CELESTE = `${NS}:redea_celeste`;
export const LOBO_NIVEL = 12;

/**
 * domar.item: oferecido à criatura selvagem (interagir segurando); chance por tentativa (+Sorte); nivel mínimo;
 * req(player): texto de recusa ou undefined; consome: gasta o item a cada tentativa. Sem `domar`: não há criatura selvagem.
 * voa: montaria voadora (o cavaleiro plana ao desmontar no ar); adultoEvento: evento de surgimento do adulto (dragão).
 */
export const MOUNTS = {
  cavalo: {
    id: `${NS}:cavalo_guerra`, item: `${NS}:escritura_cavalo`, nome: "Corcel de Guerra", recMin: 3, armadura: 0.3,
    hab: "Investida", habCd: 20, velocidade: "Rápido (0,30)", salto: "Pulo carregado (segure pular)",
    passiva: "Pisoteia inimigos a galope", comida: "trigo, feno, maçã, cenoura, cenoura e maçã douradas",
    anim: "animation.valdoria.cavalo_guerra.empinar", som: "mob.horse.idle", pitch: 0.9,
    obter: "Crônica III (Capitão da Guarda) ou Estábulo da Guarda, reputação Amigo.",
    domar: { item: `${NS}:escritura_cavalo`, nivel: 1, chance: 1, consome: false, msgFalha: "" },
  },
  lobo: {
    id: `${NS}:lobo_gigante`, item: `${NS}:apito_lobo`, nome: "Lobo Gigante", recMin: 5, armadura: 0.15,
    hab: "Uivo do Alfa", habCd: 30, velocidade: "Muito rápido (0,34)", salto: "Bote: pular avança em investida",
    passiva: "Morde inimigos à frente enquanto você monta", comida: "carnes cruas ou assadas",
    anim: "animation.valdoria.lobo_gigante.uivo", som: "mob.wolf.growl", pitch: 0.6,
    obter: `Dome um selvagem das florestas frias com o Osso do Alfa (nível ${LOBO_NIVEL}+).`,
    domar: { item: OSSO_ALFA, nivel: LOBO_NIVEL, chance: 0.3, consome: true, som: "mob.wolf.growl",
      msgFalha: "O lobo fareja o osso... e rosna." },
  },
  alce: {
    id: `${NS}:alce`, item: `${NS}:berrante_alce`, nome: "Alce do Norte", recMin: 2, armadura: 0.1,
    hab: "Galope do Norte", habCd: 25, velocidade: "Rápido (0,31)", salto: "Salto altíssimo (segure pular); sobe degraus de 1,5",
    passiva: "Não sofre dano de queda e atravessa neve e mato sem perder fôlego", comida: "frutas doces, maçãs, trigo, folhas de algas secas",
    anim: "animation.valdoria.alce.berro", som: "mob.goat.ambient", pitch: 0.55,
    obter: "Dome um selvagem (taigas, bosques nevados, prados) com Frutas Doces, a partir do nível 6.",
    domar: { item: "minecraft:sweet_berries", nivel: 6, chance: 0.35, consome: true, som: "mob.goat.ambient",
      msgFalha: "O alce come as frutas... e se afasta, desconfiado." },
  },
  urso: {
    id: `${NS}:urso_guerra`, item: `${NS}:insignia_urso`, nome: "Urso de Guerra", recMin: 4, armadura: 0.35,
    hab: "Rugido de Guerra", habCd: 25, velocidade: "Lento (0,25)", salto: "Pulo curto; inabalável (sem repulsão)",
    passiva: "Dá patadas em inimigos à frente e dos lados", comida: "mel, peixes, carnes e frutas doces",
    anim: "animation.valdoria.urso_guerra.rugido", som: "mob.polarbear.warning", pitch: 0.7,
    obter: "Dome um Urso Pardo selvagem (florestas e taigas) com Garrafa de Mel, a partir do nível 10.",
    domar: { item: "minecraft:honey_bottle", nivel: 10, chance: 0.3, consome: true, som: "mob.polarbear.warning",
      msgFalha: "O urso lambe o mel... e rosna. Ainda não confia em você." },
  },
  unicornio: {
    id: `${NS}:unicornio`, item: `${NS}:sino_prata`, nome: "Unicórnio", recMin: 6, armadura: 0.15,
    hab: "Bênção do Chifre", habCd: 45, velocidade: "Rápido (0,32)", salto: "Pulo carregado alto; sem dano de queda",
    passiva: "Regeneração para o cavaleiro enquanto montado", comida: "maçãs, cenouras douradas, maçãs douradas, açúcar",
    anim: "animation.valdoria.unicornio.empinar", som: "mob.horse.idle", pitch: 1.4,
    obter: "Dome um selvagem (florestas floridas, prados, bosques de cerejeira) com Maçã Dourada: nível 14+ e reputação Conhecido.",
    domar: { item: "minecraft:golden_apple", nivel: 14, chance: 0.35, consome: true, som: "mob.horse.angry",
      msgFalha: "O unicórnio aceita a maçã, mas recua. Tente de novo.",
      req: (p) => (npcData(p).rep >= 50 ? undefined : "§cO unicórnio só confia em quem tem reputação §fConhecido§c ou maior nas vilas.") },
  },
  grifo: {
    id: `${NS}:grifo`, item: `${NS}:pena_dourada`, nome: "Grifo", recMin: 8, armadura: 0.2,
    hab: "Rajada das Asas", habCd: 10, velocidade: "Voo (cerca de 12 blocos/s); 0,28 em terra",
    salto: "Voo: olhe para onde quer ir; segure pular para subir", voa: true, planar: "§bVocê desce planando, preso às penas do grifo.",
    passiva: "Voa de verdade; ao desmontar no ar, você plana até o chão", comida: "carnes e peixes crus ou assados",
    anim: "animation.valdoria.grifo.grito", som: "mob.parrot.idle", pitch: 0.55,
    obter: "Dome um selvagem (Ninho de Grifo, nas montanhas) com a Rédea Celeste, a partir do nível 18.",
    domar: { item: REDEA_CELESTE, nivel: 18, chance: 0.25, consome: true, som: "mob.parrot.hurt",
      msgFalha: "O grifo bica a rédea e se esquiva. Tente de novo." },
  },
  // Não se doma: nasce do Ovo de Ignaroth (dragon.js). O filhote cresce com o tempo e com carne; só o adulto pode ser montado.
  dragao: {
    id: `${NS}:dragao_jovem`, item: `${NS}:talisma_dragao`, nome: "Dragão Jovem", recMin: 10, armadura: 0.3,
    hab: "Sopro de Fogo", habCd: 15, velocidade: "Voo (cerca de 14 blocos/s); 0,27 em terra",
    salto: "Voo: olhe para onde quer ir; segure pular para subir", voa: true,
    planar: "§6Você desce planando, agarrado às escamas do dragão.",
    passiva: "Voa de verdade; você fica imune a fogo e lava enquanto monta", comida: "carnes e peixes (o filhote cresce com carne assada)",
    anim: "animation.valdoria.dragao_jovem.sopro", som: "mob.enderdragon.growl", pitch: 1.6,
    obter: "Choque o Ovo de Ignaroth (cai do Dragão Ancestral) perto de fogo ou lava e crie o filhote até ele crescer.",
    adultoEvento: "valdoria:nascer_adulto",
  },
};
export const BY_TYPE = Object.fromEntries(Object.entries(MOUNTS).map(([k, m]) => [m.id, k]));
export const ITEM_TYPE = Object.fromEntries(Object.entries(MOUNTS).map(([k, m]) => [m.item, k]));
export const TAME_ITEMS = new Set(Object.values(MOUNTS).filter((m) => m.domar).map((m) => m.domar.item));
