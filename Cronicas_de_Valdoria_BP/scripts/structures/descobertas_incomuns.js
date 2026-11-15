// Descobertas incomuns: locais de porte médio com várias atividades (mina subterrânea, biblioteca com enigma,
// posto de observação que revela o horizonte, campo de batalha assombrado à noite).
import { world } from "@minecraft/server";
import { NS } from "../core/util.js";
import { psound, particle } from "../core/fx.js";
import { Plan, B, prepareGround } from "./builder.js";
import { gableRoof } from "./arch.js";
import { getData, markDirty } from "../core/store.js";
import { addXP } from "../rpg/progression.js";
import { symbolsFor, credit } from "../exploration/mechanisms.js";
import { revealMany, revealRumor } from "../exploration/rumors.js";

const AIR = "minecraft:air";
const grassy = (p) => p.pick([["minecraft:grass_block", 8], ["minecraft:coarse_dirt", 2], ["minecraft:gravel", 1]]);

// ====================================================================== MINA ABANDONADA
const MF = -14; // piso das galerias
const MINA_MECS = [
  { k: "leitura", id: "diario", bloco: "diario_capataz", titulo: "Diário do Capataz Hrothgar",
    texto: () => "§fPáginas sujas de fuligem:\n\n§7\"Dia 40: o veio de mithril corre para LESTE, atrás da parede da galeria principal. " +
      "Mandei escorar com cascalho depois do desabamento; quem quiser chegar lá vai ter que cavar.\n\nDia 41: as placas de pedra " +
      "no meio da galeria disparam o teto podre. Andem rente aos esteios!\n\nDia 43: ouço martelos à noite, lá no salão do fundo. " +
      "Os rapazes dizem que é o velho Hrothgar... mas eu sou o Hrothgar.\"" },
  { k: "armadilha", id: "teto", placas: "placa_teto", tipo: "desabamento", dano: 6, raio: 1.8 },
  { k: "guardiao", id: "capataz", ponto: "capataz", sala: "sala_fundo", tipo: `${NS}:fantasma_anao`, nome: "Capataz Espectral", nivel: 2,
    subtitulo: "Hrothgar ainda guarda a mina", obj: "Derrotar o Capataz Espectral", xp: 180,
    depois: { bau: "bau_capataz", tier: "mina_capataz", msg: "§7Um baú de ferramentas surge entre as pedras" } },
  // cavar qualquer bloco do desabamento faz o resto do cascalho ceder (o diário aponta "para leste, atrás da parede")
  { k: "segredo", id: "veio", porta: "cascalho", sala: "sala_veio", obj: "Encontrar o veio de mithril escondido", nome: "O veio de Hrothgar", xp: 100 },
];
export const MINA = {
  id: "mina", nome: "Mina Abandonada", raridade: "incomum", raio: 8, alcance: 22, alturaMax: 5, minY: 40, xp: 70, xpLimpo: 200, repovoar: 60,
  nivel: 6, peso: 3, espaco: 600,
  nomes: ["Mina do Velho Hrothgar", "Mina Fundafria", "Poço das Lanternas", "Mina da Veia Azul"],
  descricao: "Poço de mina anão com galerias escoradas, veios de minério, teto traiçoeiro e um capataz que não descansa.",
  dica: "§7Uma armação de madeira marca a boca de um poço",
  biomas: [""],
  objLimpo: "Limpar as galerias",
  async plan(dim, origin, rot, rnd) {
    const p = new Plan(origin, rot, rnd);
    const prep = await prepareGround(dim, p, -8, -8, 8, 8, 12, "minecraft:dirt", (x, z) =>
      Math.abs(x) <= 4 && Math.abs(z) <= 4 ? p.pick([["minecraft:gravel", 3], ["minecraft:coarse_dirt", 3], ["minecraft:cobblestone", 1]]) : grassy(p));
    const rock = () => p.pick([["minecraft:stone", 6], ["minecraft:andesite", 2], ["minecraft:tuff", 1], ["minecraft:cobblestone", 1]]);
    // ---- superfície: armação sobre o poço, galpão e pilhas de rejeito
    for (const [x, z] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) for (let y = 1; y <= 5; y++) p.set(x, y, z, B.log("minecraft:spruce_log"));
    for (let x = -2; x <= 2; x++) p.set(x, 6, -2, B.log("minecraft:spruce_log", "x")).set(x, 6, 2, B.log("minecraft:spruce_log", "x"));
    for (let z = -1; z <= 1; z++) p.set(0, 6, z, B.log("minecraft:spruce_log", "z"));
    p.set(0, 5, 0, ["minecraft:iron_chain", { pillar_axis: "y" }]).set(0, 4, 0, B.lantern("minecraft:lantern", true));
    for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) p.set(x, 0, z, AIR);
    for (const [x, z] of [[-2, -1], [-2, 0], [-2, 1], [2, -1], [2, 0], [2, 1], [-1, 2], [1, 2]]) p.set(x, 1, z, B.fence("minecraft:spruce_fence"));
    // galpão do capataz
    for (let y = 1; y <= 3; y++) for (let x = 4; x <= 7; x++) for (let z = -6; z <= -3; z++) {
      const edge = x === 4 || x === 7 || z === -6 || z === -3;
      p.set(x, y, z, edge ? (y === 1 ? "minecraft:cobblestone" : "minecraft:spruce_planks") : AIR);
    }
    p.set(5, 1, -3, AIR).set(5, 2, -3, AIR);
    for (let x = 3; x <= 8; x++) for (let z = -7; z <= -2; z++) p.set(x, 4, z, B.slab("minecraft:spruce_slab"));
    p.set(6, 1, -5, B.facing("minecraft:lectern", "west")).set(6, 1, -4, B.barrel()).set(5, 1, -5, "minecraft:crafting_table");
    p.mark("diario_capataz", 6, 1, -5);
    p.chest(-6, 1, 4, "east", "mina");
    for (const [x, z, h] of [[-6, -5, 2], [-5, -6, 1], [-7, -4, 1], [6, 5, 2], [5, 6, 1]]) for (let y = 1; y <= h; y++) p.set(x, y, z, p.pick([["minecraft:gravel", 2], ["minecraft:cobblestone", 1]]));
    p.set(-4, 1, 1, B.rail("x")).set(-5, 1, 1, B.rail("x")).set(-6, 1, 1, B.rail("x"));
    // ---- poço até as galerias
    for (let y = MF + 1; y <= -1; y++) {
      for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) {
        const edge = Math.abs(x) === 2 || Math.abs(z) === 2;
        p.set(x, y, z, edge ? (y % 4 === 0 && Math.abs(x) === 2 && Math.abs(z) === 2 ? B.log("minecraft:spruce_log") : rock()) : AIR);
      }
    }
    for (let y = MF + 1; y <= 0; y++) p.set(0, y, -1, B.ladder("south"));
    // ---- galeria principal (sentido norte), com esteios a cada 4 blocos
    p.room(-3, MF, -26, 3, MF + 4, 2, "minecraft:stone", "minecraft:gravel");
    for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) p.set(x, MF + 4, z, AIR);
    for (let z = -3; z >= -24; z -= 4) {
      for (const x of [-2, 2]) for (let y = MF + 1; y <= MF + 3; y++) p.set(x, y, z, B.log("minecraft:spruce_log"));
      for (let x = -2; x <= 2; x++) p.set(x, MF + 3, z, B.log("minecraft:spruce_log", "x"));
      p.set(0, MF + 2, z, B.lantern("minecraft:lantern", true));
    }
    for (let z = 0; z >= -25; z--) p.set(0, MF + 1, z, B.rail("z"));
    // teto podre da armadilha: blocos de cascalho e pedra rachada visíveis acima das placas
    for (const z of [-17, -18]) for (const x of [-1, 0, 1]) {
      p.set(x, MF + 1, z, x === 0 ? B.rail("z") : B.plate());
      if (x !== 0) p.mark("placa_teto", x, MF + 1, z);
      p.set(x, MF + 4, z, x === 0 ? "minecraft:gravel" : "minecraft:cracked_stone_bricks");
    }
    p.set(0, MF + 1, -17, B.plate()).set(0, MF + 1, -18, B.plate());
    p.mark("placa_teto", 0, MF + 1, -17).mark("placa_teto", 0, MF + 1, -18);
    // ---- sala do minério (oeste)
    p.room(-13, MF, -16, -3, MF + 5, -8, "minecraft:stone", "minecraft:cobblestone");
    for (let z = -13; z <= -11; z++) for (let y = MF + 1; y <= MF + 3; y++) p.set(-3, y, z, AIR);
    for (let i = 0; i < 26; i++) {
      const wall = Math.floor(rnd() * 3);
      const x = wall === 0 ? -13 : -12 + Math.floor(rnd() * 9);
      const z = wall === 0 ? -15 + Math.floor(rnd() * 7) : wall === 1 ? -16 : -8;
      p.set(x, MF + 1 + Math.floor(rnd() * 4), z, p.pick([["minecraft:iron_ore", 4], ["minecraft:coal_ore", 4], ["minecraft:copper_ore", 2], ["minecraft:gold_ore", 1]]));
    }
    p.set(-11, MF + 1, -10, B.barrel()).set(-6, MF + 1, -14, "minecraft:anvil");
    p.chest(-12, MF + 1, -14, "east", "mina");
    // ---- desabamento a leste (cave para passar) e o veio escondido
    for (let x = 3; x <= 9; x++) for (let z = -8; z <= -6; z++) for (let y = MF + 1; y <= MF + 3; y++) p.set(x, y, z, "minecraft:gravel").mark("cascalho", x, y, z);
    for (let x = 3; x <= 9; x++) for (const z of [-9, -5]) for (let y = MF; y <= MF + 4; y++) p.set(x, y, z, rock());
    for (let x = 3; x <= 9; x++) for (let z = -8; z <= -6; z++) { p.set(x, MF, z, rock()); p.set(x, MF + 4, z, rock()); }
    p.room(10, MF, -12, 17, MF + 5, -2, "minecraft:deepslate", "minecraft:deepslate_tiles");
    for (let z = -8; z <= -6; z++) for (let y = MF + 1; y <= MF + 3; y++) p.set(10, y, z, "minecraft:gravel").mark("cascalho", 10, y, z);
    for (let i = 0; i < 18; i++) p.set(17 - Math.floor(rnd() * 2) * 7, MF + 1 + Math.floor(rnd() * 4), -11 + Math.floor(rnd() * 9), `${NS}:minerio_mithril`);
    p.set(16, MF + 1, -11, `${NS}:minerio_mithril`).set(16, MF + 2, -11, `${NS}:minerio_mithril`);
    p.chest(15, MF + 1, -4, "west", "mina_segredo");
    p.set(12, MF + 1, -11, B.lantern("minecraft:soul_lantern")).set(11, MF + 1, -3, "minecraft:skeleton_skull");
    p.box("sala_veio", 11, MF + 1, -11, 16, MF + 4, -3);
    // ---- salão do fundo (o capataz)
    p.room(-7, MF, -38, 7, MF + 6, -26, "minecraft:stone_bricks", "minecraft:polished_andesite");
    for (let x = -1; x <= 1; x++) for (let y = MF + 1; y <= MF + 3; y++) p.set(x, y, -26, AIR);
    for (const [x, z] of [[-5, -28], [5, -28], [-5, -36], [5, -36]]) for (let y = MF + 1; y <= MF + 5; y++) p.set(x, y, z, "minecraft:chiseled_stone_bricks");
    p.set(0, MF + 1, -36, "minecraft:anvil").set(-2, MF + 1, -36, B.fire("minecraft:soul_campfire")).set(2, MF + 1, -36, "minecraft:blast_furnace");
    p.set(-4, MF + 1, -31, B.barrel()).set(4, MF + 1, -31, B.barrel());
    p.mark("capataz", 0, MF + 1, -33).mark("bau_capataz", 0, MF + 1, -37);
    p.box("sala_fundo", -6, MF + 1, -37, 6, MF + 5, -27);
    for (const [x, z] of [[0, -8], [-1, -20], [-8, -12]]) p.mark("mineiro", x, MF + 1, z);
    p.mark("fantasma", -9, MF + 1, -11).mark("fantasma", 0, MF + 1, -24);
    p.box("area", -8, MF - 1, -38, 17, 8, 8);
    return { plans: [prep, p], plan: p };
  },
  guards: [["mineiro", "minecraft:zombie"], ["fantasma", `${NS}:fantasma_anao`]],
  mecanismos: MINA_MECS,
};

