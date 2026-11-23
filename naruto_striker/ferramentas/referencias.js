const fs=require('fs'),path=require('path');
const ROOT=process.argv[2];const RP=path.join(ROOT,'resource_pack'),BP=path.join(ROOT,'behavior_pack');
function strip(s){let o='',i=0,inS=false;while(i<s.length){const c=s[i];if(inS){o+=c;if(c==='\\'){o+=s[i+1];i+=2;continue}if(c==='"')inS=false;i++;continue}if(c==='"'){inS=true;o+=c;i++;continue}if(c==='/'&&s[i+1]==='/'){while(i<s.length&&s[i]!=='\n')i++;continue}if(c==='/'&&s[i+1]==='*'){i+=2;while(i<s.length&&!(s[i]==='*'&&s[i+1]==='/'))i++;i+=2;continue}o+=c;i++}return o}
function rj(f){const s=fs.readFileSync(f,'utf8').replace(/^\uFEFF/,'');try{return JSON.parse(s)}catch{return JSON.parse(strip(s).replace(/,(\s*[}\]])/g,'$1'))}}
function walk(d,a=[]){if(!fs.existsSync(d))return a;for(const f of fs.readdirSync(d)){const p=path.join(d,f);if(fs.statSync(p).isDirectory())walk(p,a);else a.push(p)}return a}
const geos=new Set(),anims=new Set(),acs=new Set(),rcs=new Set(),parts=new Set(),bpAnims=new Set(),bpAcs=new Set();
for(const f of walk(path.join(RP,'models')).filter(f=>f.endsWith('.json'))){const j=rj(f);for(const g of j['minecraft:geometry']||[])geos.add(g.description.identifier);for(const k in j)if(k.startsWith('geometry.'))geos.add(k.split(':')[0])}
for(const f of walk(path.join(RP,'animations')).filter(f=>f.endsWith('.json')))for(const k in rj(f).animations||{})anims.add(k);
for(const f of walk(path.join(RP,'animation_controllers')).filter(f=>f.endsWith('.json')))for(const k in rj(f).animation_controllers||{})acs.add(k);
for(const f of walk(path.join(RP,'render_controllers')).filter(f=>f.endsWith('.json')))for(const k in rj(f).render_controllers||{})rcs.add(k);
for(const f of walk(path.join(RP,'particles')).filter(f=>f.endsWith('.json'))){const j=rj(f);parts.add(j.particle_effect?.description?.identifier)}
for(const f of walk(path.join(BP,'animations')).filter(f=>f.endsWith('.json')))for(const k in rj(f).animations||{})bpAnims.add(k);
for(const f of walk(path.join(BP,'animation_controllers')).filter(f=>f.endsWith('.json')))for(const k in rj(f).animation_controllers||{})bpAcs.add(k);
const vanillaGeo=g=>/^geometry\.(humanoid|player|steve|alex|cow|zombie|item_sprite|armor_stand|npc|villager)/.test(g);
const texExists=t=>['.png','.tga','.jpg',''].some(e=>fs.existsSync(path.join(RP,t+e)));
const vanillaTex=t=>/^textures\/(entity|items|blocks|particle|misc|ui|environment)\//.test(t)&&!texExists(t);
let issues=[];const I=(...a)=>issues.push(a.join(' '));
const rel=f=>path.relative(ROOT,f);
for(const f of walk(path.join(RP,'entity')).filter(f=>f.endsWith('.json'))){const j=rj(f);const d=j['minecraft:client_entity']?.description;if(!d){I('NO_DESC',rel(f));continue}
 for(const[k,g]of Object.entries(d.geometry||{}))if(!geos.has(g)&&!vanillaGeo(g))I('GEO',rel(f),k,g);
 for(const[k,t]of Object.entries(d.textures||{}))if(!texExists(t)&&!/^textures\/(entity|misc)\//.test(t))I('TEX',rel(f),k,t);else if(!texExists(t))I('TEX?',rel(f),k,t);
 for(const[k,a]of Object.entries(d.animations||{})){if(a.startsWith('animation.')&&!anims.has(a)&&!/^animation\.(player|humanoid|zombie|npc|cow|villager)\./.test(a))I('ANIM',rel(f),k,a);if(a.startsWith('controller.')&&!acs.has(a)&&!/^controller\.animation\.(player|humanoid)\./.test(a))I('AC',rel(f),k,a)}
 for(const r of d.render_controllers||[]){const id=typeof r==='string'?r:Object.keys(r)[0];if(!rcs.has(id)&&!/^controller\.render\.(player|default|item_default)/.test(id))I('RC',rel(f),id)}
 for(const[k,p]of Object.entries(d.particle_effects||{}))if(!parts.has(p)&&!p.startsWith('minecraft:'))I('PART',rel(f),k,p)
}
// attachables
for(const f of walk(path.join(RP,'attachables')).filter(f=>f.endsWith('.json'))){const j=rj(f);const d=j['minecraft:attachable']?.description;if(!d){I('NO_DESC',rel(f));continue}
 for(const[k,g]of Object.entries(d.geometry||{}))if(!geos.has(g)&&!vanillaGeo(g))I('GEO',rel(f),k,g);
 for(const[k,t]of Object.entries(d.textures||{}))if(!texExists(t))I(vanillaTex(t)||/^textures\/misc/.test(t)?'TEX?':'TEX',rel(f),k,t);
 for(const[k,a]of Object.entries(d.animations||{})){if(a.startsWith('animation.')&&!anims.has(a)&&!/^animation\.(player|humanoid)\./.test(a))I('ANIM',rel(f),k,a)}}
// particles textures
for(const f of walk(path.join(RP,'particles')).filter(f=>f.endsWith('.json'))){const j=rj(f);const t=j.particle_effect?.description?.basic_render_parameters?.texture;if(t&&!texExists(t)&&!t.startsWith('textures/particle/')&&!t.startsWith('textures/blocks')&&!t.startsWith('textures/items'))I('PTEX',rel(f),t)}
// AC references to animations in RP ACs
for(const f of walk(path.join(RP,'animation_controllers')).filter(f=>f.endsWith('.json'))){}
// sounds
const sd=path.join(RP,'sounds','sound_definitions.json');const soundNames=new Set();
if(fs.existsSync(sd)){const j=rj(sd);const defs=j.sound_definitions||j;for(const[n,v]of Object.entries(defs)){soundNames.add(n);for(const s of v.sounds||[]){const nm=typeof s==='string'?s:s.name;if(!['.ogg','.wav','.fsb'].some(e=>fs.existsSync(path.join(RP,nm+e))))I('SOUNDFILE',n,nm)}}}
// particles referenced in scripts/functions/BP
const bpText=walk(BP).filter(f=>/\.(js|mcfunction|json)$/.test(f)).map(f=>[f,fs.readFileSync(f,'utf8')]);
const rpText=walk(path.join(RP,'animations')).concat(walk(path.join(RP,'animation_controllers'))).filter(f=>f.endsWith('.json')).map(f=>[f,fs.readFileSync(f,'utf8')]);
const seenP=new Set();for(const[f,s]of bpText.concat(rpText)){for(const m of s.matchAll(/particle\s+([a-z0-9_]+:[a-z0-9_\.]+)/g)){const p=m[1];if(!parts.has(p)&&!p.startsWith('minecraft:')&&!seenP.has(p+f)){seenP.add(p+f);I('PARTREF',rel(f),p)}}
 for(const m of s.matchAll(/spawnParticle\(\s*["']([^"']+)["']/g)){const p=m[1];if(!parts.has(p)&&!p.startsWith('minecraft:'))I('PARTREF',rel(f),p)}
 for(const m of s.matchAll(/playsound\s+([a-zA-Z0-9_\.]+)/g)){const n=m[1];if(!soundNames.has(n)&&!/^(random|mob|note|ambient|block|dig|step|game|use|fire|liquid|item|armor|damage|portal|beacon|bucket|conduit|elytra|break|bottle|crossbow|firework|hit|jump|land|tile|camera|cauldron|minecart|music|raid|record|ui|trident|chime|sweet|respawn_anchor|lodestone|smithing_table|bubble|celebrate|leashknot|place|pre_ram|scrape|shatter|lever|tilt|attack|bell)/.test(n))I('SOUNDREF',rel(f),n)}
 for(const m of s.matchAll(/playAnimation\(\s*["']?([a-z0-9_\.]+)/g)){const a=m[1];if(a.startsWith('animation.')&&!anims.has(a))I('PLAYANIM',rel(f),a)}
 for(const m of s.matchAll(/playanimation\s+\S+\s+(animation\.[a-z0-9_\.]+)/g)){const a=m[1];if(!anims.has(a)&&!/^animation\.(player|humanoid)\./.test(a))I('PLAYANIM',rel(f),a)}
}
console.log(`geos ${geos.size} anims ${anims.size} acs ${acs.size} rcs ${rcs.size} parts ${parts.size} sounds ${soundNames.size}`);
const counts={};for(const i of issues){const k=i.split(' ')[0];counts[k]=(counts[k]||0)+1}console.log(counts);
console.log([...new Set(issues)].join('\n'));
