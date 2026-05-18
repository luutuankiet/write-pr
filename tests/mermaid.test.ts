import { describe, it, expect } from 'vitest';
import { makeMermaid } from '../src/filters/mermaid.js';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function setupEvidence(): { evidenceDir: string; mmdPath: string; mmdContent: string } {
  const evidenceDir = mkdtempSync(join(tmpdir(), 'write-pr-mermaid-'));
  mkdirSync(join(evidenceDir, 'diagrams'), { recursive: true });
  const mmdPath = join(evidenceDir, 'diagrams', 'flow.mmd');
  const mmdContent = 'flowchart LR\n    A --> B\n    B --> C';
  writeFileSync(mmdPath, mmdContent + '\n');
  return { evidenceDir, mmdPath, mmdContent };
}

describe('mermaid filter', () => {
  it('reads a .mmd file relative to evidence dir and wraps in fenced ```mermaid block', () => {
    const { evidenceDir, mmdContent } = setupEvidence();
    const mermaid = makeMermaid(evidenceDir);
    const out = mermaid('diagrams/flow.mmd');
    expect(out).toBe('```mermaid\n' + mmdContent + '\n```');
  });

  it('honors absolute paths regardless of evidence dir', () => {
    const { evidenceDir, mmdPath, mmdContent } = setupEvidence();
    const mermaid = makeMermaid('/nonexistent/dir');
    void evidenceDir;
    const out = mermaid(mmdPath);
    expect(out).toBe('```mermaid\n' + mmdContent + '\n```');
  });

  it('strips trailing newline from file contents', () => {
    const evidenceDir = mkdtempSync(join(tmpdir(), 'write-pr-mermaid-nl-'));
    writeFileSync(join(evidenceDir, 'g.mmd'), 'graph TD\n  X-->Y\n');
    const out = makeMermaid(evidenceDir)('g.mmd');
    expect(out).toBe('```mermaid\ngraph TD\n  X-->Y\n```');
  });

  it('throws on non-string input', () => {
    expect(() => makeMermaid('/tmp')(123 as unknown as string)).toThrow(/expected a string path/);
  });
});
