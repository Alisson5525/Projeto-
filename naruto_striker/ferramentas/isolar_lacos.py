# Envolve o corpo de cada "for (const player of ...getPlayers())" em try/catch,
# para que um erro com um jogador nao interrompa o laco para os demais.
import re, sys
PAD = re.compile(r'for\s*\(\s*const\s+player\s+of\s+(?:mc\.)?world\.getPlayers\(\)\s*\)\s*\{')
def fim_bloco(s, i):
    # i aponta para '{'; devolve indice do '}' correspondente (ignora strings/comentarios)
    prof = 0; j = i; n = len(s)
    while j < n:
        c = s[j]
        if c in '"\'`':
            q = c; j += 1
            while j < n and s[j] != q:
                if s[j] == '\\': j += 1
                elif q == '`' and s[j] == '$' and j + 1 < n and s[j+1] == '{':
                    k = fim_bloco(s, j + 1); j = k
                j += 1
        elif c == '/' and j + 1 < n and s[j+1] == '/':
            while j < n and s[j] != '\n': j += 1
        elif c == '/' and j + 1 < n and s[j+1] == '*':
            j = s.index('*/', j + 2) + 1
        elif c == '{': prof += 1
        elif c == '}':
            prof -= 1
            if prof == 0: return j
        j += 1
    raise ValueError('bloco sem fim')
for f in sys.argv[1:]:
    s = open(f, encoding='utf-8').read()
    out = []; pos = 0; n = 0
    for m in PAD.finditer(s):
        if m.start() < pos: continue
        ab = m.end() - 1; fe = fim_bloco(s, ab)
        corpo = s[ab+1:fe]
        if corpo.lstrip().startswith('try {') and corpo.rstrip().endswith('}'):
            continue
        out.append(s[pos:ab+1]); out.append('\n    try {' + corpo + '\n    } catch (e) {}\n  '); pos = fe; n += 1
    out.append(s[pos:])
    if n:
        open(f, 'w', encoding='utf-8').write(''.join(out))
    print(f, n)
