// Validador do add-on: JSON, referencias cruzadas, ossos, Molang, particulas, sons e itens.
// Uso: node tools/validate.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const RP = path.join(ROOT, 'superman_addon/resource_pack');
const BP = path.join(ROOT, 'superman_addon/behavior_pack');
const VAN = path.join(ROOT, 'tools/vanilla');
let errors = 0;
let checks = 0;
const err = (m) => { errors++; console.log('ERRO: ' + m); };
const ok = () => { checks++; };

function walk(dir, ext) {
  const out = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) out.push(...walk(p, ext));
    else if (f.name.endsWith(ext)) out.push(p);
  }
  return out;
}
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\s*\/\/.*$/mg, ''));

// 1) todos os JSON abrem
const json = {};
for (const p of [...walk(RP, '.json'), ...walk(BP, '.json')]) {
  try { json[p] = readJson(p); ok(); } catch (e) { err(`JSON invalido ${p}: ${e.message}`); }
}

// 2) Molang: compila todas as expressoes (sintaxe)
function molangOk(expr, where) {
  if (typeof expr !== 'string') return;
  let s = expr.toLowerCase()
    .replace(/\bmath\.(\w+)/g, 'M.$1').replace(/\b(query|q)\.(\w+)/g, 'Q.$2')
    .replace(/\b(variable|v)\.(\w+)/g, 'V.$2').replace(/\b(temp|t)\.(\w+)/g, 'T.$2')
    .replace(/\b(context|c)\.(\w+)/g, 'C.$2').replace(/\bthis\b/g, '0');
  // strings Molang usam aspas simples, iguais ao JS
  try {
    if (/;\s*$/.test(s.trim()) || /=[^=]/.test(s.replace(/[=!<>]=/g, ''))) new Function('M', 'Q', 'V', 'T', 'C', s);
    else new Function('M', 'Q', 'V', 'T', 'C', 'return (' + s + ');');
    ok();
  } catch (e) {
    err(`Molang invalido em ${where}: ${expr}`);
  }
  const fns = s.match(/M\.(\w+)/g) || [];
  const known = new Set(['sin', 'cos', 'abs', 'clamp', 'lerp', 'min', 'max', 'mod', 'floor', 'ceil', 'round', 'trunc', 'sqrt',
    'pow', 'exp', 'random', 'random_integer', 'pi', 'asin', 'acos', 'atan', 'atan2', 'hermite_blend', 'lerprotate', 'die_roll', 'ln', 'sign']);
  for (const f of fns) if (!known.has(f.slice(2))) err(`funcao Molang desconhecida ${f} em ${where}`);
}
function scan(obj, where) {
  if (typeof obj === 'string') { if (/[qv]\.|math\.|query\.|variable\./.test(obj)) molangOk(obj, where); return; }
  if (Array.isArray(obj)) { obj.forEach((o, i) => scan(o, `${where}[${i}]`)); return; }
  if (obj && typeof obj === 'object') for (const [k, v] of Object.entries(obj)) scan(v, `${where}.${k}`);
}
for (const [p, d] of Object.entries(json)) {
  if (p.includes('/animations/') || p.includes('/animation_controllers/') || p.includes('/particles/') ||
      p.includes('/entity/') || p.includes('/render_controllers/')) scan(d, path.relative(ROOT, p));
}

// 3) geometria e ossos
const geo = json[path.join(RP, 'models/entity/superman.geo.json')]['minecraft:geometry'][0];
const bones = new Set(geo.bones.map((b) => b.name.toLowerCase()));
for (const b of geo.bones) if (b.parent && !bones.has(b.parent.toLowerCase())) err(`osso ${b.name} com pai inexistente ${b.parent}`);
const anims = json[path.join(RP, 'animations/superman.animation.json')].animations;
for (const [n, a] of Object.entries(anims)) {
  for (const b of Object.keys(a.bones || {})) {
    if (!bones.has(b.toLowerCase())) err(`animacao ${n} usa osso inexistente ${b}`); else ok();
  }
}

