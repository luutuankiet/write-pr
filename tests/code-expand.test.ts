import { describe, it, expect } from 'vitest';
import { makeCodeExpand } from '../src/filters/code-expand.js';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function setupRepo(): { rootPath: string; sqlPath: string; htmlPath: string } {
  const rootPath = mkdtempSync(join(tmpdir(), 'write-pr-codex-'));
  mkdirSync(join(rootPath, 'models'), { recursive: true });
  writeFileSync(
    join(rootPath, 'models', 'foo.sql'),
    'SELECT 1 AS a\nFROM bar\nWHERE b = 2\nORDER BY c\nLIMIT 10\n',
  );
  writeFileSync(
    join(rootPath, 'page.html'),
    '<html>\n  <body>hi</body>\n</html>\n',
  );
  return { rootPath, sqlPath: 'models/foo.sql', htmlPath: 'page.html' };
}

describe('code_expand filter', () => {
  it('renders whole file with auto-detected lang and bare-path header', () => {
    const { rootPath, sqlPath } = setupRepo();
    const out = makeCodeExpand(rootPath)(sqlPath);
    const lines = out.split('\n');
    expect(lines[0]).toBe('```sql');
    expect(lines[1]).toBe('-- models/foo.sql');
    expect(lines[2]).toBe('SELECT 1 AS a');
    expect(lines[lines.length - 1]).toBe('```');
    // 5 source lines + 2 fence lines + 1 header = 8
    expect(lines.length).toBe(8);
  });

  it('honors string lines spec "N-M"', () => {
    const { rootPath, sqlPath } = setupRepo();
    const out = makeCodeExpand(rootPath)(sqlPath, { lines: '2-4' });
    const lines = out.split('\n');
    expect(lines[1]).toBe('-- models/foo.sql:2-4');
    expect(lines.slice(2, -1)).toEqual(['FROM bar', 'WHERE b = 2', 'ORDER BY c']);
  });

  it('honors array lines spec [N, M]', () => {
    const { rootPath, sqlPath } = setupRepo();
    const out = makeCodeExpand(rootPath)(sqlPath, { lines: [1, 2] });
    expect(out.split('\n')[1]).toBe('-- models/foo.sql:1-2');
  });

  it('explicit lang overrides auto-detect', () => {
    const { rootPath, sqlPath } = setupRepo();
    const out = makeCodeExpand(rootPath)(sqlPath, { lang: 'py' });
    const lines = out.split('\n');
    expect(lines[0]).toBe('```py');
    expect(lines[1]).toBe('# models/foo.sql');
  });

  it('per-call root_path overrides factory default', () => {
    const { rootPath, sqlPath } = setupRepo();
    const factory = makeCodeExpand('/wrong/root');
    const out = factory(sqlPath, { root_path: rootPath });
    expect(out).toContain('SELECT 1 AS a');
  });

  it('annotate map appends inline comments to specified lines', () => {
    const { rootPath, sqlPath } = setupRepo();
    const out = makeCodeExpand(rootPath)(sqlPath, {
      lines: '1-3',
      annotate: { 2: 'joined table', 3: 'predicate' },
    });
    const lines = out.split('\n');
    expect(lines[2]).toBe('SELECT 1 AS a');
    expect(lines[3]).toBe('FROM bar  -- <- joined table');
    expect(lines[4]).toBe('WHERE b = 2  -- <- predicate');
  });

  it('annotate accepts string keys (JSON-friendly)', () => {
    const { rootPath, sqlPath } = setupRepo();
    const out = makeCodeExpand(rootPath)(sqlPath, {
      lines: '1-2',
      annotate: { '2': 'string-key' } as Record<string, string>,
    });
    expect(out).toContain('FROM bar  -- <- string-key');
  });

  it('uses block-comment wrappers for html/xml/md/css', () => {
    const { rootPath, htmlPath } = setupRepo();
    const out = makeCodeExpand(rootPath)(htmlPath, { annotate: { 2: 'body' } });
    const lines = out.split('\n');
    expect(lines[0]).toBe('```html');
    expect(lines[1]).toBe('<!-- page.html -->');
    expect(lines[3]).toBe('  <body>hi</body>  <!-- <- body -->');
  });

  it('rejects malformed lines spec', () => {
    const { rootPath, sqlPath } = setupRepo();
    expect(() =>
      makeCodeExpand(rootPath)(sqlPath, { lines: 'banana' }),
    ).toThrow(/invalid lines spec/);
  });

  it('absolute path is honored and rendered as relative to root_path', () => {
    const { rootPath, sqlPath } = setupRepo();
    const abs = join(rootPath, sqlPath);
    const out = makeCodeExpand(rootPath)(abs, { lines: '1-1' });
    expect(out).toContain('-- models/foo.sql:1-1');
  });
});
