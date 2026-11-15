// Missões: campanha principal (Crônica I) e contratos repetíveis, com rastreamento e recompensas.
import { world, ItemStack } from "@minecraft/server";
import { NS, say, countItem, takeItem, giveItem, isPlayer, tick } from "../core/util.js";
import { psound, particle } from "../core/fx.js";
import { getData, markDirty, saveNow } from "../core/store.js";
import { addXP, onLevelUp } from "../rpg/progression.js";
import { onKill } from "../core/damage.js";
import { summonOwner } from "../abilities/engine.js";

const UNDEAD = ["minecraft:zombie", "minecraft:skeleton", "minecraft:husk", "minecraft:stray", "minecraft:drowned",
  "minecraft:zombie_villager", "minecraft:bogged", `${NS}:espectro`];
const GOBLINS = [`${NS}:goblin`, `${NS}:goblin_xama`];

export const LORE_INTRO = "§7Há mil anos, os §dAetherianos§7 uniram Valdoria com a energia dos cristais de Aetherita - até a " +
  "§cRuptura§7 apagar sua civilização. Hoje os reinos estão divididos, criaturas corrompidas vagam pelas terras e os antigos " +
  "Guardiões despertam. Você carrega um §eSigilo Aetheriano§7 - e ele começou a brilhar.";

