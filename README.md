# best-game-entry

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/takhao666/best-game-entry/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/takhao666/best-game-entry/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Starfall Salvage** — a neon arena salvage game. Fly your skiff through a debris field, blast asteroids and hunter drones, scoop the glowing salvage cores, chain combos, pick an upgrade between waves, and survive all 10 waves to bring the haul home.

- **Fly** with WASD / arrows, **aim** with the mouse, **hold click** to fire, **Shift / Space** to dash through danger.
- **Score** by collecting cores — pickups chain into a combo multiplier up to x8. Kills drop cores; big rocks split into smaller ones.
- **Upgrades** between waves: faster fire, heavier rounds, split shot, plated hull, shield coil, tractor web, ion dash, hot thrusters.
- **Win** by clearing wave 10. **Lose** when your hull hits zero. Pause with P, mute with M, restart with R.
- Synthesised WebAudio sound (no audio files), particles, screen shake, parallax starfield — everything runs offline from static files.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Or open `game/index.html` from any static server. `main.ts` hands the game in: it copies `game/` and `screenshots/` to the output directory and writes `dossier.json` (see `node main.ts` with `MAKEFUN_OUTPUT_DIR` set).

---

<sub>Entered on [make.fun](https://make.fun/?ref=hvn9m3q0&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
