"""Builds resource-pack assets from the extracted Java mod jar.

Usage: python3 -I tools/prepare_assets.py <extracted_jar_dir> [step ...]
Steps: icons textures sounds (default: all)
"""
import json
import math
import shutil
import os
import sys

from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BP = os.path.join(ROOT, "packs", "JJK_BP")
RP = os.path.join(ROOT, "packs", "JJK_RP")


def jar_asset(jar: str, *parts: str) -> str:
    return os.path.join(jar, "assets", "jujutsukaisen", *parts)


def make_icon(jar: str, out: str) -> None:
    """Pack icon: the Six Eyes sprite upscaled on a dark cursed-energy glow."""
    size = 256
    icon = Image.new("RGBA", (size, size), (9, 12, 20, 255))
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((28, 28, size - 28, size - 28), fill=(40, 170, 220, 150))
    icon.alpha_composite(glow.filter(ImageFilter.GaussianBlur(26)))
    eye = Image.open(jar_asset(jar, "textures", "item", "six_eyes.png")).convert("RGBA")
    eye = eye.resize((192, 192), Image.NEAREST)
    icon.alpha_composite(eye, (32, 32))
    icon.save(out)


def step_icons(jar: str) -> None:
    for pack in (BP, RP):
        make_icon(jar, os.path.join(pack, "pack_icon.png"))
    print("[assets] pack icons")


GOJO = ("characters", "gojo")
FX = GOJO + ("photon", "photon")

# name -> (source path parts, max size, grid) ; grid only documents flipbooks
FX_TEXTURES = {
    "sparkle_sheet": (FX + ("1.png",), 256, (4, 4)),
    "circuit_ring": (FX + ("200.png",), 256, None),
    "white_ring": (FX + ("4.png",), 256, None),
    "purple_sphere": (FX + ("back.png",), 256, None),
    "blue_fire_sheet": (FX + ("blue_max_fire.png",), 512, (8, 8)),
    "blue_water_sheet": (FX + ("blue_max_water.png",), 256, (4, 4)),
    "prismatic_flare": (FX + ("centered_prismatic_flare.png",), 256, None),
    "purple_core": (FX + ("core.png",), 256, None),
    "flare": (FX + ("flare.png",), 128, None),
    "electric_sheet": (FX + ("flipelc.png",), 256, (4, 4)),
    "red_shockwave": (FX + ("gojo_red_shockwave.png",), 256, None),
    "red_shockwave_add": (FX + ("gojo_red_shockwave_additive.png",), 256, None),
    "purple_ring": (FX + ("light.png",), 256, None),
    "red_sheet": (FX + ("max_red.png",), 512, (8, 8)),
    "star_flare": (FX + ("max_red2.png",), 128, None),
    "lens_star": (FX + ("max_red3.png",), 128, None),
    "moon": (FX + ("moon.png",), 256, None),
    "burst_rays": (FX + ("nuke1.png",), 128, None),
    "shards": (FX + ("nuke2.png",), 128, None),
    "swirl": (FX + ("nuke4.png",), 128, None),
    "nuke_sheet": (FX + ("nuke5.png",), 512, (8, 8)),
    "lens_flare": (FX + ("prismatic_lens_flare.png",), 256, None),
    "violet_ring": (FX + ("ring.png",), 256, None),
    "soft_circle": (FX + ("soft_edge_white_circle.png",), 128, None),
    "corona": (GOJO + ("photon", "plasma_irregular_v4", "textures", "leader_corona.png"), 128, None),
    "shock_noise": (GOJO + ("photon", "plasma_power_v3", "textures", "shock_outer_clean.png"), 256, None),
}

ICONS = {
    "infinity": "skill_1.png",
    "blue": "skill_2.png",
    "barrage": "skill_3.png",
    "red": "skill_4.png",
    "purple": "skill_5.png",
    "awakening": "skill_6.png",
    "void": "skill_6_awakened.png",
    "max_blue": "awk_skill_2.png",
    "max_red": "awk_skill_4.png",
    "awakened_purple": "awk_skill_5.png",
}

