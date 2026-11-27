// Roda de Técnicas (agachar + usar o Astrolábio), Status e Configurações.
import { system } from '@minecraft/server';
import { ActionFormData, ModalFormData } from '@minecraft/server-ui';
import { GLIFO, SONS, TECNICAS } from '../core/config.js';
import { cfgJogador, cfgMundo, ehOperador, salvarCfgJogador, salvarCfgMundo } from '../core/configuracoes.js';
import { ehCriativo, maxEter, obterEstado, salvarEstado } from '../core/estado.js';
import { somJogador } from '../core/fx.js';
import { avisar } from '../core/lancar.js';
import { progressoNivel, regenEter, tecnicaLiberada } from '../core/progression.js';
import { tr } from '../core/texto.js';
import { darSigilos } from '../sistemas/entregas.js';
import { abrirCodice } from './codice.js';
import { mostrar } from './forms.js';

/** @param {import('@minecraft/server').Player} player */
function ctxLiberacao(player) {
  const e = obterEstado(player);
  return { nivel: e.nivel, abobada: e.abobada, criativo: ehCriativo(player) };
}

/** Texto de duas linhas do botão de uma técnica. */
function botaoTecnica(tec, player, agora) {
  const e = obterEstado(player);
  const liberada = tecnicaLiberada(tec, ctxLiberacao(player));
  /** @type {import('@minecraft/server').RawMessage[]} */
  const r = [];
  if (!liberada) {
    r.push({ text: '§8§l' }, tr(`zenite.tec.${tec.id}.nome`), { text: `§r\n§8${GLIFO.cadeado} ` }, tr('zenite.menu.bloqueada'), { text: ' §8(' });
    r.push(...(tec.requer ? [tr('zenite.menu.coracao')] : [tr('zenite.menu.nivel'), { text: ` ${tec.nivel}` }]), { text: ')' });
    return { rawtext: r };
  }
  r.push({ text: `${tec.corBotao}§l` }, tr(`zenite.tec.${tec.id}.nome`), { text: '§r\n' });
  if (e.selecionada === tec.id) r.push(tr('zenite.menu.selecionada'));
  else {
    r.push({ text: '§8' }, tr('zenite.menu.custo'), { text: ' §0' });
    r.push(...(tec.custo === 'cheio' ? [tr('zenite.menu.eter_cheio')] : [{ text: `${tec.custo}` }]));
    const falta = (e.recargas[tec.id] ?? 0) - agora;
    r.push({ text: '  §8' }, tr('zenite.menu.recarga'), { text: falta > 0 ? ` §4${(falta / 20).toFixed(1)}s` : ` §0${tec.recarga / 20}s` });
  }
  return { rawtext: r };
}

/** @param {import('@minecraft/server').Player} player */
export async function abrirRoda(player) {
  const agora = system.currentTick;
  const f = new ActionFormData().title(tr('zenite.menu.titulo')).body(tr('zenite.menu.corpo'));
  for (const tec of TECNICAS) f.button(botaoTecnica(tec, player, agora), tec.icone);
  f.button(tr('zenite.menu.sigilos'), 'textures/items/zenite/sigilo_nova');
  f.button(tr('zenite.menu.status'), 'textures/items/zenite/coracao_firmamento');
  f.button(tr('zenite.menu.config'), 'textures/items/zenite/astrolabio');
  f.button(tr('zenite.menu.codice'), 'textures/items/zenite/codice');
  somJogador(player, SONS.ui, 0.6);
  const r = await mostrar(player, f);
  if (!r || r.canceled || r.selection === undefined) return;
  const i = r.selection;
  if (i < TECNICAS.length) {
    selecionar(player, TECNICAS[i]);
    return;
  }
  const extra = i - TECNICAS.length;
  if (extra === 0) darSigilos(player);
  else if (extra === 1) await abrirStatus(player);
  else if (extra === 2) await abrirConfig(player);
  else if (extra === 3) await abrirCodice(player);
}