/** Campanha principal: cada passo tem um objetivo verificável. */
export const CHAPTER = [
  { cap: "I", titulo: "O Errante", texto: "O sigilo reage à sua presença. Antes de tudo, descubra quem você é.",
    obj: { tipo: "raca" }, alvo: "Escolha sua raça no Diário", recompensa: { xp: 50, itens: [[`${NS}:pocao_energia`, 3]] } },
  { titulo: "Primeiros Passos", texto: "Fortaleça-se explorando e enfrentando as ameaças das planícies.",
    obj: { tipo: "nivel", n: 3 }, alvo: "Alcance o nível 3", recompensa: { xp: 80, itens: [[`${NS}:lingote_aco`, 4]] } },
  { titulo: "Ameaça Goblin", texto: "Bandos goblins atacam viajantes nas estradas de Valdoria. Detenha-os.",
    obj: { tipo: "abate", alvos: GOBLINS, n: 6 }, alvo: "Derrote 6 goblins",
    recompensa: { xp: 150, itens: [[`${NS}:cristal_aetherita`, 2], [`${NS}:essencia_arcana`, 1]] } },
  { titulo: "Ecos Arcanos", texto: "O sigilo sussurra fórmulas antigas. Aprenda seu primeiro feitiço no Grimório.",
    obj: { tipo: "magias", n: 1 }, alvo: "Aprenda 1 feitiço", recompensa: { xp: 100, itens: [[`${NS}:pocao_energia`, 3]] } },
  { titulo: "Fragmentos de Aetherita", texto: "Os cristais aetherianos brilham nas profundezas, sob a ardósia.",
    obj: { tipo: "possuir", item: `${NS}:cristal_aetherita`, n: 4 }, alvo: "Tenha 4 Cristais de Aetherita",
    recompensa: { xp: 200, itens: [[`${NS}:pedra_aprimoramento`, 2]] } },
  { titulo: "A Forja Rúnica", texto: "Construa uma Mesa Rúnica e use-a para aprimorar seu equipamento.",
    obj: { tipo: "flag", flag: "mesa" }, alvo: "Use uma Mesa Rúnica", recompensa: { xp: 150, itens: [[`${NS}:runa_fogo`, 1]] } },
  { titulo: "Provação", texto: "Somente aventureiros experientes sobreviverão ao que está por vir.",
    obj: { tipo: "nivel", n: 10 }, alvo: "Alcance o nível 10", recompensa: { xp: 250, itens: [[`${NS}:lingote_mithril`, 3]] } },
  { titulo: "O Ídolo Adormecido", texto: "Os textos aetherianos falam de um guardião de pedra que protege o próximo fragmento. Fabrique o Ídolo do Titã.",
    obj: { tipo: "possuir", item: `${NS}:idolo_tita`, n: 1 }, alvo: "Fabrique o Ídolo do Titã", recompensa: { xp: 200, itens: [] } },
  { titulo: "O Despertar da Pedra", texto: "Use o Ídolo em campo aberto e derrote o Titã de Pedra.",
    obj: { tipo: "chefe", n: 1 }, alvo: "Derrote o Titã de Pedra", recompensa: { xp: 600, itens: [[`${NS}:pedra_aprimoramento`, 4]] } },
  // ---------------------------------------------------------------- Crônica II - O Senhor dos Mortos
  { cap: "II", titulo: "Rumores de Guerra", texto: "Os goblins andam organizados demais para simples saqueadores. Encontre um " +
    "Acampamento Goblin e liberte-o. (O Mapa do Explorador revela locais próximos.)",
    obj: { tipo: "flag", flag: "limpo_acampamento" }, alvo: "Liberte um Acampamento Goblin",
    recompensa: { xp: 300, itens: [[`${NS}:lingote_aco`, 4], [`${NS}:pocao_energia`, 2]] } },
  { cap: "II", titulo: "A Torre do Arquimago", texto: "As ordens do chefe goblin falam de uma torre velha e assombrada. Explore a " +
    "Torre do Mago em Ruínas e leia o segundo volume do diário de Aldric, guardado no topo.",
    obj: { tipo: "lore", id: "aldric_2" }, alvo: "Leia o Diário de Aldric (II)",
    recompensa: { xp: 350, itens: [[`${NS}:essencia_arcana`, 3], [`${NS}:cristal_aetherita`, 2]] } },
  { cap: "II", titulo: "A Cripta Ancestral", texto: "Aldric encontrou a cripta de Malachar, o último rei antes da Ruptura. " +
    "Encontre uma Cripta Ancestral: um mausoléu sombrio cercado de túmulos.",
    obj: { tipo: "flag", flag: "descoberto_cripta" }, alvo: "Descubra uma Cripta Ancestral",
    recompensa: { xp: 250, itens: [[`${NS}:pocao_energia`, 3]] } },
  { cap: "II", titulo: "A Chave do Coveiro", texto: "A Câmara do Trono está lacrada por um selo de Aetherita. Encontre a chave na " +
    "biblioteca da cripta e rompa o selo - cuidado com os espinhos e as bocas de fogo.",
    obj: { tipo: "flag", flag: "portao_cripta" }, alvo: "Abra o Portão Selado", recompensa: { xp: 300, itens: [[`${NS}:pedra_aprimoramento`, 2]] } },
  { cap: "II", titulo: "O Senhor dos Mortos", texto: "Malachar aguarda no trono. Destrua seus filactérios para romper o escudo de " +
    "almas e devolva o rei ao pó.", obj: { tipo: "flag", flag: "malachar" }, alvo: "Derrote o Senhor dos Mortos",
    recompensa: { xp: 900, itens: [[`${NS}:pedra_aprimoramento`, 4], [`${NS}:lingote_mithril`, 4]] } },
  { cap: "II", titulo: "Epílogo: O Véu Negro", texto: "O testamento de Malachar fala da Dama de Véu Negro, que reúne os fragmentos " +
    "do Coração de Aetherita. Antes de segui-la, fortaleça-se.",
    obj: { tipo: "nivel", n: 14 }, alvo: "Alcance o nível 14", recompensa: { xp: 300, itens: [[`${NS}:pocao_energia`, 3]] } },
  // ---------------------------------------------------------------- Crônica III - O Reino Sombrio
  { cap: "III", titulo: "Cavalaria de Valdoria", texto: "O Capitão da Guarda de uma vila guarda um corcel de guerra para quem vai " +
    "enfrentar o Domínio do Fogo. Fale com ele e escolha \"Cavalaria de Valdoria\".",
    obj: { tipo: "flag", flag: "corcel" }, alvo: "Receba o Corcel do Capitão da Guarda",
    recompensa: { xp: 200, itens: [["minecraft:golden_carrot", 6], ["minecraft:hay_block", 2]] } },
  { cap: "III", titulo: "O Domínio do Fogo", texto: "Aldric escreveu sobre um dragão que guarda um fragmento do Coração. Encontre o " +
    "Ninho do Dragão: uma cratera de basalto cercada de ossos colossais. (O Mapa do Explorador ajuda.)",
    obj: { tipo: "flag", flag: "descoberto_ninho" }, alvo: "Descubra um Ninho do Dragão",
    recompensa: { xp: 400, itens: [[`${NS}:pocao_energia`, 3], [`${NS}:runa_gelo`, 1]] } },
  { cap: "III", titulo: "Ignaroth, o Dragão Ancestral", texto: "Entre na cratera e enfrente Ignaroth. Corra para os lados do sopro, saia " +
    "das marcas no chão, pule o anel de chamas e aproveite quando ele pousar exausto.",
    obj: { tipo: "flag", flag: "ignaroth" }, alvo: "Derrote o Dragão Ancestral",
    recompensa: { xp: 1200, itens: [[`${NS}:pedra_aprimoramento`, 4], [`${NS}:lingote_mithril`, 4]] } },
  { cap: "III", titulo: "O Santuário do Véu Negro", texto: "A crônica escondida no tesouro de Ignaroth revela o refúgio da Dama de Véu " +
    "Negro: uma catedral sombria guardada por acólitos. Encontre o Santuário do Véu Negro.",
    obj: { tipo: "flag", flag: "descoberto_santuario" }, alvo: "Descubra o Santuário do Véu Negro",
    recompensa: { xp: 500, itens: [[`${NS}:runa_luz`, 2]] } },
  { cap: "III", titulo: "A Rainha das Trevas", texto: "Vaelith aguarda no trono. Quebre as cópias translúcidas, fuja do círculo depois " +
    "da corrente e, no Eclipse, fique dentro de um círculo de luz.", obj: { tipo: "flag", flag: "vaelith" }, alvo: "Derrote a Rainha das Trevas",
    recompensa: { xp: 1500, itens: [[`${NS}:pedra_aprimoramento`, 5], [`${NS}:elixir_renascimento`, 1]] } },
  { cap: "III", titulo: "Epílogo: O Coração Partido", texto: "Com Vaelith derrotada, os fragmentos do Coração de Aetherita voltam a " +
    "pulsar... e um mensageiro real procura por você: o Rei Aldemar III convoca o portador do Sigilo. Fortaleça-se para a viagem.",
    obj: { tipo: "nivel", n: 16 }, alvo: "Alcance o nível 16", recompensa: { xp: 300, itens: [[`${NS}:pocao_energia`, 3]] } },
  // ---------------------------------------------------------------- Crônica IV - A Coroa de Valdoria
  { cap: "IV", titulo: "O Chamado da Coroa", texto: "A carta do rei traz o selo vermelho de Aurendel, a capital de Valdoria. Siga as " +
    "estradas e encontre a cidade das torres e estandartes. (Explore: ela surge perto de você.)",
    obj: { tipo: "flag", flag: "descoberto_capital" }, alvo: "Encontre Aurendel, a capital",
    recompensa: { xp: 400, itens: [["minecraft:golden_carrot", 4]] } },
  { cap: "IV", titulo: "Audiência Real", texto: "Atravesse a Praça da Coroa e o portão do castelo. No Salão do Trono, peça audiência " +
    "ao Rei Aldemar III.", obj: { tipo: "flag", flag: "audiencia" }, alvo: "Fale com o Rei no Salão do Trono",
    recompensa: { xp: 300, itens: [[`${NS}:selo_real`, 1]] } },
  { cap: "IV", titulo: "Provas do Reino", texto: "O Chanceler Real, na ala oeste do Salão do Trono, distribui as Missões Reais. Conclua " +
    "três delas para que seu nome entre no Livro de Honra.", obj: { tipo: "flag", flag: "provas_reais" }, alvo: "Conclua 3 Missões Reais",
    recompensa: { xp: 600, itens: [[`${NS}:pedra_aprimoramento`, 3]] } },
  { cap: "IV", titulo: "A Sagração", texto: "Volte ao Rei e ajoelhe-se: chegou a hora de ser sagrado Cavaleiro de Valdoria.",
    obj: { tipo: "flag", flag: "cavaleiro" }, alvo: "Seja sagrado pelo Rei", recompensa: { xp: 800, itens: [[`${NS}:lingote_mithril`, 4]] } },
  { cap: "IV", titulo: "Epílogo: Os Reinos Vizinhos", texto: "Cavaleiro de Valdoria, você carrega agora a bandeira do reino. Uma flecha " +
    "de prata crava-se na árvore ao seu lado, com um bilhete: a Rainha Lyrael, de Aelthar, pede ajuda contra uma praga. Prepare-se para a viagem.",
    obj: { tipo: "nivel", n: 18 }, alvo: "Alcance o nível 18", recompensa: { xp: 300, itens: [["minecraft:arrow", 32], [`${NS}:pocao_energia`, 2]] } },
  // ---------------------------------------------------------------- Crônica V - A Floresta que Esquece
  { cap: "V", titulo: "A Floresta que Lembra", texto: "O bilhete fala de uma árvore de casca prateada tão alta que toca as nuvens. " +
    "Encontre Aelthar, o Reino Élfico. (Explore florestas: ela surge perto de você.)",
    obj: { tipo: "flag", flag: "descoberto_aelthar" }, alvo: "Encontre Aelthar", recompensa: { xp: 400, itens: [["minecraft:arrow", 16]] } },
  { cap: "V", titulo: "O Conselho das Folhas", texto: "Suba a grande escadaria até a plataforma da Árvore-Mãe. No Salão do Conselho, ao " +
    "norte, fale com a Rainha Lyrael.", obj: { tipo: "flag", flag: "conselho_elfico" }, alvo: "Fale com a Rainha no Salão do Conselho",
    recompensa: { xp: 300, itens: [[`${NS}:essencia_natural`, 2]] } },
  { cap: "V", titulo: "Orvalho da Lua", texto: "A druida do Bosque, a sudoeste da Árvore-Mãe, guarda o Orvalho Lunar. Peça a ela os frascos.",
    obj: { tipo: "flag", flag: "orvalho" }, alvo: "Receba o Orvalho Lunar da druida", recompensa: { xp: 200, itens: [[`${NS}:pocao_energia`, 2]] } },
  { cap: "V", titulo: "A Praga Cinzenta", texto: "Três raízes cinzentas afloraram dentro da sebe: a oeste, a leste e ao norte. Use o Orvalho " +
    "Lunar em cada uma e derrote os brotos corrompidos que saírem da terra.", obj: { tipo: "flag", flag: "raizes_aelthar" },
    alvo: "Purifique as 3 Raízes Corrompidas", recompensa: { xp: 700, itens: [[`${NS}:pedra_aprimoramento`, 3]] } },
  { cap: "V", titulo: "O Coração de Ylthariel", texto: "O selo do salão das raízes se abriu. Desça o poço até o Coração e liberte Morthil, " +
    "o Guardião Cinzento. Saia dos círculos marcados e das nuvens de esporos; quando ele se enraizar para se curar, use fogo.",
    obj: { tipo: "flag", flag: "morthil" }, alvo: "Derrote Morthil, o Guardião Cinzento",
    recompensa: { xp: 1500, itens: [[`${NS}:pedra_aprimoramento`, 5], [`${NS}:lingote_mithril`, 4]] } },
  { cap: "V", titulo: "A Bênção de Aelthar", texto: "A seiva volta a correr pela Árvore-Mãe. Volte ao Salão do Conselho: a Rainha Lyrael quer " +
    "agradecer.", obj: { tipo: "flag", flag: "amigo_elfico" }, alvo: "Receba a Bênção da Rainha", recompensa: { xp: 600, itens: [[`${NS}:elixir_renascimento`, 1]] } },
  { cap: "V", titulo: "Epílogo: O Sussurro sob as Raízes", texto: "Morthil falou de um sussurro que chama os fragmentos do Coração de " +
    "Aetherita, e de algo no Reino Sombrio que responde. A estrada para as terras corrompidas é perigosa: fortaleça-se.",
    obj: { tipo: "nivel", n: 22 }, alvo: "Alcance o nível 22", recompensa: { xp: 400, itens: [[`${NS}:pocao_energia`, 3], ["minecraft:golden_apple", 2]] } },
  // ---------------------------------------------------------------- Crônica VI - O Trono Sombrio
  { cap: "VI", titulo: "As Terras Corrompidas", texto: "A terra morre onde o Reino Sombrio toca. Encontre a Cidadela de Nyxhal, de muralhas " +
    "de pedra-negra. (Explore: ela surge perto de você.)", obj: { tipo: "flag", flag: "descoberto_nyxhal" }, alvo: "Encontre Nyxhal",
    recompensa: { xp: 500, itens: [[`${NS}:pocao_energia`, 2]] } },
  { cap: "VI", titulo: "Os Três Selos de Sombra", texto: "Três obeliscos no pátio prendem a Barreira Sombria do Salão do Trono. Derrote os " +
    "Cavaleiros Corrompidos que guardam cada um e quebre o selo (use-o). Cuidado com as estátuas: algumas gárgulas só fingem dormir. O " +
    "escudo dos cavaleiros apara golpes de frente.", obj: { tipo: "flag", flag: "selos_nyxhal" }, alvo: "Quebre os 3 Selos de Sombra",
    recompensa: { xp: 900, itens: [[`${NS}:pedra_aprimoramento`, 4]] } },
  { cap: "VI", titulo: "O Trono Sombrio", texto: "Entre no Salão do Trono e derrube Azrakar, o Rei Demônio. Saia dos círculos e das " +
    "linhas marcadas; quando o salão escurecer no Eclipse, corra para um dos quatro Círculos de Luz do piso.",
    obj: { tipo: "flag", flag: "azrakar" }, alvo: "Derrote Azrakar, o Rei Demônio",
    recompensa: { xp: 2000, itens: [[`${NS}:elixir_renascimento`, 1], [`${NS}:lingote_mithril`, 6]] } },
  { cap: "VI", titulo: "Epílogo: Acima das Nuvens", texto: "Azrakar falou de um Guardião Celestial que guarda o último fragmento do Coração, " +
    "acima das nuvens. A luz não perdoa os fracos: fortaleça-se antes de subir.",
    obj: { tipo: "nivel", n: 26 }, alvo: "Alcance o nível 26", recompensa: { xp: 500, itens: [[`${NS}:pocao_energia`, 3], ["minecraft:golden_apple", 2]] } },
  // ---------------------------------------------------------------- Crônica VII - O Guardião Celestial
  { cap: "VII", titulo: "O Círculo dos Ventos", texto: "Uma sombra cobre o chão e não é de nuvem. Encontre o Santuário Celestial: no chão, " +
    "um círculo de colunas brancas; lá no alto, uma ilha flutuante. (Explore: ele surge perto de você.)",
    obj: { tipo: "flag", flag: "descoberto_celeste" }, alvo: "Encontre o Santuário Celestial", recompensa: { xp: 500, itens: [[`${NS}:pocao_energia`, 2]] } },
  { cap: "VII", titulo: "Pelos Ventos", texto: "Use a Pedra dos Ventos no centro do círculo para subir até a ilha. A mesma pedra, do " +
    "lado de cima, traz você de volta. Se cair, os ventos amparam a queda.", obj: { tipo: "flag", flag: "subiu_celeste" },
    alvo: "Suba à ilha pela Pedra dos Ventos", recompensa: { xp: 300, itens: [["minecraft:golden_apple", 1]] } },
  { cap: "VII", titulo: "Os Três Juramentos", texto: "Cumpra os juramentos nos três altares: o do Valor (ilhota oeste: derrote os " +
    "desafiantes), o da Sabedoria (ilhota leste: responda à pergunta sobre as Crônicas) e o do Sacrifício (praça: ofereça uma Maçã " +
    "Dourada e parte da sua vida).", obj: { tipo: "flag", flag: "juramentos_celeste" }, alvo: "Cumpra os 3 Juramentos",
    recompensa: { xp: 1000, itens: [[`${NS}:pedra_aprimoramento`, 4]] } },
  { cap: "VII", titulo: "O Guardião Celestial", texto: "Suba a escadaria até a Plataforma do Guardião e enfrente Auriel. Saia das linhas " +
    "e dos círculos marcados; na Rajada das Asas, agache-se para se firmar; no Juízo Celestial, corra PARA PERTO dele.",
    obj: { tipo: "flag", flag: "guardiao_celeste" }, alvo: "Vença Auriel, o Guardião Celestial",
    recompensa: { xp: 2500, itens: [[`${NS}:elixir_renascimento`, 1], [`${NS}:lingote_mithril`, 6]] } },
  { cap: "VII", titulo: "O Coração de Aetherita", texto: "O último fragmento se uniu aos outros. Erga o Coração de Aetherita (use-o) e " +
    "veja o que ele lembra.", obj: { tipo: "flag", flag: "coracao_reunido" }, alvo: "Use o Coração de Aetherita",
    recompensa: { xp: 1500, itens: [[`${NS}:pedra_aprimoramento`, 5], ["minecraft:enchanted_golden_apple", 1]] } },
  { cap: "VII", titulo: "Epílogo: Valdoria Respira", texto: "A Ruptura começa a fechar. A história principal termina aqui, mas Valdoria " +
    "continua: contratos, masmorras, chefes e reinos esperam por você.",
    obj: { tipo: "fim" }, alvo: "Fim da história principal", recompensa: { xp: 0, itens: [] } },
];

