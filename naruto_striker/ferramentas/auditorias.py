# Auditorias estruturais do add-on (rodar a partir da pasta naruto_striker):
#   python3 ferramentas/auditorias.py
# Verifica: placares usados x criados, funcoes chamadas x existentes, itens/sons/estruturas
# em comandos, tabelas de saque, icones, pares BP<->RP de entidades, attachables,
# controladores (estados/transicoes/animacoes declaradas), render controllers e
# "scripts.animate", e a sintaxe dos subcomandos de "execute".
# Sai com codigo 1 se encontrar problemas.
import json, os, re, sys

BP, RP = 'behavior_pack', 'resource_pack'
problemas = []

def walk(d):
    for r, ds, fs in os.walk(d):
        for f in fs:
            yield os.path.join(r, f)

def ler(p):
    return open(p, encoding='utf-8-sig', errors='ignore').read()

def rj(p):
    s = ler(p)
    try:
        return json.loads(s)
    except Exception:
        s = re.sub(r'^\s*//.*$', '', s, flags=re.M)
        return json.loads(re.sub(r',(\s*[}\]])', r'\1', s))

def ident(p):
    m = re.search(r'"identifier"\s*:\s*"([^"]+)"', ler(p))
    return m.group(1) if m else None

def sem_comentarios(p, s):
    return '\n'.join(l for l in s.split('\n') if not l.lstrip().startswith('#')) if p.endswith('.mcfunction') else s

textos = [(p, sem_comentarios(p, ler(p))) for p in walk(BP) if re.search(r'\.(json|mcfunction|js)$', p)]

# ---------- placares ----------
criados = set()
usados = {}
for p, s in textos:
    criados |= set(re.findall(r'scoreboard objectives add\s+(\S+)', s))
    criados |= set(re.findall(r'(?:addObjective|objetivo)\(\s*["\'`]([^"\'`]+)', s))
    for lista in re.findall(r'for \(const nome of \[([^\]]*)\]\) objetivo', s):
        criados |= set(re.findall(r'"([^"]+)"', lista))
    for m in re.finditer(r'scoreboard players (?:add|remove|set|reset|test|random|operation)\s+(?:@[a-z](?:\[[^\]]*\])?|\S+)\s+([A-Za-z0-9_\.]+)', s):
        usados.setdefault(m.group(1), p)
    for m in re.finditer(r'scores=\{([^}]*)\}', s):
        for k in re.findall(r'([A-Za-z0-9_\.]+)\s*=', m.group(1)):
            usados.setdefault(k, p)
    for k in re.findall(r"q(?:uery)?\.scoreboard\(\s*'([^']+)'", s):
        usados.setdefault(k, p)
for k, p in usados.items():
    if k not in criados:
        problemas.append(f'placar usado mas nunca criado: {k} ({p})')

# ---------- funcoes ----------
fns = {os.path.relpath(p, f'{BP}/functions')[:-11] for p in walk(f'{BP}/functions') if p.endswith('.mcfunction')}
for p, s in textos:
    if p.endswith('.js'):
        continue
    for n in re.findall(r'(?:^|[\s"/])function\s+([A-Za-z0-9_/\.]+)', s):
        if n not in fns:
            problemas.append(f'funcao inexistente: {n} ({p})')

# ---------- itens, sons, estruturas ----------
itens = {ident(p) for p in walk(f'{BP}/items') if p.endswith('.json')} - {None}
sd = rj(f'{RP}/sounds/sound_definitions.json')
sons = set((sd.get('sound_definitions') or sd).keys())
estruturas = {os.path.basename(p)[:-12] for p in walk(f'{BP}/structures') if p.endswith('.mcstructure')}
vanilla_som = re.compile(r'^(random|mob|note|ambient|block|dig|step|game|use|fire|liquid|item|armor|damage|portal|beacon|bucket|conduit|elytra|break|bottle|crossbow|firework|hit|jump|land|tile|camera|cauldron|minecart|music|raid|record|ui|trident|chime|respawn_anchor|bubble|leashknot|place|attack|bell|apply_effect|smithing_table|vr)')
for p, s in textos:
    for i in re.findall(r'(?:give|replaceitem\s+entity\s+\S+\s+\S+\s+\d+|clear)\s+@[a-z](?:\[[^\]]*\])?\s+(tnt:[a-z0-9_]+)', s):
        if i not in itens:
            problemas.append(f'item inexistente em comando: {i} ({p})')
    for n in re.findall(r'playsound\s+([A-Za-z0-9_.]+)', s):
        if n not in sons and not vanilla_som.match(n):
            problemas.append(f'som inexistente: {n} ({p})')
    for n in re.findall(r'structure\s+load\s+"?([A-Za-z0-9_:]+)', s):
        if n not in estruturas:
            problemas.append(f'estrutura inexistente: {n} ({p})')
    for sub in re.findall(r'execute\s+([a-z_]+)', s):
        if sub not in {'as', 'at', 'if', 'unless', 'run', 'positioned', 'in', 'anchored', 'align', 'facing', 'rotated'}:
            problemas.append(f'execute com subcomando invalido: {sub} ({p})')
    if re.search(r'@[aeprs] \[', s):
        problemas.append(f'seletor com espaco antes de [ ({p})')

