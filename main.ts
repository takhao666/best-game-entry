// Starfall Salvage — the program that hands the game in (Node 22,
// standard library only). The grader runs this file twice in a sandbox
// with no network: it must write the same bytes both times.
//
// What it does, in order:
//   1. Copies the playable game (game/) beside this file into the output
//      directory the grader provides (/output, or MAKEFUN_OUTPUT_DIR
//      when run by hand).
//   2. Copies the screenshots (screenshots/) the same way, when present.
//   3. Writes dossier.json with buildDossier from the vendored make.fun
//      library, using the scorer's own caps, so the dossier the judge
//      reads is byte for byte the one the library writes from these files.
//
// Everything it reads is a file in this repository; it fetches nothing,
// reads no clock and rolls no dice, so the two runs match exactly.
//
// Run it by hand:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function handIn() {
  mkdirSync(outDir, { recursive: true });

  // The game itself: plain static files, loaded offline by game/index.html.
  cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });

  // The screenshots, real renders of the game's own code in a browser.
  const shotsDir = join(outDir, 'screenshots');
  mkdirSync(shotsDir, { recursive: true });
  const localShots = join(repoRoot, 'screenshots');
  if (existsSync(localShots)) {
    cpSync(localShots, shotsDir, { recursive: true });
  }

  // The dossier: the judge's view of the game, written by the library
  // from exactly the files above, under the scorer's caps.
  const dossier = buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  });
  writeFileSync(join(outDir, 'dossier.json'), dossier);
}

handIn();
