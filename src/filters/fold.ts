export interface FoldOpts {
  /** Summary label shown collapsed. Default 'Details'. */
  summary?: string;
  /** Render expanded by default. Default false. */
  open?: boolean;
}

/**
 * fold filter: wrap ANY content in a GitHub `<details><summary>...</summary>` block.
 *
 * Composable with every other filter — pipe their output through `fold` to make it
 * collapsible. No coupling to JSON / specific content types.
 *
 * Usage:
 *   [[ long_text | fold ]]
 *   [[ long_text | fold('Full log') ]]
 *   [[ rows | md_table | fold(summary='Validation results', open=true) ]]
 *   [[ payload | json_pretty | fold('Raw query result (JSON)') ]]
 */
export function fold(content: unknown, summaryOrOpts: string | FoldOpts = {}): string {
  const opts: FoldOpts =
    typeof summaryOrOpts === 'string' ? { summary: summaryOrOpts } : summaryOrOpts;
  const summary = opts.summary ?? 'Details';
  const open = opts.open ?? false;
  const openAttr = open ? ' open' : '';
  const body = content == null ? '' : String(content);
  return `<details${openAttr}><summary>${summary}</summary>\n\n${body}\n\n</details>`;
}
