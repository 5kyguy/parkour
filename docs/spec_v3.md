# Parkour — Game Specification v3.0

> **Changelog:** v3.0 pivots from a linear parkour course to an open-world traversal experience. Florence is now a fully explorable 300×300m district. No floor higher than 2 floors. Architecture is designed around Assassin's Creed's parkour principles.

---

## 1. Concept & Vision

### The Premise

Michael Scott has been isekai'd.

One moment he was in a Dunder Mifflin conference room explaining the rules of Casino Night. The next, he wakes up in 15th-century Florence, surrounded by terracotta rooftops, cobblestone plazas, and absolutely no idea how he got there.

He is wearing his Dunder Mifflin polo. He has his ID badge. He still has his dignity (marginally).

And then he sees a rooftop — and something awakens in him.

**"I've watched videos. I can do this."**

He cannot, in fact, do this. But he is going to try anyway.

### The Game

This is **open-world parkour exploration**. Not a timed course. Not a linear gauntlet. Just Michael, an open Florence district, and his stubborn belief that he was born to free-run.

The joy is in the traversal itself — the flow, the chains, the accidental combos that happen when the city is built right. The comedy emerges naturally from Michael's earnest, uncoordinated attempts at athleticism.

> **No fall damage.** Explore freely. The ground is not punishment — it's just where you restart your climb.

### Core Experience

```text
Explore Florence → Find your flow → Chain moves → Lose yourself in the city → Repeat
```

---

## 2. Open World Design — Florence, 300×300m

### World Philosophy

**"The city is the playground."**

Florence is not a level — it's a place. It has:

- Wide plazas for running space
- Narrow alleys for wall-run shortcuts
- Rooftops at consistent 2-floor height (6–8m) for accessible climbing
- Courtyards, churches, market squares, and residential blocks
- Clear parkour highways and side routes

The principle from Assassin's Creed applies: **every direction is viable**. If you can see it, you can probably parkour there.

### Dimensions

| Parameter | Value |
| --- | --- |
| **World size** | 300m × 300m |
| **Street width** | 4–6m |
| **Building height max** | 2 floors (~7m) |
| **Rooftop height** | ~7m (consistent) |
| **Alley width** | 2–3m |
| **Plaza size** | 30–50m across |
| **Ground level** | Y = 0 |
| **Rooftop level** | Y = 7m |
| **Player spawn** | Random rooftop |

### Vertical Layering

Florence has **2 distinct navigation layers:**

| Layer | Y Range | What's There |
| --- | --- | --- |
| **Ground** | 0–1m | Streets, alleys, market stalls, pedestrians, fountains |
| **Rooftop** | 7m | All building rooftops, connected into a continuous parkour surface |

Between ground and rooftop: **walls, ledges, balconies, and handholds** every 2–3m for climbing.

### No Invisible Walls

Every surface in the world is either:

- **Climbable** (rough texture, handholds present)
- **Wall-runnable** (smooth vertical surface, minimum 3m tall)
- **Passable** (open window, doorway, archway)
- **Blocking** (explicit wall with no handholds — clearly not climbable)

If it looks climbable, it is.

---

## 3. Architecture System — The AC Principles

This section translates the Assassin's Creed parkour design principles into our Florence.

### Principle 1: Parkour Starters (Everywhere)

From AC: *"Objects like carts or a stack of boxes that allow the player to quickly start free running and gain access to higher ground."*

In Florence:

- **Wooden crates** scattered at street corners — climbable, vaultable
- **Market stalls** — tables, awning frames, fruit crates
- **Barrel stacks** — rollable, vaultable
- **Stacked goods** — rice bags, cloth bundles, pottery crates
- **Ladder bottoms** — placed at 45° against walls, always climbable
- **Scaffolding** — on ~20% of building facades (randomized)

**Placement rule:** Every 15–20m along a street, there is a parkour starter within 3m. Entering the parkour system takes zero planning.

### Principle 2: The Parkour Highway (Gaps in Jumping Metric)

From AC: *"Gaps between building rooftops and/or parkour-able objects need to be in jumping metric. The longer and varied this path is, the more satisfying."*

In Florence:

- **Rooftop-to-rooftop gaps:** always ≤ 2.5m (Michael can jump this comfortably)
- **Rooftop-to-wall distances:** ≤ 2m (leap + wall-run is always possible)
- **Gap-to-ledge:** Landing ledge is always within 1m of gap landing zone
- **Wall-to-wall (across alley):** ≤ 3m (leap across, or wall-run one wall → pushoff to other)

