// SOLMARA — round 4 entry for make.fun bounty gta6-01 (Node 22, stdlib only).
// Open-world crime game: 12 chained missions, crew of 3, Ember Garage with
// 4-car storage + repair/paint/upgrades, respect ranks, 3-slot saves,
// 4 radio stations, safehouse, shops, SMPD 5-star wanted + AIR-1 + roadblocks.
// This file is plumbing only: it copies game/ + screenshots/ from beside
// itself to MAKEFUN_OUTPUT_DIR (default /output) and writes dossier.json
// via the kit's vendored builder. It never deletes the output dir (the
// grader may mount it as a volume). Run: MAKEFUN_OUTPUT_DIR=out node main.ts
import { cpSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const gameDir = join(here, 'game');
if (!existsSync(join(gameDir, 'index.html'))) {
  console.error('SOLMARA: game/index.html is missing — cannot build the entry.');
  process.exit(1);
}

mkdirSync(out, { recursive: true });
cpSync(gameDir, join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// Dossier caps from the scorer's reference gate: text budget shapes the
// bytes; the rest refuse an entry the scorer would refuse (more than 4
// screenshots or one over 256 KiB; more than 993 game files, 48 MiB of
// game files, or a game path over 1000 bytes).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
console.log(`SOLMARA round 4 entry written to ${out} (dossier ${statSync(join(out, 'dossier.json')).size} bytes)`);
