import { describe, it, expect } from 'vitest';
import { jsonPretty } from '../src/filters/json-pretty.js';

describe('json_pretty filter', () => {
  it('renders a fenced ```json block with default indent=2', () => {
    const out = jsonPretty({ a: 1, b: [2, 3] });
    const lines = out.split('\n');
    expect(lines[0]).toBe('```json');
    expect(lines[lines.length - 1]).toBe('```');
    expect(out).toContain('"a": 1');
    expect(out).toContain('  "b": [');
  });

  it('honors custom indent', () => {
    const out = jsonPretty({ a: 1 }, { indent: 4 });
    expect(out).toContain('    "a": 1');
  });

  it('fold=true wraps in <details><summary>JSON</summary>', () => {
    const out = jsonPretty({ x: 1 }, { fold: true });
    expect(out.startsWith('<details><summary>JSON</summary>')).toBe(true);
    expect(out.endsWith('</details>')).toBe(true);
    expect(out).toContain('```json');
  });

  it('fold=true with custom summary label', () => {
    const out = jsonPretty([1, 2], { fold: true, summary: 'Raw query result' });
    expect(out).toContain('<summary>Raw query result</summary>');
  });

  it('handles primitives and nulls', () => {
    expect(jsonPretty(null)).toContain('null');
    expect(jsonPretty(42)).toContain('42');
    expect(jsonPretty('hi')).toContain('"hi"');
  });
});
