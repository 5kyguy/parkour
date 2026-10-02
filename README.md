# Parkour

A third-person browser parkour game set in a stylized Florence. Michael Scott finds himself among terracotta rooftops, market stalls, and narrow alleys, convinced that an office manager can become a free-runner.

The player will explore a compact district, discover routes, and chain moves from the street to the rooftops. Responsive movement, expressive animation, and quick recovery from a missed jump will make experimenting feel good.

## The game I'm building

- Running and sprinting that carry momentum through jumps, vaults, and landings.
- Wall-runs, wall-jumps, ledge grabs, climbing, slides, and landing rolls.
- Connected rooftop routes, courtyards, and street-level ways to climb back up.
- A low-poly office worker with articulated limbs, a fluttering tie, and a bouncing badge.
- Warm lighting, readable surfaces, landing dust, and synthesized movement sounds.
- A mouse-controlled follow camera and keyboard controls for desktop browsers.

Character geometry, scenery, material patterns, animation, and game audio will be
generated in code. The game will run client-side and ship as a static website.

## Design documents

- [Game concept](docs/concept.md): the experience, movement, world, art direction, and intended controls.
- [Architecture](docs/architecture.md): the planned systems, resource generation, simulation, and verification.

These documents define the implementation target and its acceptance criteria.

## Development

The stack is TypeScript, Three.js, and Vite. Use Yarn for dependencies and scripts;
`yarn.lock` records the dependency versions.

```sh
yarn install --frozen-lockfile
yarn dev
```

Build and serve the production output:

```sh
yarn build
yarn preview
```

`yarn build` runs the TypeScript compiler and writes the browser build to `dist/`.
Playwright is available for browser verification.

## License

[MIT](LICENSE).