/** Contratos: repetíveis (cd em minutos reais) ou únicos. */
export const CONTRACTS = {
  caca_goblins: { nome: "Caça aos Goblins", desc: "Derrote 10 goblins.", obj: { tipo: "abate", alvos: GOBLINS, n: 10 }, cd: 20,
    recompensa: { xp: 200, itens: [["minecraft:gold_nugget", 6], [`${NS}:essencia_arcana`, 1]] } },
  xamas: { nome: "Desafio: Xamãs", desc: "Derrote 3 Goblins Xamãs.", obj: { tipo: "abate", alvos: [`${NS}:goblin_xama`], n: 3 }, cd: 30,
    recompensa: { xp: 260, itens: [[`${NS}:cristal_aetherita`, 1], [`${NS}:essencia_arcana`, 2]] } },
  espectros: { nome: "Espectros da Noite", desc: "Derrote 4 espectros.", obj: { tipo: "abate", alvos: [`${NS}:espectro`], n: 4 }, cd: 30,
    recompensa: { xp: 250, itens: [[`${NS}:cristal_aetherita`, 1], [`${NS}:pocao_energia`, 2]] } },
  mortos: { nome: "Mortos Inquietos", desc: "Derrote 15 mortos-vivos.", obj: { tipo: "abate", alvos: UNDEAD, n: 15 }, cd: 20,
    recompensa: { xp: 220, itens: [["minecraft:iron_ingot", 3], [`${NS}:runa_luz`, 1]] } },
  insignias: { nome: "Insígnias Goblin", desc: "Entregue 8 Insígnias Goblin.", obj: { tipo: "entregar", item: `${NS}:insignia_goblin`, n: 8 },
    cd: 15, recompensa: { xp: 180, itens: [[`${NS}:lingote_aco`, 2], [`${NS}:pocao_energia`, 1]] } },
  floresta: { nome: "Essência da Floresta", desc: "Entregue 3 Essências Naturais.", obj: { tipo: "entregar", item: `${NS}:essencia_natural`, n: 3 },
    cd: 15, recompensa: { xp: 150, itens: [[`${NS}:pedra_aprimoramento`, 1]] } },
  mithril: { nome: "Mineiro de Mithril", desc: "Entregue 6 Mithril Bruto.", obj: { tipo: "entregar", item: `${NS}:mithril_bruto`, n: 6 },
    cd: 20, recompensa: { xp: 300, itens: [[`${NS}:pedra_aprimoramento`, 2]] } },
  cartografo: { nome: "Cartógrafo de Valdoria", desc: "Descubra 8 regiões diferentes.", obj: { tipo: "regioes", n: 8 }, cd: -1,
    recompensa: { xp: 400, itens: [[`${NS}:amuleto_fortuna`, 1]] } },
  pacificador: { nome: "Pacificador", desc: "Liberte 1 Acampamento Goblin (expulse todos os goblins).",
    obj: { tipo: "evento", ev: "limpar", alvo: "acampamento", n: 1 }, cd: 30,
    recompensa: { xp: 350, itens: [[`${NS}:lingote_aco`, 3], [`${NS}:cristal_aetherita`, 1]] } },
  exorcista: { nome: "Exorcista", desc: "Liberte 1 Torre do Mago em Ruínas.", obj: { tipo: "evento", ev: "limpar", alvo: "torre", n: 1 },
    cd: 45, recompensa: { xp: 400, itens: [[`${NS}:essencia_arcana`, 3], [`${NS}:runa_luz`, 1]] } },
  kardum: { nome: "Os Portões de Kar'Dum", desc: "Liberte as Ruínas de Kar'Dum: desperte as runas e derrote o Rei Durgan.",
    obj: { tipo: "evento", ev: "limpar", alvo: "kardum", n: 1 }, cd: 90,
    recompensa: { xp: 900, itens: [[`${NS}:pedra_aprimoramento`, 3], [`${NS}:lingote_mithril`, 4]] } },
  explorador: { nome: "Explorador de Ruínas", desc: "Descubra 3 locais (acampamentos, torres ou criptas).", obj: { tipo: "locais", n: 3 },
    cd: -1, recompensa: { xp: 450, itens: [[`${NS}:mapa_explorador`, 1], [`${NS}:pedra_aprimoramento`, 2]] } },
  colecionador: { nome: "Colecionador", desc: "Descubra 25 itens do add-on.", obj: { tipo: "itens", n: 25 }, cd: -1,
    recompensa: { xp: 500, itens: [[`${NS}:elixir_renascimento`, 1]] } },
};
export const MAX_ACTIVE = 3;

