// Leonida Trophy Guide — the program that hands the entry in.
//
// The guide itself is plain static files: app/index.html opens in a
// desktop browser with no build step, app/app.js renders the checklist
// and the roadmap from app/data/trophies.json, and everything the page
// loads lives under app/, so it works with the network off. This file
// copies app/ and screenshots/ from beside it into /output and writes
// /output/dossier.json with the vendored make.fun library, exactly as
// the scorer expects it. Leave vendor/makefun-frontend.ts untouched:
// the gate rebuilds the dossier with its own copy and compares the two
// byte for byte.
//
// Run it outside the grader with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Node 22 or later, standard library only, no network, no install.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Fresh output directory, then the whole app and the screenshots.
mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The gate's caps, as the starter states them: at most 4 screenshots,
// none over 256 KiB; at most 993 files and directories in app/ and
// 48 MiB of app files in all. text_max_bytes caps the dossier's text.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);
