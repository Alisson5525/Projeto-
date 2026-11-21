// Mock of @minecraft/server-ui 2.0.0: forms answer from a scripted queue.
export const FormCancelationReason = { UserBusy: "UserBusy", UserClosed: "UserClosed" };
export const answers = [];
export const shown = [];
class Base {
  constructor() { this.parts = []; }
  title(t) { this.parts.push(["title", t]); return this; }
  body(t) { this.parts.push(["body", t]); return this; }
  async show(player) {
    shown.push(this);
    const a = answers.shift();
    if (a === undefined) return { canceled: true, cancelationReason: "UserClosed" };
    return a;
  }
}
export class ActionFormData extends Base {
  button(t, icon) { if (icon !== undefined && typeof icon !== "string") throw new Error("icon"); this.parts.push(["button", t, icon]); return this; }
  label(t) { this.parts.push(["label", t]); return this; }
  header(t) { this.parts.push(["header", t]); return this; }
  divider() { return this; }
}
export class MessageFormData extends Base {
  button1(t) { this.parts.push(["b1", t]); return this; }
  button2(t) { this.parts.push(["b2", t]); return this; }
}
export class ModalFormData extends Base {
  toggle(l, o) { this.parts.push(["toggle", l, o]); return this; }
  slider(l, a, b, o) { if (typeof a !== "number" || typeof b !== "number") throw new Error("slider"); this.parts.push(["slider", l]); return this; }
  dropdown() { return this; }
  textField() { return this; }
}