// ------------------------------------------------------------------ progresso
function progressOf(player, obj, store) {
  const d = getData(player);
  switch (obj.tipo) {
    case "raca": return d.raca ? 1 : 0;
    case "nivel": return Math.min(d.nivel, obj.n);
    case "abate": return Math.min(store?.p || 0, obj.n);
    case "magias": return Math.min(d.magias.length, obj.n);
    case "possuir": case "entregar": return Math.min(countItem(player, obj.item), obj.n);
    case "flag": return d.flags?.[obj.flag] ? 1 : 0;
    case "chefe": return Math.min(d.chefes, obj.n);
    case "regioes": return Math.min(d.desc.biomas.length, obj.n);
    case "itens": return Math.min(d.desc.itens.length, obj.n);
    case "lore": return (d.lidos || []).includes(obj.id) ? 1 : 0;
    case "locais": return Math.min((d.locais || []).length, obj.n);
    case "evento": return Math.min(store?.p || 0, obj.n);
    default: return 0;
  }
}
function goalOf(obj) {
  return obj.n ?? 1;
}

export function chapterStep(player) {
  const d = getData(player);
  return { idx: d.historia, step: CHAPTER[Math.min(d.historia, CHAPTER.length - 1)] };
}

export function chapterProgress(player) {
  const d = getData(player);
  const step = CHAPTER[d.historia];
  if (!step) return { p: 0, n: 1, done: false };
  const p = progressOf(player, step.obj, d.missoes.cap);
  return { p, n: goalOf(step.obj), done: step.obj.tipo !== "fim" && p >= goalOf(step.obj) };
}

