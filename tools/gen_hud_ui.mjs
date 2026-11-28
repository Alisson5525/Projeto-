// Generates the combat HUD JSON UI (resource pack ui/) from the layout of
// src/core/hudCodec.ts. Run: node tools/gen_hud_ui.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const UI = join(root, "packs/JJK_RP/ui");

// Keep in sync with src/core/hudCodec.ts (checked by tests/tools/hudLayout.test.ts).
export const OFFSET = { visible: 7, awakened: 8, infinity: 9, energy: 10, states: 42, cooldowns: 50, awakening: 58, hold: 73, slotNumbers: 88, trial: 89 };
export const ENERGY_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef";
export const STEP_LETTERS = "ABCDEFGHIJKLMNO";

const S = "#hud_title_text_string";
const charAt = (k) => `('%.1s' * (${S} - ('%.${k}s' * ${S})))`;
const substr = (k, n) => `('%.${n}s' * (${S} - ('%.${k}s' * ${S})))`;
const contains = (k, n, letter) => `(not ((${substr(k, n)} - '${letter}') = ${substr(k, n)}))`;
const isChar = (k, c) => `(${charAt(k)} = '${c}')`;
const VISIBLE = isChar(OFFSET.visible, "1");

const title = { binding_name: S, binding_type: "global" };
const view = (expr, target = "#visible") => ({ binding_type: "view", source_property_name: expr, target_property_name: target });
const visibleWhen = (expr) => [title, view(expr)];

function img(texture, extra = {}) {
  return { type: "image", texture, ...extra };
}

// ---- header: frame + energy bar + awakening bar + infinity indicator -------
const HEADER_W = 186;
const HEADER_H = 28.5;
const FILL = { x: 29, y: 19.5, w: 129.5, h: 7.5 };

const energySegments = ENERGY_LETTERS.split("").map((letter, k) => ({
  [`seg_${k}`]: img("textures/jjk/hud/energy_fill", {
    size: [FILL.w / 32 + 0.05, FILL.h],
    offset: [(k * FILL.w) / 32, 0],
    anchor_from: "top_left",
    anchor_to: "top_left",
    uv: [k * 8, 0],
    uv_size: [8, 16],
    bindings: visibleWhen(contains(OFFSET.energy, 32, letter)),
  }),
}));

const awakeningSegments = STEP_LETTERS.split("").map((letter, k) => ({
  [`awk_${k}`]: img("textures/jjk/hud/awakening_fill", {
    size: [FILL.w / 15 + 0.05, 2],
    offset: [(k * FILL.w) / 15, 0],
    anchor_from: "top_left",
    anchor_to: "top_left",
    uv: [(k * 128) / 15, 0],
    uv_size: [128 / 15, 4],
    bindings: visibleWhen(contains(OFFSET.awakening, 15, letter)),
  }),
}));

const header = {
  type: "panel",
  size: [HEADER_W, HEADER_H + 4],
  anchor_from: "top_middle",
  anchor_to: "top_middle",
  offset: [0, 4],
  layer: 30,
  bindings: visibleWhen(VISIBLE),
  controls: [
    { track: img("textures/jjk/hud/header_track", { size: [HEADER_W, HEADER_H], anchor_from: "top_left", anchor_to: "top_left", layer: 1 }) },
    {
      fill: {
        type: "panel",
        size: [FILL.w, FILL.h],
        offset: [FILL.x, FILL.y],
        anchor_from: "top_left",
        anchor_to: "top_left",
        layer: 2,
        controls: energySegments,
      },
    },
    { frame: img("textures/jjk/hud/header_frame", { size: [HEADER_W, HEADER_H], anchor_from: "top_left", anchor_to: "top_left", layer: 3 }) },
    {
      awakening: {
        type: "panel",
        size: [FILL.w, 2],
        offset: [FILL.x, HEADER_H + 1],
        anchor_from: "top_left",
        anchor_to: "top_left",
        layer: 2,
        controls: awakeningSegments,
      },
    },
    {
      infinity: img("textures/jjk/icons/infinity", {
        size: [12, 12],
        offset: [FILL.x - 16, FILL.y - 3],
        anchor_from: "top_left",
        anchor_to: "top_left",
        layer: 4,
        bindings: visibleWhen(isChar(OFFSET.infinity, "1")),
      }),
    },
  ],
};

