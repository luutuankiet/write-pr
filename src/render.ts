import nunjucks from 'nunjucks';
import yaml from 'js-yaml';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve, isAbsolute, join } from 'node:path';
import { mdTable } from './filters/md-table.js';
import { jsonPretty } from './filters/json-pretty.js';
import { ghCallout } from './filters/gh-callout.js';
import { makeCodeExpand } from './filters/code-expand.js';
import { deltaTable } from './filters/delta-table.js';
import { fold } from './filters/fold.js';

export interface Frontmatter {
  title?: string;
  root_path?: string;
  [key: string]: unknown;
}

function parseFrontmatter(source: string): { frontmatter: Frontmatter; body: string } {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: source };
  const raw = (yaml.load(match[1]) ?? {}) as Frontmatter;
  return { frontmatter: raw, body: match[2] };
}

function resolveUnder(base: string, rel: string): string {
  return isAbsolute(rel) ? rel : join(base, rel);
}

/**
 * Walk up from `start` looking for a `.claude/skills/write-pr/` or bare `skills/write-pr/`
 * dir that contains a `snippets/` subdir. Returns the bundle base path (the dir CONTAINING
 * `snippets/`) so the nunjucks loader can resolve `[% include 'snippets/X.j2' %]`.
 *
 * Honors both install location (.claude/skills/write-pr/) and bundle/dev location (skills/write-pr/).
 */
function findSnippetsParent(start: string): string | null {
  let cur = resolve(start);
  for (let i = 0; i < 12; i++) {
    for (const sub of ['.claude/skills/write-pr', 'skills/write-pr']) {
      const candidate = join(cur, sub);
      if (existsSync(join(candidate, 'snippets'))) return candidate;
    }
    const parent = dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return null;
}

export async function renderPR(templatePath: string, evidenceDir: string, outPath: string): Promise<void> {
  const templateAbs = resolve(templatePath);
  const evidenceAbs = resolve(evidenceDir);
  const outAbs = resolve(outPath);

  const source = readFileSync(templateAbs, 'utf8');
  const { frontmatter, body } = parseFrontmatter(source);

  // Build loader search paths: template dir first (user's own includes resolve here),
  // then any reachable write-pr bundle so `[% include 'snippets/X.j2' %]` works.
  const searchPaths = [dirname(templateAbs)];
  for (const start of [process.cwd(), dirname(templateAbs)]) {
    const found = findSnippetsParent(start);
    if (found && !searchPaths.includes(found)) searchPaths.push(found);
  }

  // Custom Jinja delimiters to dodge dbt-Jinja `{{ }}` collision inside code fences.
  // MANDATORY — see ARCHITECTURE.md §Critical Gotchas in gsd-lite.
  const env = nunjucks.configure(searchPaths, {
    autoescape: false,
    throwOnUndefined: false,
    tags: {
      variableStart: '[[',
      variableEnd: ']]',
      blockStart: '[%',
      blockEnd: '%]',
      commentStart: '[#',
      commentEnd: '#]',
    },
  });

  // Globals: load evidence files from disk so agent context doesn't carry raw tool I/O.
  env.addGlobal('load_json', (relPath: string): unknown => {
    const abs = resolveUnder(evidenceAbs, relPath);
    return JSON.parse(readFileSync(abs, 'utf8'));
  });
  env.addGlobal('load_text', (relPath: string): string => {
    const abs = resolveUnder(evidenceAbs, relPath);
    return readFileSync(abs, 'utf8');
  });
  env.addGlobal('meta', frontmatter);
  // Absolute path to evidence dir — lets templates pass `root_path=evidence_dir` into
  // code_expand when rendering code that lives next to the evidence (synthetic examples).
  env.addGlobal('evidence_dir', evidenceAbs);

  // Filter registry — see ARCHITECTURE.md §Filter Library for signatures.
  // Factory binds path-context for the only file-reading filter (code_expand →
  // frontmatter.root_path with per-call override).
  const defaultRootPath =
    typeof frontmatter.root_path === 'string' ? frontmatter.root_path : undefined;
  env.addFilter('md_table', mdTable);
  env.addFilter('json_pretty', jsonPretty);
  env.addFilter('gh_callout', ghCallout);
  env.addFilter('code_expand', makeCodeExpand(defaultRootPath));
  env.addFilter('delta_table', deltaTable);
  env.addFilter('fold', fold);

  const rendered = env.renderString(body, { meta: frontmatter });

  // Lint: `<summary>` containing a markdown heading is the Trait 3 antipattern.
  // A heading inside `<summary>` collapses the section title behind the click-target —
  // reviewers see what looks like a normal heading with no visible expand affordance, and
  // the heading drops out of GitHub's anchor-link graph. See rules/template-gotchas.md Gotcha 3.
  const summaryRegex = /<summary\b[^>]*>([\s\S]*?)<\/summary>/g;
  const violations: string[] = [];
  let summaryMatch: RegExpExecArray | null;
  while ((summaryMatch = summaryRegex.exec(rendered)) !== null) {
    const headingMatch = summaryMatch[1].match(/^\s*(#{1,6})\s+(.+)$/m);
    if (headingMatch) violations.push(headingMatch[0].trim());
  }
  if (violations.length > 0) {
    throw new Error(
      `write-pr: heading-inside-<summary> antipattern detected (${violations.length} occurrence${violations.length > 1 ? 's' : ''}):\n` +
        violations.map((v) => `  - ${v}`).join('\n') +
        `\n\nHeadings inside <summary> collapse the section title behind the click-target.\n` +
        `Move the heading OUTSIDE the <details> wrap; use "Click to expand details" (or a descriptive label) as the <summary> text.\n` +
        `See rules/template-gotchas.md Gotcha 3 and rules/good-pr-traits.md Trait 3.`,
    );
  }

  // Prepend title heading if frontmatter specifies one and body doesn't already lead with `# `.
  const bodyClean = rendered.replace(/^\s*\n+/, '');
  const out = frontmatter.title && !bodyClean.startsWith('# ')
    ? `# ${frontmatter.title}\n\n${bodyClean}`
    : rendered;

  writeFileSync(outAbs, out, 'utf8');
  console.log(`write-pr: rendered ${templateAbs} → ${outAbs} (${out.length} bytes)`);
}