function giveReward(player, r) {
  for (const [id, n] of r.itens) giveItem(player, new ItemStack(id, n));
  if (r.xp) addXP(player, r.xp, "missão");
  particle(player.dimension, "nivel_anel", player.location);
  psound(player, "random.toast", 1, 1);
}

export function completeChapterStep(player) {
  const d = getData(player);
  const pr = chapterProgress(player);
  if (!pr.done) return false;
  const step = CHAPTER[d.historia];
  d.historia++;
  d.missoes.cap = { p: 0 };
  markDirty(player);
  say(player, `§6[Crônica ${step.cap || "I"}] §fConcluído: §e${step.titulo}`);
  giveReward(player, step.recompensa);
  const next = CHAPTER[d.historia];
  if (next) say(player, `§6[Crônica ${next.cap || "I"}] §fNovo objetivo: §a${next.alvo}`);
  saveNow(player);
  return true;
}

/** Modo de Teste: conclui a etapa atual da Crônica mesmo sem o objetivo cumprido. */
export function forceChapterStep(player) {
  const d = getData(player);
  const step = CHAPTER[d.historia];
  if (!step || step.obj.tipo === "fim") return "§7A campanha já está no último capítulo disponível.";
  d.historia++;
  d.missoes.cap = { p: 0 };
  markDirty(player);
  giveReward(player, step.recompensa);
  saveNow(player);
  const next = CHAPTER[d.historia];
  return `§6[Teste] Etapa concluída: ${step.titulo}${next ? ` §7- próxima: ${next.titulo}` : ""}`;
}

