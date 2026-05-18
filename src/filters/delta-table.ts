import { mdTable } from './md-table.js';

export interface DeltaRow {
  [key: string]: unknown;
}

export interface DeltaOpts {
  /** Field used as the join key across before/after rows. Default 'metric'. */
  key?: string;
  /** Field holding the value to compare. Default 'value'. */
  value?: string;
  /** Header label for the delta column. Default 'Δ'. */
  delta_label?: string;
  /** Header label for the key column. Default = the key field name. */
  key_label?: string;
  /** Header label for before/after value columns. Default 'before' / 'after'. */
  before_label?: string;
  after_label?: string;
  /** Decimal places for numeric Δ. Default 2. */
  precision?: number;
  /** Show percentage alongside numeric Δ when before is non-zero. Default true. */
  percent?: boolean;
  /** Placeholder for missing values. Default '_(n/a)_'. */
  na?: string;
}

/**
 * delta_table filter: generic before/after comparison table.
 *
 * Universal primitive for perf regressions, config migrations, schema diffs —
 * anywhere two same-shape arrays of `{key, value}` rows want a side-by-side
 * compare with a computed Δ column.
 *
 * Filter usage:
 *   [[ before_rows | delta_table(after_rows) ]]
 *   [[ before_rows | delta_table(after_rows, {key: 'name', value: 'count'}) ]]
 *
 * Δ semantics:
 *   - both numeric:           `after - before` (+ percentage if before != 0 and percent=true)
 *   - both identical strings: '' (no change)
 *   - different strings:      'changed'
 *   - missing in before:      'added'
 *   - missing in after:       'removed'
 */
export function deltaTable(
  before: DeltaRow[],
  after: DeltaRow[],
  opts: DeltaOpts = {},
): string {
  const key = opts.key ?? 'metric';
  const value = opts.value ?? 'value';
  const deltaLabel = opts.delta_label ?? 'Δ';
  const keyLabel = opts.key_label ?? key;
  const beforeLabel = opts.before_label ?? 'before';
  const afterLabel = opts.after_label ?? 'after';
  const precision = opts.precision ?? 2;
  const percent = opts.percent ?? true;
  const na = opts.na ?? '_(n/a)_';

  const beforeArr = Array.isArray(before) ? before : [];
  const afterArr = Array.isArray(after) ? after : [];

  if (beforeArr.length === 0 && afterArr.length === 0) return '_(no data)_';

  // Preserve insertion order: before rows first, then any new keys from after.
  const seen = new Set<string>();
  const orderedKeys: string[] = [];
  for (const row of beforeArr) {
    const k = String(row[key] ?? '');
    if (!seen.has(k)) {
      seen.add(k);
      orderedKeys.push(k);
    }
  }
  for (const row of afterArr) {
    const k = String(row[key] ?? '');
    if (!seen.has(k)) {
      seen.add(k);
      orderedKeys.push(k);
    }
  }

  const beforeMap = new Map<string, unknown>();
  for (const row of beforeArr) beforeMap.set(String(row[key] ?? ''), row[value]);
  const afterMap = new Map<string, unknown>();
  for (const row of afterArr) afterMap.set(String(row[key] ?? ''), row[value]);

  const rows = orderedKeys.map((k) => {
    const b = beforeMap.has(k) ? beforeMap.get(k) : undefined;
    const a = afterMap.has(k) ? afterMap.get(k) : undefined;
    const bMissing = !beforeMap.has(k);
    const aMissing = !afterMap.has(k);

    let delta: string;
    if (bMissing && !aMissing) {
      delta = 'added';
    } else if (!bMissing && aMissing) {
      delta = 'removed';
    } else if (typeof b === 'number' && typeof a === 'number') {
      const diff = a - b;
      const sign = diff > 0 ? '+' : '';
      const rounded = Number(diff.toFixed(precision));
      if (percent && b !== 0) {
        const pct = ((diff / b) * 100).toFixed(0);
        const pctSign = Number(pct) > 0 ? '+' : '';
        delta = `${sign}${rounded} (${pctSign}${pct}%)`;
      } else {
        delta = `${sign}${rounded}`;
      }
    } else if (b === a) {
      delta = '';
    } else {
      delta = 'changed';
    }

    return {
      [keyLabel]: k,
      [beforeLabel]: bMissing ? na : (b as string | number | boolean | null),
      [afterLabel]: aMissing ? na : (a as string | number | boolean | null),
      [deltaLabel]: delta,
    };
  });

  return mdTable(rows);
}
