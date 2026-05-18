import { readFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';

/**
 * Factory: bind a mermaid filter to an evidence directory so paths can be relative.
 *
 * The filter reads a .mmd file and wraps its contents in a fenced ```mermaid block.
 * Paths are resolved against `evidenceDir` (the --evidence arg passed to render).
 * Absolute paths are honored as-is.
 */
export function makeMermaid(evidenceDir: string) {
  return function mermaid(relPath: string): string {
    if (typeof relPath !== 'string') {
      throw new Error(`mermaid: expected a string path, got ${typeof relPath}`);
    }
    const abs = isAbsolute(relPath) ? relPath : join(evidenceDir, relPath);
    const content = readFileSync(abs, 'utf8').replace(/\r?\n$/, '');
    return '```mermaid\n' + content + '\n```';
  };
}