/** Modo de Teste: completa o progresso de todos os contratos ativos e zera os tempos de espera. */
export function completeContractsForTest(player) {
  const d = getData(player);
  for (const [id, st] of Object.entries(d.missoes.ativas)) {
    const c = CONTRACTS[id];
    if (c && (c.obj.tipo === "abate" || c.obj.tipo === "evento")) st.p = c.obj.n;
  }
  d.missoes.feitas = (d.missoes.feitas || []).filter((f) => CONTRACTS[f.id]?.cd < 0);
  markDirty(player);
  return "§6[Teste] Contratos de abate/eventos completos e tempos de espera zerados.";
}

export function contractState(player, id) {
  const d = getData(player);
  const c = CONTRACTS[id];
  const act = d.missoes.ativas[id];
  if (act) {
    const p = progressOf(player, c.obj, act);
    return { estado: p >= goalOf(c.obj) ? "pronto" : "ativo", p, n: goalOf(c.obj) };
  }
  const done = (d.missoes.feitas || []).filter((f) => f.id === id);
  if (c.cd < 0 && done.length) return { estado: "concluido" };
  const last = done.length ? done[done.length - 1].t : 0;
  const wait = last ? last + c.cd * 60000 - Date.now() : 0;
  if (wait > 0) return { estado: "espera", min: Math.ceil(wait / 60000) };
  return { estado: "disponivel" };
}

