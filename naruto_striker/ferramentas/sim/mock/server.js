// Mock minimo-mas-estrito da API @minecraft/server (1.13) para testes de fumaça.
const S = globalThis.__SIM = globalThis.__SIM || {};
S.errors = []; S.cmds = []; S.particles = []; S.sounds = []; S.unknown = [];
S.knownParticles = S.knownParticles || new Set(); S.knownEntities = S.knownEntities || new Set();
S.knownSounds = S.knownSounds || new Set(); S.knownFunctions = S.knownFunctions || new Set();
S.readonly = false; S.tick = 0;
let NEXT_ID = 1;
function err(where, e){ S.errors.push({where, msg: String(e && e.message || e), stack: (e && e.stack || '').split('\n').slice(1,4).join(' | ')}); }
function guardWrite(name){ if (S.readonly) throw new Error(`Native function [${name}] does not have required privileges.`); }
function vec(v){ if(!v || typeof v.x!=='number'||typeof v.y!=='number'||typeof v.z!=='number'||!Number.isFinite(v.x+v.y+v.z)) throw new TypeError('Invalid Vector3: '+JSON.stringify(v)); return {x:v.x,y:v.y,z:v.z}; }

class Signal { constructor(name, before){ this.name=name; this.before=before; this.h=[]; }
  subscribe(f){ if(typeof f!=='function') throw new TypeError('subscribe needs fn'); this.h.push(f); return f; }
  unsubscribe(f){ this.h=this.h.filter(x=>x!==f); }
  fire(ev){ if(this.before){ S.readonly=true; try{ for(const f of this.h){ try{f(ev)}catch(e){err('before:'+this.name,e)} } } finally{ S.readonly=false; } }
    else S.queue.push(()=>{ for(const f of this.h){ try{f(ev)}catch(e){err('after:'+this.name,e)} } }); }
}
S.queue = [];
const sig = (names, before)=>Object.fromEntries(names.map(n=>[n,new Signal(n,before)]));

export const EntityDamageCause = new Proxy({}, {get:(_,k)=>String(k)});
export const TicksPerSecond = 20;
export const EquipmentSlot = { Mainhand:'Mainhand', Offhand:'Offhand', Head:'Head', Chest:'Chest', Legs:'Legs', Feet:'Feet' };
export class MolangVariableMap { constructor(){ this.v={}; } setFloat(k,n){ if(typeof n!=='number') throw new TypeError('float'); this.v[k]=n; } setColorRGB(k,c){ this.v[k]=c; } setColorRGBA(k,c){ this.v[k]=c; } setVector3(k,v){ this.v[k]=vec(v);} setSpeedAndDirection(k,s,d){ this.v[k]=[s,d]; } }

export class ItemStack { constructor(typeId, amount=1){ if(typeof typeId!=='string') throw new TypeError('ItemStack id'); this.typeId=typeId.includes(':')?typeId:'minecraft:'+typeId; this.amount=amount; this._lore=[]; this.nameTag=undefined; }
  getLore(){ return [...this._lore]; } setLore(l){ this._lore=[...(l||[])]; } clone(){ const c=new ItemStack(this.typeId,this.amount); c._lore=[...this._lore]; return c; }
  getComponent(){ return undefined; } hasComponent(){ return false; } }

class Container { constructor(n){ this.size=n; this.slots=new Array(n).fill(undefined); this.emptySlotsCount=n; }
  getItem(i){ if(i<0||i>=this.size) throw new RangeError('slot'); const it=this.slots[i]; return it?it.clone():undefined; }
  setItem(i,it){ if(i<0||i>=this.size) throw new RangeError('slot'); this.slots[i]=it?it.clone():undefined; }
  addItem(it){ const i=this.slots.findIndex(x=>!x); if(i>=0) this.slots[i]=it.clone(); } }

class ScoreObj { constructor(id){ this.id=id; this.displayName=id; this.m=new Map(); }
  getScore(p){ const k=p && (p.id ?? p); if(k===undefined) throw new Error('identity'); return this.m.get(k); }
  setScore(p,v){ this.m.set(p.id ?? p, v); } addScore(p,v){ const k=p.id??p; this.m.set(k,(this.m.get(k)??0)+v); }
  hasParticipant(p){ return this.m.has(p.id??p); } getParticipants(){ return []; } }

