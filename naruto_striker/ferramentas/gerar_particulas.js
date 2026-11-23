const fs=require('fs'),path=require('path');
const OUT=process.argv[2];
const UV={petala:[0,96],glow:[0,0],core:[32,0],star:[64,0],ring:[96,0],streak:[0,32],puff:[32,32],leaf:[64,32],bolt:[96,32],drop:[0,64],wisp:[32,64],blade:[64,64],rock:[96,64]};
const tex={texture_width:128,texture_height:128,uv:null,uv_size:[32,32]};
function P(id,{mat='particles_blend',events,emitter,shape,init={},motion,size,uv,color,facing='lookat_xyz',lifetime,collision,spin,dirFace,lighting=false}){
 const c={};
 Object.assign(c,emitter);
 c[shape[0]]=shape[1];
 c['minecraft:particle_lifetime_expression']=lifetime;
 if(init.rot!==undefined||init.rate!==undefined)c['minecraft:particle_initial_spin']={rotation:init.rot??0,rotation_rate:init.rate??0};
 if(init.speed!==undefined)c['minecraft:particle_initial_speed']=init.speed;
 c['minecraft:particle_motion_dynamic']=motion||{};
 const b={size,facing_camera_mode:facing,uv:Object.assign({},tex,{uv:UV[uv]})};
 if(dirFace)b.direction={mode:'derive_from_velocity',min_speed_threshold:0.01};
 c['minecraft:particle_appearance_billboard']=b;
 if(lighting)c['minecraft:particle_appearance_lighting']={};
 c['minecraft:particle_appearance_tinting']={color};
 if(collision)c['minecraft:particle_motion_collision']=collision;
 const j={format_version:'1.10.0',particle_effect:{description:{identifier:'tnt:'+id,basic_render_parameters:{material:mat,texture:'textures/particle/ns_fx'}},components:c}};
 if(events){j.particle_effect.events=events.defs;c['minecraft:emitter_lifetime_events']=events.life}
 fs.writeFileSync(path.join(OUT,id+'.json'),JSON.stringify(j,null,2));
}
const once=(n,life=0.5)=>({'minecraft:emitter_rate_instant':{num_particles:n},'minecraft:emitter_lifetime_once':{active_time:life}});
const sub=(names)=>({defs:Object.fromEntries(names.map(n=>[n,{particle_effect:{effect:'tnt:'+n,type:'emitter'}}])),life:{creation_event:names}});
// cor por variavel (setFloat variable.cor_r/g/b no script); fallback azul chakra quando nao setado
const VC=['variable.cor_r > 0 ? variable.cor_r : 0.35','variable.cor_g > 0 ? variable.cor_g : 0.7','variable.cor_b > 0 ? variable.cor_b : 1.0'];
const rgbaFade=(r,g,b)=>({gradient:{'0.0':[r,g,b,1],'0.6':[r,g,b,0.85],'1.0':[r,g,b,0]},interpolant:'v.particle_age / v.particle_lifetime'});
const varFade=VC.concat(['1 - math.pow(v.particle_age / v.particle_lifetime, 2)']);

// ---------- flash: brilho rapido ----------
P('ns_flash',{mat:'particles_add',emitter:once(1,0.2),shape:['minecraft:emitter_shape_point',{}],lifetime:{max_lifetime:0.16},
 size:['0.35 + v.particle_age * 9','0.35 + v.particle_age * 9'],uv:'core',color:rgbaFade(1,0.97,0.85)});
// ---------- impacto: faiscas + flash ----------
P('ns_impacto',{mat:'particles_add',events:sub(['ns_flash']),emitter:once(10,0.3),shape:['minecraft:emitter_shape_sphere',{radius:0.15,direction:'outwards'}],
 lifetime:{max_lifetime:'0.18 + math.random(0, 0.15)'},init:{speed:'math.random(6, 11)',rot:'math.random(0,360)'},
 motion:{linear_acceleration:[0,-6,0],linear_drag_coefficient:6},size:['0.12 * (1 - v.particle_age / v.particle_lifetime) + 0.03','0.12 * (1 - v.particle_age / v.particle_lifetime) + 0.03'],
 uv:'star',color:rgbaFade(1,0.9,0.55)});
// ---------- onda de choque horizontal ----------
P('ns_onda',{mat:'particles_add',emitter:once(1,0.4),shape:['minecraft:emitter_shape_point',{}],lifetime:{max_lifetime:0.35},
 size:['0.3 + v.particle_age * 9','0.3 + v.particle_age * 9'],uv:'ring',facing:'emitter_transform_xz',color:rgbaFade(1,1,1)});