export function acceptContract(player, id) {
  const d = getData(player);
  if (Object.keys(d.missoes.ativas).length >= MAX_ACTIVE) return `§cMáximo de ${MAX_ACTIVE} contratos ativos.`;
  if (contractState(player, id).estado !== "disponivel") return "§cContrato indisponível no momento.";
  d.missoes.ativas[id] = { p: 0 };
  markDirty(player);
  return `§aContrato aceito: ${CONTRACTS[id].nome}`;
}

export function abandonContract(player, id) {
  const d = getData(player);
  delete d.missoes.ativas[id];
  markDirty(player);
  return "§7Contrato abandonado.";
}

export function turnInContract(player, id) {
  const st = contractState(player, id);
  if (st.estado !== "pronto") return "§cObjetivo ainda não concluído.";
  const c = CONTRACTS[id];
  if (c.obj.tipo === "entregar" && !takeItem(player, c.obj.item, c.obj.n)) return "§cItens insuficientes.";
  const d = getData(player);
  delete d.missoes.ativas[id];
  d.missoes.feitas = (d.missoes.feitas || []).filter((f) => f.id !== id).concat([{ id, t: Date.now() }]);
  markDirty(player);
  giveReward(player, c.recompensa);
  saveNow(player);
  return `§aContrato concluído: ${c.nome}!`;
}

