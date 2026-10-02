# Architecture

This document defines the architecture to implement for the [game concept](concept.md). The runtime will use TypeScript and Three.js, with browser APIs for input, audio, and local settings. Vite will produce a static website, and Yarn will manage dependencies.

## System boundaries

| System | Responsibility |
| --- | --- |
| Application | Own startup, the simulation loop, play/pause state, resize, and disposal. |
| Input | Translate keyboard and mouse events into movement intent and buffered actions. |
| World | Construct the district and expose collision shapes, traversal surfaces, and safe positions. |
| Character motor | Own player position, velocity, collision response, grounding, and movement transitions. |
| Traversal | Select a reachable interaction and maintain its path, contacts, and exit conditions. |
| Character presentation | Build the character and derive its pose from the motor and traversal state. |
| Camera | Follow and orbit the player, resolve obstruction, and apply optional movement effects. |
| Feedback | Turn movement events into synthesized sound and pooled visual effects. |
| Interface | Present controls, pause/settings, contextual hints, and development diagnostics. |

The motor will own gameplay position. Character presentation will consume a snapshot of that state. Both will use the same traversal progress and contact targets so that the body and collision representation agree throughout a move.

## Planned source organization

The following layout describes the intended module boundaries:

```text
src/
  main.ts
  game/
    app/          startup, loop, lifecycle, settings
    input/        intent, action buffers, pointer lock
    world/        district data, geometry kit, materials, spatial queries
    movement/     motor, collision, traversal probes and actions
    character/    mesh generation, joints, poses, IK, secondary motion
    camera/       orbit, follow, obstruction queries
    feedback/     synthesized audio, particles, movement events
    ui/           menus, hints, debug overlay
  styles/
tests/
  movement/       deterministic motor and traversal scenarios
  world/          geometry and route validation
  browser/        production-build interaction checks
```

Tuning values for the motor, traversal reach, camera, and animation will have named configuration fields. World validation will consume the same movement settings used by the player.

## Simulation and input

The simulation will advance at a fixed 60 Hz. An accumulator will feed bounded simulation steps, and rendering will interpolate between the previous and current snapshots. A catch-up limit will keep a long frame from creating unbounded work. Pausing or hiding the tab will clear accumulated time and transient input.

Each simulation step will:

1. Read movement intent and pending actions.
2. Query nearby collision and traversal surfaces.
3. Advance the active movement state and resolve collisions.
4. Publish a player snapshot and movement events.

Rendering will use the interpolated snapshot to update the character and camera. Feedback will consume each simulation event once, even when several simulation steps run during a rendered frame.

Action buffers will retain a press until the motor accepts it or its expiry is reached. Coyote time will use simulation time since the last supported position. Input handling will clear held keys on focus loss and suppress browser defaults for gameplay keys while play is active. Pointer-lock release will pause play; resuming will require a user interaction.

## Character motor and collision

The controller will be a custom JavaScript kinematic capsule motor. Static world collision shapes will use simple boxes and planes organized in a spatial grid. Swept movement queries and iterative sliding will resolve travel against nearby solids. Ground probes will report support height, surface normal, and material.

The capsule will have standing and sliding dimensions. Clearance checks will validate crouching, standing up, mantling, and traversal exits. The motor will record safe supported positions for recovery and explicit respawn.

Movement states will cover grounded locomotion, jumping/falling, vaulting, ledge hanging, climbing/mantling, wall-running, sliding, and landing/rolling. Each state will define entry requirements, accepted input, collision behavior, completion, and cancellation. A reset will clear velocity, action buffers, traversal targets, and secondary motion before placing the player at a validated safe position.

## Traversal contracts

A traversal probe will return a candidate containing:

- The surface identifier and movement type.
- Entry position, approach direction, and required clearance.
- Hand/foot contacts and supporting surface normals.
- A collision-checked path and destination pose.
- Progress parameters, exit velocity, and cancellation behavior.

Selection will score candidates by player intent, alignment, distance, and reachability, with a stable tie-breaker. The accepted candidate will remain bound to the action while it executes. The motor will sweep along the path and validate support at the destination; interruption will return control to an appropriate grounded or airborne state.

