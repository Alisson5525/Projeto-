#!/usr/bin/env python3
"""Gera geometrias (Bedrock 1.12.0) e as texturas casadas com o mapa UV.

- geometry.zenite.arconte  → RP/models/entity/arconte.geo.json
  texturas RP/textures/entity/zenite/arconte.png e arconte_furia.png (128x128)
  Material entity_emissive_alpha: alfa 0 = brilho total (runas, olhos, coroa).
- geometry.zenite.diadema  → RP/models/entity/diadema.geo.json
  textura RP/textures/models/armor/zenite_diadema.png (64x64)
  Ossos waist/body/head iguais aos de geometry.player.armor.base.

A UV de cada cubo é calculada por um empacotador simples, e cada face é
pintada por uma função de "material", então modelo e textura nunca
desencontram.
"""
from __future__ import annotations

import json
import math
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

from pixel import P, Tela, com_alfa, clarear, escurecer, hx, mistura, rng

RAIZ = Path(__file__).resolve().parent.parent
RP = RAIZ / "RP"

GLOW = 30  # alfa baixo = emissivo (~88%); não usa 0 para a cor sobreviver a premultiplicação


@dataclass
class Cubo:
    origem: tuple[float, float, float]
    tamanho: tuple[int, int, int]
    pintor: str
    rotacao: tuple[float, float, float] | None = None
    pivo: tuple[float, float, float] | None = None
    inflar: float = 0.0
    grupo_uv: str | None = None  # cubos com o mesmo grupo compartilham a UV
    espelhar: bool = False
    uv: tuple[int, int] | None = None


@dataclass
class Osso:
    nome: str
    pivo: tuple[float, float, float]
    pai: str | None = None
    cubos: list[Cubo] = field(default_factory=list)
    rotacao: tuple[float, float, float] | None = None


def regiao(c: Cubo) -> tuple[int, int]:
    w, h, d = c.tamanho
    return 2 * (w + d), d + h


def empacotar(ossos: list[Osso], largura: int, altura: int) -> None:
    """Prateleiras simples; cubos do mesmo grupo_uv reaproveitam a mesma UV."""
    grupos: dict[str, tuple[int, int]] = {}
    pendentes = [c for o in ossos for c in o.cubos]
    ordem = sorted({id(c): c for c in pendentes}.values(), key=lambda c: -regiao(c)[1])
    x = y = 0
    alt_prateleira = 0
    for c in ordem:
        if c.grupo_uv and c.grupo_uv in grupos:
            c.uv = grupos[c.grupo_uv]
            continue
        w, h = regiao(c)
        if x + w > largura:
            x, y = 0, y + alt_prateleira + 1
            alt_prateleira = 0
        if y + h > altura:
            raise SystemExit(f"textura {largura}x{altura} pequena demais")
        c.uv = (x, y)
        if c.grupo_uv:
            grupos[c.grupo_uv] = c.uv
        x += w + 1
        alt_prateleira = max(alt_prateleira, h)


def faces(c: Cubo) -> dict[str, tuple[int, int, int, int]]:
    """Retângulos (x, y, w, h) de cada face no layout box UV do Bedrock."""
    u, v = c.uv
    w, h, d = c.tamanho
    return {
        "topo": (u + d, v, w, d),
        "base": (u + d + w, v, w, d),
        "direita": (u, v + d, d, h),
        "frente": (u + d, v + d, w, h),
        "esquerda": (u + d + w, v + d, d, h),
        "costas": (u + 2 * d + w, v + d, w, h),
    }


Pintor = Callable[[str, int, int, int, int, "Cubo"], tuple | None]


def pintar(t: Tela, ossos: list[Osso], pintores: dict[str, Pintor]) -> None:
    feitos: set[tuple[int, int]] = set()
    for o in ossos:
        for c in o.cubos:
            if c.uv in feitos:
                continue
            feitos.add(c.uv)
            for nome, (fx, fy, fw, fh) in faces(c).items():
                for yy in range(fh):
                    for xx in range(fw):
                        cor = pintores[c.pintor](nome, xx, yy, fw, fh, c)
                        if cor is not None:
                            t.p(fx + xx, fy + yy, cor)