// ---------- critico: estrelas douradas + anel + flash ----------
P('ns_critico',{mat:'particles_add',events:sub(['ns_flash','ns_critico_anel']),emitter:once(16,0.4),shape:['minecraft:emitter_shape_sphere',{radius:0.2,direction:'outwards'}],
 lifetime:{max_lifetime:'0.3 + math.random(0, 0.25)'},init:{speed:'math.random(5, 9)',rot:'math.random(0,360)',rate:'math.random(-200,200)'},
 motion:{linear_acceleration:[0,-3,0],linear_drag_coefficient:4},size:['0.22 * (1 - v.particle_age / v.particle_lifetime) + 0.04','0.22 * (1 - v.particle_age / v.particle_lifetime) + 0.04'],
 uv:'star',color:rgbaFade(1,0.78,0.2)});
P('ns_critico_anel',{mat:'particles_add',emitter:once(1,0.4),shape:['minecraft:emitter_shape_point',{}],lifetime:{max_lifetime:0.3},
 size:['0.2 + v.particle_age * 7','0.2 + v.particle_age * 7'],uv:'ring',color:rgbaFade(1,0.75,0.25)});
// ---------- aura de chakra (cor por variavel) ----------
P('ns_aura',{mat:'particles_add',emitter:once(6,0.25),shape:['minecraft:emitter_shape_disc',{radius:0.55,plane_normal:'y',surface_only:true,direction:[0,1,0],offset:[0,0.1,0]}],
 lifetime:{max_lifetime:'0.7 + math.random(0, 0.5)'},init:{speed:'math.random(1.2, 2.4)'},motion:{linear_acceleration:[0,0.8,0],linear_drag_coefficient:1.2},
 size:['0.28 * (1 - v.particle_age / v.particle_lifetime * 0.6)','0.42 * (1 - v.particle_age / v.particle_lifetime * 0.4)'],uv:'wisp',facing:'lookat_y',color:varFade});
// ---------- rastro de velocidade (cor por variavel) ----------
P('ns_rastro',{mat:'particles_add',emitter:once(3,0.15),shape:['minecraft:emitter_shape_box',{half_dimensions:[0.25,0.7,0.25],offset:[0,0.9,0]}],
 lifetime:{max_lifetime:'0.25 + math.random(0, 0.15)'},init:{speed:0},motion:{},
 size:['0.35 * (1 - v.particle_age / v.particle_lifetime)','0.35 * (1 - v.particle_age / v.particle_lifetime)'],uv:'glow',color:varFade});
// ---------- poeira / detritos (pouso, golpe pesado) ----------
P('ns_poeira',{emitter:once(14,0.3),shape:['minecraft:emitter_shape_disc',{radius:0.4,plane_normal:'y',direction:'outwards'}],
 lifetime:{max_lifetime:'0.6 + math.random(0, 0.5)'},init:{speed:'math.random(2, 4)',rot:'math.random(0,360)',rate:'math.random(-60,60)'},
 motion:{linear_acceleration:[0,0.4,0],linear_drag_coefficient:3},size:['0.25 + v.particle_age * 0.6','0.25 + v.particle_age * 0.6'],uv:'puff',lighting:true,
 color:{gradient:{'0.0':[0.78,0.72,0.62,0.75],'1.0':[0.78,0.72,0.62,0]},interpolant:'v.particle_age / v.particle_lifetime'}});
P('ns_detritos',{mat:'particles_alpha',events:sub(['ns_poeira']),emitter:once(8,0.3),shape:['minecraft:emitter_shape_disc',{radius:0.3,plane_normal:'y',direction:[0,1,0]}],
 lifetime:{max_lifetime:'0.9 + math.random(0, 0.4)'},init:{speed:'math.random(4, 7)',rot:'math.random(0,360)',rate:'math.random(-300,300)'},
 motion:{linear_acceleration:[0,-22,0],linear_drag_coefficient:0.5},collision:{collision_radius:0.08,coefficient_of_restitution:0.3,collision_drag:6},
 size:['0.09 + math.random(0, 0.05)','0.09 + math.random(0, 0.05)'],uv:'rock',lighting:true,color:[1,1,1,1]});
// ---------- level up: pilar de estrelas + anel + folhas ----------
P('ns_level_up',{mat:'particles_add',events:sub(['ns_level_up_anel','ns_folhas']),emitter:{'minecraft:emitter_rate_steady':{spawn_rate:60,max_particles:80},'minecraft:emitter_lifetime_once':{active_time:1.2}},
 shape:['minecraft:emitter_shape_disc',{radius:0.7,plane_normal:'y',surface_only:true,direction:[0,1,0]}],lifetime:{max_lifetime:'0.9 + math.random(0, 0.5)'},
 init:{speed:'math.random(2.5, 4.5)',rot:'math.random(0,360)',rate:120},motion:{linear_drag_coefficient:1.4},
 size:['0.14 * (1 - v.particle_age / v.particle_lifetime) + 0.04','0.14 * (1 - v.particle_age / v.particle_lifetime) + 0.04'],uv:'star',
 color:{gradient:{'0.0':[1,0.95,0.6,1],'0.5':[1,0.65,0.15,1],'1.0':[1,0.4,0.1,0]},interpolant:'v.particle_age / v.particle_lifetime'}});
