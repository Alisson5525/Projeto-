// Itens da Edição Definitiva ligados à exploração: relíquias exclusivas de locais (não fabricáveis), fragmentos de mapa,
// chaves e tomos. Os dados são mesclados em ITEM_DATA (gerado) logo na carga do módulo, antes de qualquer tabela de saque.
import { ITEM_DATA } from "./items_gen.js";

export const ITEMS_EXPLORE = {
  "valdoria:fragmento_mapa": { n: "Fragmento de Mapa Antigo", r: "epico", k: "quest",
    d: "Pedaço de um mapa dos Reis Esquecidos. Junte 3 e use um deles para montar o Mapa dos Reis.",
    origem: "Exploração completa de locais incomuns ou mais raros, caçadas a criaturas raras e tesouros enterrados." },
  "valdoria:mapa_reis": { n: "Mapa dos Reis Esquecidos", r: "lendario", k: "quest",
    d: "Use para revelar o Cofre dos Reis Esquecidos. O cofre surge em terreno firme, longe do ponto de uso.",
    origem: "Montado com 3 Fragmentos de Mapa Antigo." },
  "valdoria:chave_antiga": { n: "Chave Antiga", r: "raro", k: "key",
    d: "Abre um Portão Selado de templos e cofres antigos (a fechadura consome a chave).",
    origem: "Carregada pelos guardiões de templos e cofres; às vezes escondida em salas secretas." },
  "valdoria:tomo_perdido": { n: "Tomo Perdido", r: "epico", k: "quest",
    d: "Use para aprender um feitiço que você ainda não conhece e cujo nível já alcançou, sem gastar essências.",
    origem: "Bibliotecas Ancestrais e tesouros de locais raros." },
  "valdoria:anel_vigia": { n: "Anel da Sentinela", r: "incomum", k: "accessory", slot: "anel", exclusivo: true,
    mods: { pre: 2, crit: 0.02, dodge: 0.01 }, origem: "Ruínas de Postos de Vigia e Postos de Observação." },
  "valdoria:anel_bibliotecario": { n: "Anel do Bibliotecário", r: "raro", k: "accessory", slot: "anel", exclusivo: true,
    mods: { int: 3, spellCost: -0.06 }, origem: "Cofre secreto da Biblioteca Ancestral." },
  "valdoria:amuleto_mineiro": { n: "Amuleto do Mineiro Anão", r: "raro", k: "accessory", slot: "amuleto", exclusivo: true,
    mods: { def: 2, lootLuck: 0.06, rEarth: 0.2 }, origem: "Esconderijo do capataz da Mina Abandonada; tesouro de Kar'Dum." },
  "valdoria:estandarte_comandante": { n: "Estandarte do Comandante Caído", r: "epico", k: "accessory", slot: "reliquia", exclusivo: true,
    mods: { str: 3, def: 3, melee: 0.06 }, origem: "Derrote o Comandante Caído no Campo de Batalha Antigo." },
  "valdoria:sino_runico": { n: "Sino Rúnico de Bolso", r: "epico", k: "accessory", slot: "reliquia", exclusivo: true,
    mods: { cdr: 0.06, arcane: 0.12, lightning: 0.08 }, origem: "Cofre do Templo Rúnico." },
  "valdoria:lanterna_fadas": { n: "Lanterna das Fadas", r: "epico", k: "accessory", slot: "amuleto", exclusivo: true,
    mods: { nature: 0.2, regen: 0.25, heal: 0.1 }, origem: "Acenda o Círculo das Fadas no Bosque Encantado." },
  "valdoria:medalhao_purificado": { n: "Medalhão Purificado", r: "epico", k: "accessory", slot: "amuleto", exclusivo: true,
    mods: { holy: 0.15, rDark: 0.25, vsUndead: 0.15 }, origem: "Purifique um Altar Corrompido; raramente no tesouro da Cripta." },
  "valdoria:coroa_reis_esquecidos": { n: "Coroa dos Reis Esquecidos", r: "lendario", k: "accessory", slot: "reliquia", exclusivo: true,
    mods: { str: 3, vit: 3, agi: 3, int: 3, spi: 3, xp: 0.1, lootLuck: 0.1 }, origem: "Câmara final do Cofre dos Reis Esquecidos." },
};

for (const [id, d] of Object.entries(ITEMS_EXPLORE)) {
  if (!d.d) d.d = "";
  ITEM_DATA[id] = d;
}

export const RELICS_EXPLORE = Object.keys(ITEMS_EXPLORE).filter((id) => ITEMS_EXPLORE[id].exclusivo);
