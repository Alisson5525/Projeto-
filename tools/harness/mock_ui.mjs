class F { constructor() { return new Proxy(this, { get: (t, k) => (k === "show" ? async () => ({ canceled: true }) : k === "then" ? undefined : () => t[k] ?? t) }); } }
export class ActionFormData extends F {}
export class ModalFormData extends F {}
export class MessageFormData extends F {}
export const FormCancelationReason = { UserBusy: "UserBusy", UserClosed: "UserClosed" };
export const FormResponse = class {};
