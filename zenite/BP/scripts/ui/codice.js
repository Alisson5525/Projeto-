// Códice do Zênite: o guia dentro do jogo, em capítulos.
import { ActionFormData } from '@minecraft/server-ui';
import { SONS, TECNICAS } from '../core/config.js';
import { somJogador } from '../core/fx.js';
import { tr } from '../core/texto.js';
import { mostrar } from './forms.js';

/** Capítulos e quantos parágrafos (chaves zenite.codice.<id>.<n>) cada um tem. */
export const CAPITULOS = Object.freeze([
  { id: 'inicio', icone: 'textures/items/zenite/astrolabio', paragrafos: 6 },
  { id: 'tecnicas', icone: 'textures/ui/zenite/horizonte', paragrafos: 1 },
  { id: 'maestria', icone: 'textures/items/zenite/poeira_estelar', paragrafos: 4 },
  { id: 'traje', icone: 'textures/items/zenite/manto', paragrafos: 3 },
  { id: 'arconte', icone: 'textures/items/zenite/selo_eclipse', paragrafos: 3 },
  { id: 'comandos', icone: 'textures/items/zenite/codice', paragrafos: 2 },
]);

/** @param {import('@minecraft/server').Player} player */
export async function abrirCodice(player) {
  const f = new ActionFormData().title(tr('zenite.codice.titulo')).body(tr('zenite.codice.corpo'));
  for (const c of CAPITULOS) f.button(tr(`zenite.codice.cap.${c.id}`), c.icone);
  somJogador(player, SONS.ui, 0.6);
  const r = await mostrar(player, f);
  if (!r || r.canceled || r.selection === undefined) return;
  await abrirCapitulo(player, CAPITULOS[r.selection]);
}

/** @param {import('@minecraft/server').Player} player @param {(typeof CAPITULOS)[number]} cap */
async function abrirCapitulo(player, cap) {
  /** @type {import('@minecraft/server').RawMessage[]} */
  const partes = [{ text: '§l§e' }, tr(`zenite.codice.cap.${cap.id}`), { text: '§r\n\n' }];
  for (let i = 1; i <= cap.paragrafos; i++) partes.push({ text: '§f' }, tr(`zenite.codice.${cap.id}.${i}`), { text: '\n\n' });
  if (cap.id === 'tecnicas') {
    for (const tec of TECNICAS) {
      const custo = tec.custo === 'cheio' ? [tr('zenite.menu.eter_cheio')] : [{ text: `${tec.custo}` }];
      const libera = tec.requer ? [tr('zenite.menu.coracao')] : [tr('zenite.menu.nivel'), { text: ` ${tec.nivel}` }];
      partes.push(
        { text: `${tec.corTexto}§l` }, tr(`zenite.tec.${tec.id}.nome`), { text: '§r\n§7' }, tr(`zenite.tec.${tec.id}.desc`),
        { text: '\n§8' }, tr('zenite.menu.custo'), { text: ': §b' }, ...custo,
        { text: '  §8' }, tr('zenite.menu.recarga'), { text: `: §b${tec.recarga / 20}s  §8` }, ...libera, { text: '\n\n' },
      );
    }
  }
  const f = new ActionFormData().title(tr('zenite.codice.titulo')).body({ rawtext: partes }).button(tr('zenite.menu.voltar'));
  const r = await mostrar(player, f);
  if (r && !r.canceled && r.selection === 0) await abrirCodice(player);
}
