# JJK Bedrock Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an installable `.mcaddon` (Behavior Pack + Resource Pack) that reproduces the Java mod "My Jujutsu Kaisen" (Limitless/Gojo) on Minecraft Bedrock, playable with touch controls on a weak phone.

**Architecture:** TypeScript game logic bundled by esbuild into one script module on the stable Script API. Pure rules (numbers, timelines, geometry, state machines, HUD encoding) live in `src/core` with no `@minecraft/*` imports and are unit-tested with vitest; `src/game` adapts them to the Bedrock API. The resource pack carries converted player animations, curated particle effects built from the mod's textures (downscaled), the mod's sounds, a JSON UI combat HUD and themed forms.

**Tech Stack:** TypeScript 5 (strict), esbuild, vitest, Node 22, Python 3.13 + Pillow (asset converters), `@minecraft/server` 2.10.0, `@minecraft/server-ui` 2.2.0.

**Spec:** `docs/analise/analise-mod-java.md` (every gameplay number) + the decisions below. The decompiled Java (`scratchpad/decomp`) is the tie-breaker for any value the spec omits.

## Global Constraints

- `min_engine_version` `[1, 26, 50]`; manifest dependencies exactly `@minecraft/server` `2.10.0` and `@minecraft/server-ui` `2.2.0`; no beta APIs, no experimental toggles.
- Do not override vanilla `player.json` / `player.entity.json` (compatibility with other add-ons).
- Namespace `jjk`. Player data in dynamic property `jjk:profile` (JSON, `v: 1`). World settings in world dynamic property `jjk:settings`.
- All gameplay values match the spec at 20 ticks/s. Timeline ticks come from the Java animation markers.
- Default performance profile `leve` (weak phone). Profiles: `leve`, `medio`, `alto` (alto = Java values).
- Terrain destruction world setting: `desligada` / `leve` / `completa`, default `leve`. Never remove unbreakable blocks (bedrock, barrier, command blocks, structure/jigsaw, portals, end portal frame, border/allow/deny, light blocks).
- Never move or delete player items, except: consuming Six Eyes, and swapping the technique item into hotbar slot 9 on entering combat.
- Player-facing text through lang keys in `texts/pt_BR.lang` (primary) and `texts/en_US.lang`.
- Commit after every task; push to `ccr-fe453a13-roruv0`.

## Controls (decided)

| Input | Outside combat | In combat mode |
|---|---|---|
| Technique item "Ilimitado", tap *use* | enter combat | — |
| Technique item, sneaking + *use* | open Menu Jujutsu | leave combat |
| Hotbar slots 1–6 (tap) | normal items | skills 1–6 (instant cast; selection snaps back to slot 9) |
| Hotbar slot 7 | normal | dodge toward joystick direction (neutral = back) |
| Hotbar slot 8 | normal | RCT heal on/off (1 pulse/s while on) |
| Attack / swing | vanilla | M1 combo (vanilla melee damage cancelled) |
| Hold *use* on technique item | — | guard (use_modifiers movement 0.55) |
| Second tap on the same skill slot | — | release variant: Blue self-pull/fly, Max Red fire, Max Blue cancel |
| Joystick forward/back while casting Max Blue | — | distance ±1 block per 5 ticks (2.5–24) |
| `/jjk:menu` | open menu | open menu |

Hold skills on touch: Purple fires automatically at 149 ticks; Max Red auto-fires after 200 ticks of charge.

## Review Focus

1. Player dies, logs out or changes dimension mid-cast → no stuck lock/teleport loop, camera, input permissions, HUD or invulnerability. Test `CastRegistry.interruptAll returns every cleanup` (Task 3).
2. Player leaves or the world closes while inside the domain → on next join they are returned to the saved origin. Test `DomainJournal round-trips and flags stale sessions` (Task 12).
3. The script's own snap-back to slot 9 must not cast a skill; a tap on the same slot within 4 ticks must not double-cast. Test `HotbarTrigger ignores self-induced changes and debounces` (Task 3).
4. Six Eyes rounding, no negative energy, regen paused by Infinity, awakened slot remap. Tests in Task 2.
5. Huge deletions (Self Purple r24, Nuke r64) never exceed the per-tick budget and skip unbreakables. Test `sphereRuns budgets by blocks per job step` (Task 4).