// ====================================================================== BIBLIOTECA ANCESTRAL
const BIB_SEQ = { k: "sequencia", id: "estantes", input: "lever", n: 4, entradas: "alavanca", porta: "alcapao", leitor: "indice",
  nome: "As estantes", tituloPista: "Índice do Bibliotecário", falha: "despertar", guardioes: "estante_fantasma", mob: `${NS}:espectro`,
  prologo: "§8Na última página do índice, uma nota à margem:§r", obj: "Abrir o Arquivo Proibido", xp: 150,
  depois: { msg: "§7Uma laje do piso afunda e revela uma escada para o arquivo" } };
export const BIBLIOTECA = {
  id: "biblioteca", nome: "Biblioteca Ancestral", raridade: "incomum", raio: 9, alturaMax: 4, xp: 75, xpLimpo: 200, repovoar: 70,
  nivel: 8, peso: 2, espaco: 700,
  nomes: ["Biblioteca de Aldmoor", "Scriptorium dos Aetherianos", "Biblioteca da Pena Cinzenta", "Arquivo de Valéria"],
  descricao: "Salão de leitura aetheriano tomado por bibliotecários espectrais. Quatro alavancas guardam o Arquivo Proibido.",
  dica: "§dPáginas soltas voam com o vento",
  biomas: ["forest", "birch", "dark_forest", "roofed", "taiga", "plains", "meadow", "cherry", "grove", "pale"],
  objLimpo: "Acalmar os bibliotecários espectrais",
  async plan(dim, origin, rot, rnd, seed) {
    const p = new Plan(origin, rot, rnd);
    const prep = await prepareGround(dim, p, -9, -9, 9, 9, 16, "minecraft:dirt", (x, z) =>
      Math.abs(x) <= 1 && z > 7 ? "minecraft:grass_path" : grassy(p));
    const base = "minecraft:deepslate_bricks";
    // paredes: base de ardósia, colunas de carvalho escuro e reboco de calcita, janelas altas
    for (let y = 1; y <= 9; y++) {
      for (let x = -6; x <= 6; x++) for (let z = -7; z <= 7; z++) {
        const edge = Math.abs(x) === 6 || Math.abs(z) === 7;
        if (!edge) { p.set(x, y, z, AIR); continue; }
        const corner = Math.abs(x) === 6 && Math.abs(z) === 7;
        const post = corner || (Math.abs(z) === 7 ? x % 3 === 0 : z % 3 === 0);
        let blk = y <= 2 ? base : post ? B.log("minecraft:dark_oak_log") : y === 5 || y === 9 ? B.log("minecraft:dark_oak_log", Math.abs(z) === 7 ? "x" : "z") : "minecraft:calcite";
        if (!post && (y === 3 || y === 4 || y === 7 || y === 8) && (Math.abs(z) === 7 ? Math.abs(x) % 3 === 1 : Math.abs(z) % 3 === 1)) blk = B.fence("minecraft:glass_pane", Math.abs(x) === 6, Math.abs(z) === 7);
        p.set(x, y, z, blk);
      }
    }
    p.fill(-5, 0, -6, 5, 0, 6, "minecraft:dark_oak_planks");
    for (let x = -5; x <= 5; x++) for (let z = -6; z <= 6; z++) if ((x + z) % 2 === 0) p.set(x, 0, z, "minecraft:spruce_planks");
    gableRoof(p, -6, -7, 6, 7, 10, { stairs: "minecraft:deepslate_tile_stairs", slab: "minecraft:deepslate_tile_slab", gable: "minecraft:calcite", axis: "z" });
    p.set(0, 1, 7, AIR).set(0, 2, 7, AIR).set(0, 3, 7, AIR);
    // mezanino (piso do 2º andar em anel) com escada
    for (let x = -5; x <= 5; x++) for (let z = -6; z <= 6; z++) if (Math.abs(x) >= 3 || Math.abs(z) >= 4) p.set(x, 5, z, "minecraft:dark_oak_planks");
    for (let x = -2; x <= 2; x++) for (const z of [-4, 4]) p.set(x, 6, z, B.fence("minecraft:dark_oak_fence", false, true));
    for (let z = -3; z <= 3; z++) for (const x of [-3, 3]) p.set(x, 6, z, B.fence("minecraft:dark_oak_fence", true, false));
    // escada até o mezanino (sobe para o norte, rente à parede leste)
    for (let i = 0; i < 4; i++) {
      p.set(5, 1 + i, 2 - i, B.stairs("minecraft:dark_oak_stairs", "north"));
      for (let y = 1; y <= i; y++) p.set(5, y, 2 - i, "minecraft:dark_oak_planks");
      p.set(5, 5, 2 - i, AIR);
    }
    // corredores de estantes no térreo
    for (const x of [-4, -2, 2]) for (let z = -1; z <= 4; z++) for (let y = 1; y <= 3; y++) p.set(x, y, z, rnd() < 0.9 ? "minecraft:bookshelf" : "minecraft:chiseled_bookshelf");
    // nichos do enigma na parede norte: cor do símbolo + alavanca
    const syms = symbolsFor(seed, BIB_SEQ);
    [-3, -1, 1, 3].forEach((x, i) => {
      p.set(x, 1, -6, syms[i].lã).set(x, 2, -6, B.lever("x"));
      p.set(x, 3, -6, B.candle(2)).set(x, 1, -7, "minecraft:bookshelf").set(x, 2, -7, "minecraft:bookshelf");
      p.mark("alavanca", x, 2, -6);
    });
    for (const x of [-5, -4, -2, 0, 2, 4, 5]) for (let y = 1; y <= 3; y++) p.set(x, y, -6, "minecraft:bookshelf");
    p.set(0, 0, -4, "minecraft:chiseled_deepslate"); // laje com o glifo do arquivo
    p.mark("alcapao", 0, 0, -4);
    p.set(-1, 1, -3, B.facing("minecraft:lectern", "north")).set(1, 1, -3, B.candle(3));
    p.mark("indice", -1, 1, -3);
    // mesas de leitura
    for (const [x, z] of [[3, 3], [3, 5], [-5, 5]]) p.set(x, 1, z, B.slab("minecraft:dark_oak_slab", true)).set(x, 2, z, B.candle(1));
    p.set(-5, 1, 2, B.facing("minecraft:lectern", "east"));
    // mezanino: baú e prateleiras
    for (let x = -5; x <= 5; x += 2) p.set(x, 6, -6, "minecraft:bookshelf").set(x, 7, -6, "minecraft:bookshelf");
    p.chest(-4, 6, 5, "east", "biblioteca", { lore: "aetherianos_bibliotecas" });
    p.set(0, 8, 0, B.lantern("minecraft:soul_lantern", true));
    // Arquivo Proibido (subsolo)
    p.room(-5, -6, -8, 5, -1, -1, "minecraft:deepslate_tiles", "minecraft:polished_deepslate");
    for (let y = -5; y <= -1; y++) p.set(0, y, -5, "minecraft:deepslate_bricks").set(0, y, -4, B.ladder("south"));
    for (const x of [-4, -3, 3, 4]) for (let y = -5; y <= -3; y++) p.set(x, y, -7, "minecraft:bookshelf");
    p.chest(0, -5, -7, "south", "biblioteca_arquivo", { item: `${NS}:tomo_perdido` });
    p.set(-2, -5, -2, B.lantern("minecraft:soul_lantern")).set(2, -5, -2, "minecraft:enchanting_table");
    p.set(-3, -5, -3, B.cluster()).set(3, -5, -4, B.cluster());
    p.box("sala_arquivo", -4, -5, -7, 4, -3, -2);
    for (const [x, z] of [[-3, 1], [3, -1]]) p.mark("bibliotecario", x, 1, z);
    p.mark("bibliotecario", 0, 6, 5);
    p.mark("estante_fantasma", -3, 1, -4).mark("estante_fantasma", 3, 1, -4);
    p.box("area", -9, -7, -9, 9, 16, 9);
    return { plans: [prep, p], plan: p };
  },
  guards: [["bibliotecario", `${NS}:espectro`]],
  mecanismos: [
    BIB_SEQ,
    { k: "segredo", id: "arquivo", sala: "sala_arquivo", obj: "Entrar no Arquivo Proibido", nome: "O Arquivo Proibido", xp: 80 },
  ],
};

