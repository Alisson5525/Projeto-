// Ofícios dos moradores: aparência (índice de textura), nomes, falas, loja e serviços.
import { NS } from "../core/util.js";

const I = (id) => (id.includes(":") ? id : `${NS}:${id}`);

/** Índices de ofício usados pela propriedade valdoria:oficio (aparência e itens na mão). */
export const OFICIO = { anciao: 0, ferreiro: 1, mercador: 2, alquimista: 3, taverneiro: 4, curandeira: 5, instrutor: 6, mestre_guilda: 7,
  fazendeiro: 8, capitao: 9, guarda: 10, prisioneiro: 11, forasteiro: 12, espiao: 13,
  rei: 14, chanceler: 15, joalheiro: 16, mago_corte: 17, armeiro: 18, cavaleiro_real: 19, cidadao: 20,
  rainha_elfica: 21, sabio_elfico: 22, druida: 23, arqueiro_elfico: 24, artesao_elfico: 25, elfo: 26 };

export const ROLES = {
  anciao: {
    titulo: "Ancião", nomes: ["Edric", "Aldous", "Berenice", "Osmund"], tipo: "aldeao", raio: 4, aberto: true,
    falas: ["Seja bem-vindo a nossa vila, viajante. Valdoria precisa de gente de coragem.",
      "Desde a Ruptura, cada pedra destas muralhas foi erguida com suor.",
      "Os goblins andam ousados demais. Alguém os paga, tenho certeza."],
    noite: ["Não consigo dormir... há algo de errado nesta vila à noite."],
    servicos: ["historia"],
  },
  ferreiro: {
    titulo: "Ferreiro", nomes: ["Bram", "Gunnar", "Hilda", "Torvald"], tipo: "aldeao", raio: 3, loja: "ferreiro",
    falas: ["Aço de Valdoria! Não há lâmina melhor deste lado das montanhas.", "Traga ferro e eu faço milagres.",
      "Essa arma já viu dias melhores. Quer que eu dê um jeito nela?"],
    noite: ["A forja esfria à noite. Volte ao amanhecer para negociar."],
    servicos: ["reparar"],
  },
  mercador: {
    titulo: "Mercadora", nomes: ["Lena", "Marta", "Isolde", "Pip"], tipo: "aldeao", raio: 3, loja: "mercador",
    falas: ["Pão fresco, tochas, flechas! E compro quase tudo que você trouxer da estrada.",
      "Insígnias goblins valem bem na capital, sabia?", "Preço justo para quem é honesto com a vila."],
    noite: ["A banca está fechada. Até amanhã, viajante."],
  },
  alquimista: {
    titulo: "Alquimista", nomes: ["Vesna", "Corvin", "Ysolde", "Maelis"], tipo: "aldeao", raio: 3, loja: "alquimista",
    falas: ["Essências, poções, runas... cuidado para não misturar as erradas.", "Cristais de Aetherita! Traga-os e pago bem.",
      "Sente esse cheiro? Pó de blaze. Não toque em nada."],
    noite: ["Meus caldeirões precisam descansar. Volte de dia."],
  },
  taverneiro: {
    titulo: "Taverneiro", nomes: ["Gorm", "Olaf", "Rosalind", "Barnaby"], tipo: "aldeao", raio: 3, loja: "taverna", aberto: true,
    falas: ["Bem-vindo ao Javali Dourado! Uma caneca, uma cama e as melhores histórias da estrada.",
      "Quem bebe aqui ouve de tudo. Quer saber algo? Custa uma moeda ou cinco.", "Cuidado com o banco do canto, ele morde."],
    noite: ["A noite é quando a taverna ganha vida! Sente-se, viajante."],
    servicos: ["descansar", "rumores"],
  },
  curandeira: {
    titulo: "Curandeira", nomes: ["Irmã Elara", "Irmã Ada", "Irmão Tobias", "Irmã Ingrid"], tipo: "aldeao", raio: 3, aberto: true,
    loja: "templo",
    falas: ["Que a Luz cure suas feridas.", "O templo acolhe todos que precisam de cuidado.", "Os mortos-vivos temem a luz. Lembre-se disso."],
    noite: ["O templo nunca fecha para quem sofre."],
    servicos: ["curar", "bencao", "companheiro"],
  },
  instrutor: {
    titulo: "Mestre Instrutor", nomes: ["Mestre Kael", "Mestra Ilsa", "Mestre Doran", "Mestra Veyla"], tipo: "aldeao", raio: 3,
    falas: ["Força sem técnica é desperdício. Posso ensinar o que você não aprendeu sozinho.",
      "Feitiços também se aprendem com moedas, se a Inteligência acompanhar.", "Errou o caminho? Reorganizo seus atributos, por um preço."],
    noite: ["Treinos só com a luz do sol."],
    servicos: ["aprender", "redistribuir"],
  },
  mestre_guilda: {
    titulo: "Mestre da Guilda", nomes: ["Rurik", "Agatha", "Cedric", "Freya"], tipo: "aldeao", raio: 3, loja: "guilda", aberto: true,
    falas: ["A Guilda dos Aventureiros paga bem por trabalho bem feito.", "Contratos novos todo amanhecer. Escolha com sabedoria.",
      "Sua patente cresce com cada serviço concluído."],
    noite: ["A guilda não dorme. Os contratos continuam no quadro."],
    servicos: ["guilda"],
  },
  fazendeiro: {
    titulo: "Fazendeiro", nomes: ["Joaquim", "Hans", "Matilde", "Benedito"], tipo: "aldeao", raio: 4, loja: "fazenda",
    falas: ["A colheita está boa este ano, graças à Luz.", "Compro trigo, cenoura, batata... o que a terra der.",
      "Meu filho Tomé saiu para a estrada e não voltou..."],
    noite: ["É tarde. A terra também precisa descansar."],
  },
  capitao: {
    titulo: "Capitão da Guarda", nomes: ["Capitão Roderick", "Capitã Brenna", "Capitão Aldo"], tipo: "guarda", raio: 8, aberto: true,
    loja: "cavalaria",
    falas: ["A muralha aguenta. A questão é quem está do lado de fora.", "Mantenha a espada limpa e os olhos abertos.",
      "Os goblins testam nossos portões todas as semanas."],
    noite: ["Noite é hora de vigília. Fique atento ao portão."],
    servicos: ["defesa", "cavalaria"],
  },
  guarda: {
    titulo: "Guarda", nomes: ["Ivo", "Lars", "Petra", "Ulric", "Sigrid", "Bento"], tipo: "guarda", raio: 14, aberto: true,
    falas: ["Tudo em ordem por aqui.", "Viu algo suspeito? Fale com o Capitão.", "Se for causar problema, cause lá fora."],
    noite: ["Fique perto das lanternas, viajante."],
  },
  // ---------------------------------------------------------------- Etapa 7: Aurendel, a capital
  rei: {
    titulo: "Rei de Valdoria", nomes: ["Rei Aldemar III"], tipo: "aldeao", raio: 2, aberto: true,
    falas: ["Valdoria resistiu à Ruptura com pedra e coragem. Precisarei das duas outra vez.",
      "Meus cavaleiros guardam as estradas, mas o que vem dos reinos vizinhos exige mais que espadas.",
      "Ajoelhe-se apenas diante da verdade, aventureiro. Eu sou só o homem que a carrega."],
    noite: ["Mesmo à noite, o trono não descansa."],
    servicos: ["audiencia"],
  },
  chanceler: {
    titulo: "Chanceler Real", nomes: ["Chanceler Orsino", "Chanceler Hedda"], tipo: "aldeao", raio: 3, aberto: true,
    falas: ["Os assuntos do reino não esperam. Há sempre uma missão na mesa.", "A Coroa recompensa quem a serve com Selos Reais.",
      "Assine aqui, aqui e... ali. Burocracia também vence guerras."],
    noite: ["A Chancelaria trabalha à luz de velas."],
    servicos: ["missoes_reais", "tesouro_real"],
  },
  joalheiro: {
    titulo: "Joalheiro da Corte", nomes: ["Mestre Lucius", "Mestra Ottilia", "Mestre Fennick"], tipo: "aldeao", raio: 3, loja: "joalheria",
    falas: ["Ouro, prata, gemas e encantos: tudo que brilha passa por esta mesa.", "Anéis que aquecem, amuletos que protegem. Escolha bem.",
      "Esmeraldas e diamantes? Pago melhor que qualquer mercador de vila."],
    noite: ["As joias dormem no cofre à noite. Volte de manhã."],
  },
  mago_corte: {
    titulo: "Mago da Corte", nomes: ["Arquimago Thessaly", "Arquimaga Morwen"], tipo: "aldeao", raio: 3, loja: "torre_arcana", aberto: true,
    falas: ["A Aetherita não é só um cristal: é memória. Os Aetherianos guardaram nela tudo o que sabiam.",
      "Feitiços avançados exigem mente afiada. Posso ensinar os que você ainda não domina.", "Não toque no orbe. Sério."],
    noite: ["As estrelas falam mais alto à noite. Pode entrar."],
    servicos: ["aprender"],
  },
  armeiro: {
    titulo: "Armeiro Real", nomes: ["Mestre Godric", "Mestra Brunhild"], tipo: "aldeao", raio: 3, loja: "arsenal_real",
    falas: ["Cada placa desta armadura foi temperada três vezes.", "Armaduras completas protegem mais que a soma das peças.",
      "Traga sua armadura gasta: eu a deixo como nova."],
    noite: ["O arsenal fecha ao pôr do sol."],
    servicos: ["reparar"],
  },
  cavaleiro_real: {
    titulo: "Cavaleiro da Guarda Real", nomes: ["Sir Aldwin", "Dama Isolde", "Sir Percival", "Dama Rowena", "Sir Galen", "Dama Elowen"],
    tipo: "guarda", raio: 8, aberto: true,
    falas: ["Pela Coroa e por Valdoria.", "Ninguém se aproxima do trono sem permissão.", "Um dia, quem sabe, você jure ao nosso lado."],
    noite: ["A Guarda Real não dorme."],
    servicos: ["companheiro"],
  },
  cidadao: {
    titulo: "Cidadão de Aurendel", nomes: ["Amélia", "Teobaldo", "Constança", "Rufino", "Leonor", "Bartolomeu", "Inês", "Gaspar"],
    tipo: "aldeao", raio: 9,
    falas: ["A capital nunca dorme! Bem, quase nunca.", "Dizem que o rei procura um campeão. Talvez seja você?",
      "O pão da Praça do Mercado é o melhor do reino.", "Já viu a catedral por dentro? Os vitrais são de antes da Ruptura."],
    noite: ["Está tarde. Vou para casa."],
  },
  // ---------------------------------------------------------------- Etapa 9: Aelthar, o Reino Élfico
  rainha_elfica: {
    titulo: "Rainha de Aelthar", nomes: ["Rainha Lyrael"], tipo: "aldeao", raio: 2, aberto: true,
    falas: ["A floresta lembra de tudo, viajante. Ou lembrava, antes da praga.",
      "Ylthariel cresceu de uma semente de Aetherita. Se ela morrer, Aelthar esquece quem é.",
      "Os humanos de Valdoria mandaram um cavaleiro. Veremos se as árvores confiam em você."],
    noite: ["A lua ilumina as folhas da Árvore-Mãe. É a hora em que ela fala mais alto."],
    servicos: ["conselho"],
  },
  sabio_elfico: {
    titulo: "Guardião das Memórias", nomes: ["Thalanor", "Ilyndra"], tipo: "aldeao", raio: 3, aberto: true,
    falas: ["Cada livro desta biblioteca é uma folha que caiu da Árvore-Mãe.", "A magia da natureza se aprende ouvindo, não lendo.",
      "Pergunte. As memórias de Aelthar são para quem as procura."],
    noite: ["As estrelas também são memórias. Pode ficar e ler."],
    servicos: ["memorias", "aprender"],
  },
  druida: {
    titulo: "Druida do Bosque", nomes: ["Faelwen", "Orinel"], tipo: "aldeao", raio: 3, loja: "bosque", aberto: true,
    falas: ["As raízes cinzentas estão frias. A praga bebe a seiva da Árvore-Mãe.", "O Orvalho Lunar desperta o que a praga adormeceu.",
      "Ervas, essências e orvalho: tudo o que a floresta ainda pode dar."],
    noite: ["É à noite que se colhe o Orvalho Lunar. Precisa de algo?"],
    servicos: ["orvalho", "curar"],
  },
  arqueiro_elfico: {
    titulo: "Arqueiro de Aelthar", nomes: ["Aelion", "Sylvara", "Caelith", "Nymeria", "Thandor", "Elarin"], tipo: "guarda_elfico", raio: 10,
    aberto: true,
    falas: ["Nenhum broto cinzento passa por esta sebe.", "Nossas flechas não erram duas vezes.", "A Rainha espera no Salão do Conselho, lá em cima."],
    noite: ["À noite, a praga fica mais ousada. Fique perto das luzes."],
  },
  artesao_elfico: {
    titulo: "Mestre Arqueiro", nomes: ["Mestre Faenor", "Mestra Lirien"], tipo: "aldeao", raio: 3, loja: "arcos_elficos",
    falas: ["Um arco élfico é feito de mithril e paciência.", "Puxe até o fim: a corda sabe quando você tem pressa.",
      "Traga seiva ancestral e eu forjo o que nenhum humano já vestiu."],
    noite: ["O ateliê descansa à noite. As cordas também precisam."],
    servicos: ["reparar", "companheiro"],
  },
  elfo: {
    titulo: "Elfo de Aelthar", nomes: ["Aerin", "Lúthien", "Eldrin", "Myrla", "Tarael", "Seren", "Ilvar", "Naelis"], tipo: "aldeao", raio: 5,
    falas: ["As pontes balançam, mas nunca caíram. Bem, quase nunca.", "Você é o cavaleiro de Valdoria? Achei que seria mais alto.",
      "A Árvore-Mãe canta quando venta. Ultimamente, canta baixinho.", "Não pise nas flores do Bosque do Druida, por favor."],
    noite: ["Boa noite, viajante. Que as folhas guardem seu sono."],
  },
};