HUD = ["hud_base", "energy_track", "energy_fill_gradient", "slot_backing_strip", "skill_slot",
       "skill_highlight", "slot_backing", "reticle_corner_invert", "energy_chain_overlay"]
MENU = ["power_backdrop", "ritual_frame", "ritual_panel_surface", "ritual_tab_active", "ritual_tab_idle",
        "ritual_button", "ritual_title_sweep", "ritual_divider", "nav_settings", "nav_stats"]


def save_scaled(src: str, dst: str, max_size: int, nearest: bool = False) -> None:
    im = Image.open(src).convert("RGBA")
    if max(im.size) > max_size:
        ratio = max_size / max(im.size)
        size = (max(1, round(im.size[0] * ratio)), max(1, round(im.size[1] * ratio)))
        im = im.resize(size, Image.NEAREST if nearest else Image.LANCZOS)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    im.save(dst, optimize=True)


def radial(size: int, fn) -> Image.Image:
    im = Image.new("RGBA", (size, size))
    px = im.load()
    c = (size - 1) / 2
    for y in range(size):
        for x in range(size):
            d = math.hypot(x - c, y - c) / c
            px[x, y] = fn(d, math.atan2(y - c, x - c))
    return im


def generated_fx(out: str) -> None:
    """Basic particle shapes Photon provided built-in (soft dot, glow, spark, ring, streak)."""
    def soft(d, _a):
        a = max(0.0, 1 - d) ** 2
        return (255, 255, 255, int(255 * a))

    def glow(d, _a):
        a = math.exp(-((d * 2.6) ** 2))
        return (255, 255, 255, int(255 * a))

    def ring(d, _a):
        a = math.exp(-(((d - 0.78) / 0.09) ** 2))
        return (255, 255, 255, int(255 * a))

    def spark(d, ang):
        rays = abs(math.cos(ang * 2)) ** 24
        a = max(math.exp(-((d * 5) ** 2)), rays * max(0.0, 1 - d) ** 1.5)
        return (255, 255, 255, int(255 * min(1.0, a)))

    radial(64, soft).save(os.path.join(out, "dot.png"))
    radial(64, glow).save(os.path.join(out, "glow.png"))
    radial(128, ring).save(os.path.join(out, "thin_ring.png"))
    radial(64, spark).save(os.path.join(out, "spark.png"))
    streak = Image.new("RGBA", (16, 64))
    px = streak.load()
    for y in range(64):
        for x in range(16):
            v = math.exp(-(((x - 7.5) / 3.2) ** 2)) * math.sin(math.pi * y / 63) ** 0.6
            px[x, y] = (255, 255, 255, int(255 * v))
    streak.save(os.path.join(out, "streak.png"))


def cooldown_frames(out: str) -> None:
    """16 clockwise sweep overlays (0 = ready ... 15 = full cooldown) for HUD slots."""
    size = 32
    for i in range(16):
        frac = i / 15
        im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        if frac > 0:
            mask = Image.new("L", (size * 4, size * 4), 0)
            ImageDraw.Draw(mask).pieslice((-size, -size, size * 5, size * 5), -90, -90 + 360 * frac, fill=150)
            mask = mask.resize((size, size), Image.LANCZOS)
            im.putalpha(mask)
        im.save(os.path.join(out, f"cd_{i:x}.png"))


def pixel_icon(rows: list[str], palette: dict[str, tuple]) -> Image.Image:
    im = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    px = im.load()
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch in palette:
                px[x, y] = palette[ch]
    return im.resize((32, 32), Image.NEAREST)