def exportar(ident: str, ossos: list[Osso], largura: int, altura: int, limites: tuple[float, float, float]) -> dict:
    bones = []
    for o in ossos:
        b: dict = {"name": o.nome, "pivot": list(o.pivo)}
        if o.pai:
            b["parent"] = o.pai
        if o.rotacao:
            b["rotation"] = list(o.rotacao)
        cubes = []
        for c in o.cubos:
            cj: dict = {"origin": list(c.origem), "size": list(c.tamanho), "uv": list(c.uv)}
            if c.inflar:
                cj["inflate"] = c.inflar
            if c.rotacao:
                cj["rotation"] = list(c.rotacao)
                cj["pivot"] = list(c.pivo)
            if c.espelhar:
                cj["mirror"] = True
            cubes.append(cj)
        if cubes:
            b["cubes"] = cubes
        bones.append(b)
    return {
        "format_version": "1.12.0",
        "minecraft:geometry": [
            {
                "description": {
                    "identifier": ident,
                    "texture_width": largura,
                    "texture_height": altura,
                    "visible_bounds_width": limites[0],
                    "visible_bounds_height": limites[1],
                    "visible_bounds_offset": [0, limites[2], 0],
                },
                "bones": bones,
            }
        ],
    }


# =================================================================== Arconte do Eclipse
def ossos_arconte() -> list[Osso]:
    root = Osso("root", (0, 0, 0))
    body = Osso("body", (0, 21, 0), "root", [
        Cubo((-6, 2, -4), (12, 19, 8), "manto"),
        Cubo((-5, 21, -3), (10, 12, 6), "torso"),
        Cubo((-6.5, 30, -4), (13, 3, 8), "gola"),
    ])
    head = Osso("head", (0, 33, 0), "body", [Cubo((-4, 33, -4), (8, 8, 8), "eclipse")])
    raios = []
    for k in range(12):
        raios.append(Cubo((-0.5, 42, 4.5), (1, 4, 1), "raio", rotacao=(0, 0, k * 30.0), pivo=(0, 37, 5), grupo_uv="raio"))
    crown = Osso("crown", (0, 37, 5), "head", raios)
    halo_cubos = []
    for k in range(10):
        if k in (3, 7):  # auréola partida
            continue
        halo_cubos.append(Cubo((-1.5, 45, -7), (3, 1, 1), "aureola", rotacao=(0, k * 36.0, 0), pivo=(0, 45.5, 0), grupo_uv="aureola"))
    halo = Osso("halo", (0, 45.5, 0), "head", halo_cubos)
    right = Osso("rightArm", (-6.5, 31, 0), "body", [
        Cubo((-10.5, 17, -2.5), (4, 14, 5), "manga", grupo_uv="manga"),
        Cubo((-10, 13, -1.5), (3, 4, 3), "mao", grupo_uv="mao"),
    ])
    left = Osso("leftArm", (6.5, 31, 0), "body", [
        Cubo((6.5, 17, -2.5), (4, 14, 5), "manga", grupo_uv="manga", espelhar=True),
        Cubo((7, 13, -1.5), (3, 4, 3), "mao", grupo_uv="mao", espelhar=True),
    ])
    cape = Osso("cape", (0, 32, 4), "body", [Cubo((-5.5, 5, 4), (11, 27, 1), "capa")])
    shards_cubos = []
    for k in range(4):
        a = math.radians(45 + 90 * k)
        cx, cz = 13 * math.cos(a), 13 * math.sin(a)
        shards_cubos.append(Cubo((round(cx - 1, 2), 22, round(cz - 1, 2)), (2, 5, 2), "cristal", rotacao=(0, 45, 0), pivo=(round(cx, 2), 24.5, round(cz, 2)), grupo_uv="cristal"))
    shards = Osso("shards", (0, 24, 0), "root", shards_cubos)
    return [root, body, head, crown, halo, right, left, cape, shards]