---

### Task 1: Tooling and pack skeleton

**Files:**
- Create: `package.json` (scripts `build`, `typecheck`, `test`, `validate`, `pack`), `tsconfig.json`, `vitest.config.ts`, `.gitignore`
- Create: `tools/build.mjs` (esbuild `src/main.ts` → `packs/JJK_BP/scripts/main.js`, ESM, externals `@minecraft/server`, `@minecraft/server-ui`)
- Create: `tools/validate-packs.mjs` (strict JSON parse of every pack file; manifest UUID uniqueness; references: item/entity textures, `item_texture.json`, sound files, animation names, particle ids, lang keys used by scripts — via `tools/refs.json` emitted by the build)
- Create: `tools/pack.mjs` (zip `packs/JJK_BP` + `packs/JJK_RP` → `dist/JJK_Ilimitado.mcaddon`)
- Create: `packs/JJK_BP/manifest.json`, `packs/JJK_RP/manifest.json`, `pack_icon.png` (from `six_eyes.png` upscaled), `texts/languages.json`, `texts/pt_BR.lang`, `texts/en_US.lang`
- Create: `src/main.ts` (logs `[JJK] loaded`)

- [ ] Step 1: `npm run build && npm run validate` → both exit 0; `packs/JJK_BP/scripts/main.js` exists.
- [ ] Step 2: `npm test` with `tests/smoke.test.ts` (`expect(1+1).toBe(2)`) → PASS.
- [ ] Step 3: Commit `build: add Bedrock pack skeleton and tooling`.

### Task 2: Core progression and profile

**Files:** Create `src/core/constants.ts`, `src/core/progression.ts`, `src/core/profile.ts`; Test `tests/core/progression.test.ts`, `tests/core/profile.test.ts`

**Interfaces (produces):**
- `xpToNext(level: number): number`, `killXp(maxHealth: number): number`, `techniqueXp(baseCost: number): number`
- `energyMax(level: number, cursedPts: number): number`, `effectiveCost(base: number, sixEyes: boolean): number`
- `energyRecovery(idleTicks: number, cursedPts: number, combat: boolean): number`
- `physicalMult(str: number)`, `cursedMult(ce: number)`, `vitalityReduction(vit: number)`, `vitalityHealthBonus(vit: number)`
- `skillLevel(slot: 1..6)`, `isSkillUnlocked(slot, level, rct): boolean`, `lockReason(slot, level, rct): 'level'|'rct'|'red'|null`
- `grantXp(p: ProfileData, amount: number): { profile: ProfileData; leveledUp: boolean; gainedPoints: number }`
- `type ProfileData = { v: 1; level; xp; technique: 'none'|'limitless'; sixEyes; rct; vit; str; ce; settings: PlayerSettings }`
- `parseProfile(raw: string|undefined): ProfileData`, `serializeProfile(p): string`, `investStat`, `removeStat`, `rebirth(p)`

- [ ] Step 1: Tests with spec values: `xpToNext(0)=40`, `xpToNext(24)=136`, `xpToNext(100)=0`; `killXp(20)=35`, `killXp(500)=126`; `energyMax(0,0)=240`, `energyMax(100,100)=1000`; `effectiveCost(60,true)=3`, `effectiveCost(280,true)=14`; `energyRecovery(14,0,true)=0`, `energyRecovery(240,0,true)=14`, `energyRecovery(240,0,false)=18`; `techniqueXp(0)=4`, `techniqueXp(280)=24`; unlock: slot 4 needs level 18 and rct, slot 5 needs slot 4; `grantXp` across several levels; `parseProfile('garbage')` → defaults; stat caps 100 and points `level*3`.
- [ ] Step 2: Run → FAIL; implement; run → PASS.
- [ ] Step 3: Commit `feat(core): progression and profile rules`.

### Task 3: Core state machines

**Files:** Create `src/core/rct.ts`, `src/core/combo.ts`, `src/core/roll.ts`, `src/core/hotbarTrigger.ts`, `src/core/castRegistry.ts`; Test `tests/core/state.test.ts`