export function setFlag(player, flag) {
  const d = getData(player);
  d.flags = d.flags || {};
  if (!d.flags[flag]) {
    d.flags[flag] = true;
    markDirty(player);
    notifyIfReady(player);
  }
}

const eventHooks = [];
/** Outros sistemas (Guilda) também acompanham os eventos de exploração. */
export function onQuestEvent(fn) {
  eventHooks.push(fn);
}

/** Eventos de exploração (limpar local, descobrir, ler texto, segredo): avançam contratos do tipo "evento". */
export function questEvent(player, ev, alvo) {
  for (const fn of eventHooks) {
    try { fn(player, ev, alvo); } catch (e) { console.warn(`[Valdoria] evento de missão: ${e}`); }
  }
  const d = getData(player);
  let changed = false;
  for (const [id, st] of Object.entries(d.missoes.ativas)) {
    const c = CONTRACTS[id];
    if (!c || c.obj.tipo !== "evento" || c.obj.ev !== ev || c.obj.alvo !== alvo) continue;
    st.p = (st.p || 0) + 1;
    changed = true;
    player.onScreenDisplay.setActionBar(`§bContrato ${c.nome}: §f${Math.min(st.p, c.obj.n)}/${c.obj.n}`);
    if (st.p === c.obj.n) psound(player, "random.orb", 1.4, 0.7);
  }
  if (changed) markDirty(player);
  notifyIfReady(player);
}

function notifyIfReady(player) {
  if (chapterProgress(player).done) {
    player.onScreenDisplay.setActionBar("§6Objetivo da Crônica concluído! §fAbra o Diário para receber a recompensa.");
    psound(player, "random.orb", 1.2, 0.7);
  }
}

function onKillQuest(ev) {
  let killer = ev.damageSource.damagingEntity;
  if (killer && !isPlayer(killer)) killer = summonOwner(killer);
  if (!isPlayer(killer)) return;
  const tid = ev.deadEntity.typeId;
  const d = getData(killer);
  const step = CHAPTER[d.historia];
  if (step && step.obj.tipo === "abate" && step.obj.alvos.includes(tid)) {
    d.missoes.cap = d.missoes.cap || { p: 0 };
    d.missoes.cap.p++;
    killer.onScreenDisplay.setActionBar(`§6Crônica: §f${step.alvo} §e${Math.min(d.missoes.cap.p, step.obj.n)}/${step.obj.n}`);
    notifyIfReady(killer);
  }
  for (const [id, st] of Object.entries(d.missoes.ativas)) {
    const c = CONTRACTS[id];
    if (!c || c.obj.tipo !== "abate" || !c.obj.alvos.includes(tid)) continue;
    st.p = (st.p || 0) + 1;
    killer.onScreenDisplay.setActionBar(`§bContrato ${c.nome}: §f${Math.min(st.p, c.obj.n)}/${c.obj.n}`);
    if (st.p === c.obj.n) psound(killer, "random.orb", 1.4, 0.7);
  }
  markDirty(killer);
}

export function startQuests() {
  onKill(onKillQuest);
  onLevelUp((p) => notifyIfReady(p));
}

export { tick, world };
