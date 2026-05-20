import { describe, it, expect } from 'vitest';
import { renderPR } from '../src/render.js';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(HERE, '..', 'skills', 'write-pr', 'examples', 'minimal');

describe('renderPR — minimal example round-trip', () => {
  it('renders bundled minimal example matching pr.rendered.md byte-for-byte', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'write-pr-round-trip-'));
    const out = join(tmp, 'out.md');
    await renderPR(join(FIXTURES, 'pr.md.j2'), join(FIXTURES, 'evidence'), out);
    const actual = readFileSync(out, 'utf8');
    const expected = readFileSync(join(FIXTURES, 'pr.rendered.md'), 'utf8');
    expect(actual).toBe(expected);
  });
});

describe('renderPR — custom Jinja delimiters dodge dbt-Jinja collision', () => {
  it('leaves {{ ... }} as literal text (does NOT interpret as variable)', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'write-pr-jinja-'));
    const tpl = join(tmp, 't.j2');
    const evid = join(tmp, 'evid');
    mkdirSync(evid, { recursive: true });
    writeFileSync(
      tpl,
      `---\ntitle: "T"\n---\n\nDBT macro example: {{ ref('foo') }}\n\nOur var: [[ 'hello' ]]\n`,
    );
    const out = join(tmp, 'out.md');
    await renderPR(tpl, evid, out);
    const txt = readFileSync(out, 'utf8');
    expect(txt).toContain("{{ ref('foo') }}");
    expect(txt).toContain('hello');
  });
});

describe('renderPR — template gotchas (Phase 2 A regression)', () => {
  it('GOTCHA 1: literal [x] / [ ] checkboxes survive via [% if %] blocks (no [[[ trap)', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'write-pr-gotcha1-'));
    const tpl = join(tmp, 't.j2');
    writeFileSync(
      tpl,
      `---\ntitle: "T"\n---\n\n[% set checked = true %]- [% if checked %][x][% else %][ ][% endif %] item\n[% set checked = false %]- [% if checked %][x][% else %][ ][% endif %] item2\n`,
    );
    const out = join(tmp, 'out.md');
    await renderPR(tpl, tmp, out);
    const txt = readFileSync(out, 'utf8');
    expect(txt).toContain('- [x] item');
    expect(txt).toContain('- [ ] item2');
  });

  it('GOTCHA 2: string-literal interpolation preserves literal [[ ... ]] in prose', async () => {
    // Documentation pattern: to write LITERAL `[[ rows | md_table ]]` in prose (e.g. when documenting
    // the API in a PR body), wrap the literal in a string-literal variable interpolation.
    // [% raw %] does NOT work with custom delimiters (nunjucks raw-mode lexer hard-codes default {% %}).
    const tmp = mkdtempSync(join(tmpdir(), 'write-pr-gotcha2-'));
    const tpl = join(tmp, 't.j2');
    writeFileSync(
      tpl,
      `---\ntitle: "T"\n---\n\nUse \`[[ "[[ rows | md_table ]]" ]]\` to render a table.\n`,
    );
    const out = join(tmp, 'out.md');
    await renderPR(tpl, tmp, out);
    const txt = readFileSync(out, 'utf8');
    expect(txt).toContain('`[[ rows | md_table ]]`');
  });
});

describe('renderPR — heading-inside-summary lint (Trait 3 antipattern)', () => {
  it('throws when a `## heading` appears inside <summary>', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'write-pr-summary-lint-'));
    const tpl = join(tmp, 't.j2');
    writeFileSync(
      tpl,
      `---\ntitle: "T"\n---\n\n<details><summary>\n\n## Root cause\n\n</summary>\n\nbody\n\n</details>\n`,
    );
    const out = join(tmp, 'out.md');
    await expect(renderPR(tpl, tmp, out)).rejects.toThrow(/heading-inside-<summary>/);
  });

  it('accepts heading OUTSIDE summary + body wrapped in <details>', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'write-pr-summary-ok-'));
    const tpl = join(tmp, 't.j2');
    writeFileSync(
      tpl,
      `---\ntitle: "T"\n---\n\n## Root cause\n\n<details><summary>Click to expand details</summary>\n\nbody\n\n</details>\n`,
    );
    const out = join(tmp, 'out.md');
    await renderPR(tpl, tmp, out);
    const txt = readFileSync(out, 'utf8');
    expect(txt).toContain('## Root cause');
    expect(txt).toContain('<summary>Click to expand details</summary>');
  });
});

describe('renderPR — frontmatter title prepend', () => {
  it('prepends title heading when body does not start with `# `', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'write-pr-title1-'));
    const tpl = join(tmp, 't.j2');
    writeFileSync(tpl, `---\ntitle: "My PR"\n---\n\n## Section\n\nbody\n`);
    const out = join(tmp, 'out.md');
    await renderPR(tpl, tmp, out);
    expect(readFileSync(out, 'utf8').startsWith('# My PR\n')).toBe(true);
  });

  it('does NOT prepend when body already starts with `# `', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'write-pr-title2-'));
    const tpl = join(tmp, 't.j2');
    writeFileSync(tpl, `---\ntitle: "Frontmatter Title"\n---\n# Body Title\n\nbody\n`);
    const out = join(tmp, 'out.md');
    await renderPR(tpl, tmp, out);
    const txt = readFileSync(out, 'utf8');
    expect(txt.startsWith('# Body Title')).toBe(true);
    expect(txt).not.toContain('Frontmatter Title');
  });

  it('handles template with NO frontmatter gracefully', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'write-pr-nofm-'));
    const tpl = join(tmp, 't.j2');
    writeFileSync(tpl, `Just body, no frontmatter.\n[[ 1 + 1 ]]\n`);
    const out = join(tmp, 'out.md');
    await renderPR(tpl, tmp, out);
    const txt = readFileSync(out, 'utf8');
    expect(txt).toContain('Just body');
    expect(txt).toContain('2');
  });
});