P('ns_level_up_anel',{mat:'particles_add',emitter:{'minecraft:emitter_rate_steady':{spawn_rate:4,max_particles:6},'minecraft:emitter_lifetime_once':{active_time:1}},shape:['minecraft:emitter_shape_point',{offset:[0,0.1,0]}],lifetime:{max_lifetime:0.6},
 size:['0.4 + v.particle_age * 6','0.4 + v.particle_age * 6'],uv:'ring',facing:'emitter_transform_xz',color:rgbaFade(1,0.8,0.3)});
// ---------- folhas de konoha (descoberta / level up) ----------
P('ns_folhas',{mat:'particles_alpha',emitter:once(18,0.5),shape:['minecraft:emitter_shape_disc',{radius:1.2,plane_normal:'y',offset:[0,1.6,0],direction:'outwards'}],
 lifetime:{max_lifetime:'1.6 + math.random(0, 1.2)'},init:{speed:'math.random(0.8, 1.8)',rot:'math.random(0,360)',rate:'math.random(-180,180)'},
 motion:{linear_acceleration:['math.sin(v.particle_age * 260 + v.particle_random_1 * 360) * 2.5',-1.2,'math.cos(v.particle_age * 200 + v.particle_random_2 * 360) * 2.5'],linear_drag_coefficient:1.6},
 size:[0.12,0.12],uv:'leaf',lighting:true,collision:{collision_radius:0.05,collision_drag:10,coefficient_of_restitution:0},
 color:{gradient:{'0.0':[1,1,1,1],'0.85':[1,1,1,1],'1.0':[1,1,1,0]},interpolant:'v.particle_age / v.particle_lifetime'}});
// ---------- meditacao: chakra convergindo ----------
P('ns_meditacao',{mat:'particles_add',emitter:once(5,0.25),shape:['minecraft:emitter_shape_sphere',{radius:1.8,surface_only:true,direction:'inwards',offset:[0,1,0]}],
 lifetime:{max_lifetime:0.6},init:{speed:2.8},motion:{linear_drag_coefficient:0.5},
 size:['0.12 * (1 - v.particle_age / v.particle_lifetime) + 0.03','0.12 * (1 - v.particle_age / v.particle_lifetime) + 0.03'],uv:'glow',color:varFade});
// ---------- raio (critico eletrico / jutsu raio) ----------
P('ns_faisca_raio',{mat:'particles_add',emitter:once(4,0.2),shape:['minecraft:emitter_shape_sphere',{radius:0.6}],lifetime:{max_lifetime:'0.08 + math.random(0, 0.08)'},
 init:{rot:'math.random(0,360)'},size:['0.25 + math.random(0, 0.15)','0.25 + math.random(0, 0.15)'],uv:'bolt',color:rgbaFade(0.7,0.85,1)});
// ---------- rasen shuriken: impacto final (antes inexistente) ----------
P('rasen_shuriken_inpact_jt_3',{mat:'particles_add',events:sub(['ns_onda','ns_flash']),emitter:{'minecraft:emitter_rate_steady':{spawn_rate:40,max_particles:30},'minecraft:emitter_lifetime_once':{active_time:0.8}},
 shape:['minecraft:emitter_shape_sphere',{radius:1.2,direction:'outwards'}],lifetime:{max_lifetime:'0.4 + math.random(0, 0.3)'},
 init:{speed:'math.random(3, 6)',rot:'math.random(0,360)',rate:'math.random(500, 900)'},motion:{linear_drag_coefficient:2.5},
 size:['0.6 + v.particle_age * 1.5','0.6 + v.particle_age * 1.5'],uv:'blade',color:rgbaFade(0.75,0.95,1)});
// ---------- portal/teleporte de fumaca (aparicao ninja) ----------
P('ns_fumaca_ninja',{emitter:once(22,0.3),shape:['minecraft:emitter_shape_sphere',{radius:0.5,offset:[0,0.9,0],direction:'outwards'}],
 lifetime:{max_lifetime:'0.7 + math.random(0, 0.5)'},init:{speed:'math.random(1.5, 3)',rot:'math.random(0,360)',rate:'math.random(-40,40)'},motion:{linear_drag_coefficient:3.5,linear_acceleration:[0,0.6,0]},
 size:['0.45 + v.particle_age * 0.9','0.45 + v.particle_age * 0.9'],uv:'puff',lighting:true,color:{gradient:{'0.0':[0.95,0.95,0.95,0.95],'1.0':[0.85,0.85,0.85,0]},interpolant:'v.particle_age / v.particle_lifetime'}});
