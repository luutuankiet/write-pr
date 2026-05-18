import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const NAMESPACE = 'write-pr';

export interface InstallOptions {
  global?: boolean;
  path?: string;
}

function findSkillDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  // Path resolution fallback chain — works whether called from dist/, src/ via tsx, or after npm-installed location
  const candidates = [
    resolve(here, '..', 'skills', NAMESPACE),         // dist/install-skill.js → ../skills/<NS>
    resolve(here, '..', '..', 'skills', NAMESPACE),   // src/install-skill.ts (tsx) → ../../skills/<NS>
    resolve(here, 'skills', NAMESPACE),               // edge: skills/ sibling to entry
    resolve(process.cwd(), 'skills', NAMESPACE),      // cwd fallback
  ];
  for (const c of candidates) {
    if (existsSync(join(c, 'SKILL.md'))) return c;
  }
  throw new Error(
    `Could not locate bundled skill 'skills/${NAMESPACE}/'. Tried:\n${candidates.map((c) => '  - ' + c).join('\n')}`,
  );
}

function resolveTarget(opts: InstallOptions): string {
  if (opts.global) return join(homedir(), '.claude', 'skills', NAMESPACE);
  if (opts.path) return join(resolve(opts.path), '.claude', 'skills', NAMESPACE);
  return join(process.cwd(), '.claude', 'skills', NAMESPACE);
}

function countFiles(dir: string): number {
  let n = 0;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) n += countFiles(full);
    else n++;
  }
  return n;
}

export function installSkill(opts: InstallOptions): void {
  const srcDir = findSkillDir();
  const targetDir = resolveTarget(opts);
  mkdirSync(dirname(targetDir), { recursive: true });
  cpSync(srcDir, targetDir, { recursive: true });
  const fileCount = countFiles(targetDir);
  console.log(`write-pr: installed ${fileCount} files → ${targetDir}`);
}

// Show what would be installed (used by --help integration if needed)
export function listSkillFiles(): string[] {
  const root = findSkillDir();
  const out: string[] = [];
  function walk(dir: string, prefix = '') {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const rel = prefix ? `${prefix}/${entry}` : entry;
      if (statSync(full).isDirectory()) walk(full, rel);
      else out.push(rel);
    }
  }
  walk(root);
  return out;
}
