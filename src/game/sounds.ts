// The mod's sounds with their channel and Java outer audible range.
import { SOUND } from "../ids";
import type { SoundDef } from "./sound";

const def = (id: string, channel: SoundDef["channel"], range: number): SoundDef => ({ id, channel, range });

export const SND = {
  nukeVoice: def(SOUND.nukeVoice, "voice", 24),
  nukeSfx: def(SOUND.nukeSfx, "sfx", 48),
  nukeMusic: def(SOUND.nukeMusic, "music", 24),
  maxBlueVoice: def(SOUND.maxBlueVoice, "voice", 24),
  maxBlueStart: def(SOUND.maxBlueStart, "sfx", 24),
  purpleStartVoice: def(SOUND.purpleStartVoice, "voice", 24),
  purpleFireVoice: def(SOUND.purpleFireVoice, "voice", 24),
  purpleFire: def(SOUND.purpleFire, "sfx", 30),
  voidStart: def(SOUND.voidStart, "sfx", 24),
  voidVoice: def(SOUND.voidVoice, "voice", 24),
  awakeningVoice: def(SOUND.awakeningVoice, "voice", 24),
  selfSparking: def(SOUND.selfSparking, "sfx", 10),
  selfExplosion: def(SOUND.selfExplosion, "sfx", 55),
  bluePull: def(SOUND.bluePull, "sfx", 16),
  redStart: def(SOUND.redStart, "sfx", 19),
  infinityDeflect: def(SOUND.infinityDeflect, "sfx", 13),
  infinityToggle: def(SOUND.infinityToggle, "sfx", 24),
  barrageGrab: def(SOUND.barrageGrab, "sfx", 11),
  maxRedVoice: def(SOUND.maxRedVoice, "voice", 24),
  maxRedCharge: def(SOUND.maxRedCharge, "sfx", 15),
  maxRedFire: def(SOUND.maxRedFire, "sfx", 24),
  cardDrop: def(SOUND.cardDrop, "ui", 0),
  cardLand: def(SOUND.cardLand, "ui", 0),
  cardReveal: def(SOUND.cardReveal, "ui", 0),
  cardHover: def(SOUND.cardHover, "ui", 0),
  cardSelect: def(SOUND.cardSelect, "ui", 0),
  cardShatter: def(SOUND.cardShatter, "ui", 0),
} as const;