// ====================================================================== POSTO DE OBSERVAÇÃO
export const POSTO = {
  id: "posto", nome: "Posto de Observação", raridade: "incomum", raio: 6, alturaMax: 5, xp: 60, xpLimpo: 140, repovoar: 50,
  nivel: 3, peso: 3, espaco: 650,
  nomes: ["Olho do Falcão", "Torre do Vigilante", "Posto da Colina Alta", "Atalaia de Pedramar"],
  descricao: "Atalaia alta tomada por aranhas. Do topo, a luneta do vigia revela locais desconhecidos nas redondezas (uma vez por dia).",
  dica: "§7Uma atalaia solitária domina a paisagem",
  biomas: [""],
  objLimpo: "Livrar a atalaia das aranhas",
  async plan(dim, origin, rot, rnd) {
    const p = new Plan(origin, rot, rnd);
    const prep = await prepareGround(dim, p, -6, -6, 6, 6, 24, "minecraft:dirt", (x, z) => (Math.abs(x) <= 3 && Math.abs(z) <= 3 ? "minecraft:cobblestone" : grassy(p)));
    const H = 18;
    for (let y = 1; y <= H; y++) {
      for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) {
        const edge = Math.abs(x) === 3 || Math.abs(z) === 3;
        const corner = Math.abs(x) === 3 && Math.abs(z) === 3;
        if (!edge) { p.set(x, y, z, AIR); continue; }
        if (y <= 6) p.set(x, y, z, p.pick([["minecraft:stone_bricks", 5], ["minecraft:mossy_stone_bricks", 2], ["minecraft:cobblestone", 1]]));
        else if (corner) p.set(x, y, z, B.log("minecraft:spruce_log"));
        else if (y % 6 === 0) p.set(x, y, z, B.log("minecraft:spruce_log", Math.abs(z) === 3 ? "x" : "z"));
        else p.set(x, y, z, (x === 0 || z === 0) && y % 6 === 3 ? B.fence("minecraft:glass_pane", Math.abs(x) === 3, Math.abs(z) === 3) : "minecraft:spruce_planks");
      }
    }
    for (const fy of [6, 12]) for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) if (!(x === 0 && z === -2)) p.set(x, fy, z, "minecraft:spruce_planks");
    for (let y = 1; y <= H; y++) p.set(0, y, -2, B.ladder("south"));
    p.set(0, 1, 3, AIR).set(0, 2, 3, AIR);
    // plataforma do topo com ameias, telhado e a luneta
    for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) {
      if (x === 0 && z === -2) continue; // abertura da escada de mão
      p.set(x, H, z, Math.abs(x) <= 3 && Math.abs(z) <= 3 ? "minecraft:spruce_planks" : B.slab("minecraft:spruce_slab", true));
      if (Math.abs(x) === 4 || Math.abs(z) === 4) p.set(x, H + 1, z, B.fence("minecraft:spruce_fence", Math.abs(x) === 4, Math.abs(z) === 4));
    }
    for (const [x, z] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) for (let y = H + 1; y <= H + 4; y++) p.set(x, y, z, B.log("minecraft:spruce_log"));
    for (let k = 0; k <= 4; k++) for (let x = -5 + k; x <= 5 - k; x++) for (let z = -5 + k; z <= 5 - k; z++) {
      if (Math.abs(x) === 5 - k || Math.abs(z) === 5 - k) p.set(x, H + 5 + k, z, "minecraft:dark_oak_planks");
    }
    p.set(0, H + 1, 2, B.fence("minecraft:spruce_fence")).set(0, H + 2, 2, ["minecraft:lightning_rod", { facing_direction: 3 }]);
    p.mark("luneta", 0, H + 2, 2).mark("luneta", 0, H + 1, 2);
    p.set(1, H + 1, 2, B.facing("minecraft:lectern", "west"));
    p.mark("registro", 1, H + 1, 2);
    p.chest(-2, H + 1, -2, "south", "posto");
    // andares: abandono e teias
    for (const [x, y, z] of [[2, 8, 1], [-2, 10, -1], [1, 15, 2], [-2, 14, 1], [2, 3, -2], [-1, 17, 0]]) p.set(x, y, z, "minecraft:web");
    p.set(2, 7, 2, B.barrel()).set(-2, 13, 2, "minecraft:hay_block").set(2, 1, 2, B.barrel()).set(-2, 1, 2, B.deadFire());
    p.mark("aranha", 1, 7, 1).mark("aranha", -1, 13, 1).mark("aranha", 1, 1, 0);
    p.box("area", -6, -1, -6, 6, H + 10, 6);
    return { plans: [prep, p], plan: p };
  },
  guards: [["aranha", "minecraft:spider"]],
  mecanismos: [
    { k: "leitura", id: "registro", bloco: "registro", titulo: "Registro do Vigia",
      texto: () => "§fUma tabela de avistamentos, a última linha borrada:\n\n§7\"Fumaça a oeste: salteadores. Luzes na colina: santuário. " +
        "Asas enormes ao norte, ao entardecer... não é ave nenhuma.\"\n\n§8(Use a luneta no parapeito para revelar locais desconhecidos ao redor. Uma vez por dia.)" },
    { k: "interagir", id: "luneta", bloco: "luneta", obj: "Observar o horizonte pela luneta",
      fn: (player, rec) => {
        const d = getData(player);
        d.expl = d.expl || {};
        const pr = (d.expl[rec.id] = d.expl[rec.id] || { o: {}, c: 0 });
        const today = Math.floor(world.getAbsoluteTime() / 24000);
        if (pr.luneta === today) {
          player.onScreenDisplay.setActionBar("§7Você já esquadrinhou o horizonte hoje. Volte amanhã.");
          return;
        }
        pr.luneta = today;
        markDirty(player);
        psound(player, "item.spyglass.use", 1, 1);
        particle(player.dimension, "vento_explosao", player.location, { radius: 1 });
        const n = revealMany(player, 3, 800, "visto da atalaia");
        if (!n) revealRumor(player, { motivo: "visto da atalaia" }).catch(() => {});
        else addXP(player, 40 * n, "observação");
        credit(player, rec, "luneta");
      } },
  ],
};

