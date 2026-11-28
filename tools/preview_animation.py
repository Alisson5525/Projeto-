"""Renders side-view stick previews of converted Bedrock player animations.

Usage: python3 -I tools/preview_animation.py <animation.json> <out.png> <name> [<name> ...]
Model convention used (Bedrock runtime): front = -Z, +X rotation tips a bone's
top forward, +position.z moves backward. Only used for visual sanity checks.
"""
import json
import math
import os
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import convert_animations as ca  # noqa: E402

BONES = {
    # name: (parent, pivot, box_min, box_size, color)
    "root": (None, (0, 0, 0), None, None, None),
    "waist": ("root", (0, 12, 0), None, None, None),
    "body": ("waist", (0, 24, 0), (-4, 12, -2), (8, 12, 4), (60, 120, 200)),
    "head": ("body", (0, 24, 0), (-4, 24, -4), (8, 8, 8), (230, 190, 150)),
    # Blockbench/PAL frame: right = +X, front = -Z (Bedrock geometry X mirrored)
    "rightArm": ("body", (5, 22, 0), (4, 12, -2), (4, 12, 4), (230, 160, 120)),
    "leftArm": ("body", (-5, 22, 0), (-8, 12, -2), (4, 12, 4), (200, 130, 100)),
    "rightLeg": ("root", (1.9, 12, 0), (-0.1, 0, -2), (4, 12, 4), (40, 60, 140)),
    "leftLeg": ("root", (-1.9, 12, 0), (-3.9, 0, -2), (4, 12, 4), (30, 45, 110)),
}


def rot_matrix(rx, ry, rz):
    return ca.euler_to_matrix(rx, ry, rz)


def mul(A, B):
    return [[sum(A[i][k] * B[k][j] for k in range(3)) for j in range(3)] for i in range(3)]


def apply(M, v):
    return [sum(M[i][k] * v[k] for k in range(3)) for i in range(3)]


def world_transforms(anim, t):
    cache = {}

    def get(name):
        if name in cache:
            return cache[name]
        parent, pivot, *_ = BONES[name]
        bone = anim["bones"].get(name, {})
        r = ca.sample(ca.parse_channel(bone["rotation"]), t) if "rotation" in bone else [0, 0, 0]
        p = ca.to_frame(ca.sample(ca.parse_channel(bone["position"]), t)) if "position" in bone else [0, 0, 0]
        R = rot_matrix(*r)

        def local(v):
            d = [v[i] - pivot[i] for i in range(3)]
            d = apply(R, d)
            return [d[0] + pivot[0] + p[0], d[1] + pivot[1] + p[1], d[2] + pivot[2] + p[2]]

        if parent:
            pf = get(parent)
            fn = lambda v: pf(local(v))  # noqa: E731
        else:
            fn = local
        cache[name] = fn
        return fn

    return {name: get(name) for name in BONES}


def draw_pose(draw, anim, t, ox, oy, scale):
    tf = world_transforms(anim, t)
    polys = []
    for name, (_parent, _pivot, bmin, size, color) in BONES.items():
        if not bmin:
            continue
        corners = []
        for dx in (0, size[0]):
            for dy in (0, size[1]):
                for dz in (0, size[2]):
                    corners.append(tf[name]([bmin[0] + dx, bmin[1] + dy, bmin[2] + dz]))
        pts = [(ox - c[2] * scale, oy - c[1] * scale) for c in corners]
        depth = sum(c[0] for c in corners) / 8
        polys.append((depth, hull(pts), color))
    for _d, pts, color in sorted(polys, key=lambda x: x[0]):
        draw.polygon(pts, fill=color, outline=(20, 20, 20))


def hull(points):
    pts = sorted(set(points))
    if len(pts) <= 2:
        return pts

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower, upper = [], []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


def main(argv):
    path, out, names = argv[1], argv[2], argv[3:]
    data = json.load(open(path, encoding="utf-8"))["animations"]
    frames = 8
    cell = 150
    img = Image.new("RGB", (cell * frames, cell * len(names)), (235, 235, 240))
    draw = ImageDraw.Draw(img)
    for row, name in enumerate(names):
        anim = data["animation.jjk." + name]
        length = anim["animation_length"]
        for i in range(frames):
            t = length * i / (frames - 1)
            ox, oy = cell * i + cell // 2, cell * row + cell - 25
            draw.line((cell * i, oy, cell * (i + 1), oy), fill=(150, 150, 150))
            draw_pose(draw, anim, t, ox, oy, 3)
            draw.text((cell * i + 4, cell * row + 4), f"{name} {t:.2f}s", fill=(0, 0, 0))
    img.save(out)
    print(out)


if __name__ == "__main__":
    main(sys.argv)
