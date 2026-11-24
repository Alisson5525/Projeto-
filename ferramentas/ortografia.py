"""Revisao ortografica do texto EXIBIDO ao jogador (pt-BR).

Altera somente:
  - literais de string dos scripts que sao texto visivel (contem espaco, quebra de linha ou
    codigo de cor) e nao sao comandos; em comandos tellraw/titleraw, so o conteudo de "text";
  - "text" de tellraw/titleraw em .mcfunction e nos JSON de entidades/controladores;
  - valores dos arquivos .lang.
Nunca altera identificadores, tags, placares, eventos, o marcador 'Lock' da UI nem chaves ui.*.
"""
import os, re, sys, json

PALAVRAS = {
    "nao": "não", "voce": "você", "voces": "vocês", "ja": "já", "tambem": "também", "missao": "missão",
    "missoes": "missões", "portao": "portão", "portoes": "portões", "nivel": "nível", "niveis": "níveis",
    "maldiçao": "maldição", "maldicao": "maldição", "regeneraçao": "regeneração", "evoluçao": "evolução",
    "evolucao": "evolução", "comcluida": "concluída", "comcluido": "concluído", "concluida": "concluída",
    "concluido": "concluído", "informaçoes": "informações", "informacoes": "informações", "informaçao": "informação",
    "poderar": "poderá", "cahkra": "chakra", "recaregar": "recarregar", "tera": "terá", "celulas": "células",
    "segundario": "secundário", "segundarios": "secundários", "espadachin": "espadachim", "ativaçao": "ativação",
    "ativacao": "ativação", "necessario": "necessário", "forca": "força", "habilidade": "habilidade",
    "capturas": "capturas", "duraçao": "duração", "duracao": "duração", "atençao": "atenção", "atencao": "atenção",
    "proximo": "próximo", "proxima": "próxima", "ultimo": "último", "ultima": "última", "possivel": "possível",
    "disponivel": "disponível", "indisponivel": "indisponível", "invocaçao": "invocação", "invocacao": "invocação",
    "tecnica": "técnica", "tecnicas": "técnicas", "transformaçao": "transformação", "transformacao": "transformação",
    "voçe": "você", "mascara": "máscara", "sabio": "sábio", "sabios": "sábios", "rapido": "rápido",
    "botao": "botão", "setimo": "sétimo", "sera": "será", "kekeigenkai": "kekkei genkai", "obrigatorio": "obrigatório", "vitoria": "vitória", "experiencia": "experiência", "conteudo": "conteúdo", "aldeao": "aldeão", "agua": "água", "aagua": "água", "prisao": "prisão", "saudacao": "saudação", "tubarao": "tubarão", "lamina": "lâmina", "aniquilacao": "aniquilação", "sanduiche": "sanduíche", "apos": "após", "bonus": "bônus", "beneficios": "benefícios", "beneficio": "benefício", "facil": "fácil", "dificil": "difícil", "historia": "história", "construçao": "construção", "protecao": "proteção", "protecão": "proteção", "configuraçao": "configuração", "opçoes": "opções", "opcoes": "opções", "cancelaçao": "cancelamento", "requer": "requer", "unica": "única", "unicas": "únicas", "unico": "único", "sabedoria": "sabedoria", "basico": "básico", "basica": "básica", "estatisticas": "estatísticas", "itens": "itens", "voltar": "voltar", "pagina": "página", "proxima pagina": "próxima página", "olho": "olho", "esta": None, "ate": None,
}
FRASES = [
    (re.compile(r"\bsennin do sapos\b", re.I), "Sennin dos Sapos"),
    (re.compile(r"\bmodo sennin do sapos\b", re.I), "Modo Sennin dos Sapos"),
    (re.compile(r"\bTreinamento Comcluida\b"), "Treinamento Concluído"),
    (re.compile(r"\bTempo De Treinamento Comcluida\b"), "Tempo de Treinamento Concluído"),
]


def caso(orig, novo):
    if orig.isupper() and len(orig) > 1:
        return novo.upper()
    if orig[0].isupper():
        return novo[0].upper() + novo[1:]
    return novo


PAT = re.compile(r"(?:(?<=§[0-9a-zA-Z])|(?<![\w_:.\-/@]))(" + "|".join(sorted((re.escape(k) for k, v in PALAVRAS.items() if v), key=len, reverse=True)) + r")(?![\w_:\-])", re.I)


def corrigir_texto(t):
    if "ui." in t and " " not in t:
        return t
    for p, r in FRASES:
        t = p.sub(r, t)

    def rep(m):
        w = m.group(1)
        novo = PALAVRAS.get(w.lower())
        return caso(w, novo) if novo else w
    return PAT.sub(rep, t)