// ====================================================================== CAMPO DE BATALHA ANTIGO
export const CAMPO_BATALHA = {
  id: "campo_batalha", nome: "Campo de Batalha Antigo", raridade: "incomum", raio: 14, alturaMax: 4, xp: 70, limpeza: false,
  nivel: 10, peso: 2, espaco: 800,
  nomes: ["Campo da Última Carga", "Vale dos Estandartes", "Planície das Lanças Partidas", "Campo de Torvel"],
  descricao: "Onde dois exércitos caíram há séculos. À noite os ecos da batalha se levantam e, por fim, o Comandante Caído.",
  dica: "§8Lanças partidas cobrem a planície",
  biomas: ["plains", "savanna", "meadow", "sunflower", "windswept", "taiga", "snowy_plains", "desert", "badlands", "mesa"],
  async plan(dim, origin, rot, rnd) {
    const p = new Plan(origin, rot, rnd);
    const prep = await prepareGround(dim, p, -14, -14, 14, 14, 10, "minecraft:dirt", (x, z) =>
      p.pick([["minecraft:grass_block", 6], ["minecraft:coarse_dirt", 3], ["minecraft:podzol", 1], ["minecraft:gravel", 1]]));
    // crateras
    for (let i = 0; i < 6; i++) {
      const cx = Math.round((rnd() - 0.5) * 20);
      const cz = Math.round((rnd() - 0.5) * 20);
      for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) {
        if (Math.hypot(x, z) > 2.3) continue;
        p.set(cx + x, 0, cz + z, Math.hypot(x, z) < 1.2 ? "minecraft:gravel" : "minecraft:coarse_dirt");
        if (Math.hypot(x, z) < 1.2) p.set(cx + x, -1, cz + z, "minecraft:gravel");
      }
    }
    // lanças fincadas, escudos e crânios
    for (let i = 0; i < 28; i++) {
      const x = Math.round((rnd() - 0.5) * 24);
      const z = Math.round((rnd() - 0.5) * 24);
      if (Math.abs(x) <= 3 && z <= -6 && z >= -12) continue;
      const r = rnd();
      if (r < 0.45) { p.set(x, 1, z, B.fence("minecraft:spruce_fence")); if (rnd() < 0.5) p.set(x, 2, z, B.fence("minecraft:spruce_fence")); }
      else if (r < 0.65) p.set(x, 1, z, "minecraft:skeleton_skull");
      else if (r < 0.8) p.set(x, 1, z, B.trapdoor("minecraft:iron_trapdoor", "north"));
      else p.set(x, 1, z, B.slab("minecraft:cobblestone_slab"));
    }
    // torre de cerco destruída
    for (let y = 1; y <= 6; y++) for (const [x, z] of [[8, 6], [11, 6], [8, 9], [11, 9]]) if (y < 4 || rnd() < 0.6) p.set(x, y, z, B.log("minecraft:dark_oak_log"));
    for (let x = 8; x <= 11; x++) for (let z = 6; z <= 9; z++) if (rnd() < 0.55) p.set(x, 4, z, "minecraft:dark_oak_planks");
    for (let i = 0; i < 6; i++) p.set(7 - i % 3, 1, 10 + Math.floor(i / 3), B.log("minecraft:dark_oak_log", "x"));
    // túmulo do comandante: marco de pedra, fogueira das almas e o epitáfio
    for (let x = -3; x <= 3; x++) for (let z = -12; z <= -6; z++) {
      const d = Math.max(Math.abs(x), Math.abs(z + 9));
      p.set(x, 0, z, "minecraft:polished_andesite");
      if (d === 3 && (x + z) % 2 === 0) p.set(x, 1, z, "minecraft:cobblestone_wall");
    }
    for (let y = 1; y <= 3; y++) p.set(0, y, -11, y === 3 ? "minecraft:chiseled_stone_bricks" : "minecraft:stone_bricks");
    p.set(0, 4, -11, "minecraft:skeleton_skull").set(-1, 1, -11, B.soulFire()).set(1, 1, -11, B.soulFire());
    p.set(0, 1, -7, B.facing("minecraft:lectern", "south"));
    p.mark("epitafio_comandante", 0, 1, -7);
    p.chest(2, 1, -10, "west", "campo_batalha");
    p.mark("comandante", 0, 1, -9);
    p.box("sala_marco", -3, 0, -12, 3, 4, -6);
    for (const [x, z] of [[-8, -4], [7, -3], [-6, 6], [5, 2], [-2, 9], [10, -8], [-10, 1]]) p.mark("eco", x, 1, z);
    p.box("sala_campo", -14, 0, -14, 14, 6, 14);
    p.box("area", -14, -2, -14, 14, 8, 14);
    return { plans: [prep, p], plan: p };
  },
  mecanismos: [
    { k: "leitura", id: "epitafio", bloco: "epitafio_comandante", titulo: "Marco do Comandante Torvel",
      texto: () => "§fLetras fundas na pedra:\n\n§7\"TORVEL, COMANDANTE DA VANGUARDA.\nJUROU NÃO RECUAR, E NÃO RECUOU.\n" +
        "SEUS HOMENS AINDA MARCHAM QUANDO A LUA SOBE.\"\n\n§8(À noite, os ecos da batalha se levantam no campo. Vença-os para despertar o Comandante.)" },
    { k: "ondas", id: "ecos", sala: "sala_campo", pontos: "eco", noite: true, obj: "Vencer os Ecos da Batalha", titulo: "§8Os Ecos da Batalha!",
      vitoria: "Os ecos se dissipam... a terra treme junto ao marco", xp: 220,
      ondas: [[["minecraft:skeleton", 3], ["minecraft:zombie", 2]], [["minecraft:skeleton", 2], ["minecraft:zombie", 2], ["minecraft:stray", 1]],
        [["minecraft:skeleton", 2], [`${NS}:cavaleiro_corrompido`, 1], ["minecraft:husk", 2]]] },
    { k: "guardiao", id: "comandante", ponto: "comandante", sala: "sala_marco", requer: "ecos", tipo: `${NS}:cavaleiro_corrompido`,
      nome: "Comandante Torvel", nivel: 3, subtitulo: "o Comandante Caído se ergue", obj: "Derrotar o Comandante Caído", xp: 320,
      solta: [[`${NS}:estandarte_comandante`, 1], [`${NS}:moeda_ouro`, 30]] },
  ],
};

export const INCOMUNS = [MINA, BIBLIOTECA, POSTO, CAMPO_BATALHA];
