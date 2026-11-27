// Mock de @minecraft/server-ui 2.0.0. As respostas dos formulários vêm de uma
// fila que os testes preenchem com __responder(...); sem resposta, o formulário
// é "cancelado" (como fechar a janela).
const fila = [];
export const FormCancelationReason = { UserBusy: 'UserBusy', UserClosed: 'UserClosed' };
export const __formsMostrados = [];
export function __responder(resp) { fila.push(resp); }
export function __limparForms() { fila.length = 0; __formsMostrados.length = 0; }

class Base {
  constructor(tipo) { this.tipo = tipo; this.itens = []; }
  title(t) { this.titulo = t; return this; }
  body(t) { this.corpo = t; return this; }
  async show(player) {
    __formsMostrados.push({ form: this, player });
    const r = fila.shift();
    if (!r) return { canceled: true, cancelationReason: FormCancelationReason.UserClosed };
    return { canceled: false, ...r };
  }
}
export class ActionFormData extends Base {
  constructor() { super('action'); }
  button(texto, icone) { this.itens.push({ tipo: 'button', texto, icone }); return this; }
  divider() { this.itens.push({ tipo: 'divider' }); return this; }
  header(t) { this.itens.push({ tipo: 'header', texto: t }); return this; }
  label(t) { this.itens.push({ tipo: 'label', texto: t }); return this; }
}
export class ModalFormData extends Base {
  constructor() { super('modal'); }
  toggle(t, o) { this.itens.push({ tipo: 'toggle', texto: t, o }); return this; }
  slider(t, min, max, o) { this.itens.push({ tipo: 'slider', texto: t, min, max, o }); return this; }
  dropdown(t, ops, o) { this.itens.push({ tipo: 'dropdown', texto: t, ops, o }); return this; }
  textField(t, ph, o) { this.itens.push({ tipo: 'textField', texto: t, ph, o }); return this; }
  submitButton(t) { this.enviar = t; return this; }
  divider() { this.itens.push({ tipo: 'divider' }); return this; }
  header(t) { this.itens.push({ tipo: 'header', texto: t }); return this; }
  label(t) { this.itens.push({ tipo: 'label', texto: t }); return this; }
}
export class MessageFormData extends Base {
  constructor() { super('message'); }
  button1(t) { this.b1 = t; return this; }
  button2(t) { this.b2 = t; return this; }
}