// 4) entidade: animacoes e controladores referenciados existem
const ent = json[path.join(RP, 'entity/player.entity.json')]['minecraft:client_entity'].description;
const vanillaEnt = readJson(path.join(VAN, 'player.entity.json'))['minecraft:client_entity'].description;
const ctrls = json[path.join(RP, 'animation_controllers/superman.animation_controllers.json')].animation_controllers;
for (const [short, full] of Object.entries(ent.animations)) {
  if (full.startsWith('animation.superman.')) { if (!anims[full]) err(`entidade aponta para animacao inexistente ${full}`); else ok(); }
  else if (full.startsWith('controller.animation.superman.')) { if (!ctrls[full]) err(`controlador inexistente ${full}`); else ok(); }
  else if (vanillaEnt.animations[short] !== full) err(`animacao vanilla alterada: ${short}`);
}
for (const a of ent.scripts.animate) {
  const k = typeof a === 'string' ? a : Object.keys(a)[0];
  if (!ent.animations[k]) err(`animate usa ${k} inexistente`); else ok();
}
for (const [cn, c] of Object.entries(ctrls)) {
  for (const [sn, st] of Object.entries(c.states)) {
    for (const a of st.animations || []) {
      const k = typeof a === 'string' ? a : Object.keys(a)[0];
      if (!ent.animations[k]) err(`${cn}.${sn} usa animacao ${k} nao declarada na entidade`); else ok();
    }
    for (const t of st.transitions || []) {
      const dest = Object.keys(t)[0];
      if (!c.states[dest]) err(`${cn}.${sn} transita para estado inexistente ${dest}`); else ok();
    }
  }
  if (!c.states[c.initial_state]) err(`${cn} sem estado inicial valido`);
}
// variaveis usadas devem ser definidas em pre_animation/initialize (ou vanilla)
const defined = new Set();
for (const line of [...ent.scripts.initialize, ...ent.scripts.pre_animation]) {
  const m = line.match(/^\s*(?:v|variable)\.(\w+)\s*=/);
  if (m) defined.add(m[1]);
}
['is_first_person', 'is_paperdoll', 'map_face_icon', 'attack_time', 'is_using_vr', 'gliding_speed_value', 'swim_amount',
  'is_holding_right', 'is_holding_left', 'is_brandishing_spear', 'is_holding_spyglass', 'damage_nearby_mobs', 'melee_spear_equipped',
  'use_item_interval_progress', 'use_item_startup_progress', 'is_tooting_goat_horn', 'is_using_brush', 'bob_animation',
  'first_person_item_rotation_factor', 'short_arm_offset_right', 'short_arm_offset_left', 'player_x_rotation', 'is_sneaking'].forEach((v) => defined.add(v));
const used = new Set();
const grab = (o) => JSON.stringify(o).replace(/(?:\bv|variable)\.(\w+)/g, (m, n) => { used.add(n); return m; });
grab(anims); grab(ctrls); grab(ent.scripts); grab(json[path.join(RP, 'render_controllers/superman.render_controllers.json')]);
for (const v of used) {
  if (v.startsWith('sm_') && !defined.has(v)) err(`variavel v.${v} usada mas nunca definida`);
  else ok();
}

// 5) render controllers e texturas
const rc = json[path.join(RP, 'render_controllers/superman.render_controllers.json')].render_controllers;
for (const r of ent.render_controllers) {
  const k = Object.keys(r)[0];
  if (k.startsWith('controller.render.superman') && !rc[k]) err(`render controller ${k} inexistente`); else ok();
}
for (const [k, t] of Object.entries(ent.textures)) {
  if (k === 'superman' && !fs.existsSync(path.join(RP, t + '.png'))) err(`textura ausente ${t}`); else ok();
}
for (const [, d] of Object.entries(json[path.join(RP, 'textures/item_texture.json')].texture_data)) {
  if (!fs.existsSync(path.join(RP, d.textures + '.png'))) err(`icone ausente ${d.textures}`); else ok();
}

// 6) scripts: particulas, sons, itens
const partIds = new Set(Object.values(json).filter((d) => d.particle_effect).map((d) => d.particle_effect.description.identifier));
for (const d of Object.values(json).filter((d) => d.particle_effect)) {
  const t = d.particle_effect.description.basic_render_parameters.texture;
  if (!fs.existsSync(path.join(RP, t + '.png'))) err(`textura de particula ausente ${t}`);
}
const sounds = new Set(Object.keys(readJson(path.join(VAN, 'sound_definitions.json')).sound_definitions));
const itemIds = new Set(Object.values(json).filter((d) => d['minecraft:item']).map((d) => d['minecraft:item'].description.identifier));
const src = walk(path.join(BP, 'scripts'), '.js').map((p) => fs.readFileSync(p, 'utf8')).join('\n');
for (const m of src.matchAll(/'(superman:[a-z_]+)'/g)) {
  const id = m[1];
  if (id.startsWith('superman:') && (partIds.has(id) || itemIds.has(id) || /superman:(on|fly|power|charge|input|combat|settings|got_emblem|tutorial)$/.test(id))) ok();
  else err(`script usa id desconhecido ${id}`);
}
for (const m of src.matchAll(/sound\(\w+, '([a-z0-9_.]+)'/g)) {
  if (!sounds.has(m[1])) err(`som inexistente ${m[1]}`); else ok();
}
for (const [k, v] of Object.entries(json[path.join(BP, 'entities/player.json')]['minecraft:entity'].description.properties)) {
  if (!src.includes(`'${k}'`)) err(`propriedade ${k} nao usada nos scripts`); else ok();
}

// 7) manifestos
const rpm = json[path.join(RP, 'manifest.json')], bpm = json[path.join(BP, 'manifest.json')];
if (!rpm.dependencies.some((d) => d.uuid === bpm.header.uuid)) err('RP nao depende do BP');
if (!bpm.dependencies.some((d) => d.uuid === rpm.header.uuid)) err('BP nao depende do RP');
if (!fs.existsSync(path.join(BP, bpm.modules.find((m) => m.type === 'script').entry))) err('entrada de script ausente');

console.log(`\n${checks} verificacoes OK, ${errors} erro(s).`);
process.exit(errors ? 1 : 0);