**The highway is the default path.** Streets are not faster. Going ground-level means navigating crowds and obstacles — rooftops are the efficient path.

### Principle 3: Ledges, Handholds, and Ledges (Climbing Infrastructure)

From AC: *"Altaïr was also an adept climber, able to run up nearly any wall and spider through its maze of loose bricks, windowsills, and other handholds."*

In Florence:

- **Ledges:** Every rooftop edge has a 0.3m ledge — Michael can grab it and pull up
- **Window sills:** Protrude 0.4m from walls, every 1.5m vertically — climbable
- **Balconies:** Every 3rd building has a balcony with iron railing — grab-able, vault-over-able
- **Drainpipes:** Vertical pipes on 40% of building walls — climbable
- **Trellises:** On Renaissance-style buildings (20%) — fast climbing surface
- **Brick patterns:** Every 0.3m offset brick creates a handhold texture — run-up-able walls

**Rule:** Any wall under 8m can be climbed by any player without special timing.

### Principle 4: Open Buildings (Interior Paths)

From AC: *"Buildings started having open windows and doors. Players can use these to quickly cut through the building."*

In Florence:

- **Open doors:** 30% of ground-floor doorways are open, leading to interior courtyards
- **Open windows:** 50% of first-floor windows are open — Michael can vault through
- **Courtyards:** Interior passages connect streets through buildings
- **Arches:** Every 20m, a covered archway passes through a building — no obstacle, just passage

**Benefit:** Interior paths offer shortcuts and cooler air. Rooftops offer speed and views.

### Principle 5: Wall-Run Surfaces

Florence walls are primarily:

- **Stucco (rough):** Cream walls, slightly bumpy — NOT wall-runnable (no grip)
- **Brick:** Dark orange-red brick — wall-runnable
- **Stone:** Church and municipal buildings, smooth — wall-runnable

**Wall-run surface rule:** Brick or stone walls ≥ 3m tall and ≥ 4m wide are wall-runnable. These are clearly visually distinct from rough stucco.

**Alley wall-runs:** Alleys (2–3m wide) have walls on both sides, both wall-runnable. Michael can wall-run the entire length of an alley for fast horizontal travel.

### Principle 6: Visual Landmarks (Navigation)

From AC: *"Placing objectives far away from the player's current location and not providing the player with a clear path."*

In Florence:

| Landmark | Location | Visual |
| --- | --- | --- |
| **Duomo (Cathedral)** | City center | Tall dome, always visible from anywhere |
| **Bell Tower** | Adjacent to Duomo | Tall, narrow, 8m × 8m footprint |
| **Market Square** | Southwest quadrant | Open plaza, fountain, flag poles |
| **River crossing** | Northern edge | Bridge connecting to unexplored area |
| **Palazzo Medici** | Eastern quadrant | Large courtyard, colonnade |
| **Cemetery** | Northwestern corner | Low walls, open, parkour-friendly |

Michael spawns in a random rooftop. He orients by looking for the Duomo dome.

### Principle 7: Ground = Slow Path (Not Punishment)

From AC: *"Narrow streets that can be blocked by crowds."*

In Florence:

- **Crowds:** Market areas have pedestrian clusters that slow movement
- **Narrow alleys:** Sometimes blocked by a cart — must vault over or go around
- **Stairs:** Building entrances have 2–3 steps — small obstacle, small reward
- **No enemies** (v1): No guard chase — just exploration

**Philosophy:** Ground is fine. Rooftops are better. But ground is never *bad* — it just requires a different movement style (vaults, slides, rolls).

---

## 4. Movement System (Refined for Open World)

Movement is **emergent, not scripted.** No predetermined routes. Every player finds their own path.

### Physics Constants (Refined)

```javascript
const PHYSICS = {
  GRAVITY:          -22.0,   // Slightly floaty — better air control
  RUN_SPEED:         6.5,   // m/s — comfortable跑
  SPRINT_SPEED:     10.0,   // m/s — fast but not overwhelming
  AIR_CONTROL:       0.4,   // More forgiving air steering
  JUMP_VELOCITY:     7.5,   // Short hops, frequent chaining
  LEAP_VELOCITY:    10.0,   // Bigger directional jumps
  VAULT_DURATION:    0.35,  // Quick vaults
  WALL_RUN_DURATION: 2.0,   // Long enough for alleys
  WALL_RUN_SPEED:    8.0,   // Fast lateral travel
  CLIMB_SPEED:       3.0,   // Slow but certain
  ROLL_DURATION:     0.5,
  SLIDE_DURATION:    0.5,
  // Open world additions:
  COYOTE_TIME:       0.12,  // Seconds after leaving edge to still jump
  JUMP_BUFFER:       0.10,  // Seconds before landing to queue jump
  LANDING_GRACE:     0.20,  // Forgiveness on landing
  WALL_PUSH_ANGLE:   45,    // Degrees from perpendicular
  WALL_PUSH_VELOCITY: 9.0,  // m/s, diagonal up-forward
};
```

