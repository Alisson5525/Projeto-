import json,os,re,sys,collections
ROOT=sys.argv[1]; BP=os.path.join(ROOT,'Naruto Striker+ BP'); RP=os.path.join(ROOT,'Naruto Striker+ RP')
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
def load(p): return json.loads(strip(open(p,encoding='utf-8-sig').read()))
def files(base,ext='.json'):
    for r,_,fs in os.walk(base):
        for f in fs:
            if f.endswith(ext): yield os.path.join(r,f)
rel=lambda p: os.path.relpath(p,ROOT)
prob=collections.defaultdict(list)
# ---------- duplicate identifiers
def dup_ids(folder, getter, kind):
    seen={}
    for p in files(folder):
        try: d=load(p)
        except Exception as e: prob['json_err'].append(f'{rel(p)} {e}'); continue
        for i in getter(d):
            if i in seen and seen[i]!=p: prob['dup_'+kind].append(f'{i}: {rel(seen[i])} & {rel(p)}')
            seen.setdefault(i,p)
    return seen
rp_anims=dup_ids(os.path.join(RP,'animations'), lambda d: list(d.get('animations',{}).keys()), 'anim_rp')
rp_acs=dup_ids(os.path.join(RP,'animation_controllers'), lambda d: list(d.get('animation_controllers',{}).keys()), 'ac_rp')
rp_rcs=dup_ids(os.path.join(RP,'render_controllers'), lambda d: list(d.get('render_controllers',{}).keys()), 'rc')
def geos(d):
    out=[g['description']['identifier'] for g in d.get('minecraft:geometry',[])]
    out+=[k.split(':')[0] for k in d if k.startswith('geometry.')]
    return out
rp_geo=dup_ids(os.path.join(RP,'models'), geos, 'geo')
bp_anims=dup_ids(os.path.join(BP,'animations'), lambda d: list(d.get('animations',{}).keys()), 'anim_bp')
bp_acs=dup_ids(os.path.join(BP,'animation_controllers'), lambda d: list(d.get('animation_controllers',{}).keys()), 'ac_bp')
dup_ids(os.path.join(RP,'particles'), lambda d: [d['particle_effect']['description']['identifier']], 'particle')
dup_ids(os.path.join(RP,'entity'), lambda d: [d['minecraft:client_entity']['description']['identifier']] if 'minecraft:client_entity' in d else [], 'client_entity')
dup_ids(os.path.join(RP,'attachables'), lambda d: [d['minecraft:attachable']['description']['identifier']] if 'minecraft:attachable' in d else [], 'attachable')
dup_ids(os.path.join(BP,'entities'), lambda d: [d['minecraft:entity']['description']['identifier']], 'entity')
dup_ids(os.path.join(BP,'items'), lambda d: [d['minecraft:item']['description']['identifier']] if 'minecraft:item' in d else [], 'item')
# ---------- render controller refs vs entities
rcdata={}
for p in files(os.path.join(RP,'render_controllers')):
    for k,v in load(p).get('render_controllers',{}).items(): rcdata[k]=(v,p)
def refs_rc(rc):
    s=json.dumps(rc)
    arrays=set(re.findall(r'Array\.(\w+)',s))
    out={'Texture':set(re.findall(r'Texture\.(\w+)',s)),'Geometry':set(re.findall(r'Geometry\.(\w+)',s)),'Material':set(re.findall(r'Material\.(\w+)',s))}
    return out
VAN_RC={'controller.render.item_sprite','controller.render.armor','controller.render.zombie','controller.render.player.first_person','controller.render.player.third_person','controller.render.player.map','controller.render.default','controller.render.item_default'}
for kind,folder,key in (('entity','entity','minecraft:client_entity'),('attachable','attachables','minecraft:attachable')):
    for p in files(os.path.join(RP,folder)):
        d=load(p).get(key)
        if not d: continue
        desc=d['description']
        tex=set(desc.get('textures',{})); geo=set(desc.get('geometry',{})); mat=set(desc.get('materials',{}))
        for r in desc.get('render_controllers',[]):
            rn=r if isinstance(r,str) else list(r)[0]
            if rn not in rcdata: continue
            rc,rp_=rcdata[rn]; refs=refs_rc(rc)
            for t in refs['Texture']-tex: prob['rc_texture_undef'].append(f'{rel(p)} usa {rn} -> Texture.{t}')
            for g in refs['Geometry']-geo: prob['rc_geometry_undef'].append(f'{rel(p)} usa {rn} -> Geometry.{g}')
            for m in refs['Material']-mat:
                if m!='default' or 'default' not in mat: prob['rc_material_undef'].append(f'{rel(p)} usa {rn} -> Material.{m}')
        # animations map values exist
        amap=desc.get('animations',{})
        for k,a in amap.items():
            if not a: prob['anim_empty'].append(f'{rel(p)} chave "{k}" vazia')
        # AC states referencing animation short names
        for k,a in amap.items():
            if a in rp_acs:
                acp=rp_acs[a]; ac=load(acp)['animation_controllers'][a]
                for sn,st in ac.get('states',{}).items():
                    for an in st.get('animations',[]):
                        nm=an if isinstance(an,str) else list(an)[0]
                        if nm not in amap: prob['ac_anim_undef_rp'].append(f'{rel(p)} controlador {a} estado {sn} -> "{nm}"')
        # animate list entries exist
        for an in desc.get('scripts',{}).get('animate',[]):
            nm=an if isinstance(an,str) else list(an)[0]
            if nm not in amap: prob['animate_undef_rp'].append(f'{rel(p)} animate -> "{nm}"')
