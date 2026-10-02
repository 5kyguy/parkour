# Game concept

## Premise

Michael Scott has landed in a Renaissance-inspired Florence. He still has his polo, tie, office shoes, and ID badge. A city full of rooftops looks like the ideal place to discover his athletic potential.

We're building a stylized third-person parkour playground around that idea. Players will choose a landmark, spot a route, and improvise their way through the district. Michael's exaggerated poses and occasional awkward recovery will give him personality while the controls remain responsive.

## The experience

A good run will flow from sprinting into a jump, across a wall, and over a rooftop ledge. The player will learn the city by moving through it: a market stall becomes a way up, a balcony becomes a shortcut, and a familiar alley connects two routes.

The core loop is:

1. Spot a rooftop or landmark worth reaching.
2. Pick a route through the available surfaces.
3. Chain moves and carry speed through the route.
4. Recover from a missed landing and find another way up.
5. Return to a familiar section and take it more smoothly.

Falling will lead to a landing, a roll, or a quick return to a safe position. Exploration will remain forgiving at every height.

## Movement

| Move | Player experience |
| --- | --- |
| Run and sprint | Build speed, steer relative to the camera, and lean into turns. |
| Jump and leap | Clear small obstacles or carry sprint momentum across a roof gap. |
| Vault | Plant a hand on a low obstacle and carry the body over it. |
| Ledge grab and mantle | Catch a reachable edge, hang, and pull onto the surface. |
| Climb | Move between authored handholds and ledges on a readable route upward. |
| Wall-run and wall-jump | Travel along a suitable wall and push off toward the next surface. |
| Slide | Lower the body and pass beneath a low opening. |
| Land and roll | Absorb an impact and return smoothly to running. |

Jump buffering and coyote time will make takeoffs forgiving. Air control will allow landing corrections. Traversal selection will consider intent, approach direction, available clearance, and the destination surface.

Animation will communicate each move through anticipation, body contact, weight shift, and recovery. Landing and traversal exits will preserve useful momentum.

## The district

The playable space will be a compact Florence-inspired neighborhood with connected street and rooftop routes. Its layout will be authored around tested jump ranges, climbing reach, wall-run length, and landing space. Procedural construction will supply the buildings and their visual variation.

The district will include:

- Terracotta-roofed homes with shutters, cornices, balconies, and window ledges.
- A market square with stalls, crates, barrels, and awnings.
- Narrow alleys with wall-run routes and passages between streets.
- Courtyards and scaffolding that connect ground-level paths to rooftops.
- A dome and bell tower that help the player orient from the roofline.

Routes will form loops with alternate approaches. Every playable rooftop will connect to the traversal network, and street routes will provide frequent ways back up. Silhouettes, surface treatment, and visible handholds will communicate where the player can go. The district boundary will use visible architecture and safe recovery points.

## Character and art direction

Michael will be an articulated low-poly character with stocky proportions, separate upper and lower limbs, and a readable silhouette. A pale shirt, dark trousers, navy tie, and ID badge will keep the office-worker premise visible while he moves. His tie and badge will respond to acceleration and landings.

The environment will use warm plaster, terracotta, wood, and pale stone. Golden sunlight and soft shadows will separate roof heights and show contact with the ground. Repeated architectural details will give the city texture while keeping landing surfaces easy to read.

All gameplay geometry and material patterns will be generated in code. Poses, motion curves, and hand/foot placement will drive character animation. This lets us tune body proportions, obstacle sizes, and traversal together.

## Camera, sound, and interface

The camera will follow behind the player, orbit with mouse input, and adjust its distance around walls. Movement look-ahead will keep the next landing visible. Speed-related field of view and restrained impact motion will reinforce movement; a reduced-motion setting will control camera effects.

Synthesized footsteps, landing impacts, cloth swishes, and wind will respond to speed, surface, and movement events. Landing dust and small contact effects will reinforce weight. Audio will start from the player's Play interaction and include a mute control.

The interface will provide a Play screen, a short controls guide, contextual traversal hints, and pause/settings controls. A separate debug overlay will expose movement state, collision probes, traversal targets, and performance during development.

## Intended desktop controls

These bindings define the control scheme to implement.

| Input | Action |
| --- | --- |
| WASD / arrow keys | Move relative to the camera. |
| Mouse | Orbit the camera while pointer lock is active. |
| Shift | Sprint. |
| Space | Jump, vault, grab/mantle a ledge, or push off a wall according to context. |
| W / up arrow while climbing | Continue upward through reachable holds. |
| C | Slide on the ground; prepare a roll in the air; release a ledge while hanging. |
| R | Return to the nearest validated safe position. |
| Escape | Release pointer lock and open the pause interface. |

Landing rolls will also trigger automatically for larger impacts. Settings will include mouse sensitivity, audio volume, and reduced camera motion.

## Playable acceptance target

The representative route will let the player sprint across a roof, jump a gap, vault an obstacle, wall-run, mantle a ledge, then drop and roll into another run. A nearby low passage will exercise sliding, and a street-to-roof route will exercise climbing and ledge recovery.

The implementation will be ready for broader district play when:

- Each move works repeatedly from its supported approach directions.
- Hands and feet meet the intended contact surfaces during traversal.
- Chained moves preserve control and transition smoothly between poses.
- Missed jumps recover safely and lead back into the route network.
- The camera keeps the player and upcoming landing readable around corners.
- Movement remains consistent across different rendering frame rates.
- The production browser build loads its resources and runs the route successfully.

See [Architecture](architecture.md) for the systems and checks behind this target.