def pintores_arconte(furia: bool) -> dict[str, Pintor]:
    olho = P["carm3"] if furia else P["ciano3"]
    coroa_a, coroa_b = (P["carm2"], P["lar3"]) if furia else (P["ouro2"], P["ouro4"])
    runa = P["carm2"] if furia else P["viol2"]

    def tecido(x: int, y: int, base: tuple, semente: str) -> tuple:
        r = rng(f"{semente}{x},{y}")
        dobra = 0.18 if x % 3 == 0 else 0.0
        return escurecer(mistura(base, P["viol0"], r.random() * 0.35), dobra)

    def manto(face, x, y, w, h, c):
        if face in ("topo", "base"):
            return P["viol0"] if face == "topo" else escurecer(P["viol0"], 0.4)
        if y >= h - 2:
            return P["ouro2"] if y == h - 2 else P["ouro1"]
        if y == h - 5:
            simbolo = (x * 7 + 3) % 5 in (0, 2)
            return com_alfa(runa, GLOW) if simbolo else escurecer(P["viol0"], 0.3)
        base = mistura(P["viol0"], hx("#120720"), y / h)
        return tecido(x, y, base, f"manto{face}")

    def torso(face, x, y, w, h, c):
        if face in ("topo", "base"):
            return P["viol0"]
        base = tecido(x, y, hx("#1a0b2e"), f"torso{face}")
        if face == "frente":
            cx, cy = (w - 1) / 2, 5
            d = math.hypot(x - cx, y - cy)
            if 2.0 <= d <= 3.1:
                return com_alfa(coroa_b if d < 2.6 else coroa_a, GLOW)
            if d < 2.0:
                return hx("#020104")
            if abs(x - cx) < 0.6 and y >= 9:
                return P["ouro2"]
        return base

    def gola(face, x, y, w, h, c):
        if face == "base":
            return P["viol0"]
        if face == "topo":
            return P["ouro1"] if x in (0, w - 1) or y in (0, h - 1) else P["viol1"]
        if y == h - 1:
            return P["ouro2"]
        if (x + y * 3) % 6 == 0:
            return com_alfa(P["prata3"], GLOW)
        return mistura(P["viol1"], P["viol0"], 0.4)

    def eclipse(face, x, y, w, h, c):
        borda = x in (0, w - 1) or y in (0, h - 1)
        if face == "frente":
            if y == 4 and x in (1, 2, 5, 6):
                return com_alfa(olho, GLOW)
            if y == 5 and x in (2, 5):
                return com_alfa(escurecer(olho, 0.3), 90)
            if borda:
                return com_alfa(hx("#5a1020") if furia else hx("#3a1a5a"), 255)
            return hx("#030206")
        if face == "topo" and not borda and (x + y) % 5 == 0:
            return com_alfa(P["viol3"], 140)
        return hx("#2a0f3a") if borda else hx("#050309")

    def raio(face, x, y, w, h, c):
        return com_alfa(mistura(coroa_b, coroa_a, y / max(1, h - 1)), GLOW)

    def aureola(face, x, y, w, h, c):
        return com_alfa(P["viol3"] if (x + y) % 2 else P["branco"], GLOW)

    def manga(face, x, y, w, h, c):
        if face in ("topo", "base"):
            return P["viol0"]
        if y >= h - 2:
            return P["ouro2"] if y == h - 2 else P["ouro1"]
        if face == "direita" and x == w // 2 and y % 3 != 2:
            return com_alfa(runa, GLOW)
        return tecido(x, y, hx("#1a0b2e"), f"manga{face}")

    def mao(face, x, y, w, h, c):
        if face == "base":
            return hx("#1a1424")
        r = rng(f"mao{face}{x}{y}")
        pedra = mistura(P["pedra1"], P["pedra2"], r.random())
        if y == h - 1 and x % 2 == 0:
            return hx("#120d18")
        if r.random() < 0.12:
            return com_alfa(runa, 60)
        return pedra

    def capa(face, x, y, w, h, c):
        if face not in ("frente", "costas"):
            return hx("#0c0620")
        if y >= h - 2:
            return P["ouro1"]
        r = rng(f"capa{face}{x}{y}")
        if r.random() < 0.06:
            return com_alfa(r.choice([P["branco"], P["ciano3"], P["viol3"]]), GLOW)
        return mistura(hx("#0a0620"), hx("#1d0b3a"), y / h)

    def cristal(face, x, y, w, h, c):
        t = y / max(1, h - 1)
        base = mistura(P["carm3"] if furia else P["ciano3"], P["carm1"] if furia else P["viol2"], t)
        return com_alfa(base, GLOW if (x + y) % 3 else 170)

    return {"manto": manto, "torso": torso, "gola": gola, "eclipse": eclipse, "raio": raio, "aureola": aureola,
            "manga": manga, "mao": mao, "capa": capa, "cristal": cristal}