**Interfaces:**
- `class ReversalTrial { start(now); charge(now); release(now); tick(now); cancel(); stage; attempts; successMask }` — windows `[12,22],[22,31],[16,24]`, auto-fail at 50 held ticks, ready timeout 600
- `class ComboState { press(now): ComboStart|null; tick(now, held): {start?: ComboStart; contact?: number; ended?: boolean} }` with contact 3/3/3/6, chain 9, action_end 9/9/9/12, recovery 20, window 20, buffer 3
- `rollDirection(move: {x:number;y:number}): 0|1|2|3` (F,B,L,R; neutral → 1) and `rollSpeed(t: number): number` = `0.72*(1-t/10)^1.25`
- `class HotbarTrigger { constructor(homeSlot=8); expectSelfChange(slot); onChange(prev, next, now): number|null }` → returns tapped slot index or null
- `class CastRegistry<K> { set(key, cleanup: () => void); clear(key); interruptAll(): number }`

- [ ] Step 1: Tests: trial passes with 2 of 3, fails on 1 of 3, times out; combo chains 1→4 then resets after window; heavy hit recovery 20; `rollDirection({x:0,y:0})===1`, `rollDirection({x:0.9,y:0.1})===3`; trigger ignores expected self change and a repeat tap within 4 ticks; registry runs every cleanup once.
- [ ] Step 2: FAIL → implement → PASS. Commit `feat(core): trial, combo, roll and input state machines`.

### Task 4: Core geometry and skill timelines

**Files:** Create `src/core/vec.ts`, `src/core/geometry.ts`, `src/core/timelines.ts`, `src/core/infinity.ts`, `src/core/maxBluePath.ts`, `src/core/nukeTimeline.ts`, `src/core/domainRules.ts`; Test `tests/core/geometry.test.ts`, `tests/core/timelines.test.ts`

**Interfaces:**
- `segmentBoxDistanceSq(a, b, min, max): number` (port of PurpleGeometry), `pointSegmentDistanceSq`, `inCone(origin, dir, target, cosHalfAngle)`
- `sphereRuns(center, radius): Run[]` and `capsuleRuns(a, b, radius): Run[]` where `Run = { y; z; x0; x1 }` (inclusive x-runs of block cells), `redDomeCells(origin, groundY)` (dome r5 + noisy ground pattern)
- `infinitySpeedFactor(gap)` = 0 ≤0.42, 1 ≥5.2, else `((gap-0.42)/4.78)^1.55`; `infinityBlocks(cause: string, hasProjectile: boolean, outsideBody: boolean): boolean`
- `maxBlueLocal(realAge): Vec3`, `maxBlueGrowth(realAge)`, `maxBlueWorld(feet, age, yaw, pitch, distance)` (port of MaxBluePath, speed 0.65)
- `nukeBlue(t)`, `nukeRed(t)`, `nukeSecondary(t)`, `nukePrimary(t, initial)`, `nukeLift(t)`, `nukeCamera(t): {pos; yawOffset; pitch}` (ports of GojoNukeTimeline/CameraPath with default settings)
- `crossesSphere(a, b, r)`, `arenaOrigin(slot)` = `(slot*2048+0.5, 64, 0.5)`
- `TL` constants: blue cast 45 fx 5 pull 30; red cast 23 impact 20; barrage start 20 contact 5 hit@10 hit 119 punches `[12,26,30,34,38,41,45,49,53,56,60,64,68]` kick 84; purple fusion 123 ready 149 windup 20; maxBlue cast 169 orbit 69 life 785 cancel 28 scan 5; maxRed ready 140 shoot 10 fx 24; selfPurple hold 100 impact 20 fx 216; awakening 157; nuke 426 explosionAt 380; domain forming 70 entry 44 active 400 fracture 18

- [ ] Step 1: Tests: segment-box distance 0 when crossing, known value for a miss; `sphereRuns(c,24)` total cells within 1% of 4/3·π·24³; every run cell inside radius; `infinitySpeedFactor(5.2)=1`; `maxBlueLocal(69)` equals key `(0,1.45,9)`; `nukeLift(4)=15`; `crossesSphere` inside→outside true, inside→inside false.
- [ ] Step 2: FAIL → implement → PASS. Commit `feat(core): geometry, paths and skill timelines`.