console.log('ok',fs.readdirSync(OUT).length);
// ---------- trilha de projeteis (cor via pre_effect_script) ----------
P('ns_trilha',{mat:'particles_add',emitter:once(2,0.1),shape:['minecraft:emitter_shape_sphere',{radius:0.15}],
 lifetime:{max_lifetime:'0.35 + math.random(0, 0.15)'},init:{speed:0.2},motion:{linear_drag_coefficient:2},
 size:['0.32 * (1 - v.particle_age / v.particle_lifetime) + 0.04','0.32 * (1 - v.particle_age / v.particle_lifetime) + 0.04'],uv:'glow',color:varFade});
// ---------- ambiente: folha caindo (sob arvores) ----------
P('ns_folha_caindo',{mat:'particles_alpha',emitter:once(1,0.1),shape:['minecraft:emitter_shape_point',{}],
 lifetime:{max_lifetime:'4 + math.random(0, 2)'},init:{speed:0,rot:'math.random(0,360)',rate:'math.random(-90,90)'},
 motion:{linear_acceleration:['math.sin(v.particle_age * 140 + v.particle_random_1 * 360) * 1.6',-0.35,'math.cos(v.particle_age * 110 + v.particle_random_2 * 360) * 1.6'],linear_drag_coefficient:1.8},
 size:[0.1,0.1],uv:'leaf',lighting:true,collision:{collision_radius:0.05,collision_drag:10,coefficient_of_restitution:0},
 color:{gradient:{'0.0':[1,1,1,0],'0.1':[1,1,1,1],'0.85':[1,1,1,1],'1.0':[1,1,1,0]},interpolant:'v.particle_age / v.particle_lifetime'}});
// ---------- ambiente: vagalumes (noite) ----------
P('ns_vagalume',{mat:'particles_add',emitter:once(1,0.1),shape:['minecraft:emitter_shape_point',{}],
 lifetime:{max_lifetime:'3 + math.random(0, 2)'},init:{speed:0.2},
 motion:{linear_acceleration:['math.sin(v.particle_age * 90 + v.particle_random_1 * 360) * 0.6','math.sin(v.particle_age * 70 + v.particle_random_3 * 360) * 0.3','math.cos(v.particle_age * 80 + v.particle_random_2 * 360) * 0.6'],linear_drag_coefficient:1},
 size:['0.06 + math.sin(v.particle_age * 400 + v.particle_random_1 * 360) * 0.02','0.06 + math.sin(v.particle_age * 400 + v.particle_random_1 * 360) * 0.02'],uv:'glow',
 color:{gradient:{'0.0':[0.8,1,0.4,0],'0.2':[0.8,1,0.4,1],'0.8':[0.8,1,0.4,1],'1.0':[0.8,1,0.4,0]},interpolant:'v.particle_age / v.particle_lifetime'}});
// ---------- rastro de corte das espadas (pontos de um arco calculados no script) ----------
P('ns_corte',{mat:'particles_add',emitter:once(1,0.05),shape:['minecraft:emitter_shape_point',{}],
 lifetime:{max_lifetime:0.2},init:{speed:0},motion:{},
 size:['0.22 * (1 - v.particle_age / v.particle_lifetime) + 0.03','0.22 * (1 - v.particle_age / v.particle_lifetime) + 0.03'],uv:'glow',color:varFade});
// ---------- petalas de sakura (ambiente de Konoha) ----------
P('ns_petala',{mat:'particles_alpha',emitter:once(1,0.1),shape:['minecraft:emitter_shape_point',{}],
 lifetime:{max_lifetime:'5 + math.random(0, 3)'},init:{speed:0,rot:'math.random(0,360)',rate:'math.random(-120,120)'},
 motion:{linear_acceleration:['1.2 + math.sin(v.particle_age * 120 + v.particle_random_1 * 360) * 1.5',-0.3,'math.cos(v.particle_age * 100 + v.particle_random_2 * 360) * 1.5'],linear_drag_coefficient:1.8},
 size:[0.09,0.09],uv:'petala',lighting:true,collision:{collision_radius:0.05,collision_drag:10,coefficient_of_restitution:0},
 color:{gradient:{'0.0':[1,1,1,0],'0.1':[1,1,1,1],'0.85':[1,1,1,1],'1.0':[1,1,1,0]},interpolant:'v.particle_age / v.particle_lifetime'}});