### The 8 Moves (Unchanged from v2.0, Context-Refined)

The 8-move system (Run, Jump, Vault, Leap, Wall-Run, Climb, Roll, Slide) remains. In open-world context:

| Move | Open World Use |
| --- | --- |
| **Run** | Default. Explore horizontally across rooftops and streets. |
| **Jump** | Small rooftop gaps, small ledges, small obstacles |
| **Vault** | Entering from ground to rooftop via market stalls, crates, benches |
| **Leap** | Crossing 2–2.5m gaps, wall-to-wall, wall-to-rooftop |
| **Wall-Run** | Alleys (2–3m wide), long smooth walls, horizontal speed |
| **Climb** | Any rough wall ≤ 7m, drainpipes, trellises, ledges |
| **Roll** | Landing from any height (auto-triggers on hard landing), speed preservation |
| **Slide** | Under archways, through open windows, descending quickly |

### Move Scaling by Context

The same input produces different results based on context:

| Input | At Ground | At Rooftop | At Wall | In Air |
| --- | --- | --- | --- | --- |
| `Space` | Small hop | Drop off edge OR tiny hop | Wall-jump (if both walls) | Nothing |
| `Space` + forward | Vault (if obstacle) | Leap (if at edge) | Push off wall | Nothing |
| `↓` | Slide | Slide off edge | Nothing | Roll |
| `↑` | Nothing | Nothing | Climb | Nothing |

---

## 5. Building Types (Florence, 2 Floors Max)

All buildings are **2 floors (ground + 1)**, 7–8m to rooftop.

### Residential (Common)

- **Footprint:** 8m × 10m, 10m × 12m
- **Walls:** Rough stucco (NOT wall-runnable) — climbable via handholds
- **Features:** Window sills (0.3m protrusion), drainpipes, balconies (every 2nd unit)
- **Roof:** Flat or slightly pitched (15°), terracotta tiles
- **Quantity:** ~60% of buildings

### Commercial (Common)

- **Footprint:** 12m × 8m, 15m × 10m
- **Walls:** Rough stucco + wood shutters — NOT wall-runnable
- **Features:** Market stall attachment points, wide doorways (open in 30%), awning frames
- **Roof:** Flat, low parapet walls (0.5m)
- **Quantity:** ~20% of buildings

### Palazzo / Noble (Landmark)

- **Footprint:** 20m × 20m, 25m × 15m
- **Walls:** Stone (wall-runnable), smooth
- **Features:** Colonnade (arched walkway at ground), balconies, grand entrance
- **Roof:** Flat, decorative parapets
- **Quantity:** ~10% of buildings (scattered, serve as orientation landmarks)

### Church / Civic (Landmark)

- **Footprint:** 25m × 15m minimum
- **Walls:** Stone (wall-runnable), buttresses, flying buttresses
- **Features:** Bell tower, dome, entrance narthex, open cemetery-adjacent
- **Roof:** Dome (non-accessible) or pitched tile
- **Quantity:** 3–4 per district (Duomo + local parish + cemetery chapel)

### Market Structures (Open Areas)

- **Tables:** 2m × 0.8m, vaultable
- **Stall frames:** Awning poles, climbable, vaultable
- **Barrel stacks:** 1.5m diameter, rollable
- **Crate clusters:** Variable, vaultable, climbable
- **Quantity:** Market square + scattered throughout

---

## 6. Procedural Generation

### City Layout Algorithm

Florence is procedurally assembled, but with constraints ensuring navigability:

```text
1. PLACE landmark buildings first (Duomo, 2–3 churches, palazzo)
   → These anchor the city and define districts

2. FILL districts with residential and commercial blocks
   → Grid-like street pattern with slight organic deviation
   → Street intersections every 20–30m
   → Dead-end alleys every 50m

3. ADD parkour infrastructure to every street:
   → Parkour starter within 15m of every intersection
   → Open window/door within 20m of every intersection
   → Wall-run surface (brick/stone) within 30m

4. CONNECT rooftops:
   → Every rooftop edge connects to at least 1 other rooftop
   → Gap distances: 1.5m (easy), 2.0m (medium), 2.5m (hard)
   → No rooftop is isolated — all are part of the parkour network

5. VALIDATE navigability:
   → Trace a path from any rooftop to any other rooftop using only jumps/leaps
   → If path fails → adjust gap distances or add bridging ledge
```

