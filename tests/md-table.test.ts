import { describe, it, expect } from 'vitest';
import { mdTable } from '../src/filters/md-table.js';

describe('md_table filter', () => {
  it('returns placeholder for empty / null / undefined input', () => {
    expect(mdTable([])).toBe('_(no rows)_');
    expect(mdTable(undefined)).toBe('_(no rows)_');
    expect(mdTable(null as unknown as undefined)).toBe('_(no rows)_');
  });

  it('renders basic table with auto-detected columns (insertion order)', () => {
    const out = mdTable([
      { name: 'foo', value: 'bar' },
      { name: 'baz', value: 'qux' },
    ]);
    const lines = out.split('\n');
    expect(lines[0]).toBe('| name | value |');
    expect(lines[1]).toBe('| :--- | :--- |');
    expect(lines[2]).toBe('| foo | bar |');
    expect(lines[3]).toBe('| baz | qux |');
  });

  it('right-aligns numeric columns automatically', () => {
    const out = mdTable([
      { label: 'a', count: 1 },
      { label: 'b', count: 2 },
    ]);
    expect(out.split('\n')[1]).toBe('| :--- | ---: |');
  });

  it('honors explicit columns order', () => {
    const out = mdTable([{ a: 1, b: 2, c: 3 }], { columns: ['c', 'a', 'b'] });
    expect(out.split('\n')[0]).toBe('| c | a | b |');
  });

  it('honors explicit global align', () => {
    const out = mdTable([{ x: 'foo' }], { align: 'C' });
    expect(out.split('\n')[1]).toBe('| :---: |');
  });

  it('honors per-column align map', () => {
    const out = mdTable([{ a: 'x', b: 'y' }], { align: { a: 'R', b: 'C' } });
    expect(out.split('\n')[1]).toBe('| ---: | :---: |');
  });

  it('escapes pipes and newlines in cells', () => {
    const out = mdTable([{ x: 'a|b\nc' }]);
    expect(out).toContain('| a\\|b<br/>c |');
  });

  it('renders null and undefined cells as empty', () => {
    const out = mdTable([{ x: null, y: undefined, z: 'present' }]);
    const dataRow = out.split('\n')[2];
    expect(dataRow).toBe('|  |  | present |');
  });

  it('stringifies object cells via JSON.stringify', () => {
    const out = mdTable([{ x: { nested: 1 } }]);
    expect(out).toContain('| {"nested":1} |');
  });

  it('mixes numeric + string columns correctly (numeric -> R, string -> L)', () => {
    const out = mdTable([
      { test_name: 'a', status: 'pass', duration_ms: 12 },
      { test_name: 'b', status: 'pass', duration_ms: 18 },
    ]);
    expect(out.split('\n')[1]).toBe('| :--- | :--- | ---: |');
  });
});
