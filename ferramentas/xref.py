import json,os,re,sys,glob
ROOT=sys.argv[1]
BP=os.path.join(ROOT,'Naruto Striker+ BP'); RP=os.path.join(ROOT,'Naruto Striker+ RP')
def strip(s):
    out=[];i=0;n=len(s);ins=False
    while i<n:
        c=s[i]
        if ins:
            out.append(c)
            if c=='\\': out.append(s[i+1]); i+=2; continue
            if c=='"': ins=False
            i+=1; continue
        if c=='"': ins=True; out.append(c); i+=1; continue
        if s.startswith('//',i):
            j=s.find('\n',i); i=n if j<0 else j; continue
        if s.startswith('/*',i):
            j=s.find('*/',i); i=n if j<0 else j+2; continue
        out.append(c); i+=1
    return re.sub(r',(\s*[}\]])',r'\1',''.join(out))
def load(p):
    return json.loads(strip(open(p,encoding='utf-8-sig').read()))
def files(base,ext):
    for r,_,fs in os.walk(base):
        for f in fs:
            if f.endswith(ext): yield os.path.join(r,f)
issues=[]
def iss(kind,msg): issues.append((kind,msg))
rel=lambda p: os.path.relpath(p,ROOT)
# ---- RP inventories
geos=set()
for p in files(os.path.join(RP,'models'),'.json'):
    d=load(p)
    for g in d.get('minecraft:geometry',[]): geos.add(g['description']['identifier'])
    for k in d:
        if k.startswith('geometry.'): geos.add(k.split(':')[0])
anims=set()
for p in files(os.path.join(RP,'animations'),'.json'): anims|=set(load(p).get('animations',{}).keys())
acs=set()
for p in files(os.path.join(RP,'animation_controllers'),'.json'): acs|=set(load(p).get('animation_controllers',{}).keys())
rcs=set()
for p in files(os.path.join(RP,'render_controllers'),'.json'): rcs|=set(load(p).get('render_controllers',{}).keys())
parts={}
for p in files(os.path.join(RP,'particles'),'.json'):
    d=load(p); pid=d['particle_effect']['description']['identifier']; parts[pid]=p
    tex=d['particle_effect']['description'].get('basic_render_parameters',{}).get('texture')
    if tex and not any(os.path.exists(os.path.join(RP,tex+e)) for e in ('.png','.tga','')): iss('particle_tex',f'{rel(p)} -> {tex}')
sdefs=load(os.path.join(RP,'sounds','sound_definitions.json'))
sdefs=sdefs.get('sound_definitions',sdefs)
for sid,sd in sdefs.items():
    if not isinstance(sd,dict): continue
    for s in sd.get('sounds',[]):
        n=s if isinstance(s,str) else s.get('name')
        if n and not any(os.path.exists(os.path.join(RP,n+e)) for e in ('.ogg','.wav','.fsb','')): iss('sound_file',f'{sid} -> {n}')
def texexists(t):
    return any(os.path.exists(os.path.join(RP,t+e)) for e in ('.png','.tga',''))
# client entities & attachables
rp_entities=set()
for kind,folder in (('entity','entity'),('attachable','attachables')):
    for p in files(os.path.join(RP,folder),'.json'):
        d=load(p); key='minecraft:client_entity' if kind=='entity' else 'minecraft:attachable'
        if key not in d: iss('rp_struct',f'{rel(p)} sem {key}'); continue
        desc=d[key]['description']; rp_entities.add(desc['identifier'])
        for k,t in desc.get('textures',{}).items():
            if not texexists(t) and not t.startswith('textures/misc/') and not t.startswith('textures/entity/'): iss('tex',f'{rel(p)} {k} -> {t}')
        for k,g in desc.get('geometry',{}).items():
            if g not in geos: iss('geo',f'{rel(p)} {k} -> {g}')
        for k,a in desc.get('animations',{}).items():
            if a not in anims and a not in acs and not re.match(r'(controller\.)?animation\.(humanoid|zombie|player|persona|armor_stand|item|skeleton|villager|cat|fox|wolf|bow|crossbow|trident|shield|parrot)',a): iss('anim',f'{rel(p)} {k} -> {a}')
        for r in desc.get('render_controllers',[]):
            r=r if isinstance(r,str) else list(r.keys())[0]
            if r not in rcs and r not in ('controller.render.item_sprite','controller.render.armor','controller.render.zombie','controller.render.player.first_person','controller.render.player.third_person','controller.render.player.map','controller.render.item_default') and not r.startswith('controller.render.default') and not r.startswith('controller.render.item_default') : iss('rc',f'{rel(p)} -> {r}')
        for k,pp in desc.get('particle_effects',{}).items():
            if pp not in parts and not pp.startswith('minecraft:'): iss('part',f'{rel(p)} {k} -> {pp}')
        for k,s in desc.get('sound_effects',{}).items():
            sn=s.get('sound_effect') if isinstance(s,dict) else s
            if sn not in sdefs: iss('snd_ce',f'{rel(p)} {k} -> {sn}')
# item textures
it=load(os.path.join(RP,'textures','item_texture.json'))['texture_data']
for k,v in it.items():
    ts=v['textures']; ts=ts if isinstance(ts,list) else [ts]
    for t in ts:
        t=t if isinstance(t,str) else t.get('path')
        if not texexists(t): iss('item_tex',f'{k} -> {t}')