# =================================================================== Diadema do Zênite
def ossos_diadema() -> list[Osso]:
    waist = Osso("waist", (0, 12, 0))
    body = Osso("body", (0, 24, 0), "waist")
    halo = []
    for k in range(8):
        halo.append(Cubo((-2, 34.5, -5.5), (4, 1, 1), "aureola", rotacao=(0, k * 45.0, 0), pivo=(0, 35, 0), grupo_uv="aureola"))
    head = Osso("head", (0, 24, 0), "body", [
        Cubo((-4, 28.5, -4), (8, 1, 8), "tiara", inflar=0.75),
        Cubo((-1, 27.5, -5.6), (2, 3, 1), "gema"),
        Cubo((-5.1, 28.5, -0.5), (1, 2, 1), "ponta", grupo_uv="ponta"),
        Cubo((4.1, 28.5, -0.5), (1, 2, 1), "ponta", grupo_uv="ponta"),
    ])
    aureola = Osso("aureola", (0, 35, 0), "head", halo)
    return [waist, body, head, aureola]


def pintores_diadema() -> dict[str, Pintor]:
    def tiara(face, x, y, w, h, c):
        if face in ("topo", "base"):
            return None
        if face == "frente" and x in (3, 4):
            return P["ouro3"]
        return P["ouro2"] if y == 0 else (P["ouro1"] if (x + face.__len__()) % 3 else P["ouro3"])

    def gema(face, x, y, w, h, c):
        if face == "frente":
            return [P["ciano3"], P["ciano2"], P["ciano1"]][min(2, y)] if x == 0 else [P["ciano2"], P["ciano1"], P["ciano0"]][min(2, y)]
        return P["ouro1"]

    def ponta(face, x, y, w, h, c):
        return P["ouro3"] if y == 0 else P["ouro2"]

    def estrela(face, x, y, w, h, c):
        return P["ouro4"]

    def aureola(face, x, y, w, h, c):
        return P["ouro4"] if face in ("topo", "frente") else P["ouro3"]

    return {"tiara": tiara, "gema": gema, "ponta": ponta, "estrela": estrela, "aureola": aureola}


def main() -> None:
    modelos = RP / "models" / "entity"
    modelos.mkdir(parents=True, exist_ok=True)
    arc = ossos_arconte()
    empacotar(arc, 128, 128)
    (modelos / "arconte.geo.json").write_text(json.dumps(exportar("geometry.zenite.arconte", arc, 128, 128, (4, 4, 1.5)), indent=1), encoding="utf-8")
    for nome, furia in (("arconte", False), ("arconte_furia", True)):
        t = Tela(128, 128)
        pintar(t, arc, pintores_arconte(furia))
        t.salvar(RP / "textures" / "entity" / "zenite" / f"{nome}.png")
    dia = ossos_diadema()
    empacotar(dia, 64, 64)
    (modelos / "diadema.geo.json").write_text(json.dumps(exportar("geometry.zenite.diadema", dia, 64, 64, (2, 3, 1.5)), indent=1), encoding="utf-8")
    t = Tela(64, 64)
    pintar(t, dia, pintores_diadema())
    t.salvar(RP / "textures" / "models" / "armor" / "zenite_diadema.png")
    print("modelos gerados")


if __name__ == "__main__":
    main()