def utility_icons(out: str) -> None:
    pal = {"a": (120, 235, 255, 255), "b": (40, 150, 210, 255), "c": (15, 60, 110, 255),
           "g": (140, 255, 190, 255), "h": (40, 190, 120, 255), "k": (20, 90, 60, 255)}
    dodge = [
        "................",
        "................",
        "...c......c.....",
        "...bc.....bc....",
        "...abc....abc...",
        "....abc....abc..",
        ".....abc....abc.",
        "......aab....aab",
        "......aab....aab",
        ".....abc....abc.",
        "....abc....abc..",
        "...abc....abc...",
        "...bc.....bc....",
        "...c......c.....",
        "................",
        "................",
    ]
    rct = [
        "................",
        "...kk.....kk....",
        "..khhk...khhk...",
        ".khgghk.khgghk..",
        ".hgggghkhgggghk.",
        ".hggaggghggaggh.",
        ".hgaaaggggaaagh.",
        ".kgaaaaggaaaagk.",
        "..hgaaaaaaaaghk.",
        "...hgaaaaaaghk..",
        "....hgaaaaghk...",
        ".....hgaaghk....",
        "......hgghk.....",
        ".......hhk......",
        "........k.......",
        "................",
    ]
    pixel_icon(dodge, pal).save(os.path.join(out, "dodge.png"))
    pixel_icon(rct, pal).save(os.path.join(out, "rct.png"))


def step_textures(jar: str) -> None:
    tex = os.path.join(RP, "textures", "jjk")
    icons = os.path.join(tex, "icons")
    os.makedirs(icons, exist_ok=True)
    src_icons = jar_asset(jar, *GOJO, "textures", "gui", "combat", "icons", "limitless")
    for name, file in ICONS.items():
        shutil.copyfile(os.path.join(src_icons, file), os.path.join(icons, name + ".png"))
    shutil.copyfile(jar_asset(jar, "textures", "gui", "combat", "icons", "none", "skill_1.png"), os.path.join(icons, "none.png"))
    utility_icons(icons)

    hud = os.path.join(tex, "hud")
    os.makedirs(hud, exist_ok=True)
    for name in HUD:
        shutil.copyfile(jar_asset(jar, "textures", "gui", "combat", name + ".png"), os.path.join(hud, name + ".png"))
    cooldown_frames(hud)

    ui = os.path.join(tex, "ui")
    os.makedirs(ui, exist_ok=True)
    for name in MENU:
        shutil.copyfile(jar_asset(jar, "textures", "gui", "menu", name + ".png"), os.path.join(ui, name + ".png"))

    cards = os.path.join(tex, "cards")
    save_scaled(jar_asset(jar, *GOJO, "textures", "gui", "technique_cards", "limitless.png"), os.path.join(cards, "limitless.png"), 384)
    save_scaled(jar_asset(jar, "textures", "gui", "technique_cards", "card_back.png"), os.path.join(cards, "card_back.png"), 384)
    save_scaled(jar_asset(jar, "textures", "gui", "technique_cards", "cursed_energy_burn.png"), os.path.join(cards, "burn_sheet.png"), 768)

    dom = os.path.join(tex, "domain")
    save_scaled(jar_asset(jar, *GOJO, "textures", "gui", "domain", "unlimited_void.png"), os.path.join(dom, "unlimited_void.png"), 640)
    save_scaled(jar_asset(jar, *GOJO, "textures", "gojo", "domain", "information_overload.png"), os.path.join(dom, "overload_sheet.png"), 256, nearest=True)

    fx = os.path.join(tex, "fx")
    os.makedirs(fx, exist_ok=True)
    for name, (parts, size, _grid) in FX_TEXTURES.items():
        save_scaled(jar_asset(jar, *parts), os.path.join(fx, name + ".png"), size)
    generated_fx(fx)

    items = os.path.join(tex, "items")
    os.makedirs(items, exist_ok=True)
    shutil.copyfile(jar_asset(jar, "textures", "item", "six_eyes.png"), os.path.join(items, "six_eyes.png"))
    shutil.copyfile(os.path.join(src_icons, "skill_1.png"), os.path.join(items, "technique.png"))
    item_texture = {
        "resource_pack_name": "jjk",
        "texture_name": "atlas.items",
        "texture_data": {
            "jjk_six_eyes": {"textures": "textures/jjk/items/six_eyes"},
            "jjk_technique": {"textures": "textures/jjk/items/technique"},
        },
    }
    with open(os.path.join(RP, "textures", "item_texture.json"), "w", encoding="utf-8") as f:
        json.dump(item_texture, f, indent=2)
    print("[assets] textures")


