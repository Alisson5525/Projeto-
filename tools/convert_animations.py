"""Converts the Java mod's Player Animation Library (GeckoLib/Blockbench format)
animations into Bedrock player animations.

Usage: python3 -I tools/convert_animations.py <extracted_jar_dir> [out.json]

Mapping (pivots from PlayerAnimationLibrary HumanoidAnimationController):
  body  (whole player, pivot 0,12,0) -> root   (pivot 0,0,0) + hip-pivot compensation
  torso (pivot 0,24,0)               -> body   (pivot 0,24,0)
  head/right_arm/left_arm/right_leg/left_leg -> head/rightArm/leftArm/rightLeg/leftLeg
Keyframe values are already in Bedrock/Blockbench conventions. Bedrock only
interpolates linear/catmullrom/step, so GeckoLib easings are baked at 30 Hz.
"""
import json
import math
import os
import sys

BONE_MAP = {
    "body": "root",
    "torso": "body",
    "head": "head",
    "right_arm": "rightArm",
    "left_arm": "leftArm",
    "right_leg": "rightLeg",
    "left_leg": "leftLeg",
}
HIP = 12.0
BAKE_HZ = 30
NATIVE = {None, "linear", "catmullrom", "step"}


def ease(name, t, args):
    """GeckoLib EasingType (easeIn* variants used by the mod, plus Out/InOut)."""
    t = min(1.0, max(0.0, t))
    arg = args[0] if args else None

    def base(kind):
        if kind == "sine":
            return lambda x: 1 - math.cos(x * math.pi / 2)
        if kind == "quad":
            return lambda x: x * x
        if kind == "cubic":
            return lambda x: x ** 3
        if kind == "quart":
            return lambda x: x ** 4
        if kind == "quint":
            return lambda x: x ** 5
        if kind == "expo":
            return lambda x: 0.0 if x == 0 else 2 ** (10 * x - 10)
        if kind == "circ":
            return lambda x: 1 - math.sqrt(max(0.0, 1 - x * x))
        if kind == "back":
            n = 1.70158 if arg is None else arg * 1.70158
            return lambda x: x * x * ((n + 1) * x - n)
        if kind == "elastic":
            n = 1.0 if arg is None else arg
            return lambda x: 1 - math.cos(x * math.pi / 2) ** 3 * math.cos(x * n * math.pi)
        if kind == "bounce":
            def b(x):
                return 1 - bounce_out(1 - x)
            return b
        return lambda x: x

    if not name or name in ("linear",):
        return t
    if name == "step":
        return 0.0 if t < 1 else 1.0
    for prefix, mode in (("easeInOut", "inout"), ("easeIn", "in"), ("easeOut", "out")):
        if name.startswith(prefix):
            f = base(name[len(prefix):].lower())
            if mode == "in":
                return f(t)
            if mode == "out":
                return 1 - f(1 - t)
            return f(t * 2) / 2 if t < 0.5 else 1 - f((1 - t) * 2) / 2
    return t


def bounce_out(x):
    n1, d1 = 7.5625, 2.75
    if x < 1 / d1:
        return n1 * x * x
    if x < 2 / d1:
        x -= 1.5 / d1
        return n1 * x * x + 0.75
    if x < 2.5 / d1:
        x -= 2.25 / d1
        return n1 * x * x + 0.9375
    x -= 2.625 / d1
    return n1 * x * x + 0.984375


def as_vec(value):
    """Keyframe vectors appear as [x,y,z], a scalar, or {"vector": [x,y,z]}."""
    if value is None:
        return None
    if isinstance(value, dict):
        return as_vec(value.get("vector"))
    if isinstance(value, list):
        return value
    return [value, value, value]


class Key:
    def __init__(self, time, raw):
        self.time = time
        self.easing = None
        self.args = None
        self.lerp = None
        if isinstance(raw, dict):
            self.easing = raw.get("easing")
            self.args = raw.get("easingArgs")
            self.lerp = raw.get("lerp_mode")
            vec = as_vec(raw.get("vector"))
            pre = as_vec(raw.get("pre"))
            post = as_vec(raw.get("post"))
            self.pre = list(pre or vec or post)
            self.post = list(post or vec or pre)
        else:
            vals = raw if isinstance(raw, list) else [raw, raw, raw]
            self.pre = list(vals)
            self.post = list(vals)

    @property
    def custom_easing(self):
        return self.easing not in NATIVE


def parse_channel(channel):
    if isinstance(channel, (list, int, float)):
        return [Key(0.0, channel)]
    if "vector" in channel or "pre" in channel or "post" in channel:
        return [Key(0.0, channel)]
    keys = [Key(float(t), v) for t, v in channel.items()]
    keys.sort(key=lambda k: k.time)
    return keys


def catmull(p0, p1, p2, p3, u):
    u2 = u * u
    u3 = u2 * u
    return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3)


