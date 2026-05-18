import { describe, it, expect } from 'vitest';
import { deltaTable } from '../src/filters/delta-table.js';

describe('delta_table filter', () => {
  it('returns placeholder when both arrays empty', () => {
    expect(deltaTable([], [])).toBe('_(no data)_');
  });

  it('computes numeric Δ with percentage by default', () => {
    const before = [{ metric: 'latency_ms', value: 1450 }];
    const after = [{ metric: 'latency_ms', value: 55 }];
    const out = deltaTable(before, after);
    expect(out).toContain('latency_ms');
    expect(out).toContain('1450');
    expect(out).toContain('55');
    expect(out).toContain('-1395 (-96%)');
  });

  it('omits percentage when percent=false', () => {
    const before = [{ metric: 'x', value: 100 }];
    const after = [{ metric: 'x', value: 150 }];
    const out = deltaTable(before, after, { percent: false });
    expect(out).toContain('+50');
    expect(out).not.toContain('(+50%)');
  });

  it('omits percentage when before is zero (avoid divide-by-zero)', () => {
    const before = [{ metric: 'errors', value: 0 }];
    const after = [{ metric: 'errors', value: 5 }];
    const out = deltaTable(before, after);
    expect(out).toContain('+5');
    // Should not contain (Infinity%) or NaN%
    expect(out).not.toMatch(/Infinity|NaN/);
  });

  it('marks added/removed rows', () => {
    const before = [{ metric: 'old_only', value: 1 }];
    const after = [{ metric: 'new_only', value: 2 }];
    const out = deltaTable(before, after);
    expect(out).toContain('old_only');
    expect(out).toContain('removed');
    expect(out).toContain('new_only');
    expect(out).toContain('added');
    expect(out).toContain('_(n/a)_');
  });

  it('marks string change as "changed"', () => {
    const before = [{ metric: 'role', value: 'ROLE_ADMIN' }];
    const after = [{ metric: 'role', value: 'ROLE_SUPERVISOR' }];
    const out = deltaTable(before, after);
    expect(out).toContain('ROLE_ADMIN');
    expect(out).toContain('ROLE_SUPERVISOR');
    expect(out).toContain('changed');
  });

  it('marks identical string with empty Δ', () => {
    const before = [{ metric: 'role', value: 'EDITOR' }];
    const after = [{ metric: 'role', value: 'EDITOR' }];
    const out = deltaTable(before, after);
    // No 'changed' label for identical values
    expect(out).not.toContain('changed');
  });

  it('honors custom key/value field names', () => {
    const before = [{ name: 'foo', count: 10 }];
    const after = [{ name: 'foo', count: 20 }];
    const out = deltaTable(before, after, { key: 'name', value: 'count' });
    expect(out).toContain('| name |');
    expect(out).toContain('foo');
    expect(out).toContain('+10');
  });

  it('honors custom column labels', () => {
    const before = [{ metric: 'm', value: 1 }];
    const after = [{ metric: 'm', value: 2 }];
    const out = deltaTable(before, after, {
      key_label: 'Field',
      before_label: 'v1',
      after_label: 'v2',
      delta_label: 'Change',
    });
    expect(out).toContain('| Field |');
    expect(out).toContain('| v1 |');
    expect(out).toContain('| v2 |');
    expect(out).toContain('| Change |');
  });

  it('preserves insertion order (before first, then new after keys)', () => {
    const before = [{ metric: 'a', value: 1 }, { metric: 'b', value: 2 }];
    const after = [{ metric: 'b', value: 3 }, { metric: 'c', value: 4 }];
    const out = deltaTable(before, after);
    const aIdx = out.indexOf('| a |');
    const bIdx = out.indexOf('| b |');
    const cIdx = out.indexOf('| c |');
    expect(aIdx).toBeLessThan(bIdx);
    expect(bIdx).toBeLessThan(cIdx);
  });

  it('respects precision option for numeric Δ', () => {
    const before = [{ metric: 'pct', value: 1.23456 }];
    const after = [{ metric: 'pct', value: 2.34567 }];
    const out = deltaTable(before, after, { precision: 4, percent: false });
    expect(out).toContain('+1.1111');
  });

  it('handles non-array inputs gracefully', () => {
    expect(deltaTable(null as unknown as never[], null as unknown as never[])).toBe('_(no data)_');
    expect(deltaTable(undefined as unknown as never[], [])).toBe('_(no data)_');
  });
});
