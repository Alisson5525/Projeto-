// Static validation of both packs: strict JSON, manifests, file references and
// every id the scripts use (.cache/refs.json from tools/build.mjs).
// Exit code 1 with a list of problems when anything is wrong.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BP = join(root, "packs/JJK_BP");
const RP = join(root, "packs/JJK_RP");
const errors = [];
const warn = [];
const err = (msg) => errors.push(msg);

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const json = new Map();
for (const file of [...walk(BP), ...walk(RP)]) {
  if (extname(file) !== ".json") continue;
  try {
    json.set(file, JSON.parse(readFileSync(file, "utf8")));
  } catch (e) {
    err(`invalid JSON: ${relative(root, file)}: ${e.message}`);
  }
}
const read = (file) => json.get(file);
const rel = (p) => relative(root, p);

// ---- manifests -------------------------------------------------------------
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const seen = new Set();
const manifests = {};
for (const [name, dir] of [["BP", BP], ["RP", RP]]) {
  const file = join(dir, "manifest.json");
  const m = read(file);
  if (!m) { err(`missing manifest: ${rel(file)}`); continue; }
  manifests[name] = m;
  const ids = [m.header?.uuid, ...(m.modules ?? []).map((x) => x.uuid)];
  for (const id of ids) {
    if (!UUID.test(id ?? "")) err(`${name} manifest: bad uuid ${id}`);
    if (seen.has(id)) err(`${name} manifest: duplicate uuid ${id}`);
    seen.add(id);
  }
  const mev = m.header?.min_engine_version;
  if (JSON.stringify(mev) !== JSON.stringify([1, 26, 50])) err(`${name} manifest: min_engine_version must be [1,26,50]`);
  if (!existsSync(join(dir, "pack_icon.png"))) err(`${name}: missing pack_icon.png`);
}
if (manifests.BP && manifests.RP) {
  const deps = manifests.BP.dependencies ?? [];
  if (!deps.some((d) => d.uuid === manifests.RP.header.uuid)) err("BP manifest must depend on the RP uuid");
  const server = deps.find((d) => d.module_name === "@minecraft/server");
  const ui = deps.find((d) => d.module_name === "@minecraft/server-ui");
  if (server?.version !== "2.10.0") err("BP must depend on @minecraft/server 2.10.0");
  if (ui?.version !== "2.2.0") err("BP must depend on @minecraft/server-ui 2.2.0");
  const script = (manifests.BP.modules ?? []).find((x) => x.type === "script");
  if (!script) err("BP manifest: missing script module");
  else if (!existsSync(join(BP, script.entry))) err(`BP script entry missing: ${script.entry} (run npm run build)`);
}

// ---- lang files ------------------------------------------------------------
function langKeys(file) {
  const keys = new Map();
  if (!existsSync(file)) { err(`missing lang file ${rel(file)}`); return keys; }
  readFileSync(file, "utf8").split(/\r?\n/).forEach((line, i) => {
    const t = line.trim();
    if (!t || t.startsWith("##")) return;
    const eq = t.indexOf("=");
    if (eq <= 0) { err(`${rel(file)}:${i + 1}: malformed line`); return; }
    const key = t.slice(0, eq);
    if (keys.has(key)) err(`${rel(file)}:${i + 1}: duplicate key ${key}`);
    keys.set(key, t.slice(eq + 1));
  });
  return keys;
}
const langs = {};
for (const dir of [BP, RP]) {
  const list = read(join(dir, "texts/languages.json"));
  if (!Array.isArray(list)) { err(`${rel(dir)}: texts/languages.json missing`); continue; }
  for (const code of list) langs[`${rel(dir)}/${code}`] = langKeys(join(dir, `texts/${code}.lang`));
}
const rpPt = langs["packs/JJK_RP/pt_BR"] ?? new Map();
const rpEn = langs["packs/JJK_RP/en_US"] ?? new Map();
for (const k of rpPt.keys()) if (!rpEn.has(k)) err(`lang key only in pt_BR: ${k}`);
for (const k of rpEn.keys()) if (!rpPt.has(k)) err(`lang key only in en_US: ${k}`);

