// Tabelas e constantes do Zênite (puro: sem dependência do jogo).
// Os valores seguem docs/superpowers/specs/2026-11-27-zenite-addon-design.md.

/** Itens do add-on. */
export const ITENS = Object.freeze({
  astrolabio: 'zenite:astrolabio',
  codice: 'zenite:codice',
  poeira: 'zenite:poeira_estelar',
  selo: 'zenite:selo_eclipse',
  coracao: 'zenite:coracao_firmamento',
  diadema: 'zenite:diadema',
  manto: 'zenite:manto',
  perneiras: 'zenite:perneiras',
  botas: 'zenite:botas',
});

/** Um sigilo por técnica: lança a técnica direto da barra rápida. */
export const SIGILOS = Object.freeze({
  veu: 'zenite:sigilo_veu',
  poco: 'zenite:sigilo_poco',
  nova: 'zenite:sigilo_nova',
  passo: 'zenite:sigilo_passo',
  reversao: 'zenite:sigilo_reversao',
  horizonte: 'zenite:sigilo_horizonte',
  abobada: 'zenite:sigilo_abobada',
});

export const BLOCO_FIRMAMENTO = 'zenite:firmamento';
export const ENTIDADE_ARCONTE = 'zenite:arconte';
export const NEVOA_ABOBADA = 'zenite:abobada';

/** Chaves de propriedades dinâmicas (não são conteúdo do jogo). */
export const CHAVES = Object.freeze({
  dados: 'zenite:dados',
  cfgMundo: 'zenite:cfg_mundo',
  cfgJogador: 'zenite:cfg_jogador',
  abobadas: 'zenite:abobadas_pendentes',
  recebeuCodice: 'zenite:recebeu_codice',
  faseArconte: 'zenite:fase',
});

/** Comandos customizados. */
export const COMANDOS = Object.freeze({
  menu: 'zenite:menu',
  codice: 'zenite:codice',
  kit: 'zenite:kit',
  nivel: 'zenite:nivel',
  arconte: 'zenite:arconte',
  limpar: 'zenite:limpar',
});

/** Ids de som (RP/sounds/sound_definitions.json). */
export const SONS = Object.freeze({
  veuOn: 'zenite.veu_on',
  veuOff: 'zenite.veu_off',
  veuBloqueio: 'zenite.veu_bloqueio',
  poco: 'zenite.poco',
  novaDisparo: 'zenite.nova_disparo',
  novaImpacto: 'zenite.nova_impacto',
  passo: 'zenite.passo',
  reversao: 'zenite.reversao',
  horizonteCarga: 'zenite.horizonte_carga',
  horizonteDisparo: 'zenite.horizonte_disparo',
  abobada: 'zenite.abobada',
  abobadaFim: 'zenite.abobada_fim',
  nivel: 'zenite.nivel',
  ui: 'zenite.ui',
  negado: 'zenite.negado',
  arconteRugido: 'zenite.arconte_rugido',
  arconteRitual: 'zenite.arconte_ritual',
  arconteMorte: 'zenite.arconte_morte',
  arconteFeixe: 'zenite.arconte_feixe',
});

/** Ids de partícula (RP/particles). Variáveis: variable.cor (RGBA) e variable.tamanho. */
export const PARTICULAS = Object.freeze({
  brilho: 'zenite:brilho',
  faisca: 'zenite:faisca',
  estrela: 'zenite:estrela',
  anel: 'zenite:anel',
  sugar: 'zenite:sugar',
  explosao: 'zenite:explosao',
  onda: 'zenite:onda',
  rastro: 'zenite:rastro',
  runa: 'zenite:runa',
  hex: 'zenite:hex',
});

/** Paleta (RGB 0..1) usada nas partículas. */
export const COR = Object.freeze({
  branco: { red: 1, green: 1, blue: 1 },
  prata: { red: 0.82, green: 0.9, blue: 1 },
  ciano: { red: 0.2, green: 0.85, blue: 1 },
  azul: { red: 0.25, green: 0.45, blue: 1 },
  carmesim: { red: 1, green: 0.16, blue: 0.24 },
  laranja: { red: 1, green: 0.55, blue: 0.15 },
  violeta: { red: 0.66, green: 0.3, blue: 1 },
  roxo: { red: 0.42, green: 0.12, blue: 0.85 },
  ouro: { red: 1, green: 0.84, blue: 0.4 },
  noite: { red: 0.08, green: 0.05, blue: 0.2 },
});

/** Página de glifos própria (RP/font/glyph_E7.png). */
export const GLIFO = Object.freeze({
  vazio: '',
  q1: '',
  q2: '',
  q3: '',
  cheio: '',
  tampaEsq: '',
  tampaDir: '',
  dourado: '',
  veu: '',
  abobada: '',
  pronto: '',
  recarga: '',
  eter: '',
  cadeado: '',
  estrela: '',
});

