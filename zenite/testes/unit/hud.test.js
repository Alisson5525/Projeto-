import { test } from 'node:test';
import assert from 'node:assert/strict';
import { montarHud, barraEter } from '../../BP/scripts/core/hud.js';

// O que o jogador vê: junta as partes e remove os códigos de cor (§x).
const texto = (raw) => raw.rawtext.map((p) => p.text ?? `{${p.translate}}`).join('').replace(/§./g, '');

test('HUD mostra Éter, a técnica e "pronta"', () => {
  const h = montarHud({ eter: 72, max: 100, tecnica: 'nova', prontaEm: 0, veu: false, dentroAbobada: false, canalizando: false, glifos: false, infinito: false });
  const t = texto(h);
  assert.match(t, /72\/100/);
  assert.match(t, /\{zenite\.tec\.nova\.nome\}/);
  assert.match(t, /\{zenite\.hud\.pronta\}/);
});

test('HUD mostra a recarga em segundos', () => {
  const t = texto(montarHud({ eter: 10, max: 100, tecnica: 'poco', prontaEm: 64, glifos: false }));
  assert.match(t, /3\.2s/);
  assert.doesNotMatch(t, /zenite\.hud\.pronta/);
});

test('HUD indica Véu ativo, Abóbada e canalização', () => {
  const t = texto(montarHud({ eter: 50, max: 100, tecnica: 'veu', prontaEm: 0, veu: true, dentroAbobada: true, canalizando: true, glifos: false }));
  assert.match(t, /\{zenite\.hud\.veu\}/);
  assert.match(t, /\{zenite\.hud\.abobada\}/);
  assert.match(t, /\{zenite\.hud\.canalizando\}/);
});

test('HUD no criativo mostra Éter infinito', () => {
  const t = texto(montarHud({ eter: 100, max: 100, tecnica: 'nova', prontaEm: 0, glifos: false, infinito: true }));
  assert.match(t, /\{zenite\.hud\.criativo\}/);
  assert.doesNotMatch(t, /100\/100/);
});

test('barraEter com glifos usa 10 segmentos da página E7 e tampas', () => {
  const b = barraEter(55, 100, true);
  assert.equal(b[0], '');
  assert.equal(b[b.length - 1], '');
  const meio = [...b.slice(1, -1)];
  assert.equal(meio.length, 10);
  assert.deepEqual(meio.slice(0, 5), Array(5).fill(''));
  assert.equal(meio[5], '');
  assert.deepEqual(meio.slice(6), Array(4).fill(''));
});

test('barraEter em texto usa 20 traços', () => {
  const b = barraEter(50, 100, false);
  assert.equal((b.match(/\|/g) || []).length, 20);
});
