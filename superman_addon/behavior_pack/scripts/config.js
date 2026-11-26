import { world } from '@minecraft/server';

// Propriedades do jogador sincronizadas com o cliente (definidas em entities/player.json)
export const PROP = {
  on: 'superman:on',
  fly: 'superman:fly',
  power: 'superman:power',
  charge: 'superman:charge',
  input: 'superman:input',
};

// Estados de voo/locomocao (iguais aos usados nos controladores de animacao)
export const FLY = {
  NONE: 0, CHARGE: 1, LAUNCH: 2, HOVER: 3, FLY: 4, FAST: 5, DIVE: 6,
  LANDPREP: 7, LANDSOFT: 8, LANDHERO: 9, AIRSTART: 10, SPEED: 11,
};
export const AIR_STATES = new Set([FLY.LAUNCH, FLY.HOVER, FLY.FLY, FLY.FAST, FLY.DIVE, FLY.LANDPREP, FLY.AIRSTART]);

// Poderes
export const POW = {
  NONE: 0, TRANSFORM: 1, DETRANSFORM: 2, HEAT: 3, FREEZE: 4, CHARGE: 5, PUNCH: 6,
  CLAP: 7, SLAM: 8, COMBO1: 9, COMBO2: 10, COMBO3: 11,
};

export const ITEM = {
  EMBLEM: 'superman:emblema',
  FLIGHT: 'superman:voo',
  HEAT: 'superman:visao_calor',
  FREEZE: 'superman:sopro_congelante',
  PUNCH: 'superman:super_soco',
  IMPACT: 'superman:impacto',
};
export const POWER_ITEMS = [ITEM.FLIGHT, ITEM.HEAT, ITEM.FREEZE, ITEM.PUNCH, ITEM.IMPACT];

// Fisica do voo (velocidades em blocos por tick; 1 bloco/tick = 72 km/h)
export const PHYS = {
  hoverSpeed: 0.3,
  hoverVertical: 0.38,
  flySpeed: 0.95,
  flyVertical: 0.35,
  strafeSpeed: 0.28,
  accelHover: 0.2,
  accelFly: 0.12,
  accelFast: 0.07,
  diveSpeed: 2.6,
};

export const DEFAULT_SETTINGS = {
  destruction: true,      // poderes e voo destroem o cenario
  intensity: 2,           // 1 = leve, 2 = normal, 3 = devastador
  drops: false,           // blocos destruidos soltam itens
  fire: true,             // visao de calor incendeia / derrete
  fastSpeed: 2.2,         // velocidade maxima (blocos/tick) no voo supersonico
  invertStrafe: false,    // inverte esquerda/direita no voo (caso o controle esteja trocado)
  invulnerable: true,     // resistencia maxima enquanto transformado
  shake: true,            // tremor de camera
  particles: 2,           // 1 = economico (celular), 2 = normal, 3 = maximo
  protectContainers: true,// nunca destruir baus, fornalhas, etc.
  punchBreak: true,       // socos quebram blocos instantaneamente
  hud: true,              // mostra velocidade/estado na barra de acao
};

const KEY = 'superman:settings';
let cache;

export function getSettings() {
  if (cache) return cache;
  let s = {};
  try {
    const raw = world.getDynamicProperty(KEY);
    if (typeof raw === 'string') s = JSON.parse(raw);
  } catch (e) { s = {}; }
  cache = Object.assign({}, DEFAULT_SETTINGS, s);
  return cache;
}

export function saveSettings(s) {
  cache = Object.assign({}, DEFAULT_SETTINGS, s);
  world.setDynamicProperty(KEY, JSON.stringify(cache));
}

export function intensityMul() {
  return [0.6, 0.6, 1.0, 1.6][getSettings().intensity] ?? 1.0;
}
