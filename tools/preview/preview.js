// Visualizador offline de geometria + animacoes Bedrock (convencoes do Blockbench).
import * as THREE from './node_modules/three/build/three.module.js';

const DEG = Math.PI / 180;

// ---------------------------------------------------------------- Molang
const M = {
  sin: (d) => Math.sin(d * DEG), cos: (d) => Math.cos(d * DEG),
  abs: Math.abs, sqrt: Math.sqrt, pow: Math.pow, exp: Math.exp, floor: Math.floor,
  ceil: Math.ceil, round: Math.round, trunc: Math.trunc,
  min: Math.min, max: Math.max,
  clamp: (v, a, b) => Math.min(Math.max(v, a), b),
  lerp: (a, b, t) => a + (b - a) * t,
  mod: (a, b) => a - b * Math.floor(a / b),
  asin: (v) => Math.asin(v) / DEG, acos: (v) => Math.acos(v) / DEG,
  atan: (v) => Math.atan(v) / DEG, atan2: (y, x) => Math.atan2(y, x) / DEG,
  pi: Math.PI, random: (a, b) => a + (b - a) * 0.5,
  hermite_blend: (t) => 3 * t * t - 2 * t * t * t,
  sign: Math.sign, ln: Math.log,
};
const cache = new Map();
export function molang(expr, Q, V) {
  if (typeof expr === 'number') return expr;
  if (typeof expr !== 'string') return 0;
  let fn = cache.get(expr);
  if (!fn) {
    let s = expr.toLowerCase();
    s = s.replace(/\bmath\.(\w+)/g, 'M.$1')
      .replace(/\b(query|q)\.(\w+)/g, 'Q.$2')
      .replace(/\b(variable|v)\.(\w+)/g, 'V.$2')
      .replace(/\b(temp|t)\.(\w+)/g, 'T.$2')
      .replace(/\bthis\b/g, '0');
    try {
      fn = new Function('M', 'Q', 'V', 'T', 'return (' + s + ');');
    } catch (e) {
      throw new Error('Molang invalido: ' + expr + ' -> ' + s);
    }
    cache.set(expr, fn);
  }
  const Qp = new Proxy(Q, { get: (o, k) => (k in o ? o[k] : 0) });
  const Vp = new Proxy(V, { get: (o, k) => (k in o ? o[k] : 0) });
  const r = fn(M, Qp, Vp, {});
  return typeof r === 'boolean' ? (r ? 1 : 0) : (Number.isFinite(r) ? r : 0);
}

// ---------------------------------------------------------------- Modelo
export function buildModel(geo, texture, hidden = ['eye_glow', 'eyelids']) {
  const g = geo['minecraft:geometry'][0];
  const TW = g.description.texture_width, TH = g.description.texture_height;
  const mat = new THREE.MeshLambertMaterial({ map: texture, transparent: false, alphaTest: 0.5, side: THREE.DoubleSide });
  const root = new THREE.Group();
  const bones = {};
  const rest = {};
  for (const b of g.bones) {
    const grp = new THREE.Group();
    grp.name = b.name;
    grp.rotation.order = 'ZYX';
    const pv = b.pivot || [0, 0, 0];
    grp.userData.pivot = new THREE.Vector3(-pv[0], pv[1], pv[2]);
    grp.userData.boneRot = (b.rotation || [0, 0, 0]).slice();
    bones[b.name.toLowerCase()] = grp;
    for (const c of (hidden.includes(b.name.toLowerCase()) ? [] : (b.cubes || []))) {
      grp.add(cubeMesh(c, mat, TW, TH, grp.userData.pivot));
    }
  }
  for (const b of g.bones) {
    const grp = bones[b.name.toLowerCase()];
    const parent = b.parent ? bones[b.parent.toLowerCase()] : null;
    const ppv = parent ? parent.userData.pivot : new THREE.Vector3();
    grp.userData.restPos = grp.userData.pivot.clone().sub(ppv);
    (parent || root).add(grp);
  }
  return { root, bones };
}