/**
 * As sete técnicas. custo em Éter ('cheio' = barra inteira), recarga em ticks,
 * nivel = nível de maestria que libera, requer = desbloqueio especial.
 */
export const TECNICAS = Object.freeze([
  { id: 'veu', custo: 10, dreno: 3, recarga: 60, nivel: 1, alternavel: true, corTexto: '§f', cor: COR.prata, icone: 'textures/ui/zenite/veu', glifo: '' },
  { id: 'poco', custo: 25, recarga: 120, nivel: 1, corTexto: '§b', cor: COR.ciano, icone: 'textures/ui/zenite/poco', glifo: '' },
  { id: 'nova', custo: 30, recarga: 140, nivel: 1, corTexto: '§c', cor: COR.carmesim, icone: 'textures/ui/zenite/nova', glifo: '' },
  { id: 'passo', custo: 12, recarga: 30, nivel: 1, corTexto: '§3', cor: COR.branco, icone: 'textures/ui/zenite/passo', glifo: '' },
  { id: 'reversao', custo: 40, recarga: 400, nivel: 2, corTexto: '§e', cor: COR.ouro, icone: 'textures/ui/zenite/reversao', glifo: '' },
  { id: 'horizonte', custo: 70, recarga: 500, nivel: 4, corTexto: '§d', cor: COR.violeta, icone: 'textures/ui/zenite/horizonte', glifo: '' },
  { id: 'abobada', custo: 'cheio', recarga: 2400, nivel: 1, requer: 'abobada', corTexto: '§5', cor: COR.roxo, icone: 'textures/ui/zenite/abobada', glifo: '' },
]);

/** @type {Record<string, (typeof TECNICAS)[number]>} */
export const TECNICA_POR_ID = Object.freeze(Object.fromEntries(TECNICAS.map((t) => [t.id, t])));

export const LIMIARES_XP = Object.freeze([0, 60, 160, 320, 540, 820, 1160, 1560, 2020, 2540]);
export const NIVEL_MAX = 10;
export const XP_ARCONTE = 600;
export const XP_CORACAO_REPETIDO = 500;

/** Blocos que nenhuma técnica apaga (além de qualquer recipiente). */
export const BLOCOS_PROTEGIDOS = Object.freeze(new Set([
  'minecraft:bedrock', 'minecraft:barrier', 'minecraft:command_block', 'minecraft:chain_command_block',
  'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:structure_void', 'minecraft:jigsaw',
  'minecraft:end_portal', 'minecraft:end_portal_frame', 'minecraft:end_gateway', 'minecraft:portal',
  'minecraft:allow', 'minecraft:deny', 'minecraft:border_block', 'minecraft:reinforced_deepslate',
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:ender_chest', 'minecraft:barrel', 'minecraft:hopper',
  'minecraft:dispenser', 'minecraft:dropper', 'minecraft:furnace', 'minecraft:lit_furnace', 'minecraft:blast_furnace',
  'minecraft:lit_blast_furnace', 'minecraft:smoker', 'minecraft:lit_smoker', 'minecraft:brewing_stand',
  'minecraft:beacon', 'minecraft:mob_spawner', 'minecraft:trial_spawner', 'minecraft:vault', 'minecraft:crafter',
  'minecraft:chiseled_bookshelf', 'minecraft:decorated_pot', 'minecraft:lectern', 'minecraft:jukebox',
  'minecraft:respawn_anchor', 'minecraft:bed', 'zenite:firmamento',
]));

/** @param {string} typeId */
export function blocoProtegido(typeId) {
  return BLOCOS_PROTEGIDOS.has(typeId) || typeId.endsWith('shulker_box') || typeId.startsWith('minecraft:light_block');
}

/** Tipos que as técnicas nunca afetam como alvo. */
export const TIPOS_IGNORADOS = Object.freeze(new Set([
  'minecraft:item', 'minecraft:xp_orb', 'minecraft:painting', 'minecraft:armor_stand', 'minecraft:leash_knot',
  'minecraft:lightning_bolt', 'minecraft:area_effect_cloud', 'minecraft:fishing_hook', 'minecraft:ender_crystal',
  'minecraft:tnt', 'minecraft:falling_block', 'minecraft:npc', 'minecraft:agent', 'minecraft:tripod_camera',
]));

/** Projéteis que o Véu congela no ar. */
export const PROJETEIS = Object.freeze(new Set([
  'minecraft:arrow', 'minecraft:snowball', 'minecraft:egg', 'minecraft:small_fireball', 'minecraft:fireball',
  'minecraft:dragon_fireball', 'minecraft:wither_skull', 'minecraft:wither_skull_dangerous', 'minecraft:shulker_bullet',
  'minecraft:llama_spit', 'minecraft:thrown_trident', 'minecraft:splash_potion', 'minecraft:lingering_potion',
  'minecraft:wind_charge_projectile', 'minecraft:breeze_wind_charge_projectile', 'minecraft:fireworks_rocket',
]));
