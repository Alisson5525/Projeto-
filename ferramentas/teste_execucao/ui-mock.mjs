export let proximaSelecao = 0;
let restantes = 0;
export function definirSelecao(n) { proximaSelecao = n; restantes = 2; }
class Form {
  constructor() { this.botoes = []; }
  title(t) { this.t = t; return this; } body(b) { return this; }
  button(t, i) { if (typeof t !== "string" && typeof t !== "object") throw new Error("button text"); this.botoes.push(t); return this; }
  button1() { return this; } button2() { return this; } divider() { return this; } label() { return this; } header() { return this; }
  textField() { return this; } dropdown() { return this; } slider() { return this; } toggle() { return this; } submitButton() { return this; }
  show(p) { if (restantes-- <= 0) return Promise.resolve({ canceled: true, cancelationReason: "UserClosed" }); const sel = Math.min(proximaSelecao, Math.max(0, this.botoes.length - 1)); return Promise.resolve({ canceled: false, selection: sel, formValues: [] }); }
}
export class ActionFormData extends Form {}
export class ModalFormData extends Form {}
export class MessageFormData extends Form {}
export const FormCancelationReason = { UserBusy: "UserBusy", UserClosed: "UserClosed" };
