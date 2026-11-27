#!/usr/bin/env python3
"""Empacota o add-on: dist/Zenite_BP.mcpack, dist/Zenite_RP.mcpack e dist/Zenite.mcaddon.

O .mcaddon é um zip com as duas pastas de pacote; abrir o arquivo no celular
ou no PC importa os dois pacotes de uma vez.
"""
from __future__ import annotations

import sys
import zipfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DIST = RAIZ / "dist"
IGNORAR = {".DS_Store", "Thumbs.db"}


def arquivos(pasta: Path):
    for p in sorted(pasta.rglob("*")):
        if p.is_file() and p.name not in IGNORAR and "__pycache__" not in p.parts:
            yield p


def zipar(destino: Path, pastas: list[tuple[Path, str]]) -> int:
    n = 0
    with zipfile.ZipFile(destino, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for pasta, prefixo in pastas:
            for p in arquivos(pasta):
                info = zipfile.ZipInfo(f"{prefixo}{p.relative_to(pasta).as_posix()}", date_time=(2026, 11, 27, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = 0o644 << 16
                z.writestr(info, p.read_bytes())
                n += 1
    return n


def main() -> int:
    DIST.mkdir(exist_ok=True)
    bp, rp = RAIZ / "BP", RAIZ / "RP"
    for pasta in (bp, rp):
        if not (pasta / "manifest.json").exists():
            print(f"ERRO: {pasta} sem manifest.json")
            return 1
    n1 = zipar(DIST / "Zenite_BP.mcpack", [(bp, "")])
    n2 = zipar(DIST / "Zenite_RP.mcpack", [(rp, "")])
    n3 = zipar(DIST / "Zenite.mcaddon", [(bp, "Zenite_BP/"), (rp, "Zenite_RP/")])
    for nome in ("Zenite_BP.mcpack", "Zenite_RP.mcpack", "Zenite.mcaddon"):
        print(f"{nome}: {(DIST / nome).stat().st_size / 1024:.1f} KiB")
    print(f"arquivos: BP={n1} RP={n2} addon={n3}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
