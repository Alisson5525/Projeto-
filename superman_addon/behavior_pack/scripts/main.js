// Superman Add-on - ponto de entrada dos scripts (servidor).
import { ButtonState, InputButton, system, world } from '@minecraft/server';
import { FLY, ITEM, POW, getSettings } from './config.js';
import { actionbar } from './fx.js';
import { updateFlight } from './flight.js';
import { POWER_NAMES, giveItems, maintainEffects, onBlockPunch, onItemUse, onMeleeHit, restore, updatePowers } from './powers.js';
import { dropState, getState, setFly, setPower, sync } from './state.js';
import { V, sign0 } from './vec.js';

const FLY_NAMES = {
  [FLY.CHARGE]: '§6Carregando decolagem', [FLY.LAUNCH]: '§bDecolando', [FLY.AIRSTART]: '§bDecolando',
  [FLY.HOVER]: '§fPairando', [FLY.FLY]: '§fVoando', [FLY.FAST]: '§c§lSUPERSÔNICO', [FLY.DIVE]: '§c§lMERGULHO',
  [FLY.LANDPREP]: '§7Pousando', [FLY.SPEED]: '§eSuper velocidade',
};

function readInput(player) {
  let fwd = 0;
  let right = 0;
  let jump = false;
  let sneak = false;
  try {
    const mv = player.inputInfo.getMovementVector();
    fwd = mv.y;
    right = -mv.x; // no Bedrock o eixo x positivo e a esquerda
  } catch (e) { /* */ }
  try { jump = player.inputInfo.getButtonState(InputButton.Jump) === ButtonState.Pressed; } catch (e) { jump = player.isJumping; }
  try { sneak = player.inputInfo.getButtonState(InputButton.Sneak) === ButtonState.Pressed; } catch (e) { /* */ }
  sneak = sneak || player.isSneaking;
  if (getSettings().invertStrafe) right = -right;
  return {
    fwd: sign0(fwd), right: sign0(right), fwdRaw: Math.max(-1, Math.min(1, fwd)), rightRaw: Math.max(-1, Math.min(1, right)),
    jump, sneak, sprint: player.isSprinting,
  };
}

function hud(player, st, tick) {
  if (!getSettings().hud || tick % 4 !== 0) return;
  let name = POWER_NAMES[st.power];
  if (st.power === POW.CHARGE) name += ` ${bar(st.charge)}`;
  if (!name) name = FLY_NAMES[st.fly];
  if (!name) return;
  const v = st.meas ?? player.getVelocity();
  let extra = `§e${Math.round(V.len(v) * 72)} km/h`;
  if (st.fly === FLY.CHARGE) extra = bar(st.charge);
  actionbar(player, `§9§lS§r §8| ${name} §8| ${extra}`);
}

function bar(x) {
  const n = Math.round(x * 10);
  return '§a' + '|'.repeat(n) + '§8' + '|'.repeat(10 - n);
}

function tickPlayer(player, tick) {
  const st = getState(player);
  if (!st.on && st.power === POW.NONE) {
    if (st.fly !== FLY.NONE) setFly(player, st, FLY.NONE);
    st.jumpEdge = false;
    return;
  }
  const inp = readInput(player);
  sync(player, st, 'input', (inp.fwd + 1) * 3 + (inp.right + 1));
  if (st.on) maintainEffects(player, st, tick);
  updatePowers(player, st, inp, tick);
  if (st.on) updateFlight(player, st, inp, tick);
  else st.jumpEdge = false;
  hud(player, st, tick);
}

system.runInterval(() => {
  const tick = system.currentTick;
  for (const player of world.getAllPlayers()) {
    try {
      tickPlayer(player, tick);
    } catch (e) {
      if (tick % 100 === 0) console.warn(`[Superman] ${e}`);
    }
  }
}, 1);

// ---------------------------------------------------------------- eventos

world.afterEvents.playerButtonInput.subscribe((ev) => {
  if (ev.button === InputButton.Jump && ev.newButtonState === ButtonState.Pressed) {
    const st = getState(ev.player);
    st.jumpEdge = true;
  }
});

world.afterEvents.itemUse.subscribe((ev) => {
  const id = ev.itemStack?.typeId;
  if (!id || !id.startsWith('superman:')) return;
  const player = ev.source;
  const st = getState(player);
  const tick = system.currentTick;
  // segurar o botao repete o uso; so conta um novo toque depois de soltar
  const last = st.lastUse[id] ?? -100;
  st.lastUse[id] = tick;
  if (tick - last < 10) return;
  try {
    onItemUse(player, st, id, tick);
  } catch (e) {
    console.warn(`[Superman] itemUse: ${e}`);
  }
});

world.afterEvents.entityHitEntity.subscribe((ev) => {
  const p = ev.damagingEntity;
  if (p?.typeId !== 'minecraft:player') return;
  const st = getState(p);
  if (st.on) onMeleeHit(p, st, ev.hitEntity, system.currentTick);
});

world.afterEvents.entityHitBlock.subscribe((ev) => {
  const p = ev.damagingEntity;
  if (p?.typeId !== 'minecraft:player') return;
  const st = getState(p);
  if (st.on) onBlockPunch(p, st, ev.hitBlock);
});

world.afterEvents.playerSpawn.subscribe((ev) => {
  const player = ev.player;
  const st = getState(player);
  st.sent = {};
  let wasOn = false;
  try { wasOn = player.getDynamicProperty('superman:on') === true; } catch (e) { /* */ }
  setFly(player, st, FLY.NONE);
  setPower(player, st, POW.NONE);
  sync(player, st, 'fly', FLY.NONE);
  sync(player, st, 'power', POW.NONE);
  sync(player, st, 'charge', 0);
  sync(player, st, 'input', 4);
  if (wasOn) restore(player, st);
  else sync(player, st, 'on', false);
  if (ev.initialSpawn) {
    let got = false;
    try { got = player.getDynamicProperty('superman:got_emblem') === true; } catch (e) { /* */ }
    if (!got) {
      giveItems(player, [ITEM.EMBLEM]);
      try { player.setDynamicProperty('superman:got_emblem', true); } catch (e) { /* */ }
      player.sendMessage('§9[Superman]§r Você recebeu o §eEmblema do Superman§r! Use-o para se transformar.');
      player.sendMessage('§7Pulo duplo = voar  |  correr = super velocidade  |  agachar + usar o Emblema = configurações');
    }
  }
});

world.afterEvents.entityDie.subscribe((ev) => {
  const e = ev.deadEntity;
  if (e?.typeId !== 'minecraft:player') return;
  const st = getState(e);
  st.vel = V.zero();
  try {
    setFly(e, st, FLY.NONE);
    setPower(e, st, POW.NONE);
  } catch (err) { /* */ }
});

world.beforeEvents.playerLeave.subscribe((ev) => {
  const id = ev.player.id;
  system.run(() => dropState(id));
});

console.warn('[Superman] add-on carregado');
