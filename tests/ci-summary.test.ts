import { describe, it, expect } from 'vitest';
import { ciSummary, type RunResultsJson } from '../src/filters/ci-summary.js';

function sampleRun(): RunResultsJson {
  return {
    elapsed_time: 123.456,
    results: [
      { status: 'success', unique_id: 'model.proj.foo', execution_time: 1.234 },
      { status: 'success', unique_id: 'model.proj.bar', execution_time: 0.5 },
      { status: 'error', unique_id: 'model.proj.baz', execution_time: 2.0, message: 'syntax error near LIMIT' },
      { status: 'skipped', unique_id: 'model.proj.qux' },
    ],
  };
}

describe('ci_summary filter', () => {
  it('returns placeholder when results are empty / missing', () => {
    expect(ciSummary({})).toBe('_(no results)_');
    expect(ciSummary({ results: [] })).toBe('_(no results)_');
  });

  it('emits status counts table with alpha-sorted statuses', () => {
    const out = ciSummary(sampleRun());
    expect(out).toContain('### Status');
    // counts: error=1, skipped=1, success=2 — sorted: error, skipped, success
    const statusBlock = out.split('### Errors')[0];
    const order = ['error', 'skipped', 'success'].map((s) => statusBlock.indexOf(`| ${s} |`));
    expect(order[0]).toBeGreaterThan(0);
    expect(order[0]).toBeLessThan(order[1]);
    expect(order[1]).toBeLessThan(order[2]);
  });

  it('emits errors block with capped messages', () => {
    const out = ciSummary(sampleRun());
    expect(out).toContain('### Errors (1)');
    expect(out).toContain('model.proj.baz');
    expect(out).toContain('syntax error near LIMIT');
  });

  it('caps long error messages at message_cap', () => {
    const long = 'x'.repeat(500);
    const out = ciSummary(
      { results: [{ status: 'error', unique_id: 'm.p.a', message: long }] },
      { message_cap: 50 },
    );
    const errorRow = out.split('\n').find((l) => l.includes('m.p.a'))!;
    expect(errorRow).toContain('x'.repeat(50));
    expect(errorRow).not.toContain('x'.repeat(51));
  });

  it('emits our_models breakdown (positional arg, back-compat)', () => {
    const out = ciSummary(sampleRun(), ['model.proj.foo', 'model.proj.bar']);
    expect(out).toContain('### Our Models (2 of 4)');
    expect(out).toContain('model.proj.foo');
    expect(out).toContain('model.proj.bar');
    expect(out).not.toContain('### Our Models (3 of 4)');
  });

  it('emits our_models breakdown (opts form)', () => {
    const out = ciSummary(sampleRun(), { our_models: ['model.proj.baz'] });
    expect(out).toContain('### Our Models (1 of 4)');
    expect(out).toContain('model.proj.baz');
  });

  it('substring match for our_models (project name catches everything)', () => {
    const out = ciSummary(sampleRun(), ['proj']);
    expect(out).toContain('### Our Models (4 of 4)');
  });

  it('emits elapsed time line when elapsed_time is present', () => {
    expect(ciSummary(sampleRun())).toContain('**Total elapsed:** 123.46s');
  });

  it('omits errors section when zero errors', () => {
    const out = ciSummary({
      results: [{ status: 'success', unique_id: 'm.p.a' }],
    });
    expect(out).not.toContain('### Errors');
  });

  it('handles fail status alongside error', () => {
    const out = ciSummary({
      results: [
        { status: 'fail', unique_id: 'm.p.a', message: 'test failed' },
        { status: 'error', unique_id: 'm.p.b', message: 'compile failed' },
      ],
    });
    expect(out).toContain('### Errors (2)');
  });
});
