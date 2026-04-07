---
name: phase-1-city-michael
overview: Implement Phase 1 by evolving the current Three.js prototype into a hand-authored Florence district slice with traversal-readable modules and a recognizable Michael proxy, while keeping the scope deliberately pre-physics-polish.
todos:
  - id: world-data-model
    content: Define reusable world-module data and traversal tags so Phase 1 geometry can drive later movement systems.
    status: completed
  - id: graybox-district-slice
    content: Replace the single rooftop placeholder with a Florence slice containing plaza, streets, alleys, rooftops, and one landmark silhouette.
    status: completed
  - id: michael-proxy
    content: Upgrade the player proxy to a recognizable Michael with separate costume pieces and rooftop spawn integration.
    status: completed
  - id: collision-spawn-generalization
    content: Remove the hardcoded single-rooftop grounding logic and derive spawn/contact info from the authored world slice.
    status: completed
  - id: phase-1-debug-readability
    content: Extend debug/UI hooks so traversal tags, spawn state, and route readability are easy to validate during implementation.
    status: completed
isProject: false
---

# Phase 1 Implementation Plan

## Goal

Update [`/home/skyguy/foss/parkour/.cursor/plans/000_parkour-project-phases.plan.md`](/home/skyguy/foss/parkour/.cursor/plans/000_parkour-project-phases.plan.md) with an implementation-oriented Phase 1 plan that matches the repo's actual baseline: Phase 0 already has a working Three.js loop, input, follow camera, debug HUD, and a placeholder rooftop world in [`/home/skyguy/foss/parkour/src/game/gameApp.ts`](/home/skyguy/foss/parkour/src/game/gameApp.ts), [`/home/skyguy/foss/parkour/src/game/world/worldBuilder.ts`](/home/skyguy/foss/parkour/src/game/world/worldBuilder.ts), and [`/home/skyguy/foss/parkour/src/game/player/playerController.ts`](/home/skyguy/foss/parkour/src/game/player/playerController.ts).

Phase 1 should therefore focus on content structure and world readability, not engine bootstrap: build a hand-authored Florence slice, define traversal-aware module metadata, and turn the current box avatar into a recognizable Michael proxy.

## Current Baseline To Build On

- [`/home/skyguy/foss/parkour/src/game/gameApp.ts`](/home/skyguy/foss/parkour/src/game/gameApp.ts) already owns the app loop, input-to-movement plumbing, camera updates, and debug rendering.
- [`/home/skyguy/foss/parkour/src/game/world/worldBuilder.ts`](/home/skyguy/foss/parkour/src/game/world/worldBuilder.ts) currently creates only a flat ground plane, one rooftop slab, and one landmark box.
- [`/home/skyguy/foss/parkour/src/game/player/playerController.ts`](/home/skyguy/foss/parkour/src/game/player/playerController.ts) still assumes grounding against a single hardcoded rooftop footprint, so Phase 1 world content cannot scale until world contact data is generalized.
- [`/home/skyguy/foss/parkour/docs/spec_v3.md`](/home/skyguy/foss/parkour/docs/spec_v3.md) defines the geometry rules that Phase 1 should encode now: 300x300 world framing, ~7m rooftops, rooftop gaps <= 2.5m, climb aids every 2-3m, parkour starters every 15-20m, and visually distinct wall-run materials.

## Recommended Phase 1 Workstreams

### 1. Introduce authored world-module data before adding more meshes

Create a small world-authoring layer under [`/home/skyguy/foss/parkour/src/game/world/`](/home/skyguy/foss/parkour/src/game/world/) so the scene is built from reusable module definitions instead of one-off meshes. Each module should carry:

- footprint / transform data
- visual archetype such as `residential`, `commercial`, `palazzo`, `plaza`, `alley`, `market_stall`, `crate_cluster`
- traversal tags such as `climbable`, `vaultable`, `wallRunnable`, `ledge`, `openPassage`
- optional spawn markers and landmark markers

This is the key enabling step because it keeps Phase 1 content hand-authored while making Phase 2 movement queries possible without rewriting the world again.

### 2. Build one Florence district slice as a curated graybox

Replace the current single rooftop in [`/home/skyguy/foss/parkour/src/game/world/worldBuilder.ts`](/home/skyguy/foss/parkour/src/game/world/worldBuilder.ts) with a compact but representative slice containing:

- one plaza as a visual anchor and open run-up space
- 2-3 street segments with parkour starters nearby
- 1-2 alley variants that showcase brick/stone wall-run readability
- 3-4 building modules with connected rooftops and rooftop gaps within spec
- one strong landmark silhouette, preferably a simplified Duomo-inspired massing or bell-tower pair

Keep it hand-placed rather than procedural. The success condition is not map size; it is whether a player standing on a rooftop can immediately read likely traversal routes.

### 3. Make traversal affordances visible in the environment

Phase 1 should not wait for full vault/climb/wall-run mechanics to communicate traversal intent. The slice should visually encode the spec's rules through module composition and materials:

- stucco surfaces look climbable but not wall-runnable
- brick and stone read as wall-runnable surfaces
- ledges, sills, balconies, drainpipes, and crates appear at deliberate intervals
- open arches or pass-throughs hint at interior/open-passage routes

A simple implementation-first rule is to centralize these material and affordance choices in shared builder helpers so later content stays consistent.

### 4. Upgrade Michael from a box into a readable proxy rig substitute

Refactor [`/home/skyguy/foss/parkour/src/game/player/playerController.ts`](/home/skyguy/foss/parkour/src/game/player/playerController.ts) so the player is a grouped proxy character rather than a single mesh. The first pass only needs silhouette readability:

- stockier torso and shoulders
- gray polo upper body
- dark slacks / darker lower body
- separate navy tie piece
- visible badge/lanyard piece

This should stay geometric and cheap. The goal is strong recognition from the default follow-camera distance, not final character art.

### 5. Generalize world contact and spawn data

The current rooftop grounding logic in [`/home/skyguy/foss/parkour/src/game/player/playerController.ts`](/home/skyguy/foss/parkour/src/game/player/playerController.ts) hardcodes one roof footprint:

```78:96:/home/skyguy/foss/parkour/src/game/player/playerController.ts
  private resolveGroundContact(now: number): void {
    const groundTop = WORLD.GROUND_Y + 0.9
    const rooftopTop = WORLD.ROOFTOP_Y + 0.5
    const onRooftop =
      Math.abs(this.body.position.x) <= 14 &&
      Math.abs(this.body.position.z) <= 14 &&
      this.body.position.y <= rooftopTop
```

Phase 1 should replace this with contact/spawn data sourced from the world slice. A pragmatic first step is to have `WorldBuilder` expose authored walkable surfaces and rooftop spawn markers, then let `PlayerController` or `GameApp` query against that data. This keeps the implementation simple while removing the single-platform assumption that would block any real district layout.

### 6. Keep the validation loop visual and debuggable

Use the existing debug path in [`/home/skyguy/foss/parkour/src/game/debug/debugHud.ts`](/home/skyguy/foss/parkour/src/game/debug/debugHud.ts) to validate Phase 1 quickly. Add just enough developer-facing visibility to confirm:

- current spawn marker / rooftop zone
- current altitude layer
- current nearby traversal tags or surface type
- whether the player is on a rooftop route versus ground route

This is more important than UI polish during Phase 1 because the main risk is layout readability, not presentation.

## Suggested File Shape

Likely core files to update:

- [`/home/skyguy/foss/parkour/src/game/world/worldBuilder.ts`](/home/skyguy/foss/parkour/src/game/world/worldBuilder.ts)
- [`/home/skyguy/foss/parkour/src/game/player/playerController.ts`](/home/skyguy/foss/parkour/src/game/player/playerController.ts)
- [`/home/skyguy/foss/parkour/src/game/gameApp.ts`](/home/skyguy/foss/parkour/src/game/gameApp.ts)
- [`/home/skyguy/foss/parkour/src/game/types.ts`](/home/skyguy/foss/parkour/src/game/types.ts)
- [`/home/skyguy/foss/parkour/src/game/debug/debugHud.ts`](/home/skyguy/foss/parkour/src/game/debug/debugHud.ts)

Likely new files under [`/home/skyguy/foss/parkour/src/game/world/`](/home/skyguy/foss/parkour/src/game/world/):

- module/type definitions for authored city pieces
- helper builders for buildings, alleys, plaza chunks, and props
- shared palette/material helpers for stucco, brick, stone, roof tile, street stone
- authored layout data for the first district slice

## Implementation Sequence

```mermaid
flowchart LR
  moduleData[ModuleDataAndTags] --> districtSlice[GrayboxDistrictSlice]
  districtSlice --> michaelProxy[MichaelProxy]
  michaelProxy --> worldContact[WorldContactAndSpawn]
  worldContact --> debugValidation[DebugValidationPass]
```

1. Define world-module data and traversal tags.
2. Build the first Florence slice from those modules.
3. Replace the single-box player mesh with a readable Michael proxy.
4. Move spawn and grounding off the hardcoded rooftop and onto world-authored data.
5. Add debug visibility and tune the slice until traversal routes read clearly from the camera.

## Exit Criteria For Phase 1

Phase 1 is complete when all of the following are true:

- Michael spawns on an authored rooftop inside a Florence slice rather than on a placeholder slab.
- The slice contains a plaza, street/alley variety, several building archetypes, and one strong landmark silhouette.
- Rooftop routes are visible and mostly conform to the spec's gap and height rules.
- The environment already communicates `climbable`, `vaultable`, and `wallRunnable` intent before the full traversal move set exists.
- Ground/contact/spawn logic no longer depends on one hardcoded rooftop footprint.

## Risks To Avoid

- Do not jump to procedural generation in Phase 1; that adds scope before the traversal language is proven.
- Do not over-invest in final character art or animation; a geometric proxy is enough if the silhouette reads.
- Do not keep world collision assumptions embedded inside `PlayerController`; that would make every later movement feature more brittle.