# ---------- saque ----------
for p in walk(f'{BP}/entities'):
    if not p.endswith('.json'):
        continue
    for t in re.findall(r'"table"\s*:\s*"([^"]+)"', ler(p)):
        if not os.path.exists(f'{BP}/{t}') and t not in ('loot_tables/empty.json', 'loot_tables/entities/player.json', 'loot_tables/entities/cat.json'):
            problemas.append(f'tabela de saque inexistente: {t} ({p})')
for p in walk(f'{BP}/loot_tables'):
    for i in re.findall(r'"name"\s*:\s*"(tnt:[^"]+)"', ler(p)):
        if i not in itens:
            problemas.append(f'item inexistente no saque: {i} ({p})')

# ---------- icones ----------
it = rj(f'{RP}/textures/item_texture.json')['texture_data']
existe = lambda t: any(os.path.exists(f'{RP}/{t}{e}') for e in ('.png', '.tga', '.jpg'))
for k, v in it.items():
    for t in (v['textures'] if isinstance(v['textures'], list) else [v['textures']]):
        t = t if isinstance(t, str) else t.get('path', '')
        if not existe(t):
            problemas.append(f'icone sem textura: {k} -> {t}')
for p in walk(f'{BP}/items'):
    if not p.endswith('.json'):
        continue
    c = rj(p)['minecraft:item'].get('components', {})
    ic = c.get('minecraft:icon')
    if ic is None:
        continue
    nome = ic if isinstance(ic, str) else (ic.get('textures', {}).get('default') or ic.get('texture'))
    if nome not in it and nome not in ('diamond',):
        problemas.append(f'icone nao registrado: {nome} ({p})')

# ---------- entidades BP x RP, attachables ----------
bp_ids = {ident(p) for p in walk(f'{BP}/entities') if p.endswith('.json')} - {None}
rp_ids = {ident(p) for p in walk(f'{RP}/entity') if p.endswith('.json')} - {None}
for i in sorted(bp_ids - rp_ids):
    if not i.startswith('minecraft:'):
        problemas.append(f'entidade sem definicao de cliente (RP): {i}')
for i in sorted(rp_ids - bp_ids):
    if not i.startswith('minecraft:'):
        problemas.append(f'cliente sem entidade no BP: {i}')
for p in walk(f'{RP}/attachables'):
    i = ident(p)
    if i and not i.startswith('minecraft:') and i not in itens:
        problemas.append(f'attachable de item inexistente: {i}')

# ---------- controladores, render controllers, animate ----------
for lado, ent_dir, chave, ac_dir in ((BP, f'{BP}/entities', 'minecraft:entity', f'{BP}/animation_controllers'),
                                     (RP, f'{RP}/entity', 'minecraft:client_entity', f'{RP}/animation_controllers')):
    acs = {}
    for p in walk(ac_dir):
        if p.endswith('.json'):
            acs.update(rj(p).get('animation_controllers', {}))
    for nome, ac in acs.items():
        st = ac.get('states', {})
        ini = ac.get('initial_state', 'default')
        if ini not in st:
            problemas.append(f'{lado} controlador sem estado inicial: {nome}')
        for sn, s in st.items():
            for t in s.get('transitions', []):
                for k in t:
                    if k not in st:
                        problemas.append(f'{lado} transicao para estado inexistente: {nome} {sn}->{k}')
    for p in walk(ent_dir):
        if not p.endswith('.json'):
            continue
        try:
            d = rj(p).get(chave, {}).get('description')
        except Exception:
            continue
        if not d:
            continue
        A = d.get('animations', {})
        for a in d.get('scripts', {}).get('animate', []):
            k = a if isinstance(a, str) else next(iter(a))
            if k not in A:
                problemas.append(f'{lado} animate sem animacao declarada: {k} ({p})')
        for v in A.values():
            for sn, s in acs.get(v, {}).get('states', {}).items():
                for a in s.get('animations', []):
                    k = a if isinstance(a, str) else next(iter(a))
                    if k not in A:
                        problemas.append(f'{lado} {d.get("identifier")}: estado {sn} de {v} usa "{k}" nao declarada')

rcs = {}
for p in walk(f'{RP}/render_controllers'):
    if p.endswith('.json'):
        rcs.update(rj(p).get('render_controllers', {}))
for p in list(walk(f'{RP}/entity')) + list(walk(f'{RP}/attachables')):
    if not p.endswith('.json'):
        continue
    j = rj(p)
    d = (j.get('minecraft:client_entity') or j.get('minecraft:attachable') or {}).get('description')
    if not d:
        continue
    mapas = {'Geometry': d.get('geometry', {}), 'Texture': d.get('textures', {}), 'Material': d.get('materials', {})}
    for r in d.get('render_controllers', []):
        rid = r if isinstance(r, str) else next(iter(r))
        rc = rcs.get(rid)
        if not rc:
            continue
        refs = json.dumps([rc.get('geometry'), rc.get('textures'), rc.get('materials'), rc.get('arrays', {})])
        for tipo, k in re.findall(r'(Geometry|Texture|Material)\.([A-Za-z0-9_]+)', refs):
            if k not in mapas[tipo] and not (tipo == 'Material' and k == 'default'):
                problemas.append(f'render controller {rid} usa {tipo}.{k} ausente em {p}')

for pr in sorted(set(problemas)):
    print(pr)
print(f'auditorias: {len(set(problemas))} problema(s)')
sys.exit(1 if problemas else 0)
