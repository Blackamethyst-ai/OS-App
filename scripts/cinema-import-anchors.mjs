#!/usr/bin/env node
// Cinema Studio — import anchor selections from gdrive-gallery.html.
//
// Reads a `cinema-anchors-*.json` file exported by the gallery, copies the
// referenced image files into public/anchor-library/picked/ (preserving
// original filenames with collision suffixes), and rebuilds the anchor
// library index so OS-App can serve them.
//
// Usage:
//   node scripts/cinema-import-anchors.mjs ~/Downloads/cinema-anchors-*.json
//   node scripts/cinema-import-anchors.mjs --latest    # auto-pick most recent in ~/Downloads
//   node scripts/cinema-import-anchors.mjs --dry-run   # preview without copying

import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PICKED_DIR = path.join(ROOT, 'public', 'anchor-library', 'picked');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const latest = args.includes('--latest');

let manifestPath = args.find(a => !a.startsWith('--'));
if (latest || !manifestPath) {
  const downloads = path.join(os.homedir(), 'Downloads');
  const files = (await fs.readdir(downloads))
    .filter(n => /^cinema-anchors-\d+\.json$/.test(n))
    .map(n => ({ n, t: Number(n.match(/(\d+)/)[1]) }))
    .sort((a, b) => b.t - a.t);
  if (!files.length) {
    console.error('No cinema-anchors-*.json files found in ~/Downloads. Pass a path explicitly.');
    process.exit(1);
  }
  manifestPath = path.join(downloads, files[0].n);
  console.log(`Auto-picked: ${files[0].n}`);
}

const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
console.log(`Manifest version ${manifest.version}, exported ${manifest.exportedAt}, ${manifest.items.length} items`);

if (manifest.canonical) {
  console.log(`  Canonical: ${manifest.canonical.sourceCount} seeds, variance ${manifest.canonical.variance.toFixed(3)}`);
}

if (!dryRun) await fs.mkdir(PICKED_DIR, { recursive: true });

let copied = 0;
let skipped = 0;
let missing = 0;
const usedNames = new Set();

for (const item of manifest.items) {
  // item.path is a file:// URL — decode to local path
  const localPath = decodeURIComponent(item.path.replace(/^file:\/\//, ''));
  try {
    const stat = await fs.stat(localPath);
    if (!stat.isFile()) { missing++; continue; }
  } catch {
    console.warn(`  MISSING: ${localPath}`);
    missing++;
    continue;
  }

  // Collision-safe name within picked/
  let name = item.name;
  let target = path.join(PICKED_DIR, name);
  if (usedNames.has(name)) {
    const ext = path.extname(name);
    const base = path.basename(name, ext);
    let n = 1;
    while (usedNames.has(`${base}-${n}${ext}`)) n++;
    name = `${base}-${n}${ext}`;
    target = path.join(PICKED_DIR, name);
  }
  usedNames.add(name);

  const exists = await fs.stat(target).then(() => true, () => false);
  if (exists) {
    skipped++;
    continue;
  }

  if (dryRun) {
    console.log(`  WOULD COPY: ${item.rel} -> picked/${name}`);
  } else {
    await fs.copyFile(localPath, target);
  }
  copied++;
}

console.log(`\n${copied} copied, ${skipped} already present, ${missing} missing`);

if (!dryRun && copied > 0) {
  console.log('\nRebuilding anchor-library-index.json...');
  execSync('bash scripts/build-anchor-index.sh', { cwd: ROOT, stdio: 'inherit' });
}

console.log('\nDone. Reload Cinema Studio Soul Cast — picked/ is now the priority library.');
