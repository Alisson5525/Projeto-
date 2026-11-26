import { ModalFormData } from '@minecraft/server-ui';
import { getSettings, saveSettings } from './config.js';

const SPEEDS = [1.4, 1.8, 2.2, 2.8, 3.4];
const SPEED_LABELS = ['100 km/h', '130 km/h', '158 km/h', '200 km/h', '245 km/h'];

/** Menu de configuracoes (agachar + usar o Emblema). */
export function openSettings(player) {
  const s = getSettings();
  const speedIdx = Math.max(0, SPEEDS.findIndex((v) => v >= s.fastSpeed - 0.01));
  const form = new ModalFormData()
    .title('§6§lSolaris §r§8- Configurações')
    .toggle('§cDestruição do cenário', { defaultValue: s.destruction })
    .slider('Intensidade da destruição (1 = leve, 3 = devastador)', 1, 3, { defaultValue: s.intensity, valueStep: 1 })
    .toggle('Blocos destruídos soltam itens', { defaultValue: s.drops })
    .toggle('Visão de calor incendeia e derrete', { defaultValue: s.fire })
    .dropdown('Velocidade do voo supersônico', SPEED_LABELS, { defaultValueIndex: speedIdx })
    .toggle('Invulnerável enquanto transformado', { defaultValue: s.invulnerable })
    .toggle('Tremor de câmera', { defaultValue: s.shake })
    .slider('Partículas (1 = econômico, 3 = máximo)', 1, 3, { defaultValue: s.particles, valueStep: 1 })
    .toggle('Proteger baús e blocos com itens', { defaultValue: s.protectContainers })
    .toggle('Soco quebra blocos na hora (super força)', { defaultValue: s.punchBreak })
    .toggle('Inverter esquerda/direita no voo', { defaultValue: s.invertStrafe })
    .toggle('Mostrar velocidade na tela', { defaultValue: s.hud })
    .submitButton('Salvar');
  form.show(player).then((res) => {
    if (res.canceled || !res.formValues) return;
    const v = res.formValues;
    saveSettings({
      destruction: !!v[0],
      intensity: Number(v[1]),
      drops: !!v[2],
      fire: !!v[3],
      fastSpeed: SPEEDS[Number(v[4])] ?? 2.2,
      invulnerable: !!v[5],
      shake: !!v[6],
      particles: Number(v[7]),
      protectContainers: !!v[8],
      punchBreak: !!v[9],
      invertStrafe: !!v[10],
      hud: !!v[11],
    });
    player.sendMessage('§6[Solaris]§r Configurações salvas.');
  }).catch(() => { /* formulario fechado */ });
}