def sample(keys, t):
    """Value of a channel at time t (GeckoLib semantics: a key's easing drives the segment ending at it)."""
    if t <= keys[0].time:
        return list(keys[0].pre if t < keys[0].time else keys[0].post)
    if t >= keys[-1].time:
        return list(keys[-1].post)
    i = 0
    while keys[i + 1].time < t:
        i += 1
    k0, k1 = keys[i], keys[i + 1]
    span = k1.time - k0.time
    u = 0.0 if span <= 0 else (t - k0.time) / span
    a, b = k0.post, k1.pre
    if k1.custom_easing:
        e = ease(k1.easing, u, k1.args)
        return [a[j] + (b[j] - a[j]) * e for j in range(3)]
    if k0.lerp == "catmullrom" or k1.lerp == "catmullrom":
        p0 = keys[i - 1].post if i > 0 else a
        p3 = keys[i + 2].pre if i + 2 < len(keys) else b
        return [catmull(p0[j], a[j], b[j], p3[j], u) for j in range(3)]
    return [a[j] + (b[j] - a[j]) * u for j in range(3)]


def fmt_time(t):
    s = f"{t:.4f}".rstrip("0")
    return s + "0" if s.endswith(".") else s


def round_vec(v):
    return [round(x, 4) for x in v]


def sample_times(keys, length):
    times = {round(k.time, 4) for k in keys}
    end = max(length, keys[-1].time)
    n = max(1, int(math.ceil(end * BAKE_HZ)))
    times.update(round(i / BAKE_HZ, 4) for i in range(n + 1))
    return sorted(t for t in times if t <= end + 1e-9)


def native_channel(keys):
    out = {}
    for k in keys:
        if k.pre != k.post:
            entry = {"pre": round_vec(k.pre), "post": round_vec(k.post)}
            if k.lerp:
                entry["lerp_mode"] = k.lerp
        elif k.lerp and k.lerp != "linear":
            entry = {"post": round_vec(k.post), "lerp_mode": k.lerp}
        else:
            entry = round_vec(k.post)
        out[fmt_time(k.time)] = entry
    return out


def baked_channel(keys, length, transform=None):
    out = {}
    for t in sample_times(keys, length):
        v = sample(keys, t)
        out[fmt_time(t)] = round_vec(transform(t, v) if transform else v)
    return out


def convert_bone(name, bone, length):
    out = {}
    rot = parse_channel(bone["rotation"]) if "rotation" in bone else None
    pos = parse_channel(bone["position"]) if "position" in bone else None
    if name == "body":
        # Root pivots at the feet; the Java body bone pivots at the hip (0,12,0).
        rot_keys = rot or [Key(0.0, [0, 0, 0])]
        pos_keys = pos or [Key(0.0, [0, 0, 0])]
        if rot:
            out["rotation"] = baked_channel(rot_keys, length) if any(k.custom_easing for k in rot_keys) else native_channel(rot_keys)

        def compensate(t, p):
            # Frame (Blockbench/PAL): right=+X, front=-Z; file position x is mirrored.
            r = euler_to_matrix(*sample(rot_keys, t))
            rh = _apply(r, [0.0, HIP, 0.0])
            c = [-rh[0], HIP - rh[1], -rh[2]]
            return [p[0] - c[0], p[1] + c[1], p[2] + c[2]]

        merged = sorted({k.time for k in rot_keys} | {k.time for k in pos_keys})
        merged_keys = [Key(t, [0, 0, 0]) for t in merged]
        out["position"] = baked_channel(merged_keys, length, lambda t, _v: compensate(t, sample(pos_keys, t)))
    else:
        for channel, keys in (("rotation", rot), ("position", pos)):
            if not keys:
                continue
            out[channel] = baked_channel(keys, length) if any(k.custom_easing for k in keys) else native_channel(keys)
    if "scale" in bone:
        out["scale"] = bone["scale"]
    return out


def _rx(a):
    return [[1, 0, 0], [0, math.cos(a), -math.sin(a)], [0, math.sin(a), math.cos(a)]]


def _ry(a):
    return [[math.cos(a), 0, math.sin(a)], [0, 1, 0], [-math.sin(a), 0, math.cos(a)]]


def _rz(a):
    return [[math.cos(a), -math.sin(a), 0], [math.sin(a), math.cos(a), 0], [0, 0, 1]]


def _mul(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(3)) for j in range(3)] for i in range(3)]


def _apply(m, v):
    return [sum(m[i][k] * v[k] for k in range(3)) for i in range(3)]


def _transpose(m):
    return [[m[j][i] for j in range(3)] for i in range(3)]


def euler_to_matrix(rx, ry, rz):
    """Bedrock bone rotation (degrees): X then Y then Z; +X tips the top forward (front = -Z)."""
    return _mul(_rz(math.radians(rz)), _mul(_ry(math.radians(-ry)), _rx(math.radians(-rx))))


