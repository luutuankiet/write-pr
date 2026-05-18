import { describe, it, expect } from 'vitest';
import { installSkill, listSkillFiles } from '../src/install-skill.js';
import { mkdtempSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('listSkillFiles', () => {
  it('returns the bundled skill files including SKILL.md', () => {
    const files = listSkillFiles();
    expect(files).toContain('SKILL.md');
    expect(files.some((f) => f.startsWith('examples/minimal/'))).toBe(true);
    expect(files.some((f) => f === 'examples/minimal/pr.md.j2')).toBe(true);
  });
});

describe('installSkill', () => {
  it('installs to <path>/.claude/skills/write-pr/', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'write-pr-install-'));
    installSkill({ path: tmp });
    const target = join(tmp, '.claude', 'skills', 'write-pr');
    expect(existsSync(target)).toBe(true);
    expect(existsSync(join(target, 'SKILL.md'))).toBe(true);
    const skillMd = readFileSync(join(target, 'SKILL.md'), 'utf8');
    expect(skillMd).toContain('name: write-pr');
    // examples subtree is preserved
    expect(existsSync(join(target, 'examples', 'minimal', 'pr.md.j2'))).toBe(true);
    expect(existsSync(join(target, 'examples', 'minimal', 'evidence', 'queries', 'q_synthetic.json'))).toBe(true);
  });

  it('overwrites existing files when re-installed', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'write-pr-reinstall-'));
    installSkill({ path: tmp });
    const before = readdirSync(join(tmp, '.claude', 'skills', 'write-pr')).sort();
    installSkill({ path: tmp });
    const after = readdirSync(join(tmp, '.claude', 'skills', 'write-pr')).sort();
    expect(after).toEqual(before);
  });
});