// ---- resource pack references ----------------------------------------------
const hasTexture = (path) => [".png", ".tga"].some((e) => existsSync(join(RP, path + e)));
const itemTextures = read(join(RP, "textures/item_texture.json"))?.texture_data ?? {};
for (const [short, def] of Object.entries(itemTextures)) {
  const paths = [].concat(def.textures);
  for (const p of paths) if (!hasTexture(typeof p === "string" ? p : p.path)) err(`item_texture ${short}: missing ${JSON.stringify(p)}`);
}
const soundDefs = read(join(RP, "sounds/sound_definitions.json"))?.sound_definitions ?? {};
for (const [id, def] of Object.entries(soundDefs)) {
  for (const s of def.sounds ?? []) {
    const name = typeof s === "string" ? s : s.name;
    if (![".ogg", ".wav", ".fsb"].some((e) => existsSync(join(RP, name + e)))) err(`sound ${id}: missing file ${name}`);
  }
}
const rpAnimations = new Set();
for (const [file, data] of json) {
  if (!file.startsWith(RP)) continue;
  const r = rel(file);
  if (r.includes("/animations/")) for (const k of Object.keys(data.animations ?? {})) rpAnimations.add(k);
}
const particleIds = new Set();
const rpEntities = new Set();
for (const [file, data] of json) {
  if (!file.startsWith(RP)) continue;
  const pe = data.particle_effect;
  if (pe) {
    particleIds.add(pe.description?.identifier);
    const tex = pe.description?.basic_render_parameters?.texture;
    if (tex && !hasTexture(tex)) err(`particle ${pe.description.identifier}: missing texture ${tex}`);
  }
  const ce = data["minecraft:client_entity"]?.description;
  if (ce) {
    rpEntities.add(ce.identifier);
    for (const t of Object.values(ce.textures ?? {})) if (!t.startsWith("textures/blocks") && !t.startsWith("textures/items") && !hasTexture(t)) err(`entity ${ce.identifier}: missing texture ${t}`);
    for (const a of Object.values(ce.animations ?? {})) if (a.startsWith("animation.") && !rpAnimations.has(a)) err(`entity ${ce.identifier}: unknown animation ${a}`);
  }
}
const bpEntities = new Set();
const bpItems = new Set();
const cameras = new Set();
for (const [file, data] of json) {
  if (!file.startsWith(BP)) continue;
  const id = data["minecraft:entity"]?.description?.identifier;
  if (id) bpEntities.add(id);
  const item = data["minecraft:item"]?.description?.identifier;
  if (item) {
    bpItems.add(item);
    const icon = data["minecraft:item"].components?.["minecraft:icon"];
    const iconId = typeof icon === "string" ? icon : icon?.textures?.default ?? icon?.texture;
    if (iconId && !itemTextures[iconId]) err(`item ${item}: icon ${iconId} not in item_texture.json`);
  }
  const cam = data["minecraft:camera_preset"]?.identifier;
  if (cam) cameras.add(cam);
}
for (const id of bpEntities) if (!rpEntities.has(id)) warn.push(`entity ${id} has no client definition`);

// ---- script references -----------------------------------------------------
const refsFile = join(root, ".cache/refs.json");
if (!existsSync(refsFile)) err("missing .cache/refs.json (run npm run build)");
else {
  const refs = JSON.parse(readFileSync(refsFile, "utf8"));
  for (const a of refs.animations) if (!rpAnimations.has(a)) err(`script uses unknown animation ${a}`);
  for (const p of refs.particles) if (!particleIds.has(p)) err(`script uses unknown particle ${p}`);
  for (const s of refs.sounds) if (!soundDefs[s]) err(`script uses unknown sound ${s}`);
  for (const e of refs.entities) if (!bpEntities.has(e)) err(`script uses unknown entity ${e}`);
  for (const i of refs.items) if (!bpItems.has(i)) err(`script uses unknown item ${i}`);
  for (const c of refs.cameras) if (!cameras.has(c)) err(`script uses unknown camera preset ${c}`);
  for (const k of refs.langKeys) if (!rpPt.has(k)) err(`script uses lang key missing from RP pt_BR: ${k}`);
}

for (const w of warn) console.log(`warning: ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`error: ${e}`);
  console.error(`\n${errors.length} problem(s) found`);
  process.exit(1);
}
console.log(`[validate] OK — ${json.size} JSON files, ${rpAnimations.size} animations, ${particleIds.size} particles, ${Object.keys(soundDefs).length} sounds`);