def matrix_to_euler(m):
    b = math.asin(max(-1.0, min(1.0, -m[2][0])))
    a = math.atan2(m[2][1], m[2][2])
    c = math.atan2(m[1][0], m[0][0])
    return [-math.degrees(a), -math.degrees(b), math.degrees(c)]


# Pivots in the Blockbench/PAL frame (right=+X, front=-Z; Bedrock geometry X is mirrored).
BODY_PIVOT = [0.0, 24.0, 0.0]
TORSO_CHILDREN = {"head": ("head", [0.0, 24.0, 0.0]), "right_arm": ("rightArm", [5.0, 22.0, 0.0]), "left_arm": ("leftArm", [-5.0, 22.0, 0.0])}


def to_frame(p):
    """File position -> frame vector (file x is mirrored)."""
    return [-p[0], p[1], p[2]]
ZERO = [Key(0.0, [0, 0, 0])]


def detach_from_torso(anim, length, bones):
    """The Java library moves head/arms independently of the torso; in Bedrock they are
    children of `body`, so bake local transforms that cancel the inherited torso motion."""
    torso = anim.get("bones", {}).get("torso")
    if not torso:
        return
    t_rot = parse_channel(torso["rotation"]) if "rotation" in torso else ZERO
    t_pos = parse_channel(torso["position"]) if "position" in torso else ZERO
    for src, (dst, pivot) in TORSO_CHILDREN.items():
        bone = anim["bones"].get(src, {})
        c_rot = parse_channel(bone["rotation"]) if "rotation" in bone else ZERO
        c_pos = parse_channel(bone["position"]) if "position" in bone else ZERO
        times = sample_times(t_rot + t_pos + c_rot + c_pos, length)
        rot_out, pos_out = {}, {}
        for t in times:
            rb = euler_to_matrix(*sample(t_rot, t))
            rc = euler_to_matrix(*sample(c_rot, t))
            inv = _transpose(rb)
            local = matrix_to_euler(_mul(inv, rc))
            pb = to_frame(sample(t_pos, t))
            pc = to_frame(sample(c_pos, t))
            d = [pivot[i] + pc[i] - BODY_PIVOT[i] - pb[i] for i in range(3)]
            back = _apply(inv, d)
            rot_out[fmt_time(t)] = round_vec(local)
            pos_out[fmt_time(t)] = round_vec(to_frame([back[i] - pivot[i] + BODY_PIVOT[i] for i in range(3)]))
        entry = {"rotation": rot_out, "position": pos_out}
        if "scale" in bone:
            entry["scale"] = bone["scale"]
        bones[dst] = entry


# Bedrock-side loop overrides: poses the scripts hold until another animation plays.
LOOP_OVERRIDES = {"blocking": True}


def convert_animation(anim, name=None):
    length = float(anim.get("animation_length", 0))
    out = {"animation_length": length, "override_previous_animation": True}
    if "loop" in anim:
        out["loop"] = anim["loop"]
    if name in LOOP_OVERRIDES:
        out["loop"] = LOOP_OVERRIDES[name]
    bones = {}
    for name, bone in anim.get("bones", {}).items():
        target = BONE_MAP.get(name)
        if target:
            bones[target] = convert_bone(name, bone, length)
    detach_from_torso(anim, length, bones)
    out["bones"] = bones
    return out


SOURCES = {
    "assets/jujutsukaisen/player_animations": [
        "base_attack.animation.json",
        "base_block.animation.json",
        "roll.animation.json",
        "run.animation.json",
    ],
    "assets/jujutsukaisen/characters/gojo/animations": [
        "barrage.animation.json",
        "gojo_awk.json",
        "gojo_base_blue.animation.json",
        "gojo_base_red.animation.json",
        "gojo_domain_expansion.json",
        "gojo_max_blue.animation.json",
        "gojo_real_nuke.animation.json",
        "hollow_purple.json",
        "max_red_ready.animation.json",
        "max_red_shoot.animation.json",
    ],
}


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 2
    jar = argv[1]
    out_path = argv[2] if len(argv) > 2 else os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "packs", "JJK_RP", "animations", "jjk_player.animation.json"
    )
    animations = {}
    for folder, files in SOURCES.items():
        for file in files:
            with open(os.path.join(jar, folder, file), encoding="utf-8") as f:
                data = json.load(f)
            for anim_name, anim in data["animations"].items():
                animations[f"animation.jjk.{anim_name}"] = convert_animation(anim, anim_name)
    animations["animation.jjk.reset"] = {"animation_length": 0.05, "bones": {}}
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"format_version": "1.8.0", "animations": animations}, f, separators=(",", ":"))
    print(f"[anim] {len(animations)} animations -> {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