# BP entities: animate/animations
for p in files(os.path.join(BP,'entities')):
    e=load(p)['minecraft:entity']; desc=e['description']; amap=desc.get('animations',{})
    for k,a in amap.items():
        if not a: prob['anim_empty_bp'].append(f'{rel(p)} chave "{k}" vazia'); continue
        if a not in bp_anims and a not in bp_acs: prob['anim_missing_bp'].append(f'{rel(p)} {k} -> {a}')
        if a in bp_acs:
            ac=load(bp_acs[a])['animation_controllers'][a]
            for sn,st in ac.get('states',{}).items():
                for an in st.get('animations',[]):
                    nm=an if isinstance(an,str) else list(an)[0]
                    if nm not in amap: prob['ac_anim_undef_bp'].append(f'{rel(p)} controlador {a} estado {sn} -> "{nm}"')
                if 'initial_state' in ac and ac['initial_state'] not in ac['states']: prob['ac_initial'].append(a)
                for tr in st.get('transitions',[]):
                    for dest in tr:
                        if dest not in ac['states']: prob['ac_transition_bp'].append(f'{a} {sn} -> {dest}')
    for an in desc.get('scripts',{}).get('animate',[]):
        nm=an if isinstance(an,str) else list(an)[0]
        if nm not in amap: prob['animate_undef_bp'].append(f'{rel(p)} animate -> "{nm}"')
# RP AC transitions
for a,p in rp_acs.items():
    ac=load(p)['animation_controllers'][a]
    if 'initial_state' in ac and ac['initial_state'] not in ac.get('states',{}): prob['ac_initial_rp'].append(a)
    for sn,st in ac.get('states',{}).items():
        for tr in st.get('transitions',[]):
            for dest in tr:
                if dest not in ac['states']: prob['ac_transition_rp'].append(f'{a} {sn} -> {dest}')
# ---------- scoreboard objectives
criados=set()
usados=collections.defaultdict(set)
srcs=list(files(BP,'.mcfunction'))+list(files(os.path.join(BP,'scripts'),'.js'))+list(files(os.path.join(BP,'animation_controllers')))+list(files(os.path.join(BP,'animations')))+list(files(os.path.join(BP,'entities')))
for p in srcs:
    s=open(p,encoding='utf-8-sig').read()
    criados|=set(re.findall(r'scoreboard objectives add (\w+)',s))
    criados|=set(re.findall(r'(?:addObjective|objetivo)\(\s*["\'](\w+)["\']',s))
    for m in re.findall(r'scoreboard players (?:add|remove|set|reset|operation|random|test) \S+ (\w+)',s): usados[m].add(rel(p))
    for blk in re.findall(r'scores=\{([^}]*)\}',s):
        for m in re.findall(r'(\w+)=',blk): usados[m].add(rel(p))
    for m in re.findall(r'(?:getScore|lerScore|somarScore|definirScore|getObjective)\([^"\']*["\'](\w+)["\']',s): usados[m].add(rel(p))
# objetivos criados em lista do util
utilsrc=open(os.path.join(BP,'scripts','ns','util.js')).read()
m=re.search(r'for \(const nome of \[([^\]]*)\]\) objetivo',utilsrc)
if m: criados|=set(re.findall(r'"(\w+)"',m.group(1)))
for o in sorted(usados):
    if o not in criados: prob['objetivo_nao_criado'].append(f'{o}  (usado em {len(usados[o])} arquivos, ex. {sorted(usados[o])[0]})')
for k,v in sorted(prob.items()):
    print(f'## {k}: {len(v)}')
    for x in sorted(set(v))[:60]: print('   ',x)
