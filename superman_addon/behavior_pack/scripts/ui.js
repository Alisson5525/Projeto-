import { ModalFormData } from '@minecraft/server-ui';
import { getSettings, resetSettings, saveSettings } from './config.js';

const SPEEDS = [1.4, 1.8, 2.2, 2.8, 3.4];
const SPEED_LABELS = ['100 km/h', '130 km/h', '158 km/h', '200 km/h', '245 km/h'];

// Campos do menu, na ordem em que aparecem (chave, tipo, rotulo)
const FIELDS = [
  ['destruction', 'toggle', '§cDestruição do cenário'],
  ['intensity', 'slider', 'Intensidade da destruição (1 = leve, 3 = devastador)'],
  ['drops', 'toggle', 'Blocos destruídos soltam itens'],
  ['fire', 'toggle', 'Visão de calor incendeia e derrete'],
  ['fastSpeed', 'speed', 'Velocidade do voo supersônico'],
  ['invulnerable', 'toggle', 'Invulnerável enquanto transformado'],
  ['protectFriends', 'toggle', 'Poupar aldeões, golens e animais domesticados'],
  ['hurtPlayers', 'toggle', 'Poderes em área atingem outros jogadores'],
  ['shake', 'toggle', 'Tremor de câmera'],
  ['particles', 'slider', 'Partículas (1 = econômico, 3 = máximo)'],
  ['protectContainers', 'toggle', 'Proteger baús e blocos com itens'],
  ['punchBreak', 'toggle', 'Soco quebra blocos na hora (super força)'],
  ['invertStrafe', 'toggle', 'Inverter esquerda/direita no voo'],
  ['hud', 'toggle', 'Mostrar velocidade, combos e poderes na tela'],
];

/** Menu de configuracoes (agachar + usar o Emblema). */
export function openSettings(player) {
  const s = getSettings();
  const form = new ModalFormData().title('§6§lSolaris §r§8- Configurações');
  for (const [key, type, label] of FIELDS) {
    if (type === 'toggle') form.toggle(label, { defaultValue: !!s[key] });
    else if (type === 'slider') form.slider(label, 1, 3, { defaultValue: s[key], valueStep: 1 });
    else form.dropdown(label, SPEED_LABELS, { defaultValueIndex: Math.max(0, SPEEDS.findIndex((v) => v >= s.fastSpeed - 0.01)) });
  }
  form.toggle('§eRestaurar o padrão', { defaultValue: false });
  form.submitButton('Salvar');
  form.show(player).then((res) => {
    if (res.canceled || !res.formValues) return;
    const v = res.formValues;
    if (v[FIELDS.length]) {
      resetSettings();
      player.sendMessage('§6[Solaris]§r Configurações restauradas para o padrão.');
      return;
    }
    const out = {};
    FIELDS.forEach(([key, type], i) => {
      if (type === 'toggle') out[key] = !!v[i];
      else if (type === 'slider') out[key] = Number(v[i]);
      else out[key] = SPEEDS[Number(v[i])] ?? 2.2;
    });
    saveSettings(out);
    player.sendMessage('§6[Solaris]§r Configurações salvas.');
  }).catch(() => { /* formulario fechado */ });
}