class Entity {
  constructor(typeId, dim, loc, opts={}){ this.id=String(NEXT_ID++); this.typeId=typeId; this.dimension=dim; this.location=vec(loc); this._valid=true;
    this._tags=new Set(); this._dp=new Map(); this._props=new Map(Object.entries(opts.props||{})); this._vel={x:0,y:0,z:0};
    const hp = opts.hp ?? 20; this._health={ currentValue:hp, effectiveMax:hp, defaultValue:hp, setCurrentValue:(v)=>{ guardWrite('setCurrentValue'); this._health.currentValue=Math.max(0,Math.min(this._health.effectiveMax,v)); if(this._health.currentValue<=0) this._die({cause:'none'}); return true; }, resetToMaxValue:()=>{this._health.currentValue=this._health.effectiveMax} };
    this.nameTag=''; this.isOnGround=true; this.isSneaking=false; this.isInWater=false; this.isFalling=false; this.isSprinting=false; this._family=opts.family||[];
    this.scoreboardIdentity={ id:'sb'+this.id };
    dim._ents.push(this); }
  _chk(){ if(!this._valid) throw new Error('Failed to call function on entity: entity is invalid (removed or unloaded)'); }
  isValid(){ return this._valid; }
  hasTag(t){ this._chk(); return this._tags.has(t); } addTag(t){ this._chk(); guardWrite('addTag'); this._tags.add(t); return true; } removeTag(t){ this._chk(); guardWrite('removeTag'); return this._tags.delete(t); } getTags(){ this._chk(); return [...this._tags]; }
  getDynamicProperty(k){ this._chk(); return this._dp.get(k); }
  setDynamicProperty(k,v){ this._chk(); guardWrite('setDynamicProperty'); if(v===undefined){ this._dp.delete(k); return; } if(!['string','number','boolean'].includes(typeof v) && !(v&&typeof v.x==='number')) throw new TypeError('bad dyn prop type for '+k); if(typeof v==='number'&&!Number.isFinite(v)) throw new TypeError('NaN dyn prop '+k); if(typeof v==='string'&&v.length>32767) throw new Error('string too long'); this._dp.set(k,v); }
  getProperty(n){ this._chk(); if(!this._props.has(n)) throw new Error(`Property '${n}' is not defined for entity ${this.typeId}`); return this._props.get(n); }
  setProperty(n,v){ this._chk(); guardWrite('setProperty'); if(!this._props.has(n)) throw new Error('prop'); this._props.set(n,v); }
  getComponent(n){ this._chk(); n=n.replace('minecraft:',''); if(n==='health') return this._health; if(n==='inventory') return this._inv; if(n==='equippable') return this._eq; return undefined; }
  hasComponent(n){ return !!this.getComponent(n); }
  runCommand(c){ this._chk(); guardWrite('runCommand'); S.cmds.push({src:this.typeId,c}); checkCmd(c); return {successCount:1}; }
  runCommandAsync(c){ this._chk(); guardWrite('runCommandAsync'); S.cmds.push({src:this.typeId,c}); checkCmd(c); return Promise.resolve({successCount:1}); }
  applyDamage(a,o){ this._chk(); guardWrite('applyDamage'); if(typeof a!=='number'||!Number.isFinite(a)) throw new TypeError('damage'); if(o && o.cause && typeof o.cause!=='string') throw new TypeError('cause'); if(o&&o.damagingEntity) o.damagingEntity._chk();
    if(this.typeId==='minecraft:item'||this.typeId.includes('xp_orb')) return false; if(this._immune) return false; if(this._health.currentValue<=0) return false;
    this._health.currentValue=Math.max(0,this._health.currentValue-a); const ds={cause:o?.cause??'none', damagingEntity:o?.damagingEntity, damagingProjectile:undefined};
    world.afterEvents.entityHurt.fire({hurtEntity:this, damage:a, damageSource:ds}); if(this._health.currentValue<=0) this._die(ds); return true; }
  _die(ds){ if(this._dead) return; this._dead=true; world.afterEvents.entityDie.fire({deadEntity:this, damageSource:ds}); if(this.typeId!=='minecraft:player') S.queue.push(()=>{this._valid=false;}); else { this._dead=false; this._health.currentValue=this._health.effectiveMax; } }
  kill(){ this._chk(); guardWrite('kill'); this._health.currentValue=0; this._die({cause:'suicide'}); return true; }
  remove(){ this._chk(); guardWrite('remove'); this._valid=false; }
  triggerEvent(e){ this._chk(); guardWrite('triggerEvent'); if(e==='ns:sumir') this._valid=false; }
  teleport(l,o){ this._chk(); guardWrite('teleport'); this.location=vec(l); if(o&&o.dimension) this.dimension=o.dimension; }
  tryTeleport(l,o){ this.teleport(l,o); return true; }
  applyKnockback(a,b,c,d){ this._chk(); guardWrite('applyKnockback'); for(const x of [a,b,c,d]) if(typeof x!=='number'||!Number.isFinite(x)) throw new TypeError('knockback args'); this._vel={x:a*c/10,y:d,z:b*c/10}; }
  applyImpulse(v){ this._chk(); guardWrite('applyImpulse'); vec(v); }
  clearVelocity(){ this._chk(); }
  getVelocity(){ this._chk(); return {...this._vel}; }
  addEffect(t,d,o){ this._chk(); guardWrite('addEffect'); if(typeof d!=='number') throw new TypeError('dur'); }
  removeEffect(){ this._chk(); } getEffects(){ return []; } getEffect(){ return undefined; }
  playAnimation(n,o){ this._chk(); guardWrite('playAnimation'); if(typeof n!=='string') throw new TypeError('anim'); for(const k of Object.keys(o||{})) if(!['blendOutTime','controller','nextState','players','stopExpression'].includes(k)) throw new TypeError('bad PlayAnimationOptions key '+k); S.anims=(S.anims||[]); S.anims.push(n); }
  getViewDirection(){ this._chk(); return {x:0,y:0,z:1}; }
  getHeadLocation(){ this._chk(); return {x:this.location.x,y:this.location.y+1.62,z:this.location.z}; }
  getBlockFromViewDirection(){ return undefined; } getEntitiesFromViewDirection(){ return []; }
  setOnFire(){ return true; } extinguishFire(){ return true; }
  matches(){ return true; }
}
class Player extends Entity {
  constructor(name, dim, loc){ super('minecraft:player', dim, loc, {hp:20, props:{'tnt:kurama':0,'tnt:uchiha':0,'tnt:hyuga':0,'tnt:shukaku':0,'tnt:sennin_sapo':0,'tnt:marca_maldicao':0,'tnt:8_portoes':0,'tnt:byakugou':0,'tnt:custon':0,'tnt:suporte_entity':0,'tnt:dna_hashirama_isanagi':0}}); this.name=name;
    this._inv={container:new Container(36), inventorySize:36}; const self=this; this._eq={ getEquipment:(s)=>self._inv.container.slots[self.selectedSlotIndex??0], setEquipment:()=>{} };
    this.selectedSlotIndex=0; this.onScreenDisplay={ setTitle:(t,o)=>{ if(typeof t!=='string') throw new TypeError('title'); if(/NaN|undefined/.test(t)) S.unknown.push('HUD title contains NaN/undefined: '+t.slice(0,80)); this._title=t; }, setActionBar:(t)=>{ if(typeof t!=='string'&&!Array.isArray(t)) throw new TypeError('ab'); if(/NaN|undefined/.test(String(t))) S.unknown.push('actionbar NaN: '+t); }, updateSubtitle(){}, isValid:()=>true }; this.camera={ fade(){}, setCamera(){}, clear(){} }; this.msgs=[]; }
  sendMessage(m){ this._chk(); this.msgs.push(typeof m==='string'?m:JSON.stringify(m)); }
  playSound(id,o){ this._chk(); S.sounds.push(id); }
  getGameMode(){ return 'survival'; } isOp(){ return true; }
  get level(){ return 0; } getTotalXp(){ return 0; } addLevels(){} addExperience(){}
}
class Dimension { constructor(id){ this.id='minecraft:'+id; this._ents=[]; }
  getEntities(o={}){ const fam=(e,f)=>e._family.includes(f)||(f==='inanimate'&&e.typeId==='tnt:ns_texto'); let r=this._ents.filter(e=>e._valid);
    if(o.type) r=r.filter(e=>e.typeId===o.type || e.typeId==='minecraft:'+o.type); if(o.excludeTypes) r=r.filter(e=>!o.excludeTypes.some(t=>e.typeId===t||e.typeId==='minecraft:'+t));
    if(o.tags) r=r.filter(e=>o.tags.every(t=>e._tags.has(t))); if(o.excludeTags) r=r.filter(e=>!o.excludeTags.some(t=>e._tags.has(t)));
    if(o.families) r=r.filter(e=>o.families.every(f=>fam(e,f))); if(o.excludeFamilies) r=r.filter(e=>!o.excludeFamilies.some(f=>fam(e,f)));
    if(o.excludeNames) r=r.filter(e=>!o.excludeNames.includes(e.name??e.nameTag));
    if(o.location){ vec(o.location); const d=e=>Math.hypot(e.location.x-o.location.x,e.location.y-o.location.y,e.location.z-o.location.z); if(o.maxDistance!==undefined) r=r.filter(e=>d(e)<=o.maxDistance); if(o.minDistance!==undefined) r=r.filter(e=>d(e)>=o.minDistance); r.sort((a,b)=>d(a)-d(b)); }
    if(o.closest) r=r.slice(0,o.closest); return r; }
  getPlayers(o){ return this.getEntities(Object.assign({},o,{type:'minecraft:player'})); }
  spawnEntity(id,loc){ guardWrite('spawnEntity'); vec(loc); if(!S.knownEntities.has(id)&&!id.startsWith('minecraft:')) S.unknown.push('spawnEntity unknown id '+id); return new Entity(id,this,loc,{hp:1}); }
  spawnParticle(id,loc,m){ guardWrite('spawnParticle'); vec(loc); if(m && !(m instanceof MolangVariableMap)) throw new TypeError('molang'); if(!S.knownParticles.has(id)&&!id.startsWith('minecraft:')) S.unknown.push('spawnParticle unknown '+id); S.particles.push(id); }
  playSound(id,loc,o){ guardWrite('playSound'); vec(loc); S.sounds.push(id); }
  runCommand(c){ guardWrite('runCommand'); S.cmds.push({src:'dim',c}); checkCmd(c); return {successCount:1}; }
  runCommandAsync(c){ guardWrite('runCommandAsync'); S.cmds.push({src:'dim',c}); checkCmd(c); return Promise.resolve({successCount:1}); }
  getBlock(l){ vec(l); const solid=l.y<64; const k=l.x+','+l.y+','+l.z; S.blocks=S.blocks||new Map(); const t=S.blocks.get(k)||(solid?'minecraft:stone':'minecraft:air'); return { typeId:t, isAir:t==='minecraft:air', isLiquid:false, permutation:{}, location:l, setType:(nt)=>{ guardWrite('setType'); if(typeof nt!=='string') throw new TypeError('setType'); S.blocks.set(k,nt.includes(':')?nt:'minecraft:'+nt); } }; }
  createExplosion(){ guardWrite('createExplosion'); return true; }
}
function checkCmd(c){ if(typeof c!=='string') throw new TypeError('command must be string'); const s=c.replace(/^\//,'').trim();
  let m=s.match(/^function\s+(\S+)/); if(m && !S.knownFunctions.has(m[1])) S.unknown.push('function missing: '+m[1]);
  m=s.match(/(?:^|run )particle\s+(\S+)/); if(m && !S.knownParticles.has(m[1]) && !m[1].startsWith('minecraft:')) S.unknown.push('particle missing: '+m[1]);
  m=s.match(/(?:^|run )(?:give|replaceitem\s+entity\s+\S+\s+\S+\s+\d+|clear)\s+\S*\s*(tnt:[a-z0-9_]+)/); if(m && S.knownItems && !S.knownItems.has(m[1])) S.unknown.push('item missing: '+m[1]+' <- '+s.slice(0,80));
  m=s.match(/(?:^|run )playsound\s+([a-zA-Z0-9_.]+)/); if(m && S.knownSounds && S.knownSounds.size && !S.knownSounds.has(m[1]) && !/^(random|mob|note|ambient|block|dig|step|game|use|fire|liquid|item|armor|damage|portal|beacon|bucket|conduit|elytra|break|bottle|crossbow|firework|hit|jump|land|tile|camera|cauldron|minecart|music|raid|record|ui|trident|chime|respawn_anchor|bubble|leashknot|place|attack|bell|apply_effect|smithing_table|vr)/.test(m[1])) S.unknown.push('sound missing: '+m[1]);
  m=s.match(/(?:^|run )structure\s+load\s+(\S+)/); if(m && S.knownStructures && !S.knownStructures.has(m[1].replace(/"/g,''))) S.unknown.push('structure missing: '+m[1]);
  m=s.match(/(?:^|run )summon\s+(\S+)/); if(m && !S.knownEntities.has(m[1]) && !m[1].startsWith('minecraft:') && m[1].includes(':')) S.unknown.push('summon missing: '+m[1]);
}
const dims={ overworld:new Dimension('overworld'), nether:new Dimension('nether'), the_end:new Dimension('the_end') };
const objectives=new Map();
export const world = {
  afterEvents: sig(['entityDie','entityHitEntity','entityHurt','itemStartUse','itemStopUse','itemUse','itemCompleteUse','playerLeave','playerSpawn','playerJoin','explosion','projectileHitEntity','projectileHitBlock','entitySpawn','worldInitialize','playerInteractWithEntity','dataDrivenEntityTrigger','effectAdd','itemReleaseUse','playerBreakBlock','playerPlaceBlock','buttonPush','chatSend','entityRemove','targetBlockHit','tripWireTrip','leverAction','pressurePlatePush','pressurePlatePop','pistonActivate','weatherChange','gameRuleChange','playerDimensionChange','entityHealthChanged','entityLoad','itemUseOn','playerInteractWithBlock','playerEmote','playerGameModeChange','playerInputPermissionCategoryChange'],false),
  beforeEvents: sig(['itemUse','itemUseOn','explosion','playerLeave','chatSend','playerBreakBlock','playerInteractWithEntity','playerInteractWithBlock','entityRemove','worldInitialize','effectAdd','weatherChange','playerGameModeChange','playerPlaceBlock'],true),
  scoreboard:{ getObjective:(id)=>objectives.get(id), addObjective:(id,n)=>{ if(objectives.has(id)) throw new Error('objective exists '+id); const o=new ScoreObj(id); objectives.set(id,o); return o; }, getObjectives:()=>[...objectives.values()], removeObjective:(id)=>objectives.delete(id?.id??id), setObjectiveAtDisplaySlot(){}, getParticipants:()=>[] },
  getDimension:(id)=>{ const k=String(id).replace('minecraft:',''); if(!dims[k]) throw new Error('dim '+id); return dims[k]; },
  getPlayers:(o)=>Object.values(dims).flatMap(d=>d.getPlayers(o)),
  getAllPlayers:()=>Object.values(dims).flatMap(d=>d.getPlayers()),
  getEntity:(id)=>Object.values(dims).flatMap(d=>d._ents).find(e=>e.id===id&&e._valid),
  _dp:new Map(), getDynamicProperty(k){ return this._dp.get(k); }, setDynamicProperty(k,v){ guardWrite('world.setDynamicProperty'); this._dp.set(k,v); },
  playSound(id,loc){ vec(loc); S.sounds.push(id); }, sendMessage(m){ S.cmds.push({src:'world.msg',c:String(m)}); }, getDefaultSpawnLocation(){ return {x:0,y:64,z:0}; }, getTimeOfDay(){ return Math.floor(S.tick*20)%24000; }, getDay(){ return Math.floor(S.tick*20/24000); },
};
let RUN_ID=1; const runs=new Map();
export const system = {
  get currentTick(){ return S.tick; },
  run(f){ return this.runTimeout(f,0); },
  runTimeout(f,d=0){ if(typeof f!=='function') throw new TypeError('runTimeout fn'); const id=RUN_ID++; runs.set(id,{f,at:S.tick+Math.max(1,Math.floor(d||0)),every:0}); return id; },
  runInterval(f,d=1){ if(typeof f!=='function') throw new TypeError('runInterval fn'); const id=RUN_ID++; const e=Math.max(1,Math.floor(d||1)); runs.set(id,{f,at:S.tick+e,every:e}); return id; },
  clearRun(id){ runs.delete(id); }, runJob(gen){ return 0; },
  afterEvents: sig(['scriptEventReceive'],false), beforeEvents: sig(['watchdogTerminate','startup'],true),
};
S.step = function(){ S.tick++; for(const [id,r] of [...runs]){ if(!runs.has(id)) continue; if(r.at<=S.tick){ try{ r.f(); }catch(e){ err('run#'+(r.every?'interval':'timeout'),e); } if(r.every) r.at=S.tick+r.every; else runs.delete(id); } } let guard=0; while(S.queue.length && guard++<10000){ const q=S.queue; S.queue=[]; for(const f of q) f(); } };
S.dims=dims; S.Player=Player; S.Entity=Entity; S.ItemStack=ItemStack; S.objectives=objectives;
export { Entity, Player, Dimension, ItemStack as _I };
export const GameMode = { survival:'survival', creative:'creative' };
export const Vector3Utils = undefined;
