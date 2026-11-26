import { FLY, POW, PROP } from './config.js';

const states = new Map();

/** Estado por jogador (apenas servidor). */
export function getState(player) {
  let st = states.get(player.id);
  if (!st) {
    st = {
      on: false,
      fly: FLY.NONE,
      power: POW.NONE,
      vel: { x: 0, y: 0, z: 0 },
      flyTicks: 0,
      powTicks: 0,
      charge: 0,
      airTicks: 0,
      groundTicks: 0,
      sneakTicks: 0,
      fwdTicks: 0,
      stopTicks: 0,
      jumpEdge: false,
      lastJumpPress: -100,
      landSpeed: 0,
      autoLaunch: false,
      heat: new Map(),
      combo: 0,
      lastHitTick: -100,
      lastUse: {},
      powerTimeout: 0,
      sent: {},
      effectTick: 0,
      prevLoc: undefined,
      meas: undefined,
      gain: 1,
      punchCharge: 0,
      comboAir: false,
      combatUntil: 0,
      exposure: new Map(),
      focus: 0,
      lastHit: undefined,
      hudTick: 0,
    };
    states.set(player.id, st);
  }
  return st;
}

/** True se o jogador com este id esta transformado (seguro em eventos "before"). */
export function isHeroId(id) {
  return !!states.get(id)?.on;
}

export function dropState(id) {
  states.delete(id);
}

/** Envia uma propriedade para o cliente apenas quando o valor muda. */
export function sync(player, st, key, value) {
  if (st.sent[key] === value) return;
  try {
    player.setProperty(PROP[key], value);
    st.sent[key] = value;
  } catch (e) {
    // propriedade ausente (pacote de comportamento desatualizado)
  }
}

export function setFly(player, st, fly) {
  if (st.fly === fly) return;
  st.fly = fly;
  st.flyTicks = 0;
  sync(player, st, 'fly', fly);
}

export function setPower(player, st, power) {
  if (st.power === power) return;
  st.power = power;
  st.powTicks = 0;
  sync(player, st, 'power', power);
}

export function setOn(player, st, on) {
  st.on = on;
  sync(player, st, 'on', on);
  try {
    player.setDynamicProperty('superman:on', on);
  } catch (e) { /* ignore */ }
}
