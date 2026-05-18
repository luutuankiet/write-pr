import { describe, it, expect } from 'vitest';
import { ghCallout } from '../src/filters/gh-callout.js';

describe('gh_callout filter', () => {
  it.each(['TIP', 'NOTE', 'IMPORTANT', 'WARNING', 'CAUTION'])(
    'accepts canonical type %s',
    (type) => {
      const out = ghCallout(type, 'hello');
      expect(out.startsWith(`> [!${type}]`)).toBe(true);
      expect(out).toContain('> hello');
    },
  );

  it('uppercases type case-insensitively', () => {
    expect(ghCallout('tip', 'x').startsWith('> [!TIP]')).toBe(true);
    expect(ghCallout('Warning', 'x').startsWith('> [!WARNING]')).toBe(true);
  });

  it('rejects unknown types with a clear error', () => {
    expect(() => ghCallout('NOPE', 'x')).toThrow(/invalid type/);
  });

  it('prefixes every line in multi-line text with `> `', () => {
    const out = ghCallout('NOTE', 'line 1\nline 2\nline 3');
    expect(out).toBe('> [!NOTE]\n> line 1\n> line 2\n> line 3');
  });

  it('handles empty string body', () => {
    expect(ghCallout('TIP', '')).toBe('> [!TIP]\n> ');
  });
});