### Module Types (Revised for Open World)

| Type | Size | Purpose |
| --- | --- | --- |
| `residential_8x10` | 8m × 10m × 7m | Standard home, stucco walls |
| `residential_10x12` | 10m × 12m × 7m | Larger home |
| `commercial_12x8` | 12m × 8m × 7m | Shop, market facing |
| `commercial_15x10` | 15m × 10m × 7m | Large market building |
| `palazzo_20x20` | 20m × 20m × 7m | Noble residence, stone, colonnade |
| `church_25x15` | 25m × 15m × 10m | Chapel, stone walls, bell tower |
| `duomo_40x30` | 40m × 30m × 18m | Cathedral, dome, landmark |
| `market_stall` | 2m × 2m × 2m | Vaultable obstacle |
| `barrel_stack` | 1.5m × 1.5m × 1.5m | Climbing surface |
| `crate_cluster` | 3m × 3m × 2m | Parkour starter |
| `alley_2x20` | 2m × 20m | Narrow alley, double wall-run |
| `alley_3x20` | 3m × 20m | Medium alley, wall-run + leap |
| `plaza_30x30` | 30m × 30m | Open square |

### Gap Networks (Parkour Highways)

The rooftop network is a graph where:

- **Nodes** = rooftop surfaces
- **Edges** = jumps/leaps between rooftops
- **Edge weights** = difficulty (1.5m = easy, 2.0m = medium, 2.5m = hard)

**Constraint:** Every node must be reachable from every other node (connected graph).

**Highway definition:** The 60% easiest edges (lowest weight) form the highway. The harder edges form alternate/expert routes.

---

## 7. Visual Identity (Florence)

### Color Palette

| Role | Hex | Usage |
| --- | --- | --- |
| **Sunlight** | `#F4C430` | Golden hour, primary light source |
| **Terracotta roof** | `#C45C3E` | 80% of building rooftops |
| **Stucco wall** | `#E8DCC8` | Residential building walls |
| **Stone wall** | `#8B7D6B` | Palazzo and church walls |
| **Street stone** | `#B8A48C` | Ground, alleys, plazas |
| **Foliage** | `#6B8E4E` | Courtyard trees, market greenery |
| **Water (fountain)** | `#3D7EA6` | Fountain in plaza |
| **Sky gradient** | `#87CEEB` → `#F4C430` | Blue zenith to golden horizon |
| **Shadow** | `#2B1E16` | Bounce light, depth |
| **Michael shirt** | `#D4D0C8` | Light heather gray |
| **Michael tie** | `#2B3A67` | Navy blue (always visible, always flapping) |
| **Michael pants** | `#3A3A3A` | Dark charcoal |
| **Market cloth** | `#A83C3C`, `#3C5AA3`, `#3CA53C` | Market awnings (colorful) |

### Lighting

- **Primary:** Directional sun, 35° elevation, west-facing (golden hour)
- **Ambient:** Sky blue `#87CEEB` at 0.3 intensity (fills shadows)
- **Hemisphere:** Sky/ground bounce — sky `#87CEEB`, ground `#C45C3E`
- **Shadows:** Soft PCF shadows, 2048px map
- **Fog:** None (clarity for parkour visibility)

### Michael Scott Silhouette

- **Proportions:** Stocky (1.75m tall, 0.55m shoulder width)
- **Clothing:** Gray polo (untucked), dark slacks, navy tie, office shoes, ID badge on lanyard
- **Tie:** Physics-simulated — flutters behind, gets caught on obstacles (comedy)
- **Badge:** Bounces on chest while running

---

## 8. Controls

### Desktop (v1)

| Key | Action |
| --- | --- |
| `W` / `↑` | Steer up / Climb (at wall) |
| `S` / `↓` | Steer down / Slide (while running) |
| `A` / `←` | Steer left |
| `D` / `→` | Steer right |
| `Space` | Jump / Vault / Leap (context-sensitive) |
| `Shift` | Sprint |
| `R` | Respawn at nearest safe rooftop |

**Controls reference displayed on screen on first load, fades after 5 seconds.**

---

## 9. UI / HUD

### Minimal HUD (Exploration Focus)

Since this is open-world exploration, not a timed run:

| Element | Position | Information |
| ------- | -------- | ----------- |
| **Control hint** | Bottom center | "WASD: Move / Space: Jump / Shift: Sprint / R: Respawn" — fades after 5s |
| **Current altitude** | Top right | "ROOFTOP" or "GROUND" — subtle indicator |
| **Coordinates** | Top right | X, Z position — for fun / orientation |
| **Tie status** | Bottom right | Small tie icon, animates when "caught" |