/** Nome exibido acima do NPC. */
export function npcTag(role, nome) {
  const R = ROLES[role];
  return `§f${nome}\n§7${R ? R.titulo : ""}`;
}

/** Fichas das lojas: compra (o NPC vende) e venda (o NPC compra). [id, quantidade por lote, preço, {rep, rank, dia}] */
export const SHOPS = {
  ferreiro: {
    nome: "Ferraria",
    vende: [
      [I("lingote_aco"), 2, 14], [I("pedra_aprimoramento"), 1, 40, { rep: 50, dia: 3 }], [I("lingote_mithril"), 1, 32, { rep: 150, dia: 4 }],
      [I("espada_longa_aco"), 1, 70], [I("espada_curta_aco"), 1, 55], [I("adaga_aco"), 1, 45], [I("machado_guerra_aco"), 1, 85],
      [I("martelo_guerra_aco"), 1, 90], [I("lanca_aco"), 1, 75], [I("maca_aco"), 1, 75], [I("katana_aco"), 1, 80],
      [I("espada_grande_aco"), 1, 95], [I("alabarda_aco"), 1, 90], [I("foice_aco"), 1, 85],
      [I("cavaleiro_capacete"), 1, 160, { rep: 150 }], [I("cavaleiro_peitoral"), 1, 260, { rep: 150 }],
      [I("cavaleiro_calcas"), 1, 220, { rep: 150 }], [I("cavaleiro_botas"), 1, 150, { rep: 150 }],
      [I("espada_longa_mithril"), 1, 240, { rep: 400 }],
      ["minecraft:shield", 1, 20], ["minecraft:iron_ingot", 2, 12],
    ],
    compra: [["minecraft:iron_ingot", 1, 4], ["minecraft:gold_ingot", 1, 7], ["minecraft:coal", 4, 2], ["minecraft:diamond", 1, 40],
      [I("engrenagem_runica"), 1, 18],
      ["minecraft:raw_iron", 2, 5], [I("lingote_aco"), 1, 4], [I("mithril_bruto"), 1, 7], [I("lingote_mithril"), 1, 12],
      [I("fragmento_tita"), 1, 20]],
    equipamento: true, // compra armas, armaduras e conjuradores do add-on
  },
  mercador: {
    nome: "Banca da Mercadora",
    vende: [["minecraft:bread", 3, 6], ["minecraft:cooked_beef", 2, 7], ["minecraft:torch", 8, 4], ["minecraft:arrow", 16, 8],
      ["minecraft:paper", 4, 3], ["minecraft:compass", 1, 25], [I("mapa_explorador"), 1, 35, { rep: 50 }], ["minecraft:bucket", 1, 10],
      ["minecraft:lead", 1, 8], ["minecraft:saddle", 1, 60, { rep: 50 }], ["minecraft:name_tag", 1, 40, { rep: 150 }]],
    compra: [[I("insignia_goblin"), 1, 3], [I("ectoplasma"), 1, 6], ["minecraft:leather", 1, 2], ["minecraft:bone", 2, 1],
      ["minecraft:string", 2, 1], ["minecraft:rotten_flesh", 4, 1], ["minecraft:feather", 4, 1], ["minecraft:gunpowder", 1, 2],
      ["minecraft:spider_eye", 1, 2], ["minecraft:emerald", 1, 15], ["minecraft:amethyst_shard", 2, 3]],
  },
  alquimista: {
    nome: "Loja de Alquimia",
    vende: [[I("pocao_energia"), 1, 12], [I("essencia_arcana"), 1, 25], [I("essencia_natural"), 1, 20], ["minecraft:glass_bottle", 4, 3],
      [I("cristal_aetherita"), 1, 45, { rep: 150, dia: 2 }], [I("runa_fogo"), 1, 60, { rep: 150 }], [I("runa_gelo"), 1, 60, { rep: 150 }],
      [I("runa_trovao"), 1, 60, { rep: 150 }], [I("runa_luz"), 1, 60, { rep: 150 }], [I("runa_sombra"), 1, 60, { rep: 150 }],
      [I("elixir_renascimento"), 1, 450, { rep: 400, dia: 1 }]],
    compra: [[I("cristal_aetherita"), 1, 15], [I("essencia_natural"), 1, 6], [I("essencia_arcana"), 1, 7], [I("ectoplasma"), 1, 5],
      ["minecraft:glowstone_dust", 2, 2], ["minecraft:redstone", 4, 2], ["minecraft:blaze_powder", 1, 6], ["minecraft:nether_wart", 2, 2],
      ["minecraft:ghast_tear", 1, 20], ["minecraft:phantom_membrane", 1, 6]],
  },
  taverna: {
    nome: "Balcão do Javali Dourado",
    vende: [["minecraft:bread", 2, 4], ["minecraft:mushroom_stew", 1, 5], ["minecraft:pumpkin_pie", 1, 5], ["minecraft:honey_bottle", 1, 6],
      ["minecraft:cooked_chicken", 2, 6], ["minecraft:cooked_mutton", 2, 6], ["minecraft:cake", 1, 15]],
    compra: [["minecraft:cod", 2, 2], ["minecraft:salmon", 2, 3], ["minecraft:sweet_berries", 8, 2], ["minecraft:honeycomb", 1, 3]],
  },
  templo: {
    nome: "Oferendas do Templo",
    vende: [["minecraft:golden_apple", 1, 60, { rep: 50, dia: 2 }], ["minecraft:golden_carrot", 2, 10], ["minecraft:glistering_melon_slice", 1, 8],
      [I("runa_luz"), 1, 55, { rep: 150 }]],
    compra: [["minecraft:rotten_flesh", 8, 1], ["minecraft:bone", 4, 1], [I("ectoplasma"), 1, 6]],
  },
  fazenda: {
    nome: "Celeiro",
    vende: [["minecraft:wheat_seeds", 8, 2], ["minecraft:bread", 3, 5], ["minecraft:baked_potato", 3, 4], ["minecraft:carrot", 4, 3],
      ["minecraft:hay_block", 1, 6], ["minecraft:egg", 4, 2]],
    compra: [["minecraft:wheat", 8, 3], ["minecraft:carrot", 8, 3], ["minecraft:potato", 8, 3], ["minecraft:beetroot", 8, 3],
      ["minecraft:pumpkin", 1, 2], ["minecraft:melon_slice", 16, 3], ["minecraft:sugar_cane", 8, 2], ["minecraft:cocoa_beans", 4, 2]],
  },
  cavalaria: {
    nome: "Estábulo da Guarda",
    vende: [[I("escritura_cavalo"), 1, 350, { rep: 150, dia: 1 }], [I("osso_alfa"), 1, 90, { rep: 50, dia: 2 }],
      [I("redea_celeste"), 1, 450, { rep: 400, dia: 1 }], ["minecraft:honey_bottle", 1, 6], ["minecraft:sweet_berries", 4, 3], ["minecraft:hay_block", 2, 8],
      ["minecraft:golden_carrot", 3, 12], ["minecraft:saddle", 1, 55], ["minecraft:lead", 1, 8], ["minecraft:cooked_beef", 4, 9]],
    compra: [["minecraft:leather", 2, 3], ["minecraft:wheat", 8, 3], ["minecraft:bone", 4, 1], [I("escama_dragao"), 1, 60],
      [I("veu_sombrio"), 1, 60], [I("pena_grifo"), 1, 15]],
  },
  joalheria: {
    nome: "Joalheria da Corte",
    vende: [[I("anel_vigor"), 1, 180], [I("anel_brasa"), 1, 320, { rep: 50 }], [I("anel_glacial"), 1, 320, { rep: 50 }],
      [I("anel_tempestade"), 1, 320, { rep: 50 }], [I("amuleto_arcano"), 1, 380, { rep: 150 }], [I("amuleto_natureza"), 1, 380, { rep: 150 }],
      [I("amuleto_fortuna"), 1, 420, { rep: 150, dia: 1 }], [I("bracelete_cacador"), 1, 260, { rep: 50 }],
      [I("reliquia_sagrada"), 1, 650, { rep: 400, dia: 1 }], ["minecraft:emerald", 1, 30], ["minecraft:diamond", 1, 90, { dia: 4 }]],
    compra: [["minecraft:emerald", 1, 18], ["minecraft:diamond", 1, 48], ["minecraft:gold_ingot", 1, 9], ["minecraft:amethyst_shard", 2, 4],
      ["minecraft:lapis_lazuli", 4, 3], ["minecraft:quartz", 4, 3], [I("cristal_aetherita"), 1, 18]],
    equipamento: true,
  },
  torre_arcana: {
    nome: "Torre do Mago da Corte",
    vende: [[I("essencia_arcana"), 1, 22], [I("cristal_aetherita"), 1, 40, { dia: 3 }], [I("pocao_energia"), 2, 20],
      [I("runa_fogo"), 1, 55], [I("runa_gelo"), 1, 55], [I("runa_trovao"), 1, 55], [I("runa_luz"), 1, 55], [I("runa_sombra"), 1, 55],
      [I("cajado_arcano"), 1, 420, { rep: 150 }], [I("varinha_mithril"), 1, 380, { rep: 150 }],
      [I("grimorio_arquimago"), 1, 1100, { rep: 400, dia: 1 }]],
    compra: [[I("cristal_aetherita"), 1, 16], [I("essencia_arcana"), 1, 8], [I("fragmento_alma"), 1, 45], [I("veu_sombrio"), 1, 65],
      ["minecraft:ender_pearl", 1, 8], ["minecraft:blaze_rod", 1, 9]],
    equipamento: true,
  },
  arsenal_real: {
    nome: "Arsenal Real",
    vende: [[I("cavaleiro_capacete"), 1, 140], [I("cavaleiro_peitoral"), 1, 230], [I("cavaleiro_calcas"), 1, 200], [I("cavaleiro_botas"), 1, 130],
      [I("arcanista_capacete"), 1, 130, { rep: 50 }], [I("arcanista_peitoral"), 1, 210, { rep: 50 }], [I("arcanista_calcas"), 1, 180, { rep: 50 }],
      [I("arcanista_botas"), 1, 120, { rep: 50 }], [I("patrulheiro_capacete"), 1, 130, { rep: 50 }], [I("patrulheiro_peitoral"), 1, 210, { rep: 50 }],
      [I("patrulheiro_calcas"), 1, 180, { rep: 50 }], [I("patrulheiro_botas"), 1, 120, { rep: 50 }],
      [I("forjarruna_capacete"), 1, 320, { rep: 150 }], [I("forjarruna_peitoral"), 1, 520, { rep: 150 }],
      [I("forjarruna_calcas"), 1, 450, { rep: 150 }], [I("forjarruna_botas"), 1, 300, { rep: 150 }],
      [I("real_capacete"), 1, 900, { flag: "cavaleiro" }], [I("real_peitoral"), 1, 1400, { flag: "cavaleiro" }],
      [I("real_calcas"), 1, 1200, { flag: "cavaleiro" }], [I("real_botas"), 1, 850, { flag: "cavaleiro" }],
      ["minecraft:shield", 1, 18], [I("arco_teixo"), 1, 60], [I("arco_aco"), 1, 140], [I("besta_aco"), 1, 180],
      [I("arco_elfico"), 1, 420, { rep: 150 }], ["minecraft:arrow", 16, 10]],
    compra: [["minecraft:iron_ingot", 1, 5], [I("lingote_aco"), 1, 5], [I("lingote_mithril"), 1, 14], ["minecraft:leather", 2, 3]],
    equipamento: true,
  },
  bosque: {
    nome: "Ervas do Bosque",
    vende: [[I("orvalho_lunar"), 1, 40], [I("essencia_natural"), 1, 18], ["minecraft:golden_carrot", 2, 9], ["minecraft:honey_bottle", 1, 5],
      ["minecraft:glow_berries", 4, 4], [I("amuleto_natureza"), 1, 340, { rep: 150 }], ["minecraft:azalea", 1, 6], ["minecraft:flowering_azalea", 1, 8],
      [I("pocao_energia"), 1, 11]],
    compra: [[I("essencia_natural"), 1, 7], [I("seiva_ancestral"), 1, 60], ["minecraft:sweet_berries", 8, 2], ["minecraft:glow_berries", 8, 3],
      ["minecraft:honeycomb", 1, 3], ["minecraft:apple", 4, 2]],
  },
  arcos_elficos: {
    nome: "Ateliê do Arqueiro",
    vende: [[I("arco_teixo"), 1, 55], [I("arco_aco"), 1, 125], [I("arco_elfico"), 1, 360, { rep: 50 }], ["minecraft:arrow", 32, 12],
      [I("patrulheiro_capacete"), 1, 120], [I("patrulheiro_peitoral"), 1, 190], [I("patrulheiro_calcas"), 1, 165], [I("patrulheiro_botas"), 1, 110],
      [I("aelthar_capacete"), 1, 850, { flag: "amigo_elfico" }], [I("aelthar_peitoral"), 1, 1300, { flag: "amigo_elfico" }],
      [I("aelthar_calcas"), 1, 1100, { flag: "amigo_elfico" }], [I("aelthar_botas"), 1, 800, { flag: "amigo_elfico" }]],
    compra: [["minecraft:string", 4, 2], ["minecraft:feather", 4, 2], ["minecraft:stick", 16, 1], [I("seiva_ancestral"), 1, 65],
      [I("lingote_mithril"), 1, 13]],
    equipamento: true,
  },
  guilda: {
    nome: "Arsenal da Guilda",
    vende: [[I("mapa_explorador"), 1, 25], [I("pocao_energia"), 2, 20], [I("pedra_aprimoramento"), 1, 35, { rank: 1, dia: 3 }],
      [I("lingote_mithril"), 2, 50, { rank: 2, dia: 3 }], [I("cristal_aetherita"), 1, 35, { rank: 2, dia: 3 }],
      [I("amuleto_fortuna"), 1, 300, { rank: 3, dia: 1 }], [I("grimorio_arquimago"), 1, 900, { rank: 4, dia: 1 }],
      [I("idolo_tita"), 1, 250, { rank: 3, dia: 1 }]],
    compra: [[I("insignia_goblin"), 1, 4], [I("fragmento_tita"), 1, 25], [I("fragmento_alma"), 1, 40], [I("nucleo_tita"), 1, 120],
      [I("escama_dragao"), 1, 70], [I("veu_sombrio"), 1, 70], [I("engrenagem_runica"), 1, 22]],
  },
};

