import { readFileSync } from 'node:fs';
import { isAbsolute, join, relative } from 'node:path';

export interface CodeExpandOpts {
  lines?: string | [number, number];
  lang?: string;
  root_path?: string;
  annotate?: Record<string | number, string>;
}

/** Inline-comment prefix per language. Block-comment languages use [open, close]. */
const COMMENT_PREFIX: Record<string, string | [string, string]> = {
  sql: '--', python: '#', py: '#', bash: '#', sh: '#', yaml: '#', yml: '#', toml: '#',
  js: '//', ts: '//', jsx: '//', tsx: '//', go: '//', rs: '//', java: '//', c: '//', cpp: '//',
  html: ['<!--', '-->'], xml: ['<!--', '-->'], md: ['<!--', '-->'],
  css: ['/*', '*/'],
};

const EXT_TO_LANG: Record<string, string> = {
  '.sql': 'sql',
  '.py': 'py', '.python': 'py',
  '.sh': 'bash', '.bash': 'bash',
  '.yaml': 'yaml', '.yml': 'yaml', '.toml': 'toml',
  '.js': 'js', '.mjs': 'js', '.cjs': 'js',
  '.ts': 'ts', '.mts': 'ts', '.cts': 'ts',
  '.jsx': 'jsx', '.tsx': 'tsx',
  '.go': 'go', '.rs': 'rs', '.java': 'java',
  '.c': 'c', '.h': 'c',
  '.cpp': 'cpp', '.cc': 'cpp', '.hpp': 'cpp',
  '.html': 'html', '.htm': 'html',
  '.xml': 'xml',
  '.md': 'md', '.markdown': 'md',
  '.css': 'css', '.scss': 'css', '.sass': 'css',
};

function detectLang(path: string): string {
  const idx = path.lastIndexOf('.');
  if (idx < 0) return '';
  return EXT_TO_LANG[path.slice(idx).toLowerCase()] ?? '';
}

function commentWrap(lang: string, text: string): string {
  const prefix = COMMENT_PREFIX[lang];
  if (!prefix) return text;
  if (typeof prefix === 'string') return `${prefix} ${text}`;
  return `${prefix[0]} ${text} ${prefix[1]}`;
}

function parseLines(spec: string | [number, number]): [number, number] {
  if (Array.isArray(spec)) return [Number(spec[0]), Number(spec[1])];
  const m = String(spec).match(/^\s*(\d+)\s*-\s*(\d+)\s*$/);
  if (!m) {
    throw new Error(
      `code_expand: invalid lines spec '${spec}'. Expected 'N-M' (e.g. '10-25') or [N, M].`,
    );
  }
  return [Number(m[1]), Number(m[2])];
}

/**
 * Factory: bind a code_expand filter to a default root_path (frontmatter or undefined).
 *
 * code_expand(path, opts) -> fenced code block with header comment.
 *
 * @param path           File path. Resolved against root_path if relative.
 * @param opts.lines     'N-M' or [N, M] line range. Omit to include whole file.
 * @param opts.lang      Override language (default: detected from extension).
 * @param opts.root_path Per-call override of default root_path.
 * @param opts.annotate  Map of {lineNum: 'note text'}. Appends ` <comment> <- text` to that line.
 *
 * Output:
 *   ```<lang>
 *   <comment> <relative_path>:<start>-<end>
 *   ...source lines...
 *   ```
 *
 * GOTCHA: comment lang prefix is for THE CODE BLOCK CONTENT, not surrounding markdown.
 *         Block-comment langs (html/xml/md/css) use `<!-- ... -->` / `/* ... *​/` wrappers.
 */
export function makeCodeExpand(defaultRootPath: string | undefined) {
  return function codeExpand(path: string, opts: CodeExpandOpts = {}): string {
    if (typeof path !== 'string') {
      throw new Error(`code_expand: expected a string path, got ${typeof path}`);
    }
    const rootPath = opts.root_path ?? defaultRootPath ?? process.cwd();
    const abs = isAbsolute(path) ? path : join(rootPath, path);
    const content = readFileSync(abs, 'utf8');
    const lang = opts.lang ?? detectLang(path);

    // Split, drop trailing empty (from terminal newline) so output isn't padded.
    const allLines = content.split(/\r?\n/);
    if (allLines.length > 0 && allLines[allLines.length - 1] === '') allLines.pop();

    const relPath = isAbsolute(path) ? relative(rootPath, abs) : path;

    let displayLines = allLines;
    let headerText = relPath;
    let startLine = 1;
    if (opts.lines !== undefined) {
      const [s, e] = parseLines(opts.lines);
      displayLines = allLines.slice(s - 1, e);
      headerText = `${relPath}:${s}-${e}`;
      startLine = s;
    }

    let body = displayLines;
    if (opts.annotate) {
      body = displayLines.map((line, i) => {
        const actualLineNum = startLine + i;
        const note =
          opts.annotate![actualLineNum] ?? opts.annotate![String(actualLineNum)];
        if (note) return `${line}  ${commentWrap(lang, `<- ${note}`)}`;
        return line;
      });
    }

    const header = commentWrap(lang, headerText);
    return ['```' + lang, header, ...body, '```'].join('\n');
  };
}
