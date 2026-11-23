# SOLMARA — Open-World Crime Game

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![Rank](https://make.fun/badge/gta6-01/17T-ProGimank/makefun-gta6-01-v2/rank.svg)](https://make.fun/bounty/gta6-01)
[![Reward](https://make.fun/badge/gta6-01/17T-ProGimank/makefun-gta6-01-v2/reward.svg)](https://make.fun/bounty/gta6-01)

An original three.js open-world crime game built for the [make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01). Play as **Dante Reyes**, a driver in debt to the wrong people, working jobs for fixer **Mara Voss** from the Ember Garage — and taking down **Silas Rook** and the Vultures across the sun-soaked island city of **Solmara**.

Referral: [https://make.fun/r/m4psg5rh](https://make.fun/r/m4psg5rh) (code `m4psg5rh`)

## How to play

Serve the game locally and open it in a browser:

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network at runtime — three.js is vendored under `game/vendor/`.

## Controls

- **W A S D** — drive / walk
- **Shift** — run
- **Space** — jump
- **E** — enter / exit car
- **F / Click** — shoot
- **R** — cycle radio stations
- **G** — garage (near the Ember Garage)
- **C** — crew
- **Esc** — pause

## Features

- **12 chained missions** — from "First Gear" to the finale "King of Solmara": heists, chases, escapes and a gold convoy
- **Crew of 3** — Mara Voss (Fixer), Jax Calloway (Wheelman) and Lena Marlowe (Ghost Driver), each with gameplay bonuses
- **Ember Garage** — store up to 4 cars, repair ($150), repaint ($200) and upgrade them (3 levels, up to $3,500)
- **Respect ranks** — NOBODY → STREET HUSTLER → WHEELMAN → MADE → SHOT CALLER → KING OF SOLMARA
- **3-slot save** — money, missions, crew, garage, respect and stats, autosaved every 30s
- **4 radio stations** — SOL FM, EMBER ROCK, BAY BASS and SOLMARA NIGHTS, with DJ idents
- **Safehouse** near the beach that heals you, plus downtown shops
- **SMPD 5-star wanted system** — patrol cruisers, helicopter AIR-1, roadblocks at 3+ stars
- **HUD with circular minimap** — money, wanted stars, health, speed, objective, respect bar and crew panel
- Golden-hour island city: bay, beach, downtown towers, port and north hills

## Screenshots

The four poses in `shots.json` (`?shot=cover|mission|garage|city`) show the
police chase, the finale, the Ember Garage and the aerial city view.

## License

MIT — see [LICENSE](LICENSE).
