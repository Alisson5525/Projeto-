"""Zips packs/JJK_BP and packs/JJK_RP into dist/JJK_Ilimitado.mcaddon."""
import os
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "dist", "JJK_Ilimitado.mcaddon")


def main() -> int:
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    count = 0
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for pack in ("JJK_BP", "JJK_RP"):
            base = os.path.join(ROOT, "packs", pack)
            for folder, _dirs, files in os.walk(base):
                for name in sorted(files):
                    path = os.path.join(folder, name)
                    arc = os.path.join(pack, os.path.relpath(path, base)).replace(os.sep, "/")
                    z.write(path, arc)
                    count += 1
    size = os.path.getsize(OUT) / (1024 * 1024)
    print(f"[pack] {OUT} ({count} files, {size:.2f} MB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