function cubeMesh(c, mat, TW, TH, pivot) {
  const [ox, oy, oz] = c.origin;
  const [sx, sy, sz] = c.size;
  const inf = c.inflate || 0;
  const x0 = ox - inf, x1 = ox + sx + inf, y0 = oy - inf, y1 = oy + sy + inf, z0 = oz - inf, z1 = oz + sz + inf;
  // cantos (bedrock) com (u,v) normalizados dentro da face; convencao do gen_model.py
  const F = {
    north: [[x0, y1, z0, 0, 0], [x1, y1, z0, 1, 0], [x1, y0, z0, 1, 1], [x0, y0, z0, 0, 1]],
    south: [[x1, y1, z1, 0, 0], [x0, y1, z1, 1, 0], [x0, y0, z1, 1, 1], [x1, y0, z1, 0, 1]],
    east: [[x0, y1, z1, 0, 0], [x0, y1, z0, 1, 0], [x0, y0, z0, 1, 1], [x0, y0, z1, 0, 1]],
    west: [[x1, y1, z0, 0, 0], [x1, y1, z1, 1, 0], [x1, y0, z1, 1, 1], [x1, y0, z0, 0, 1]],
    up: [[x0, y1, z1, 0, 0], [x1, y1, z1, 1, 0], [x1, y1, z0, 1, 1], [x0, y1, z0, 0, 1]],
    down: [[x0, y0, z0, 0, 0], [x1, y0, z0, 1, 0], [x1, y0, z1, 1, 1], [x0, y0, z1, 0, 1]],
  };
  const pos = [], uv = [], idx = [], nrm = [];
  const normals = { north: [0, 0, -1], south: [0, 0, 1], east: [1, 0, 0], west: [-1, 0, 0], up: [0, 1, 0], down: [0, -1, 0] };
  let n = 0;
  for (const face of Object.keys(F)) {
    const fu = c.uv[face];
    if (!fu) continue;
    const [u0, v0] = fu.uv, [uw, vh] = fu.uv_size;
    for (const [x, y, z, a, b] of F[face]) {
      pos.push(-x - pivot.x, y - pivot.y, z - pivot.z);
      uv.push((u0 + a * uw) / TW, 1 - (v0 + b * vh) / TH);
      nrm.push(...normals[face]);
    }
    idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
    n += 4;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  geom.setIndex(idx);
  geom.computeVertexNormals();
  return new THREE.Mesh(geom, mat);
}

// ---------------------------------------------------------------- Animacao
function kfValue(v, Q, V) {
  if (Array.isArray(v)) return v.map((e) => molang(e, Q, V));
  if (typeof v === 'number' || typeof v === 'string') { const s = molang(v, Q, V); return [s, s, s]; }
  return null;
}

function channelValue(ch, t, Q, V) {
  if (ch === undefined) return null;
  if (Array.isArray(ch) || typeof ch !== 'object') return kfValue(ch, Q, V);
  const keys = Object.keys(ch).map(parseFloat).sort((a, b) => a - b);
  const raw = Object.keys(ch).sort((a, b) => parseFloat(a) - parseFloat(b));
  const get = (i, side) => {
    const k = ch[raw[i]];
    if (Array.isArray(k) || typeof k !== 'object') return kfValue(k, Q, V);
    return kfValue(k[side] !== undefined ? k[side] : (k.post !== undefined ? k.post : k.pre), Q, V);
  };
  const mode = (i) => { const k = ch[raw[i]]; return (k && !Array.isArray(k) && typeof k === 'object' && k.lerp_mode) || 'linear'; };
  if (t <= keys[0]) return get(0, 'pre');
  if (t >= keys[keys.length - 1]) return get(keys.length - 1, 'post');
  let i = 0;
  while (i < keys.length - 1 && keys[i + 1] < t) i++;
  const a = keys[i], b = keys[i + 1];
  const f = (t - a) / (b - a);
  const p1 = get(i, 'post'), p2 = get(i + 1, 'pre');
  if (mode(i) === 'catmullrom' || mode(i + 1) === 'catmullrom') {
    const p0 = get(Math.max(i - 1, 0), 'post'), p3 = get(Math.min(i + 2, keys.length - 1), 'pre');
    return p1.map((_, j) => catmull(p0[j], p1[j], p2[j], p3[j], f));
  }
  if (mode(i) === 'step') return p1;
  return p1.map((v, j) => v + (p2[j] - v) * f);
}

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

export function applyPose(model, layers, Q, V) {
  // layers: [{anim, time, weight}]
  const acc = {};
  for (const [name, grp] of Object.entries(model.bones)) {
    acc[name] = { r: [0, 0, 0], p: [0, 0, 0], s: [1, 1, 1] };
  }
  for (const L of layers) {
    const anim = L.anim;
    const len = anim.animation_length || 0;
    let t = L.time;
    if (anim.loop === true && len > 0) t = t % len;
    if (anim.loop !== true && len > 0) t = Math.min(t, len);
    const Qa = Object.assign({}, Q, { anim_time: t });
    const w = L.weight === undefined ? 1 : L.weight;
    for (const [bname, bd] of Object.entries(anim.bones || {})) {
      const a = acc[bname.toLowerCase()];
      if (!a) continue;
      const r = channelValue(bd.rotation, t, Qa, V);
      const p = channelValue(bd.position, t, Qa, V);
      const s = channelValue(bd.scale, t, Qa, V);
      if (r) for (let j = 0; j < 3; j++) a.r[j] += r[j] * w;
      if (p) for (let j = 0; j < 3; j++) a.p[j] += p[j] * w;
      if (s) for (let j = 0; j < 3; j++) a.s[j] *= 1 + (s[j] - 1) * w;
    }
  }
  for (const [name, grp] of Object.entries(model.bones)) {
    const a = acc[name];
    const br = grp.userData.boneRot;
    grp.rotation.set(-(br[0] + a.r[0]) * DEG, -(br[1] + a.r[1]) * DEG, (br[2] + a.r[2]) * DEG, 'ZYX');
    grp.position.copy(grp.userData.restPos).add(new THREE.Vector3(-a.p[0], a.p[1], a.p[2]));
    grp.scale.set(a.s[0], a.s[1], a.s[2]);
  }
}

// ---------------------------------------------------------------- Cena
export function makeScene(w, h) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: false });
  renderer.setSize(w, h);
  renderer.setPixelRatio(1);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9ec9f5);
  scene.add(new THREE.AmbientLight(0xffffff, 1.45));
  const d1 = new THREE.DirectionalLight(0xffffff, 1.6);
  d1.position.set(-0.6, 1.0, -0.8);
  scene.add(d1);
  const d2 = new THREE.DirectionalLight(0xffffff, 0.5);
  d2.position.set(0.7, 0.3, 0.9);
  scene.add(d2);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshLambertMaterial({ color: 0x6aa84f }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  scene.add(ground);
  const grid = new THREE.GridHelper(80, 5, 0x4c7a38, 0x4c7a38);
  scene.add(grid);
  const camera = new THREE.PerspectiveCamera(30, w / h, 0.5, 500);
  return { renderer, scene, camera };
}

export function loadTexture(url) {
  return new Promise((res) => {
    new THREE.TextureLoader().load(url, (t) => {
      t.magFilter = THREE.NearestFilter;
      t.minFilter = THREE.NearestFilter;
      t.colorSpace = THREE.SRGBColorSpace;
      res(t);
    });
  });
}

export { THREE };