### Task 5: Assets — textures, sounds, items

**Files:** Create `tools/prepare_assets.py`; outputs under `packs/JJK_RP/textures/jjk/{icons,hud,ui,fx,cards,domain}`, `packs/JJK_RP/textures/item_texture.json`, `packs/JJK_RP/sounds/jjk/**`, `packs/JJK_RP/sounds/sound_definitions.json`

- FX textures downscaled: single sprites ≤256 px, flipbook sheets ≤512 px keeping the grid; UI art at native size; card art ≤512 px.
- Sound ids `jjk.<java id>`; categories: voices `player`, effects `neutral`, music `music`, UI `ui`; `max_distance` = Java outer range, `min_distance` = inner range; `stream` for nuke sfx/music.
- Item textures: `jjk_six_eyes`, `jjk_technique` (Limitless card crop), skill icons for forms.

- [ ] Step 1: `python3 -I tools/prepare_assets.py <extracted-jar> packs/JJK_RP` then `npm run validate` → 0 errors; largest PNG ≤ 512×512 except UI backdrops.
- [ ] Step 2: Commit `feat(assets): textures and sounds from the Java mod`.

### Task 6: Player animations

**Files:** Create `tools/convert_animations.py`, `tools/preview_animation.py`; Test `tests/tools/test_convert_animations.py` (run with `python3 -I -m pytest` or plain asserts); Output `packs/JJK_RP/animations/jjk_player.animation.json`

- Bone map: `body→root` (rotation about hip pivot (0,12,0) compensated into root position), `torso→body`, `head→head`, `right_arm→rightArm`, `left_arm→leftArm`, `right_leg→rightLeg`, `left_leg→leftLeg`.
- Keep `catmullrom` keys; bake non-Bedrock easings (`easeInBack`, `easeInQuint`, `easeInElastic`, `easeInQuart`, `easeInSine`) at 30 Hz; keep `loop` / `hold_on_last_frame`, `override_previous_animation`.
- Names: `animation.jjk.<java name>` (e.g. `animation.jjk.base_attack1`, `animation.jjk.gojo_base_blue`, `animation.jjk.max_red_ready`), plus `animation.jjk.reset` (empty, 0.05 s).

- [ ] Step 1: Converter tests: easing samples monotonic for `easeInQuart`; bone names all in Bedrock set; hip-pivot compensation keeps the hip point fixed for a pure X rotation.
- [ ] Step 2: Run converter; render previews of `roll_front`, `base_attack4`, `hollow_purple_start` to `scratchpad/preview/anim_*.png` and check limbs stay attached.
- [ ] Step 3: Commit `feat(assets): convert player animations to Bedrock`.

### Task 7: Game foundation — data, energy, menus, technique choice

**Files:** Create `src/game/players.ts`, `src/game/energy.ts`, `src/game/attributes.ts`, `src/game/xp.ts`, `src/game/commands.ts`, `src/game/i18n.ts`, `src/game/menu/*.ts`, `src/game/techniqueSelect.ts`; BP `items/technique.json`, RP `ui/server_form.json` modifications (themed forms keyed by title prefix `§j§k`), card animations in `ui/jjk_cards.json`

**Interfaces (produces):**
- `getRuntime(p: Player): Runtime` with `{ profile; energy; combat; infinity; awakeningTicks; cooldowns: Record<SkillKey, number>; lastTechniqueTick; ... }`, `saveProfile(p)`, `spendEnergy(p, base: number): boolean`, `commitTechnique(p, base)`
- `openMainMenu(p)`, `openTechniqueSelection(p)`
- Custom commands: `/jjk:menu`, `/jjk:level <n>`, `/jjk:xp <n>`, `/jjk:rct`, `/jjk:reset`, `/jjk:settings`

- [ ] Step 1: `npm run typecheck && npm test && npm run build && npm run validate` → all pass.
- [ ] Step 2: Commit `feat(game): profiles, energy, xp, menus and technique selection`.

### Task 8: Combat mode, HUD and basic combat