# ---- BP
bp_entities={}
events_by_entity={}
for p in files(os.path.join(BP,'entities'),'.json'):
    d=load(p); e=d.get('minecraft:entity')
    if not e: iss('bp_struct',rel(p)); continue
    ide=e['description']['identifier']
    if ide in bp_entities: iss('dup_entity',f'{ide}: {rel(p)} & {rel(bp_entities[ide])}')
    bp_entities[ide]=p
    events_by_entity[ide]=set(e.get('events',{}).keys())
    cgs=set(e.get('component_groups',{}).keys())
    def walk(o):
        if isinstance(o,dict):
            for k,v in o.items():
                if k in ('add','remove') and isinstance(v,dict):
                    for g in v.get('component_groups',[]):
                        if g not in cgs: iss('cg',f'{ide}: grupo {g} inexistente')
                if k=='event' and isinstance(v,str) and not v.startswith('minecraft:') and v not in events_by_entity[ide]:
                    pass
                walk(v)
        elif isinstance(o,list):
            for x in o: walk(x)
    walk(e.get('events',{}))
    if ide not in rp_entities and ide!='minecraft:player' and not e['description'].get('runtime_identifier'):
        iss('no_client',f'{ide} sem client entity')
all_events=set().union(*events_by_entity.values())
extra=set()
for p in bp_entities.values():
    d=load(p)['minecraft:entity']
    extra|=set(d['description'].get('properties',{}).keys())
    def fam(o):
        if isinstance(o,dict):
            for k,v in o.items():
                if k=='minecraft:type_family': extra.update(v.get('family',[]))
                if k=='family' and isinstance(v,list): extra.update(v)
                fam(v)
        elif isinstance(o,list):
            for x in o: fam(x)
    fam(d)
for p in files(os.path.join(BP,'scripts'),'.js'):
    t=open(p).read()
    extra|=set(re.findall(r'["\'`](tnt:[\w.]+)["\'`]\s*\)?\s*(?:\)|\{|;|$)',t))
    for m in re.finditer(r'id\s*===?\s*["\'`](tnt:[\w.]+)',t): extra.add(m.group(1))
    for m in re.finditer(r'event\.id\.startsWith|tnt = event\.id\.slice\(4\)',t): pass
    for m in re.finditer(r'tnt === ["\'](\w+)',t): extra.add('tnt:'+m.group(1))

# items
bp_items={}
for p in files(os.path.join(BP,'items'),'.json'):
    d=load(p); i=d.get('minecraft:item')
    if not i: continue
    ide=i['description']['identifier']
    if ide in bp_items: iss('dup_item',f'{ide}: {rel(p)} & {rel(bp_items[ide])}')
    bp_items[ide]=p
    ic=i.get('components',{}).get('minecraft:icon')
    if ic:
        t=ic if isinstance(ic,str) else (ic.get('texture') or ic.get('textures',{}).get('default'))
        if t not in it: iss('icon',f'{ide} -> {t}')
# functions
funcs=set(os.path.relpath(p,os.path.join(BP,'functions'))[:-11].replace(os.sep,'/') for p in files(os.path.join(BP,'functions'),'.mcfunction'))
# command scan across BP functions, scripts, acs, entities, dialogues
cmd_sources=list(files(BP,'.mcfunction'))+list(files(os.path.join(BP,'scripts'),'.js'))+list(files(os.path.join(BP,'animation_controllers'),'.json'))+list(files(os.path.join(BP,'animations'),'.json'))+list(files(os.path.join(BP,'entities'),'.json'))+list(files(os.path.join(BP,'dialogue'),'.json'))+list(files(os.path.join(RP,'animation_controllers'),'.json'))+list(files(os.path.join(RP,'animations'),'.json'))
known_items=set(bp_items)
for p in cmd_sources:
    s=open(p,encoding='utf-8-sig').read()
    for m in re.finditer(r'\bfunction ([\w/]+)',s):
        f=m.group(1)
        if f not in funcs and not p.endswith('.js') or (p.endswith('.js') and f not in funcs and re.search(r'["\'`]/?function '+re.escape(f),s)): 
            if f not in funcs: iss('func',f'{rel(p)} -> function {f}')
    for m in re.finditer(r'\bevent entity \S+ ([\w:.\-]+)',s):
        ev=m.group(1)
        if ev not in all_events and not ev.startswith('minecraft:'): iss('event',f'{rel(p)} -> {ev}')
    for m in re.finditer(r'triggerEvent\(\s*["\'`]([\w:.\-]+)["\'`]',s):
        ev=m.group(1)
        if ev not in all_events: iss('event_js',f'{rel(p)} -> {ev}')
    for m in re.finditer(r'\b(?:playsound|playSound\(|somArea\([^,]+,|som\([^,]+,)\s*["\'`]?([\w.]+)',s):
        sn=m.group(1)
        if sn in ('id','nome','s','som'): continue
        if sn not in sdefs and '.' not in sn: iss('sound',f'{rel(p)} -> {sn}')
    for m in re.finditer(r'\b(tnt:[\w.]+)',s):
        x=m.group(1)
        if x not in bp_items and x not in bp_entities and x not in parts and x not in all_events and x not in extra and x.split('.')[0] not in extra and not x.startswith('tnt:dano.') :
            iss('tnt_ref',f'{rel(p)} -> {x}')
kinds={}
for k,m in issues: kinds.setdefault(k,[]).append(m)
for k,ms in sorted(kinds.items()):
    print(f'## {k}: {len(ms)}')
    for m in sorted(set(ms))[:int(os.environ.get('N','25'))]: print('  ',m)
