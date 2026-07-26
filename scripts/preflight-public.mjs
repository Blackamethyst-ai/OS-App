#!/usr/bin/env node
/**
 * Preflight: prune dangling symlinks from public/.
 *
 * Vite copies publicDir wholesale during `prepare-out-dir`. It stats every
 * entry, so a single symlink whose target has vanished aborts the entire
 * build with a bare ENOENT that names the link, not the cause.
 *
 * This bit us via public/anchor-library/{ai-generated,misc,professional},
 * which pointed into a Google Drive CloudStorage folder that was later
 * moved. Those paths are gitignored, so CI and Vercel never saw them and
 * only local builds broke — the worst failure shape, since local build is
 * the loop you verify changes in.
 *
 * Dangling links carry no content by definition, so pruning is lossless.
 * We log what was removed rather than deleting silently.
 */
import { readdirSync, lstatSync, existsSync, readlinkSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PUBLIC_DIR = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'public');

/** @param {string} dir @param {string[]} pruned */
function prune(dir, pruned) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    let stat;
    try {
      stat = lstatSync(full);
    } catch {
      continue;
    }
    if (stat.isSymbolicLink()) {
      // existsSync follows the link: false here means the target is gone.
      if (!existsSync(full)) {
        const target = readlinkSync(full);
        unlinkSync(full);
        pruned.push(`${full.replace(PUBLIC_DIR, 'public')} -> ${target}`);
      }
    } else if (stat.isDirectory()) {
      prune(full, pruned);
    }
  }
}

const pruned = [];
prune(PUBLIC_DIR, pruned);

if (pruned.length) {
  console.warn(
    `[preflight] pruned ${pruned.length} dangling symlink(s) from public/ ` +
      `(their targets no longer exist; they would have failed the build):`
  );
  for (const p of pruned) console.warn(`  ${p}`);
}
