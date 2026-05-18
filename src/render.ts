import nunjucks from 'nunjucks';
import yaml from 'js-yaml';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, isAbsolute, join } from 'node:path';
import { mdTable } from './filters/md-table.js';

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

export async function renderPR(templatePath: string, evidenceDir: string, outPath: string): Promise<void> {
  const templateAbs = resolve(templatePath);
  const evidenceAbs = resolve(evidenceDir);
  const outAbs = resolve(outPath);

  const source = readFileSync(templateAbs, 'utf8');
  const { frontmatter, body } = parseFrontmatter(source);

  // Custom Jinja delimiters to dodge dbt-Jinja `{{ }}` collision inside code fences.
  // MANDATORY — see ARCHITECTURE.md §Critical Gotchas in gsd-lite.
  const env = nunjucks.configure(dirname(templateAbs), {
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

  // Filter registry — Phase 1 ships md_table only. Phases 2-3 add the rest.
  env.addFilter('md_table', mdTable);

  const rendered = env.renderString(body, { meta: frontmatter });

  // Prepend title heading if frontmatter specifies one and body doesn't already lead with `# `.
  const bodyClean = rendered.replace(/^\s*\n+/, '');
  const out = frontmatter.title && !bodyClean.startsWith('# ')
    ? `# ${frontmatter.title}\n\n${bodyClean}`
    : rendered;

  writeFileSync(outAbs, out, 'utf8');
  console.log(`write-pr: rendered ${templateAbs} → ${outAbs} (${out.length} bytes)`);
}