# Java GojoSound gain/inner/outer ranges; default (0.72, 8, 24)
SOUNDS = {
    # id suffix: (file under characters/gojo/sounds or sounds/, channel, gain, inner, outer, stream)
    "gojo.nuke_purple.voice": ("nuke_purple/nuke_start_voice", "voice", 0.72, 8, 24, False),
    "gojo.nuke_purple.sfx": ("nuke_purple/nuke_sfx", "sfx", 0.43, 12, 48, True),
    "gojo.nuke_purple.music": ("nuke_purple/nuke_music", "music", 0.62, 8, 24, True),
    "gojo.max_blue.voice": ("maximum_blue/blue_voice", "voice", 0.72, 8, 24, False),
    "gojo.max_blue.start": ("maximum_blue/blue_start", "sfx", 0.65, 10, 24, False),
    "gojo.hollow_purple.start_voice": ("hollow_purple/hollow_start_voice", "voice", 0.72, 8, 24, False),
    "gojo.hollow_purple.fire_voice": ("hollow_purple/fire_voice", "voice", 0.72, 8, 24, False),
    "gojo.hollow_purple.fire": ("hollow_purple/fire", "sfx", 0.78, 5.3, 30, False),
    "gojo.unlimited_void.start": ("unlimited_void/void_start", "sfx", 0.62, 5, 24, False),
    "gojo.unlimited_void.voice": ("unlimited_void/void_start_voice", "voice", 0.72, 8, 24, False),
    "gojo.awakening.voice": ("awakening/transform", "voice", 0.72, 8, 24, False),
    "gojo.self_purple.sparking": ("self_purple/keep_sparking", "sfx", 0.3, 2, 10, False),
    "gojo.self_purple.explosion": ("self_purple/explosion", "sfx", 0.95, 24, 55, False),
    "gojo.blue.pull": ("blue/pull", "sfx", 0.55, 2, 16, False),
    "gojo.red.start": ("red/burst", "sfx", 0.68, 5, 19, False),
    "gojo.infinity.deflect": ("infinity/deflect", "sfx", 0.48, 2, 13, False),
    "gojo.infinity.toggle": ("infinity/toggle", "sfx", 0.72, 8, 24, False),
    "gojo.barrage.grab": ("barrage/grab", "sfx", 0.55, 2, 11, False),
    "gojo.max_red.voice": ("maximum_red/red_voice", "voice", 0.72, 8, 24, False),
    "gojo.max_red.charge": ("maximum_red/charge", "sfx", 0.34, 2.36, 15, False),
    "gojo.max_red.fire": ("maximum_red/fire", "sfx", 0.72, 8, 24, False),
}
UI_SOUNDS = ["card_drop", "card_land", "card_reveal", "card_hover", "card_select", "card_shatter"]
CATEGORY = {"voice": "player", "sfx": "neutral", "music": "music", "ui": "ui"}