CMD = re.compile(r"^\s*/?(execute|scoreboard|tag|event|replaceitem|effect|give|clear|playsound|particle|tp|teleport|summon|function|camerashake|fog|title|titleraw|tellraw|hud|kill|setblock|fill|structure|spreadplayers|scriptevent|damage|ride|playanimation|gamerule|music|stopsound|xp|enchant|weather|time|say|me)\b")
TEXTO = re.compile(r'(\\?"text\\?"\s*:\s*\\?")((?:[^"\\]|\\(?!")|\\\\)*?)(\\?")')


def corrigir_comando(c):
    return TEXTO.sub(lambda m: m.group(1) + corrigir_texto(m.group(2)) + m.group(3), c)


def corrigir_literal(conteudo):
    if "Lock" == conteudo.strip():
        return conteudo
    if CMD.match(conteudo):
        return corrigir_comando(conteudo) if "text" in conteudo else conteudo
    if not re.search(r"[ \n§]|\\n", conteudo):
        return conteudo  # identificador
    if re.fullmatch(r"[\w:.\-/ ]*", conteudo) and "_" in conteudo and " " not in conteudo:
        return conteudo
    return corrigir_texto(conteudo)


def processar_js(s):
    out = []
    i = 0
    n = len(s)
    while i < n:
        c = s[i]
        if c == "/" and s.startswith("//", i):
            j = s.find("\n", i); j = n if j < 0 else j
            out.append(s[i:j]); i = j; continue
        if c == "/" and s.startswith("/*", i):
            j = s.find("*/", i); j = n if j < 0 else j + 2
            out.append(s[i:j]); i = j; continue
        if c in "'\"":
            j = i + 1
            while j < n and s[j] != c:
                if s[j] == "\\": j += 1
                if s[j] == "\n": break
                j += 1
            out.append(c + corrigir_literal(s[i + 1:j]) + c); i = j + 1; continue
        if c == "`":
            j = i + 1; partes = []; ini = j
            while j < n and s[j] != "`":
                if s[j] == "\\": j += 2; continue
                if s.startswith("${", j):
                    partes.append(("t", s[ini:j]))
                    depth = 0; k = j
                    while k < n:
                        if s[k] == "{": depth += 1
                        elif s[k] == "}":
                            depth -= 1
                            if depth == 0: break
                        k += 1
                    partes.append(("e", s[j:k + 1])); j = k + 1; ini = j; continue
                j += 1
            partes.append(("t", s[ini:j]))
            texto_total = "".join(p for t, p in partes if t == "t")
            visivel = bool(re.search(r"[ \n§]|\\n", texto_total)) and not CMD.match(texto_total)
            ehcmd = bool(CMD.match(texto_total))
            res = []
            for t, p in partes:
                if t == "t" and visivel: res.append(corrigir_texto(p))
                elif t == "t" and ehcmd and "text" in texto_total: res.append(corrigir_comando(p))
                else: res.append(p)
            out.append("`" + "".join(res) + "`"); i = j + 1; continue
        out.append(c); i += 1
    return "".join(out)


def main():
    raiz = sys.argv[1]
    mudancas = 0
    arquivos = []
    for r, _, fs in os.walk(raiz):
        for f in fs:
            p = os.path.join(r, f)
            ext = os.path.splitext(f)[1]
            if ext not in (".js", ".mcfunction", ".json", ".lang"):
                continue
            if os.sep + "ui" + os.sep in p and ext == ".json":
                continue  # JSON UI: textos ficam nos .lang/scripts
            s = open(p, encoding="utf-8-sig").read()
            if ext == ".js":
                novo = processar_js(s)
            elif ext == ".lang":
                linhas = []
                for l in s.split("\n"):
                    if "=" in l and not l.lstrip().startswith("#"):
                        k, v = l.split("=", 1)
                        v2 = corrigir_texto(v) if not k.strip().startswith("ui.") or " " in v else v
                        linhas.append(k + "=" + v2)
                    else:
                        linhas.append(l)
                novo = "\n".join(linhas)
            else:
                novo = corrigir_comando(s)
                if ext == ".mcfunction":
                    pass
            if novo != s:
                if ext == ".json":
                    json.loads(novo)  # garante que continua valido
                open(p, "w", encoding="utf-8").write(novo)
                d = sum(1 for a, b in zip(s.split("\n"), novo.split("\n")) if a != b)
                mudancas += d
                arquivos.append((os.path.relpath(p, raiz), d))
    for a, d in sorted(arquivos, key=lambda x: -x[1]):
        print(d, a)
    print("linhas alteradas:", mudancas, "arquivos:", len(arquivos))


if __name__ == "__main__":
    main()
