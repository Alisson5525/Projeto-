import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as V from '../../BP/scripts/core/vec.js';

const perto = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

test('operações básicas de vetor', () => {
  assert.deepEqual(V.add({ x: 1, y: 2, z: 3 }, { x: 1, y: 1, z: 1 }), { x: 2, y: 3, z: 4 });
  assert.deepEqual(V.sub({ x: 1, y: 2, z: 3 }, { x: 1, y: 1, z: 1 }), { x: 0, y: 1, z: 2 });
  assert.deepEqual(V.scale({ x: 1, y: -2, z: 3 }, 2), { x: 2, y: -4, z: 6 });
  assert.equal(V.len({ x: 3, y: 4, z: 0 }), 5);
  assert.equal(V.dist({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 7 }), 7);
  assert.ok(perto(V.len(V.norm({ x: 5, y: -2, z: 9 })), 1));
  assert.deepEqual(V.norm({ x: 0, y: 0, z: 0 }), { x: 0, y: 0, z: 0 });
  assert.deepEqual(V.lerp({ x: 0, y: 0, z: 0 }, { x: 10, y: 20, z: 30 }, 0.5), { x: 5, y: 10, z: 15 });
  assert.deepEqual(V.cross({ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }), { x: 0, y: 0, z: 1 });
  assert.equal(V.dot({ x: 1, y: 2, z: 3 }, { x: 4, y: 5, z: 6 }), 32);
});

test('rotY gira em torno do eixo Y', () => {
  const r = V.rotY({ x: 1, y: 5, z: 0 }, Math.PI / 2);
  assert.ok(perto(r.x, 0) && perto(r.y, 5) && perto(Math.abs(r.z), 1));
});

test('base perpendicular à direção de olhar', () => {
  const { direita, cima } = V.basePerpendicular({ x: 0, y: 0, z: 1 });
  assert.ok(perto(V.dot(direita, { x: 0, y: 0, z: 1 }), 0));
  assert.ok(perto(V.dot(cima, { x: 0, y: 0, z: 1 }), 0));
  assert.ok(perto(V.len(direita), 1) && perto(V.len(cima), 1));
  const vertical = V.basePerpendicular({ x: 0, y: 1, z: 0 });
  assert.ok(perto(V.len(vertical.direita), 1), 'olhar reto para cima não pode gerar vetor nulo');
});

test('pontosEsfera(14): casca sem duplicatas, entre r-1 e r, ordenada de cima para baixo', () => {
  const pts = V.pontosEsfera(14);
  const chaves = new Set(pts.map((p) => `${p.x},${p.y},${p.z}`));
  assert.equal(chaves.size, pts.length);
  for (const p of pts) { const d = V.len(p); assert.ok(d <= 14 + 1e-9 && d > 13 - 1e-9, `distância ${d}`); }
  for (let i = 1; i < pts.length; i++) assert.ok(pts[i - 1].y >= pts[i].y);
});

test('pontosEsfera(14) fecha a cúpula: nada escapa andando de face em face a partir do centro', () => {
  const r = 14;
  const casca = new Set(V.pontosEsfera(r).map((p) => `${p.x},${p.y},${p.z}`));
  const vistos = new Set(['0,0,0']);
  const fila = [[0, 0, 0]];
  while (fila.length) {
    const [x, y, z] = fila.pop();
    assert.ok(x * x + y * y + z * z <= (r + 1) * (r + 1), `vazou em ${x},${y},${z}`);
    for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
      const k = `${x + dx},${y + dy},${z + dz}`;
      if (!vistos.has(k) && !casca.has(k)) { vistos.add(k); fila.push([x + dx, y + dy, z + dz]); }
    }
  }
});

test('pontosBola(3) contém o centro e só pontos dentro do raio, do centro para fora', () => {
  const pts = V.pontosBola(3);
  assert.deepEqual(pts[0], { x: 0, y: 0, z: 0 });
  for (const p of pts) assert.ok(V.len(p) <= 3 + 1e-9);
  assert.equal(pts.length, new Set(pts.map((p) => `${p.x},${p.y},${p.z}`)).size);
  for (let i = 1; i < pts.length; i++) assert.ok(V.len(pts[i - 1]) <= V.len(pts[i]) + 1e-9);
});
