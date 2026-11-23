import fs from 'node:fs'; import path from 'node:path';
const ROOT = process.argv[2]; const BP=path.join(ROOT,'behavior_pack'), RP=path.join(ROOT,'resource_pack');
const S = globalThis.__SIM = {};
globalThis.__AVISOS=[]; console.warn=(...a)=>globalThis.__AVISOS.push(a.join(' '));
if (process.env.LUCKY) { Math.random = () => 0.01; }
process.on('unhandledRejection', (e) => { (globalThis.__SIM.errors ||= []).push({ where: 'promise', msg: String(e && e.message || e), stack: (e && e.stack || '').split('\n').slice(1,4).join(' | ') }); });
function walk(d,a=[]){ for(const f of fs.readdirSync(d)){ const p=path.join(d,f); if(fs.statSync(p).isDirectory()) walk(p,a); else a.push(p);} return a; }
function strip(s){return s.replace(/^﻿/,'').replace(/\/\/[^\n"]*$/gm,'');}
S.knownParticles=new Set(); for(const f of walk(path.join(RP,'particles'))) { try{ S.knownParticles.add(JSON.parse(strip(fs.readFileSync(f,'utf8'))).particle_effect.description.identifier);}catch{} }
S.knownEntities=new Set(); for(const f of walk(path.join(BP,'entities'))) { const m=fs.readFileSync(f,'utf8').match(/"identifier"\s*:\s*"([^"]+)"/); if(m) S.knownEntities.add(m[1]); }
S.knownFunctions=new Set(walk(path.join(BP,'functions')).filter(f=>f.endsWith('.mcfunction')).map(f=>path.relative(path.join(BP,'functions'),f).replace(/\.mcfunction$/,'')));
const items=[]; for(const f of walk(path.join(BP,'items'))){ const m=fs.readFileSync(f,'utf8').match(/"identifier"\s*:\s*"([^"]+)"/); if(m) items.push(m[1]); }
S.knownItems=new Set(items);
S.knownStructures=new Set(walk(path.join(BP,'structures')).map(f=>path.basename(f,'.mcstructure')));
try { const sd=JSON.parse(fs.readFileSync(path.join(RP,'sounds','sound_definitions.json'),'utf8')); S.knownSounds=new Set(Object.keys(sd.sound_definitions||sd)); } catch { S.knownSounds=new Set(); }
// copia scripts
const dst=path.join(path.dirname(new URL(import.meta.url).pathname),'.scripts_copia'); fs.rmSync(dst,{recursive:true,force:true}); fs.cpSync(path.join(BP,'scripts'),dst,{recursive:true});
const mc = await import('@minecraft/server');
const { pathToFileURL } = await import('node:url');
try { await import(pathToFileURL(path.join(dst,'all.js')).href); } catch(e){ console.log('IMPORT FAIL', e.stack); process.exit(1); }
const { world, system } = mc; const ow=S.dims.overworld;
// cria objetivos como o start.mcfunction faria
for(const o of ['chakra','chakra_max','tp','current_health','health_stats','health_stats2','health_stats3','health_dna','charge_bijuu','charge_bijuu_max','clans','tempo_doujutsu','tempo_doujutsu_slot_2','dano_stats','chakra_acumulado','missao_classico']) world.scoreboard.addObjective(o,o);
const p1=new S.Player('Tester', ow, {x:5,y:64,z:5}); const p2=new S.Player('Amigo', ow, {x:10,y:64,z:5});
const setS=(p,o,v)=>world.scoreboard.getObjective(o).setScore(p.scoreboardIdentity,v);
for(const p of [p1,p2]){ setS(p,'chakra',50); setS(p,'chakra_max',100); setS(p,'charge_bijuu_max',0); setS(p,'tp',0); }
const stepsSync=(n)=>{ for(let i=0;i<n;i++) S.step(); };
const steps=async(n)=>{ for(let i=0;i<n;i++){ S.step(); await new Promise(r=>setTimeout(r,0)); } };
world.afterEvents.playerSpawn.fire({player:p1, initialSpawn:true}); world.afterEvents.playerSpawn.fire({player:p2, initialSpawn:true});
await steps(100);
// teste diario: mesma data (sem premio) e dia seguinte (premio com sequencia)
{ const hoje=Math.floor(Date.now()/86400000); const antes=p1.msgs.length;
  world.afterEvents.playerSpawn.fire({player:p1, initialSpawn:true}); await steps(70);
  const mesmoDia=p1.msgs.slice(antes).some(m=>m.includes('Missão do Dia'));
  p1.setDynamicProperty('ns:dia_ultimo', hoje-1); p1.setDynamicProperty('ns:dia_seq', 3);
  world.afterEvents.playerSpawn.fire({player:p1, initialSpawn:true}); await steps(70);
  const premio=p1.msgs.filter(m=>m.includes('Missão do Dia')).pop();
  console.log('teste diario: mesmo dia premiou?', mesmoDia, '| dia seguinte:', premio);
  if (mesmoDia || !premio || !premio.includes('+150 TP')) S.errors.push({where:'diario',msg:'recompensa diaria incorreta',stack:''}); }
// teste isanagi: placar -> propriedade (so quando muda)
{ world.scoreboard.addObjective('isanagi','isanagi'); const o=world.scoreboard.getObjective('isanagi');
  const r=[]; for (const [sc,esp] of [[7,1],[3,5],[0,0],[9,0]]) { o.setScore(p1.scoreboardIdentity, sc); await steps(3); r.push(p1.getProperty('tnt:dna_hashirama_isanagi')===esp); }
  console.log('teste isanagi', r); if (r.includes(false)) S.errors.push({where:'isanagi',msg:'mapeamento errado '+r,stack:''}); }
// teste dano_stats: evento so na mudanca + refresh 1x/s
{ const o=world.scoreboard.getObjective('dano_stats'); S.eventos=[]; o.setScore(p1.scoreboardIdentity, 7); await steps(40);
  const ev7=S.eventos.filter(x=>x.id===p1.id&&x.e==='tnt:dano.7').length; o.setScore(p1.scoreboardIdentity, 12); await steps(2);
  const ev12=S.eventos.some(x=>x.id===p1.id&&x.e==='tnt:dano.12');
  console.log('teste dano_stats: eventos dano.7 em 40 ticks =', ev7, '| mudou p/ 12 =', ev12);
  if (ev7<2 || ev7>4 || !ev12) S.errors.push({where:'dano_stats',msg:'sincronizacao incorreta',stack:''}); }
// usa todos os itens (beforeEvents.itemUse)
for(const id of items){ p1._inv.container.slots[0]=new S.ItemStack(id); world.beforeEvents.itemUse.fire({source:p1, itemStack:new S.ItemStack(id)}); await steps(2); }
p1._inv.container.slots[0]=new S.ItemStack('tnt:selo_byakugou');
await steps(40);
// scriptevents
const se=(id,src,msg='')=>system.afterEvents.scriptEventReceive.fire({id, message:msg, sourceEntity:src, sourceType: src?'Entity':'Server'});
for(const id of ['ativar:sharingan','ativar:byakugan','desativar:sharingan','tnt:bola_fogo','tnt:aniquilacao_fogo','tnt:corte_de_agua','tnt:skill_2_kurama_1','tnt:tenseigan_orb','ns:perfil','npc:teuchi','npc:jiraiya','npc:guy','npc:iruka','npc:tsunade_hokage','npc:orochimaru','tnt:qualquer']) { se(id,p1); se(id,undefined); }
await steps(30);
// mobs
const mobs=[...S.knownEntities].filter(e=>!e.includes('empur')&&/ninja|uchiha|espadachin|bandidos|zetsu|anbu|kakashi|zabuza|gaara|neji|itachi|kisame|orochimaru|kurama_biju$|shukaku_biju$|dummy/.test(e));
const spawned=mobs.map((id,i)=>new S.Entity(id, ow, {x:6+(i%5)*0.3,y:64,z:7+(i%3)*0.3}, {hp: id.includes('biju')?800:60, family:['mob']}));
for(const m of spawned) world.afterEvents.entitySpawn.fire({entity:m, cause:'Spawned'}); await steps(3);
await steps(25); console.log('nametag amostra:', JSON.stringify(spawned.filter(m=>m._valid&&m.nameTag).slice(0,3).map(m=>m.nameTag)));
console.log('elites', spawned.filter(m=>m._tags.has('ns_elite')).length);
const item=new S.Entity('minecraft:item', ow, {x:6,y:64,z:6},{hp:1});
// combates
for(let round=0; round<12; round++){
  for(const m of spawned){ if(!m._valid) continue; world.afterEvents.entityHitEntity.fire({damagingEntity:p1, hitEntity:m}); m.applyDamage(round===11?9999:9, {cause:'entityAttack', damagingEntity:p1}); }
  // mob bate no jogador e em outro mob
  if(spawned[0]._valid){ world.afterEvents.entityHitEntity.fire({damagingEntity:spawned[0], hitEntity:p1}); p1.applyDamage(1,{cause:'entityAttack',damagingEntity:spawned[0]}); }
  await steps(3);
}
// chefe: furia abaixo de 50%
const boss=new S.Entity('tnt:kurama_biju', ow, {x:9,y:64,z:9}, {hp:1000});
boss.applyDamage(600,{cause:'entityAttack',damagingEntity:p1}); await steps(30); boss.applyDamage(50,{cause:'entityAttack',damagingEntity:p1}); await steps(30);
console.log('boss furia', boss.getDynamicProperty('ns:furia'), 'msgs', p1.msgs.filter(m=>m.includes('ENFURECIDO')).length);
// tags de habilidades / modos
for(const t of ['dash','chidori','raikiri','mao_terra','chidori_negro','shiden_negro','attack','modo_ativado','skill_hyuga','skill_selados']) p1.addTag(t);
for(const [prop,v] of [['tnt:kurama',4],['tnt:uchiha',5],['tnt:uchiha',7],['tnt:uchiha',9],['tnt:kurama',7]]){ p1._props.set(prop,v); await steps(15); world.afterEvents.entityHitEntity.fire({damagingEntity:p1, hitEntity:p2}); p2.applyDamage(1,{cause:'entityAttack',damagingEntity:p1}); await steps(25); p1._props.set(prop,0); }
// movimento: dash, queda, meditacao, vida baixa
p1._vel={x:1.2,y:0,z:0}; await steps(4); p1.isOnGround=false; p1._vel={x:0,y:-1.6,z:0}; await steps(2); p1.isOnGround=true; await steps(4);
p1._vel={x:0,y:0,z:0}; p1.isSneaking=true; await steps(80); p1.isSneaking=false; p1._health.currentValue=3; await steps(60);
// exploracao: andar por varias regioes
for(let i=0;i<10;i++){ p1.teleport({x:200*i+5,y:70,z:-150*i}); await steps(41); }
// morte do jogador e saida
p1._health.currentValue=1; p1.applyDamage(50,{cause:'entityAttack',damagingEntity:spawned.find(m=>m._valid)}); await steps(5);
world.afterEvents.itemStopUse.fire({source:p2, itemStack:new S.ItemStack('tnt:mgk_obito_skill_4')}); p2.teleport({x:500,y:200,z:500}); await steps(15);
world.afterEvents.playerLeave.fire({playerId:p2.id, playerName:p2.name}); p2._valid=false; await steps(200);
// navegar no menu do perfil: abrir -> conquistas -> voltar -> ajustes -> toggle -> voltar
globalThis.__UISEL=[0,0,1,0,4,3, 3,0,1]; se('ns:perfil',p1); for(let i=0;i<6;i++){ await new Promise(r=>setTimeout(r,0)); await steps(1); } se('ns:perfil',p1); for(let i=0;i<10;i++){ await new Promise(r=>setTimeout(r,0)); await steps(1); }
// clica em cada botao de cada menu (0..12) para exercitar as respostas dos formularios
if (process.env.MENUS) {
  const menus = items.filter(id => /menu|pergaminho|escolha_clan|selo|clan/.test(id));
  for (const id of menus) {
    for (let sel = 0; sel < 13; sel++) {
      globalThis.__UISEL = [sel, 0, 0];
      p1._inv.container.slots[0] = new S.ItemStack(id);
      world.beforeEvents.itemUse.fire({ source: p1, itemStack: new S.ItemStack(id) });
      for (let i = 0; i < 6; i++) { await new Promise(r => setTimeout(r, 0)); await steps(1); }
    }
  }
  for (const npc of ['npc:teuchi','npc:jiraiya','npc:guy','npc:iruka','npc:tsunade_hokage','npc:orochimaru','ns:perfil','ns:bingo']) {
    for (let sel = 0; sel < 13; sel++) { globalThis.__UISEL = [sel, 0, 0]; se(npc, p1); for (let i = 0; i < 6; i++) { await new Promise(r => setTimeout(r, 0)); await steps(1); } }
  }
  await steps(100);
}
se('ns:config',p1,''); se('ns:config',p1,'kawarimi off'); se('ns:config',p1,'kawarimi talvez'); se('ns:config',p1,'kawarimi on'); se('ns:config',undefined,'elite off'); se('ns:config',p1,'elite on');
se('ns:lua_vermelha',p1); await steps(60); console.log('cfg msgs', p1.msgs.filter(m=>m.includes('Naruto Striker+]')).slice(-4).join(' || ').slice(0,400));
console.log('lua', world.getDynamicProperty('ns:lua_vermelha'), 'fog cmds', S.cmds.filter(c=>c.c.startsWith('fog')).length); await steps(1300);
// meteoro do Rinnegan: explosao cancelada e cratera cavada fora do beforeEvent
{ const met=new S.Entity('tnt:meteorio_rine', ow, {x:300,y:70,z:300},{hp:1}); const ev={source:met, cancel:false}; world.beforeEvents.explosion.fire(ev); await steps(30);
  const ar=[...(S.blocks||new Map()).entries()].filter(([k,v])=>v==='minecraft:air').length; console.log('meteoro cancel',ev.cancel,'blocos removidos',ar); if(!ev.cancel||ar<1000) S.errors.push({where:'meteoro',msg:'cratera nao foi cavada ('+ar+')',stack:''}); }
// selamento de bijuu com o bijuu colado no jogador (antes: NaN -> erro)
{ const bj=new S.Entity('tnt:kurama_biju_morte', ow, {x:p1.location.x+0.3,y:p1.location.y,z:p1.location.z},{hp:50}); p1._vel={x:0,y:0,z:0};
  world.afterEvents.itemStartUse.fire({source:p1,itemStack:new S.ItemStack('tnt:pergaminho_ceifeiro')}); await steps(40);
  world.afterEvents.itemStopUse.fire({source:p1,itemStack:new S.ItemStack('tnt:pergaminho_ceifeiro')}); await steps(5); }
// teste myoboku: bloqueado < nivel 15, viagem, construcao, meditacao e volta
{ const end=S.dims.the_end; const nivelAntes=p1.getDynamicProperty('ns:nivel'); p1.setDynamicProperty('ns:nivel',3);
  se('ns:myoboku',p1); await steps(20); const bloqueado=p1.dimension===ow;
  p1.setDynamicProperty('ns:nivel',20); const origem={...p1.location}; se('ns:myoboku',p1); await steps(15);
  const foi=p1.dimension===end; await steps(120); const construiu=S.cmds.some(c=>c.c.includes('structure load monte_myoboku'));
  p1.isSneaking=true; p1.isOnGround=true; await steps(60); p1.isSneaking=false;
  se('ns:myoboku',p1); await steps(15); const voltou=p1.dimension===ow && Math.abs(p1.location.x-origem.x)<0.01;
  console.log('teste myoboku: bloqueado',bloqueado,'| foi',foi,'| construiu',construiu,'| voltou',voltou);
  const cargas1=S.cmds.filter(c=>c.c.includes('structure load monte_myoboku')).length; se('ns:myoboku',p1); await steps(120); se('ns:myoboku',p1); await steps(15);
  const cargas2=S.cmds.filter(c=>c.c.includes('structure load monte_myoboku')).length; console.log('teste myoboku: cargas na 2a viagem', cargas2-cargas1);
  if(cargas2!==cargas1) S.errors.push({where:'myoboku',msg:'estrutura recarregada',stack:''});
  if(!(bloqueado&&foi&&construiu&&voltou)) S.errors.push({where:'myoboku',msg:'fluxo incorreto',stack:''}); p1.setDynamicProperty('ns:nivel',nivelAntes??1); }
// teste aura rank: nivel 95 sem modo -> aura + faiscas
{ const nv=p1.getDynamicProperty('ns:nivel'); const tags=p1.getTags(); for(const t of tags) if(t.startsWith('modo_ativado')) p1.removeTag(t);
  p1.setDynamicProperty('ns:nivel',95); const antes=S.particles.filter(x=>x==='tnt:ns_faisca_raio').length; await steps(60);
  const depois=S.particles.filter(x=>x==='tnt:ns_faisca_raio').length; console.log('teste aura rank: faiscas', depois-antes);
  if(depois-antes<2) S.errors.push({where:'aura rank',msg:'aura de rank nao apareceu',stack:''}); p1.setDynamicProperty('ns:nivel',nv??1); }
// teste corte: golpe com espada desenha o arco
{ p1._inv.container.slots[0]=new S.ItemStack('tnt:samehada'); p1.selectedSlotIndex=0; const alvo=new S.Entity('tnt:ninja_folha_b', ow, {x:p1.location.x+1,y:p1.location.y,z:p1.location.z},{hp:60});
  const a=S.particles.filter(x=>x==='tnt:ns_corte').length; world.afterEvents.entityHitEntity.fire({damagingEntity:p1, hitEntity:alvo}); await steps(2);
  const b=S.particles.filter(x=>x==='tnt:ns_corte').length; console.log('teste corte: pontos do arco', b-a); if(b-a!==11) S.errors.push({where:'corte',msg:'arco nao desenhado',stack:''}); }
// teste jutsu sem xp: destruir uma prisao de terra (familia jutsu) nao da XP
{ const xpA=p1.getDynamicProperty('ns:xp'), nvA=p1.getDynamicProperty('ns:nivel'); const pr=new S.Entity('tnt:prisao_terra', ow, {x:p1.location.x+2,y:p1.location.y,z:p1.location.z},{hp:5000, family:['jutsu']});
  pr.applyDamage(99999,{cause:'entityAttack',damagingEntity:p1}); await steps(5);
  const ok = p1.getDynamicProperty('ns:xp')===xpA && p1.getDynamicProperty('ns:nivel')===nvA; console.log('teste jutsu sem xp:', ok); if(!ok) S.errors.push({where:'jutsu xp',msg:'jutsu deu XP',stack:''}); }
// teste konoha: viagem, recarga e nova viagem apos 5 min
{ p1.setDynamicProperty('ns:viagem_pronta', 0); p1.teleport({x:3000,y:80,z:3000}); se('ns:konoha',p1); await steps(5); const longe=Math.abs(p1.location.x)<100;
  p1.teleport({x:3000,y:80,z:3000}); se('ns:konoha',p1); await steps(5); const bloqueou=p1.location.x===3000;
  await steps(20*60*5); se('ns:konoha',p1); await steps(5); const denovo=Math.abs(p1.location.x)<100;
  console.log('teste konoha: foi',longe,'| recarga bloqueou',bloqueou,'| apos 5min',denovo); if(!(longe&&bloqueou&&denovo)) S.errors.push({where:'konoha',msg:'viagem incorreta',stack:''}); }
// teste queda myoboku: cair abaixo da base no End -> resgate ao topo
{ p1.teleport({x:-490,y:40,z:-505},{dimension:S.dims.the_end}); await steps(6);
  const ok=p1.location.y>150; console.log('teste queda myoboku: resgatado', ok); if(!ok) S.errors.push({where:'myoboku queda',msg:'nao resgatou',stack:''});
  p1.teleport({x:5,y:70,z:5},{dimension:ow}); await steps(2); }
// teste pilula: chakra 50/100 -> +50
{ const o=world.scoreboard.getObjective('chakra'); o.setScore(p1.scoreboardIdentity,50); world.scoreboard.getObjective('chakra_max').setScore(p1.scoreboardIdentity,100);
  world.afterEvents.itemCompleteUse.fire({source:p1,itemStack:new S.ItemStack('tnt:ns_pilula_soldado'),useDuration:0}); await steps(2);
  const m=p1.msgs.filter(x=>x.includes('Pílula de Soldado')).pop(); const cmd=S.cmds.some(c=>c.c==='scoreboard players add @s chakra 50');
  console.log('teste pilula:', m, cmd); if(!m||!m.includes('+50')||!cmd) S.errors.push({where:'pilula',msg:'pilula incorreta',stack:''}); }
// teste emboscada: invoca o grupo perto do jogador
{ const antes=ow._ents.filter(e=>e.typeId.startsWith('tnt:bandidos')||e.typeId.startsWith('tnt:ninja_')||e.typeId.startsWith('tnt:espadachin')).length;
  const mod=await import(pathToFileURL(path.join(dst,'ns','exploracao.js')).href); p1.teleport({x:50,y:64,z:50},{dimension:ow}); mod.emboscada(p1); await steps(2);
  const depois=ow._ents.filter(e=>e.typeId.startsWith('tnt:bandidos')||e.typeId.startsWith('tnt:ninja_')||e.typeId.startsWith('tnt:espadachin')).length;
  console.log('teste emboscada: invocados', depois-antes); if(depois-antes<1) S.errors.push({where:'emboscada',msg:'ninguem invocado',stack:''}); }
// teste ranking: abre o menu e lista o jogador
{ const n0=(globalThis.__UILOG||[]).length; const mod=await import(pathToFileURL(path.join(dst,'ns','progressao.js')).href); mod.atualizarRanking(p1);
  globalThis.__UISEL=[]; const b=mod.BOTOES_EXTRAS.find(x=>x.nome.includes('Ranking')); await b.abrir(p1);
  const f=(globalThis.__UILOG||[]).slice(n0).find(x=>x.title.includes('Ranking')); console.log('teste ranking:', !!f && f.body.includes('Tester'));
  if(!f||!f.body.includes('Tester')) S.errors.push({where:'ranking',msg:'ranking sem o jogador',stack:''}); }
// teste furtivo: bomba de fumaca + golpe = ASSASSINATO e fica visivel
{ p1.setDynamicProperty('ns:cfg', undefined);  const alvo=new S.Entity('tnt:ninja_folha_b', ow, {x:p1.location.x+1,y:p1.location.y,z:p1.location.z},{hp:300,family:['ninja','mobs']}); p1.addEffect('invisibility',80,{});
  const n0=ow._ents.filter(e=>e.typeId==='tnt:ns_texto').length; world.afterEvents.entityHitEntity.fire({damagingEntity:p1, hitEntity:alvo}); alvo.applyDamage(10,{cause:'entityAttack',damagingEntity:p1}); await steps(3);
  const txt=ow._ents.filter(e=>e.typeId==='tnt:ns_texto').slice(n0).map(e=>e.nameTag).find(t=>t.includes('ASSASSINATO'));
  const visivel=!p1.getEffect('invisibility'); console.log('teste furtivo:', txt, '| visivel de novo', visivel, '| vida alvo', alvo._health.currentValue);
  if(!txt||!visivel||alvo._health.currentValue>280) S.errors.push({where:'furtivo',msg:'ataque furtivo incorreto',stack:''}); }
// relatorio
const byKey=new Map(); for(const e of S.errors){ const k=e.where+' :: '+e.msg; if(!byKey.has(k)) byKey.set(k,{n:0,stack:e.stack}); byKey.get(k).n++; }
console.log('objetivos criados:', ['dash','slot_select','slot_cooldown_1','stamina','reset_all'].every(o=>world.scoreboard.getObjective(o)));
console.log('ticks',S.tick,'cmds',S.cmds.length,'particles',S.particles.length,'errors',S.errors.length);
for(const [k,v] of byKey) console.log(`ERR x${v.n} ${k}\n      ${v.stack}`);
console.log('UNKNOWN refs:'); for(const u of [...new Set(S.unknown)].slice(0,60)) console.log('  ',u);
const ps={}; for(const p of S.particles) ps[p]=(ps[p]||0)+1; console.log('particles used', JSON.stringify(ps));
console.log('p1 level', p1.getDynamicProperty('ns:nivel'), 'xp', p1.getDynamicProperty('ns:xp'), 'kills', p1.getDynamicProperty('ns:kills'), 'crits', p1.getDynamicProperty('ns:criticos'), 'combo', p1.getDynamicProperty('ns:combo_max'), 'regioes', p1.getDynamicProperty('ns:regioes_n'));
console.log('p1 msgs sample:\n  '+p1.msgs.slice(0,40).join('\n  '));
console.log('chests', [...(S.blocks||new Map()).values()].filter(v=>v.includes('chest')).length, 'loot cmds', S.cmds.filter(c=>c.c.startsWith('loot insert')).length, S.cmds.filter(c=>c.c.startsWith('loot insert'))[0]?.c);
console.log('UI forms shown:', (globalThis.__UILOG||[]).map(f=>f.title).join(' | '));
const nsTexts=ow._ents.filter(e=>e.typeId==='tnt:ns_texto'); console.log('ns_texto total spawned',nsTexts.length,'still valid',nsTexts.filter(e=>e._valid).length, 'sample', nsTexts.slice(0,6).map(e=>e.nameTag).join(' / '));
fs.rmSync(dst,{recursive:true,force:true});
if (S.errors.length || S.unknown.length) { console.log('\nRESULTADO: FALHOU'); process.exit(1); } else console.log('\nRESULTADO: OK (0 erros)');
