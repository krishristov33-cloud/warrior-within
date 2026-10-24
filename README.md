# Warrior2 — Ruins of the Deep

A playable side-view platformer shooter prototype (Soldat-inspired), with the warrior character rigged in Rigby2D and animated with the Spine 4.2 runtime.

**Play:** open `index.html` (works on desktop and mobile, single self-contained file).

## Controls
| Desktop | Mobile |
|---|---|
| A / D run · Shift walk · S crouch | Left side: floating stick, move (push partly to walk, fully to run) (up/down at ladders to climb) |
| W / Space jump, again mid-air = flip | JUMP button (tap again mid-air = flip) |
| Mouse aim (turns the character) · Left click shoot | Right side: floating stick, aim, push further to fire |
| Right click jet pack | JET button (hold) |
| G / middle click grenade · R reload · Wheel or +/− zoom · H show/hide controls · Esc pause | G button grenade · R button · +/− zoom · II pause |

Three difficulty levels (Easy / Normal / Hard) are chosen at start and from the pause menu. Easy has infinite ammo and grenades; on Normal / Hard you start with 2 grenades and pick up more (+2) from grenade crates around the level.

## Project layout
- `index.html` — the built game (everything embedded).
- `src/` — game source modules (`g1_boot.js` … `g7_main.js`), `template.html` and `build.py` (`python3 src/build.py` rebuilds `index.html`).
- `assets/character/` — Spine 4.2 skeleton (`warrior2.json/.atlas/.png`).
- `assets/level/` — packed level art (reference plate, tiles, FX sheet, swing sprites).
- `assets/source-art/` — original PSDs, background, FX sheet, level reference and the animation reference videos.
- `rigby/` — the pose solver and Rigby script used to recreate walk/run/jump from the reference videos.

Spine runtime: `src/vendor/spine-webgl.min.js` (Esoteric Software, Spine Runtimes license).
