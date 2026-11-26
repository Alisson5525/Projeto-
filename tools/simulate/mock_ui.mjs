export class ModalFormData {
  constructor() { this.items = []; }
  title() { return this; }
  toggle(l, o) { this.items.push(o?.defaultValue ?? false); return this; }
  slider(l, a, b, o) { this.items.push(o?.defaultValue ?? a); return this; }
  dropdown(l, opts, o) { this.items.push(o?.defaultValueIndex ?? 0); return this; }
  submitButton() { return this; }
  show() {
    globalThis.__formShown = (globalThis.__formShown || 0) + 1;
    let v = this.items.slice();
    if (globalThis.__formAnswer) v = globalThis.__formAnswer(v);
    return Promise.resolve({ canceled: false, formValues: v });
  }
}
