const fs=require('fs'),path=require('path');const BP=process.argv[2];
function walk(d,a=[]){for(const f of fs.readdirSync(d)){const p=path.join(d,f);if(fs.statSync(p).isDirectory())walk(p,a);else a.push(p)}return a}
function strip(s){let o='',i=0,inS=false;while(i<s.length){const c=s[i];if(inS){o+=c;if(c==='\\'){o+=s[i+1];i+=2;continue}if(c==='"')inS=false;i++;continue}if(c==='"'){inS=true;o+=c;i++;continue}if(c==='/'&&s[i+1]==='/'){while(i<s.length&&s[i]!=='\n')i++;continue}o+=c;i++}return o}
const rj=f=>{const s=fs.readFileSync(f,'utf8').replace(/^\uFEFF/,'');try{return JSON.parse(s)}catch{return JSON.parse(strip(s).replace(/,(\s*[}\]])/g,'$1'))}};
const ents={};const anims=new Set(),acs=new Set();
for(const f of walk(path.join(BP,'entities')).filter(f=>f.endsWith('.json'))){const e=rj(f)['minecraft:entity'];if(!e)continue;ents[e.description.identifier]={f,events:new Set(Object.keys(e.events||{})),groups:new Set(Object.keys(e.component_groups||{})),d:e.description,e}}
for(const f of walk(path.join(BP,'animations')).filter(f=>f.endsWith('.json')))for(const k in rj(f).animations||{})anims.add(k);
for(const f of walk(path.join(BP,'animation_controllers')).filter(f=>f.endsWith('.json')))for(const k in rj(f).animation_controllers||{})acs.add(k);
const out=new Set();
// 1) entity description animations exist; events reference existing groups
for(const[id,x]of Object.entries(ents)){for(const[k,a]of Object.entries(x.d.animations||{})){if(a.startsWith('animation.')&&!anims.has(a))out.add(`ANIM missing ${a} in ${id}`);if(a.startsWith('controller.')&&!acs.has(a))out.add(`AC missing ${a} in ${id}`)}
 for(const s of x.d.scripts?.animate||[]){const k=typeof s==='string'?s:Object.keys(s)[0];if(k&&!(k in (x.d.animations||{})))out.add(`animate key not defined '${k}' in ${id}`)}
 const chkEv=(ev,name)=>{const walkEv=o=>{if(!o||typeof o!=='object')return;for(const key of ['add','remove'])for(const g of o[key]?.component_groups||[])if(!x.groups.has(g))out.add(`group missing ${g} (event ${name}) in ${id}`);for(const k of ['sequence','randomize'])for(const s of o[k]||[])walkEv(s);if(o.trigger){const t=typeof o.trigger==='string'?o.trigger:o.trigger.event;if(t&&!x.events.has(t)&&!t.startsWith('minecraft:'))out.add(`trigger missing ${t} in ${id}`)}};walkEv(ev)};
 for(const[n,ev]of Object.entries(x.e.events||{}))chkEv(ev,n);
}
// 2) "event entity <sel> <name>" in all text: event must exist in some relevant entity
const allEvents=new Set();for(const x of Object.values(ents))for(const e of x.events)allEvents.add(e);
const playerEvents=ents['minecraft:player']?.events||new Set();
for(const f of walk(BP).filter(f=>/\.(js|json|mcfunction)$/.test(f))){const s=fs.readFileSync(f,'utf8');
 for(const m of s.matchAll(/event entity (@[a-z])(\[[^\]]*\])?\s+([a-z0-9_:\.]+)/g)){const sel=m[1]+(m[2]||'');const ev=m[3];const typeM=(m[2]||'').match(/type=([a-z0-9_:]+)/);
  if(ev.startsWith('minecraft:'))continue;
  if(typeM&&ents[typeM[1]]&&!ents[typeM[1]].events.has(ev))out.add(`event ${ev} not in ${typeM[1]} (${path.relative(BP,f)})`);
  else if(!allEvents.has(ev))out.add(`event ${ev} defined nowhere (${path.relative(BP,f)})`);
  else if(m[1]==='@s'&&/player|scripts|functions/.test(f)&&!f.includes('entities/')&&!playerEvents.has(ev)&&!/uchiha|hyuga|marca|kurama|desativar/.test('x'))out.add(`@s event ${ev} not on player (${path.relative(BP,f)})`);}
 for(const m of s.matchAll(/triggerEvent\(\s*["']([^"']+)["']/g)){if(!allEvents.has(m[1])&&!m[1].startsWith('ns:'))out.add(`triggerEvent ${m[1]} defined nowhere (${path.relative(BP,f)})`)}
}
// BP AC states referencing animations by short name must be declared in the entity: skip (complex)
console.log([...out].sort().join('\n')||'OK');console.log('entities',Object.keys(ents).length,'player events',playerEvents.size);