/** Patentes da Guilda dos Aventureiros (pontos mínimos). */
export const GUILD_RANKS = [["Cobre", 0, "§6"], ["Prata", 60, "§7"], ["Ouro", 180, "§e"], ["Platina", 400, "§b"], ["Lendário", 800, "§d"]];

/** Reputação com o Reino de Valdoria. */
export const REP_RANKS = [["Desconfiado", -1000, "§c", -0.25], ["Desconhecido", 0, "§7", 0], ["Conhecido", 50, "§a", 0.05],
  ["Amigo", 150, "§b", 0.1], ["Herói de Valdoria", 400, "§6", 0.15]];

export const RUMORES = [
  "Na capital, Aurendel, o rei Aldemar procura campeões. Dizem que a Chancelaria paga em Selos Reais.",
  "A Torre do Mago da Corte brilha à noite. Dizem que lá se aprendem os feitiços mais raros do reino.",
  "Dizem que o Reino Élfico de Aelthar fica entre árvores tão altas que tocam as nuvens.",
  "Os elfos de Aelthar fecharam a sebe. Dizem que uma praga cinzenta come a Árvore-Mãe por dentro.",
  "Um arqueiro élfico me disse que a praga tem medo de fogo. Ou era eu que tinha medo dele?",
  "Os anões de Kar'Dum fecharam os portões da montanha depois da Ruptura. Ninguém sabe por quê.",
  "Dizem que nas ruínas de Kar'Dum as lajes rachadas da ponte não aguentam o peso de ninguém.",
  "Um caçador jura que viu um filhote de dragão dormindo ao lado de uma fogueira. Bobagem, né?",
  "Um viajante jurou ter visto um dragão sobre as montanhas do Domínio Dracônico.",
  "Dizem que lobos do tamanho de cavalos rondam as florestas frias. Só se curvam a quem oferece o Osso do Alfa.",
  "Um caçador viu um unicórnio entre as flores. Ele fugiu, claro: só se aproxima de quem chega devagar, agachado.",
  "Grifos fazem ninho nos picos mais altos. Quem consegue uma Rédea Celeste pode voar sobre as nuvens.",
  "Ursos pardos adoram mel. Com paciência, um deles pode carregar você para a batalha.",
  "Uma catedral negra surgiu onde antes havia só mato. Acólitos de capuz entram lá à noite.",
  "No Santuário Celestial, os templos flutuam. Ou foi o que me contaram depois da terceira caneca.",
  "A Dama de Véu Negro paga em ouro por cristais de Aetherita. Gente estranha anda pela estrada à noite.",
  "Espectros não suportam a luz. Uma runa da luz na lâmina faz milagres.",
  "Os Cervos Mágicos adoram cenouras douradas. E abençoam quem as oferece.",
  "Quem escala as torres antigas encontra os diários dos magos que as construíram.",
  "Um ídolo de pedra pode despertar um titã. Só um louco faria isso... ou um herói.",
];