/** @param {import('@minecraft/server').Player} player */
function selecionar(player, tec) {
  if (!tecnicaLiberada(tec, ctxLiberacao(player))) {
    somJogador(player, SONS.negado, 0.8);
    avisar(player, tec.requer ? [tr('zenite.msg.requer_coracao')] : [tr('zenite.msg.requer_nivel'), { text: ` §f${tec.nivel}` }]);
    return;
  }
  const e = obterEstado(player);
  e.selecionada = tec.id;
  salvarEstado(player);
  somJogador(player, SONS.ui, 0.8, 1.3);
  avisar(player, [tr('zenite.msg.selecionada'), { text: ` ${tec.corTexto}§l` }, tr(`zenite.tec.${tec.id}.nome`)], 40);
}

/** @param {import('@minecraft/server').Player} player */
export async function abrirStatus(player) {
  const e = obterEstado(player);
  const pr = progressoNivel(e.xp);
  const cheios = Math.round(pr.fracao * 30);
  const criativo = ehCriativo(player);
  /** @type {import('@minecraft/server').RawMessage[]} */
  const c = [
    tr('zenite.status.nivel'), { text: ` §l${e.nivel}§r\n` },
    { text: `§b${'|'.repeat(cheios)}§8${'|'.repeat(30 - cheios)}\n` },
    tr('zenite.status.xp'), { text: ` ${e.xp}  ` },
  ];
  if (pr.proximo === null) c.push({ text: '\n' }, tr('zenite.status.maximo'));
  else c.push({ text: `§7(${pr.proximo - e.xp} ` }, tr('zenite.status.proximo'), { text: '§7)' });
  c.push(
    { text: '\n\n' }, tr('zenite.status.eter'), { text: ` ${maxEter(e)}\n` },
    tr('zenite.status.regen'), { text: ` ${regenEter(e.nivel, e.conjunto).toFixed(1)} ` }, tr('zenite.status.por_segundo'), { text: '\n' },
    tr('zenite.status.conjunto'), { text: ' ' }, tr(e.conjunto ? 'zenite.status.sim' : 'zenite.status.nao'), { text: '\n' },
    tr('zenite.status.abobada'), { text: ' ' }, tr(e.abobada || criativo ? 'zenite.status.liberada' : 'zenite.status.trancada'),
  );
  const f = new ActionFormData().title(tr('zenite.status.titulo')).body({ rawtext: c }).button(tr('zenite.menu.voltar'));
  const r = await mostrar(player, f);
  if (r && !r.canceled && r.selection === 0) await abrirRoda(player);
}

/** @param {import('@minecraft/server').Player} player */
export async function abrirConfig(player) {
  const cj = cfgJogador(player);
  const op = ehOperador(player);
  const cm = cfgMundo();
  const f = new ModalFormData().title(tr('zenite.cfg.titulo'));
  f.toggle(tr('zenite.cfg.camera'), { defaultValue: cj.camera });
  f.toggle(tr('zenite.cfg.tremor'), { defaultValue: cj.tremor });
  f.toggle(tr('zenite.cfg.hud'), { defaultValue: cj.hud });
  f.toggle(tr('zenite.cfg.glifos'), { defaultValue: cj.glifos });
  if (op) {
    f.toggle({ rawtext: [{ text: '§6✦ ' }, tr('zenite.cfg.destruicao')] }, { defaultValue: cm.destruicao });
    f.toggle({ rawtext: [{ text: '§6✦ ' }, tr('zenite.cfg.pvp')] }, { defaultValue: cm.pvp });
    f.toggle({ rawtext: [{ text: '§6✦ ' }, tr('zenite.cfg.boas_vindas')] }, { defaultValue: cm.boasVindas });
  }
  f.submitButton(tr('zenite.cfg.salvar'));
  const r = await mostrar(player, f);
  if (!r || r.canceled || !r.formValues) return;
  const v = r.formValues.filter((x) => typeof x === 'boolean');
  salvarCfgJogador(player, { camera: !!v[0], tremor: !!v[1], hud: !!v[2], glifos: !!v[3] });
  if (op && v.length >= 7) salvarCfgMundo({ destruicao: !!v[4], pvp: !!v[5], boasVindas: !!v[6] });
  somJogador(player, SONS.ui, 0.8, 1.2);
  avisar(player, [tr('zenite.msg.salvo')]);
}