**Files:** Create `src/core/hudCodec.ts` (+ `tests/core/hudCodec.test.ts`), `tools/gen_hud_ui.mjs` (writes `packs/JJK_RP/ui/jjk_hud.json` + `hud_screen.json` modifications), `src/game/combatMode.ts`, `src/game/hud.ts`, `src/game/damage.ts`, `src/game/stun.ts`, `src/game/m1.ts`, `src/game/guard.ts`, `src/game/dodge.ts`, `src/game/anim.ts`, `packs/JJK_BP/cameras/presets/jjk_shoulder.json`

- HUD payload = title text `jjkhud:` + fixed fields: visible, awakened, infinity, energy segments (32 chars `#`/`.`), 8 slot states (`0` locked, `1` ready, `2` active, `r` needs RCT, `v` needs Red) + 8 cooldown chars (`0`–`f`), awakening char (`0`–`f`), hold progress char.
- JSON UI reads chars with `('%.Ns' * (#text - ('%.Ks' * #text)))`; vanilla title hidden when it starts with `jjkhud:`.
- Camera: preset `jjk:shoulder` (inherit `minecraft:follow_orbit`, radius 2.8, view offset from Java right 0.7 / up 0.25) + `ControlScheme.CameraRelativeStrafe`.

- [ ] Step 1: `encodeHud` tests (length fixed, segments for 0/50/100%, cooldown char for 0, half, full).
- [ ] Step 2: typecheck, test, build, validate → pass. Commit `feat(game): combat mode, HUD, M1, guard, dodge and stun`.

### Task 9: Skills — Infinity, Blue, Barrage, Red

**Files:** Create `src/game/skills/{infinity,blue,barrage,red}.ts`, `src/game/fx.ts`, `src/game/terrain.ts`, particles `packs/JJK_RP/particles/jjk_{infinity,blue,red,barrage}_*.json`

- [ ] Step 1: typecheck/test/build/validate → pass. Commit `feat(skills): Infinity, Blue, Barrage and Red`.

### Task 10: Skills — Purple, Awakening, Max Blue, Max Red, Self Purple

**Files:** Create `src/game/skills/{purple,awakening,maxBlue,maxRed,selfPurple}.ts`; entities `jjk:orb` (purple/blue/red variants via property), `jjk:debris`; geometry, render controllers, particles

- [ ] Step 1: typecheck/test/build/validate → pass. Commit `feat(skills): Purple, Awakening and maximum techniques`.

### Task 11: Nuke Purple

**Files:** Create `src/game/skills/nuke.ts` (camera spline from `nukeCamera`, rise, orbs, explosion pulses, terrain sweep, music/voice/sfx, HUD hidden)

- [ ] Step 1: typecheck/test/build/validate → pass. Commit `feat(skills): Nuke Purple cinematic`.

### Task 12: Unlimited Void

**Files:** Create `packs/JJK_BP/dimensions/unlimited_void.json` (void, `min_y` 0, `height_range` 256), `src/core/domainJournal.ts` (+ test), `src/game/domain/*.ts`, barrier entity `jjk:domain_barrier`, sky entity `jjk:void_sky`, fog `packs/JJK_RP/fogs/jjk_void.json`, overload particle, comic panel UI

- [ ] Step 1: journal tests (encode/decode, stale session detection).
- [ ] Step 2: typecheck/test/build/validate → pass. Commit `feat(domain): Unlimited Void`.

### Task 13: RCT and Six Eyes

**Files:** Create `src/game/rct.ts`, `src/game/sixEyes.ts`; BP `items/six_eyes.json`, `recipes/six_eyes.json`; HUD trial meter

- [ ] Step 1: typecheck/test/build/validate → pass. Commit `feat(game): Reverse Cursed Technique and Six Eyes`.

### Task 14: Settings, performance profiles, packaging and docs

**Files:** Modify `src/game/menu/settings.ts`; Create `docs/COMO_INSTALAR.md`; `npm run pack` → `dist/JJK_Ilimitado.mcaddon`

- [ ] Step 1: Full gate: `npm run typecheck && npm test && npm run build && npm run validate && npm run pack` → all pass; `.mcaddon` < 15 MB.
- [ ] Step 2: Commit, push, send the `.mcaddon` to the user.
