import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../../BP/scripts/core/progression.js';
import { TECNICA_POR_ID, LIMIARES_XP, NIVEL_MAX, TECNICAS } from '../../BP/scripts/core/config.js';

test('tabela de técnicas com os valores do spec', () => {
  assert.deepEqual(TECNICAS.map((t) => t.id), ['veu', 'poco', 'nova', 'passo', 'reversao', 'horizonte', 'abobada']);
  const esperado = { veu: [10, 60, 1], poco: [25, 120, 1], nova: [30, 140, 1], passo: [12, 30, 1], reversao: [40, 400, 2], horizonte: [70, 500, 4] };
  for (const [id, [custo, recarga, nivel]] of Object.entries(esperado)) {
    assert.equal(TECNICA_POR_ID[id].custo, custo, `${id}.custo`);
    assert.equal(TECNICA_POR_ID[id].recarga, recarga, `${id}.recarga`);
    assert.equal(TECNICA_POR_ID[id].nivel, nivel, `${id}.nivel`);
  }
  assert.equal(TECNICA_POR_ID.veu.dreno, 3);
  assert.equal(TECNICA_POR_ID.abobada.custo, 'cheio');
  assert.equal(TECNICA_POR_ID.abobada.recarga, 2400);
  assert.deepEqual(LIMIARES_XP, [0, 60, 160, 320, 540, 820, 1160, 1560, 2020, 2540]);
  assert.equal(NIVEL_MAX, 10);
});

test('nivelPorXp segue os limiares', () => {
  assert.equal(P.nivelPorXp(0), 1);
  assert.equal(P.nivelPorXp(59), 1);
  assert.equal(P.nivelPorXp(60), 2);
  assert.equal(P.nivelPorXp(320), 4);
  assert.equal(P.nivelPorXp(2539), 9);
  assert.equal(P.nivelPorXp(99999), 10);
  assert.equal(P.nivelPorXp(-10), 1);
});

test('progressoNivel dá a fração dentro do nível', () => {
  assert.deepEqual(P.progressoNivel(110), { nivel: 2, base: 60, proximo: 160, fracao: 0.5 });
  assert.deepEqual(P.progressoNivel(5000), { nivel: 10, base: 2540, proximo: null, fracao: 1 });
});

test('Éter máximo e regeneração', () => {
  assert.equal(P.eterMax(1), 100);
  assert.equal(P.eterMax(10), 190);
  assert.ok(Math.abs(P.regenEter(1, false) - 2) < 1e-9);
  assert.ok(Math.abs(P.regenEter(10, false) - 3.8) < 1e-9);
  assert.ok(Math.abs(P.regenEter(10, true) - 7.6) < 1e-9);
});

test('clampEter nunca fica negativo nem passa do máximo', () => {
  assert.equal(P.clampEter(-5, 100), 0);
  assert.equal(P.clampEter(250, 190), 190);
  assert.equal(P.clampEter(42.5, 100), 42.5);
  assert.equal(P.clampEter(Number.NaN, 100), 0);
});

test('xpPorAbate', () => {
  assert.equal(P.xpPorAbate(20), 15);
  assert.equal(P.xpPorAbate(500), 255);
  assert.equal(P.xpPorAbate(0), 5);
});

test('tecnicaLiberada respeita nível, coração e criativo', () => {
  const T = TECNICA_POR_ID;
  assert.equal(P.tecnicaLiberada(T.horizonte, { nivel: 3, abobada: false, criativo: false }), false);
  assert.equal(P.tecnicaLiberada(T.horizonte, { nivel: 4, abobada: false, criativo: false }), true);
  assert.equal(P.tecnicaLiberada(T.reversao, { nivel: 1, abobada: false, criativo: false }), false);
  assert.equal(P.tecnicaLiberada(T.abobada, { nivel: 10, abobada: false, criativo: false }), false);
  assert.equal(P.tecnicaLiberada(T.abobada, { nivel: 1, abobada: true, criativo: false }), true);
  assert.equal(P.tecnicaLiberada(T.abobada, { nivel: 1, abobada: false, criativo: true }), true);
  assert.equal(P.tecnicaLiberada(T.horizonte, { nivel: 1, abobada: false, criativo: true }), true);
});

test('custoDe resolve o custo "cheio" da Abóbada', () => {
  assert.equal(P.custoDe(TECNICA_POR_ID.nova, 150), 30);
  assert.equal(P.custoDe(TECNICA_POR_ID.abobada, 150), 150);
});