**No timer** in v1. No score. Just exploration.

### Future HUD (Time Trial Phase)

When leaderboards are added, the HUD will add:

- Current run time (top center)
- Best segment time
- Move counter

---

## 10. Game Feel (Refined for Open World)

### Camera (Exploration Mode)

| Parameter | Value |
| --------- | ----- |
| **Distance** | 10m behind, 4m above (more zoomed out for spatial awareness) |
| **FOV** | 70° (wider for city overview) |
| **Follow speed** | Lerp 0.1 (slightly slower, more cinematic) |
| **Look-ahead** | 3m in velocity direction |
| **Landing shake** | 0.25 unit, 150ms (subtle) |
| **Airborne tilt** | 3° (less than v2.0 — less aggressive) |

### No Fall Damage (Critical for Open World)

| Fall scenario | Response |
| ------------- | -------- |
| **Missed rooftop landing** | Michael flails comically, lands on feet, recovers in 0.3s |
| **Slip off wall mid-wall-run** | Falls, recovers on feet |
| **Fall to ground from rooftop** | Roll animation, brief stagger, resumes running |
| **Fall into water** | Not possible in v1 (no water geometry to fall into) |
| **Fall off map edge** | Gentle respawn at nearest rooftop |

**Philosophy:** Falling is not failure. It's a comedy beat and a chance to try a different route.

---

## 11. Jam Scope v1.0 — What Ships

**Core (MUST):**

- [ ] 300×300m Florence — procedurally assembled
- [ ] 2-floor buildings only (6–8m), no taller
- [ ] Full move set: Run, Jump, Vault, Leap, Wall-Run, Climb, Roll, Slide
- [ ] Parkour infrastructure: starters, ledges, handholds, wall-run surfaces, open windows
- [ ] No fall damage — gentle respawn on miss
- [ ] Seamless open-world traversal — no loading, no invisible walls
- [ ] WASD + Space controls
- [ ] Minimal HUD (controls hint on start, fades)
- [ ] Visual landmarks (Duomo, churches, market square)
- [ ] Michael with tie physics

**Does NOT Ship (Future Phases):**

- [ ] Multiple eras (London, NYC, Istanbul)
- [ ] Time trials and leaderboards
- [ ] Sound effects and music
- [ ] Mobile controls
- [ ] Guard/chase encounters
- [ ] Collectibles
- [ ] More than 1 landmark building (Duomo)

---

## 12. Phase 2 Scope (Future)

After v1.0 movement is solid:

**Graphics Enhancement:**

- Better building textures (actual stucco patterns, brick normals)
- Smoother animations (procedural → keyframed)
- Particle effects (dust on landing, tie flutter)
- Dynamic time-of-day (sun position shifts)

**Content Expansion:**

- London era (Industrial, brick walls, narrow streets)
- Time trial mode (checkpoint runs through the city)
- Leaderboard (DB-backed fastest times per route)

**Polish:**

- Sound effects
- Michael voice lines (procedural or AI-generated comedy)
- Mobile touch controls

---

## 13. Design References

| Source | What It Contributes |
| ------ | ------------------- |
| Assassin's Creed Unity | Parkour animation quality, city density, "city as playground" |
| Assassin's Creed Mirage | Highway design, parkour starter placement, dense urban flow |
| Assassin's Creed Brotherhood | Rope launcher (momentum preservation concept) |
| Mirror's Edge Catalyst | Camera feel, momentum chains, "flow state" design |
| Jet Set Radio | Low-poly aesthetic, character personality through animation |
| Getting Over It | Comedy through mundane protagonist + absurd context |

---

## 14. Key AC Principles Summary (For Implementation)

These are the exact rules the level designer (or city generator) must follow:

1. **Parkour starter within 15m of every intersection**
2. **Every rooftop connects to ≥1 other rooftop, gap ≤2.5m**
3. **Every wall-run surface is visually distinct (brick/stone vs. stucco)**
4. **Every 2nd residential building has a balcony**
5. **Every 3rd building has a drainpipe**
6. **30% of doorways are open interiors**
7. **50% of first-floor windows are open**
8. **No building exceeds 2 floors (7m)**
9. **At least 3 visual landmarks visible from any rooftop**
10. **Ground is never a dead end — alleys always connect to other streets**

---

*Spec v3.0 — Parkour Vibe Jam 2026*
*Open world. No fall damage. Just Florence, just Michael, just flow.*
