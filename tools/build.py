"""Package the add-on into dist/Vampire_Craft_v<version>.mcaddon (and .mcpack files)."""
import json, os, sys, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ADDON = os.path.join(ROOT, "addon")
DIST = os.path.join(ROOT, "dist")
SKIP_EXT = (".aseprite", ".psd", ".blend", ".bbmodel", ".md")
PACKS = {"behavior_pack": "Vampire Craft BP", "resource_pack": "Vampire Craft RP"}

version = ".".join(map(str, json.load(open(os.path.join(ADDON, "behavior_pack", "manifest.json")))["header"]["version"]))
os.makedirs(DIST, exist_ok=True)


def add_pack(z, src, arc_root):
    n = 0
    for dirpath, _, files in os.walk(src):
        for f in sorted(files):
            if f.endswith(SKIP_EXT) or f.startswith("."):
                continue
            full = os.path.join(dirpath, f)
            arc = os.path.join(arc_root, os.path.relpath(full, src)) if arc_root else os.path.relpath(full, src)
            z.write(full, arc.replace(os.sep, "/"))
            n += 1
    return n


mcaddon = os.path.join(DIST, f"Vampire_Craft_v{version}.mcaddon")
with zipfile.ZipFile(mcaddon, "w", zipfile.ZIP_DEFLATED) as z:
    for folder, name in PACKS.items():
        print(name, add_pack(z, os.path.join(ADDON, folder), name), "files")
print("built", mcaddon, os.path.getsize(mcaddon) // 1024, "KB")
