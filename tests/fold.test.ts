import { describe, it, expect } from 'vitest';
import { fold } from '../src/filters/fold.js';

describe('fold filter', () => {
  it('wraps content in <details> with default summary', () => {
    expect(fold('hello')).toBe(
      '<details><summary>Details</summary>\n\nhello\n\n</details>',
    );
  });

  it('accepts a summary string as second arg', () => {
    expect(fold('hello', 'Full log')).toBe(
      '<details><summary>Full log</summary>\n\nhello\n\n</details>',
    );
  });

  it('accepts a FoldOpts object', () => {
    expect(fold('x', { summary: 'S', open: true })).toBe(
      '<details open><summary>S</summary>\n\nx\n\n</details>',
    );
  });

  it('renders open=true with the open attribute', () => {
    const out = fold('content', { open: true });
    expect(out).toContain('<details open>');
  });

  it('omits the open attribute by default', () => {
    const out = fold('content');
    expect(out).toMatch(/^<details>/);
    expect(out).not.toContain('<details open>');
  });

  it('coerces non-string content via String()', () => {
    const out = fold(42);
    expect(out).toContain('\n\n42\n\n');
  });

  it('handles null/undefined as empty body', () => {
    expect(fold(null)).toContain('\n\n\n\n');
    expect(fold(undefined)).toContain('\n\n\n\n');
  });

  it('composes with other rendered markdown (e.g. fenced block)', () => {
    const block = '```json\n{"a":1}\n```';
    const out = fold(block, 'Raw JSON');
    expect(out).toBe(
      '<details><summary>Raw JSON</summary>\n\n```json\n{"a":1}\n```\n\n</details>',
    );
  });
});
