export const LOG = globalThis.__UILOG = [];
class Base { constructor(){ this._t=''; this._b=''; this._btn=[]; }
  title(t){ if(typeof t!=='string') throw new TypeError('title must be string'); this._t=t; return this; }
  body(t){ if(typeof t!=='string') throw new TypeError('body must be string'); this._b=t; return this; }
  button(t,i){ if(typeof t!=='string') throw new TypeError('button text must be string'); this._btn.push(t); return this; }
  async show(p){ if(!p || p.typeId!=='minecraft:player') throw new Error('show() target must be a player'); LOG.push({title:this._t,body:this._b,buttons:this._btn}); const sel=globalThis.__UISEL?.shift(); return sel===undefined?{canceled:true,cancelationReason:'UserClosed'}:{canceled:false,selection:sel}; }
}
export class ActionFormData extends Base {}
export class MessageFormData extends Base { button1(t){return this} button2(t){return this} }
export class ModalFormData extends Base { textField(){return this} toggle(){return this} slider(){return this} dropdown(){return this} }
export const FormCancelationReason = { UserBusy:'UserBusy', UserClosed:'UserClosed' };