def step_sounds(jar: str) -> None:
    defs = {}
    base = os.path.join(RP, "sounds", "jjk")
    for sid, (file, channel, gain, inner, outer, stream) in SOUNDS.items():
        src = jar_asset(jar, *GOJO, "sounds", *file.split("/")) + ".ogg"
        rel = "sounds/jjk/gojo/" + file
        os.makedirs(os.path.dirname(os.path.join(RP, rel)), exist_ok=True)
        shutil.copyfile(src, os.path.join(RP, rel + ".ogg"))
        entry = {"name": rel, "volume": gain, "load_on_low_memory": True}
        if stream:
            entry["stream"] = True
        defs["jjk." + sid] = {
            "category": CATEGORY[channel],
            "min_distance": float(inner),
            "max_distance": float(outer),
            "sounds": [entry],
        }
    for name in UI_SOUNDS:
        rel = "sounds/jjk/ui/" + name
        os.makedirs(os.path.join(base, "ui"), exist_ok=True)
        shutil.copyfile(jar_asset(jar, "sounds", "ui", name + ".ogg"), os.path.join(RP, rel + ".ogg"))
        defs["jjk.ui." + name] = {"category": "ui", "sounds": [{"name": rel, "volume": 1.0, "load_on_low_memory": True}]}
    out = {"format_version": "1.20.20", "sound_definitions": defs}
    with open(os.path.join(RP, "sounds", "sound_definitions.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2)
    print(f"[assets] sounds ({len(defs)})")


HEADER_BOX = (70, 35, 442, 92)  # crest + energy bar of the Java 512x171 HUD canvas
FILL_BOX = (128, 74, 387, 89)  # inner hexagonal energy fill


def step_hud(jar: str) -> None:
    """Combat HUD pieces for Bedrock: header (frame + track), fill strip, small bars, trial meter."""
    src = jar_asset(jar, "textures", "gui", "combat")
    hud = os.path.join(RP, "textures", "jjk", "hud")
    os.makedirs(hud, exist_ok=True)
    base = Image.open(os.path.join(src, "hud_base.png")).convert("RGBA").crop(HEADER_BOX)
    # The Java frame continues into the 6-slot box below; fade its bottom rows out.
    px = base.load()
    w, h = base.size
    for y in range(h - 4, h):
        for x in range(w):
            r, g, b, a = px[x, y]
            px[x, y] = (r, g, b, int(a * (h - y) / 5))
    base.save(os.path.join(hud, "header_frame.png"))
    Image.open(os.path.join(src, "energy_track.png")).convert("RGBA").crop(HEADER_BOX).save(os.path.join(hud, "header_track.png"))
    fill = Image.open(os.path.join(src, "energy_fill_gradient.png")).convert("RGBA").crop(FILL_BOX)
    fill.resize((256, 16), Image.LANCZOS).save(os.path.join(hud, "energy_fill.png"))

    def bar(name, size, top, bottom):
        im = Image.new("RGBA", size)
        d = ImageDraw.Draw(im)
        for x in range(size[0]):
            t = x / max(1, size[0] - 1)
            col = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(4))
            d.line((x, 0, x, size[1] - 1), fill=col)
        im.save(os.path.join(hud, name))

    bar("awakening_fill.png", (128, 4), (150, 60, 240, 255), (240, 110, 200, 255))
    bar("hold_fill.png", (64, 4), (80, 200, 255, 255), (220, 250, 255, 255))
    Image.new("RGBA", (8, 8), (0, 0, 0, 150)).save(os.path.join(hud, "dim.png"))
    Image.new("RGBA", (8, 8), (6, 14, 18, 235)).save(os.path.join(hud, "slot_cover.png"))
    # Reversal trial meter: 42 ticks drawn 4 px each; green windows per pulse.
    windows = [(12, 22), (22, 31), (16, 24)]
    meter = Image.new("RGBA", (168, 8), (12, 20, 26, 220))
    ImageDraw.Draw(meter).rectangle((0, 0, 167, 7), outline=(90, 160, 180, 255))
    meter.save(os.path.join(hud, "trial_meter.png"))
    for i, (a, b) in enumerate(windows):
        zone = Image.new("RGBA", (168, 8))
        ImageDraw.Draw(zone).rectangle((a * 4, 1, b * 4, 6), fill=(80, 230, 120, 200))
        zone.save(os.path.join(hud, f"trial_zone_{i}.png"))
    marker = Image.new("RGBA", (2, 12), (255, 255, 255, 255))
    marker.save(os.path.join(hud, "trial_marker.png"))
    for name, color in (("dot_hit", (90, 240, 130, 255)), ("dot_miss", (230, 80, 80, 255)), ("dot_wait", (120, 140, 150, 255))):
        dot = Image.new("RGBA", (6, 6))
        ImageDraw.Draw(dot).ellipse((0, 0, 5, 5), fill=color)
        dot.save(os.path.join(hud, name + ".png"))
    print("[assets] hud")


STEPS = {"icons": step_icons, "textures": step_textures, "sounds": step_sounds, "hud": step_hud}


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print(__doc__)
        return 2
    jar = argv[1]
    for name in argv[2:] or list(STEPS):
        STEPS[name](jar)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