// ---- hold / charge bar under the crosshair --------------------------------
const holdSegments = STEP_LETTERS.split("").map((letter, k) => ({
  [`hold_${k}`]: img("textures/jjk/hud/hold_fill", {
    size: [64 / 15 + 0.05, 3],
    offset: [(k * 64) / 15, 0],
    anchor_from: "top_left",
    anchor_to: "top_left",
    uv: [(k * 64) / 15, 0],
    uv_size: [64 / 15, 4],
    bindings: visibleWhen(contains(OFFSET.hold, 15, letter)),
  }),
}));
const hold = {
  type: "panel",
  size: [64, 3],
  anchor_from: "center",
  anchor_to: "center",
  offset: [0, 14],
  layer: 30,
  bindings: visibleWhen(VISIBLE),
  controls: holdSegments,
};

// ---- reversal trial meter --------------------------------------------------
const trialActive = `((${isChar(OFFSET.trial, "r")}) or (${isChar(OFFSET.trial, "c")}))`;
const markers = Array.from({ length: 16 }, (_, k) => ({
  [`marker_${k}`]: img("textures/jjk/hud/trial_marker", {
    size: [2, 12],
    offset: [(k * 166) / 15, -2],
    anchor_from: "top_left",
    anchor_to: "top_left",
    layer: 4,
    bindings: visibleWhen(isChar(OFFSET.trial + 1, k.toString(16))),
  }),
}));
const zones = [0, 1, 2].map((i) => ({
  [`zone_${i}`]: img(`textures/jjk/hud/trial_zone_${i}`, { size: [168, 8], layer: 2, bindings: visibleWhen(isChar(OFFSET.trial + 2, String(i))) }),
}));
const dots = [0, 1, 2].flatMap((i) => {
  const masks = [0, 1, 2, 3, 4, 5, 6, 7].filter((m) => m & (1 << i));
  const hit = `(${masks.map((m) => isChar(OFFSET.trial + 3, String(m))).join(" or ")})`;
  const resolved = `(${[1, 2, 3].filter((a) => a > i).map((a) => isChar(OFFSET.trial + 2, String(a))).join(" or ")})`;
  const dot = (kind, cond, layer) => ({
    [`dot_${kind}_${i}`]: img(`textures/jjk/hud/dot_${kind}`, { size: [6, 6], offset: [-10 + i * 10, -12], layer, bindings: visibleWhen(cond) }),
  });
  return [dot("wait", `(not ${resolved})`, 3), dot("hit", `(${resolved} and ${hit})`, 4), dot("miss", `(${resolved} and (not ${hit}))`, 4)];
});
const trial = {
  type: "panel",
  size: [168, 8],
  anchor_from: "center",
  anchor_to: "center",
  offset: [0, 34],
  layer: 31,
  bindings: visibleWhen(trialActive),
  controls: [{ meter: img("textures/jjk/hud/trial_meter", { size: [168, 8], layer: 1 }) }, ...zones, ...markers, ...dots],
};

// ---- hotbar slot overlays (inserted into every hotbar grid item) ----------
const ICONS = [
  ["infinity", null],
  ["blue", "max_blue"],
  ["barrage", null],
  ["red", "max_red"],
  ["purple", "awakened_purple"],
  ["awakening", "void"],
  ["dodge", null],
  ["rct", null],
];
const LEVELS = ["", "", "6", "18", "32", "48", "", "15"];