Jump distance will emerge from movement speed, takeoff, and air control. Vaults will cross low obstacles, mantles will finish on supported ledges, and wall-jumps will use the selected wall normal. Climbing will advance through authored holds with checked clearance between them.

## World and resource generation

A district definition will describe building footprints, elevations, passages, props, and route connections. A shared construction kit will produce render geometry, collision shapes, traversal anchors, and safe spawn candidates from those definitions. Openings and overhangs will have matching collision geometry.

The playable layout will use authored route loops. A seeded generator will vary facades, shutters, roof details, cloth colors, and prop arrangements within the layout's clearance constraints. Gameplay randomness and visual randomness will use separate streams so cosmetic changes preserve route behavior.

A route graph will represent supported surfaces and directed traversal links. Validation will check reachability from spawn, return routes, landing clearance, and recovery access. Targeted movement simulations will verify the links against the motor's actual capabilities.

Three.js primitives and custom buffer geometry will construct the environment and character. Canvas-generated textures and material parameters will supply plaster, stone, wood, and tile patterns. Shared geometry, material caches, and instancing will handle repeated details. World teardown will dispose of generated resources.

## Procedural character animation

The character will use an articulated hierarchy with torso, head, upper/lower limbs, hands, feet, tie, and badge. Pose data and motion curves will define each move in code. Locomotion phase will follow distance travelled; blending will handle acceleration, turning, takeoff, and landing.

Traversal progress will drive authored pose curves. Two-bone inverse kinematics will place hands and feet at contacts supplied by the traversal system, with joint limits and explicit bend directions. Contact weights will ease limbs into and out of support. The visual root will follow the motor, and body offsets will describe lean, compression, and reach within that motion.

Tie and badge motion will use damped springs. Reset and pause transitions will have explicit handling so accessories recover with the character.

## Camera and feedback

The camera will calculate an orbit position from player focus, view input, and movement look-ahead. A swept-volume obstruction query will shorten the distance when buildings intervene. Frame-rate-independent smoothing will handle both the follow motion and recovery to the desired distance.

The motor will emit events such as takeoff, foot contact, traversal contact, landing, and respawn. Each event will include the relevant position, material, and intensity. Foot contact timing will come from the locomotion cycle, while landing intensity will come from the resolved impact.

Web Audio will synthesize movement sounds from oscillators, filtered noise, and generated buffers. Play will initialize or resume the audio context. The feedback system will pool dust and contact particles, cap simultaneous sounds, and respect volume and reduced-motion settings.

## Browser lifecycle and delivery

The application will own event listeners, animation frames, audio nodes, and GPU resources, with explicit cleanup for each. Resize handling will update viewport size, camera projection, and a capped rendering pixel ratio. Settings will persist locally, with defaults available when browser storage is unavailable.

Startup will construct the playable space and show the Play interface. Play will activate audio and request pointer lock. The interface will explain the required browser capabilities when initialization fails.

`yarn build` will type-check the source and emit the static site into `dist/`. Deployment verification will exercise the emitted site and resolve resources relative to the configured Vite base path.

## Performance targets

The target is responsive desktop play at 60 FPS on a documented reference laptop at 1080p. This is a measurement target for implementation. Browser checks will cover Chromium and Firefox with WebGL2 support.

Performance instrumentation will track frame time, simulation cost, draw calls, triangles, and resource counts. Quality settings will control pixel ratio, shadows, and decorative density. Collision queries will reuse working storage, while the spatial grid will bound the set of candidate solids.

## Verification

Deterministic movement tests will cover buffered jumps, coyote time, corners, head clearance, sliding clearance, ledge support, both wall-run directions, traversal interruption, and respawn. Recorded input sequences will run with varying render schedules against the same fixed-step simulation.

World checks will validate route connectivity, supported destinations, and agreement between visible openings and collision shapes. Character checks will verify contact error, joint limits, and finite transforms during pose transitions.

Playwright browser checks will load the production build, enter play, exercise movement and recovery, toggle settings, and inspect console errors and resource requests. Captured traversal sequences will support visual review of body contact, camera obstruction, and pose blending.

The representative route and acceptance criteria are defined in the [game concept](concept.md#playable-acceptance-target).
