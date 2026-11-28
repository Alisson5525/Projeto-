// Bundled and run by tools/build.mjs: prints every id the scripts reference.
declare const process: { stdout: { write(text: string): void } };

import { ANIM, CAMERA, ENTITY, ITEM, LANG_KEYS, PARTICLE, SOUND } from "../src/ids";

const refs = {
  animations: Object.values(ANIM),
  particles: Object.values(PARTICLE),
  sounds: Object.values(SOUND),
  entities: Object.values(ENTITY),
  items: Object.values(ITEM),
  cameras: Object.values(CAMERA),
  langKeys: [...LANG_KEYS],
};
process.stdout.write(JSON.stringify(refs, null, 2));