function slotVariant(i) {
  const [normal, awakened] = ICONS[i];
  const state = OFFSET.states + i;
  const cd = OFFSET.cooldowns + i;
  const awk = isChar(OFFSET.awakened, "1");
  const icon = (name, cond) => img(`textures/jjk/icons/${name}`, { size: ["70%", "70%"], layer: 2, bindings: cond ? visibleWhen(cond) : [] });
  const controls = [
    { cover: img("textures/jjk/hud/slot_cover", { size: ["80%", "80%"], layer: 1 }) },
    { icon: icon(normal, awakened ? `(not ${awk})` : null) },
  ];
  if (awakened) controls.push({ icon_awakened: icon(awakened, awk) });
  controls.push(
    {
      dim: img("textures/jjk/hud/dim", {
        size: ["80%", "80%"],
        layer: 3,
        bindings: visibleWhen(`((${isChar(state, "0")}) or (${isChar(state, "r")}) or (${isChar(state, "v")}))`),
      }),
    },
    {
      level: {
        type: "label",
        text: LEVELS[i] || "-",
        color: [1, 0.85, 0.5],
        shadow: true,
        font_scale_factor: 0.6,
        layer: 4,
        bindings: visibleWhen(isChar(state, "0")),
      },
    },
    { need_rct: img("textures/jjk/icons/rct", { size: ["45%", "45%"], layer: 4, bindings: visibleWhen(isChar(state, "r")) }) },
    { need_red: img("textures/jjk/icons/red", { size: ["45%", "45%"], layer: 4, bindings: visibleWhen(isChar(state, "v")) }) },
    {
      cooldown: img("textures/jjk/hud/cd_0", {
        size: ["80%", "80%"],
        layer: 5,
        bindings: [title, view(`(not ${isChar(cd, "0")})`), view(`('textures/jjk/hud/cd_' + ${charAt(cd)})`, "#texture")],
      }),
    },
    { active: img("textures/jjk/hud/skill_highlight", { size: ["100%", "100%"], layer: 6, bindings: visibleWhen(isChar(state, "2")) }) },
    {
      number: {
        type: "label",
        text: String(i + 1),
        anchor_from: "top_left",
        anchor_to: "top_left",
        offset: [1, 0],
        font_scale_factor: 0.5,
        shadow: true,
        layer: 7,
        bindings: visibleWhen(isChar(OFFSET.slotNumbers, "1")),
      },
    },
  );
  return {
    type: "panel",
    size: ["100%", "100%"],
    layer: 20,
    bindings: [
      { binding_type: "collection_details", binding_collection_name: "hotbar_items" },
      title,
      view(`((#collection_index = ${i}) and ${VISIBLE})`),
    ],
    controls,
  };
}

const slotOverlay = {
  type: "panel",
  size: ["100%", "100%"],
  layer: 20,
  controls: Array.from({ length: 8 }, (_, i) => ({ [`slot_${i}`]: slotVariant(i) })),
};

// ---- files ----------------------------------------------------------------
const hudFile = {
  namespace: "jjk_hud",
  root: {
    type: "panel",
    size: ["100%", "100%"],
    layer: 30,
    controls: [{ "header@jjk_hud.header": {} }, { "hold@jjk_hud.hold": {} }, { "trial@jjk_hud.trial": {} }],
  },
  header,
  hold,
  trial,
  slot_overlay: slotOverlay,
};

const hideDataTitle = view(`(${S} = (${S} - 'jjkhud:'))`);
const insertOverlay = { array_name: "controls", operation: "insert_back", value: [{ "jjk_slot_overlay@jjk_hud.slot_overlay": {} }] };
const hudScreen = {
  namespace: "hud",
  hud_title_text: { bindings: [title, hideDataTitle] },
  root_panel: { modifications: [{ array_name: "controls", operation: "insert_back", value: [{ "jjk_hud@jjk_hud.root": {} }] }] },
  gui_hotbar_grid_item: { modifications: [insertOverlay] },
  gui_hotbar_grid_item_pocket: { modifications: [insertOverlay] },
};

export const files = { hudFile, hudScreen };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  mkdirSync(UI, { recursive: true });
  writeFileSync(join(UI, "jjk_hud.json"), JSON.stringify(hudFile));
  writeFileSync(join(UI, "hud_screen.json"), JSON.stringify(hudScreen, null, 1));
  writeFileSync(join(UI, "_ui_defs.json"), JSON.stringify({ ui_defs: ["ui/jjk_hud.json"] }, null, 2));
  console.log("[ui] jjk_hud.json, hud_screen.json, _ui_defs.json");
}
