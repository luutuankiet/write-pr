type Row = Record<string, unknown>;
type Align = 'L' | 'R' | 'C';

export interface MdTableOpts {
  columns?: string[];
  align?: Align | Record<string, Align>;
}

const ALIGN_SEP: Record<Align, string> = {
  L: ':---',
  R: '---:',
  C: ':---:',
};

function cellStr(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  // Escape pipes (table separator) and newlines (break the row).
  return String(v).replace(/\|/g, '\\|').replace(/\r?\n/g, '<br/>');
}

function isNumericCol(rows: Row[], col: string): boolean {
  return rows.every((r) => {
    const v = r[col];
    return v === null || v === undefined || typeof v === 'number';
  });
}

/**
 * md_table filter: JSON array of objects -> GitHub-flavored markdown table.
 *
 * @param data    Array of row objects. Empty/undefined -> '_(no rows)_'.
 * @param opts.columns  Explicit column order. Default: auto-detect from first row's keys (insertion order).
 * @param opts.align    Global Align ('L'|'R'|'C') OR per-column {colName: Align}. Default: numeric cols R, else L.
 */
export function mdTable(data: Row[] | undefined | null, opts: MdTableOpts = {}): string {
  if (!data || !Array.isArray(data) || data.length === 0) return '_(no rows)_';

  const columns =
    opts.columns ??
    Array.from(
      data.reduce<Set<string>>((s, r) => {
        Object.keys(r ?? {}).forEach((k) => s.add(k));
        return s;
      }, new Set<string>()),
    );

  const alignFor = (col: string): Align => {
    if (opts.align && typeof opts.align === 'object') {
      return opts.align[col] ?? (isNumericCol(data, col) ? 'R' : 'L');
    }
    if (typeof opts.align === 'string') return opts.align;
    return isNumericCol(data, col) ? 'R' : 'L';
  };

  const header = `| ${columns.join(' | ')} |`;
  const sep = `| ${columns.map((c) => ALIGN_SEP[alignFor(c)]).join(' | ')} |`;
  const body = data
    .map((r) => `| ${columns.map((c) => cellStr(r[c])).join(' | ')} |`)
    .join('\n');

  return `${header}\n${sep}\n${body}`;
}
